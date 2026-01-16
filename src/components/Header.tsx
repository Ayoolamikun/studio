"use client";

import Link from 'next/link';
import { useState } from 'react';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import Logo from './Logo';
import { useUser, useAuth } from '@/firebase';
import { cn } from '@/lib/utils';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';

const navLinks = [
  { name: 'Home', href: '/' },
  { name: 'About Us', href: '/#about' },
  { name: 'Loan Services', href: '/#loans' },
  { name: 'Invest', href: '/invest' },
  { name: 'Contact Us', href: '/#contact' },
];

const NavLink = ({ href, children, onClick, className }: { href: string; children: React.ReactNode; onClick?: () => void, className?: string }) => (
  <Link href={href} onClick={onClick} className={cn("font-medium text-foreground/80 transition-colors hover:text-primary", className)}>
    {children}
  </Link>
);

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const router = useRouter();
  // The new admin UID for corporatemagnatecoop@outlook.com should be pasted here.
  const adminUid = "PASTE_YOUR_NEW_ADMIN_UID_HERE";

  const handleLogout = async () => {
    if (!auth) return;
    await signOut(auth);
    setIsMenuOpen(false); // Close the menu
    router.push('/'); // Redirect to homepage after logout
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-20 items-center justify-between">
        <Logo />

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <NavLink key={link.name} href={link.href}>
              {link.name}
            </NavLink>
          ))}
        </nav>
        
        <div className="flex items-center gap-2">
           {/* Desktop Auth Buttons */}
           <div className="hidden md:flex items-center gap-2">
             {isUserLoading ? (
                <div className="flex items-center gap-2">
                    <Skeleton className="h-10 w-20" />
                    <Skeleton className="h-10 w-24" />
                </div>
             ) : !user ? (
                <>
                    <Button asChild variant="ghost">
                        <Link href="/login">Login</Link>
                    </Button>
                    <Button asChild>
                        <Link href="/apply">Sign Up</Link>
                    </Button>
                </>
             ) : (
                <>
                    <Button asChild variant="secondary">
                        <Link href={user.uid === adminUid ? '/admin' : '/dashboard'}>My Dashboard</Link>
                    </Button>
                    <Button onClick={handleLogout} variant="ghost">
                        Logout
                    </Button>
                </>
             )}
           </div>

          {/* Mobile Menu */}
          <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <SheetHeader className='text-left'>
                  <SheetTitle>
                    <Logo />
                  </SheetTitle>
              </SheetHeader>
              <div className="p-4 mt-8">
                <nav className="flex flex-col items-start gap-6">
                  {navLinks.map((link) => (
                    <NavLink key={link.name} href={link.href} onClick={() => setIsMenuOpen(false)} className="text-lg">
                      {link.name}
                    </NavLink>
                  ))}
                  
                  <hr className='w-full border-border'/>

                  {isUserLoading ? (
                    <div className="space-y-4 w-full">
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                  ) : !user ? (
                    <>
                      <Button asChild variant='ghost' className="w-full justify-start text-lg h-12 p-2">
                        <Link href="/login" onClick={() => setIsMenuOpen(false)}>Login</Link>
                      </Button>
                      <Button asChild className="w-full text-lg h-12">
                        <Link href="/apply" onClick={() => setIsMenuOpen(false)}>Sign Up</Link>
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button asChild variant="secondary" className="w-full text-lg h-12">
                        <Link href={user.uid === adminUid ? '/admin' : '/dashboard'} onClick={() => setIsMenuOpen(false)}>My Dashboard</Link>
                      </Button>
                      <Button onClick={handleLogout} variant="ghost" className="w-full justify-start text-lg h-12 p-2">
                        Logout
                      </Button>
                    </>
                  )}
                </nav>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
