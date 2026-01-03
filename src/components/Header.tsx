
"use client";

import Link from 'next/link';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import Logo from './Logo';
import { useUser } from '@/firebase';

const navLinks = [
  { name: 'Home', href: '/' },
  { name: 'About Us', href: '/#about' },
  { name: 'Loan Services', href: '/#loans' },
  { name: 'Invest', href: '/invest' },
  { name: 'Contact Us', href: '/#contact' },
];

const NavLink = ({ href, children, onClick }: { href: string; children: React.ReactNode; onClick?: () => void }) => (
  <Link href={href} onClick={onClick} className="font-medium text-foreground/80 transition-colors hover:text-primary">
    {children}
  </Link>
);

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, isUserLoading } = useUser();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-20 items-center justify-between">
        <Logo />

        <div className="flex items-center gap-4">
          <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <SheetHeader className='text-left'>
                  <SheetTitle className="mb-4">
                    <Logo />
                  </SheetTitle>
              </SheetHeader>
              <div className="p-4">
                <nav className="flex flex-col items-start gap-6">
                  {navLinks.map((link) => (
                    <NavLink key={link.name} href={link.href} onClick={() => setIsMenuOpen(false)}>
                      {link.name}
                    </NavLink>
                  ))}

                  <div className="pt-4 w-full">
                    {!isUserLoading && user && (
                       <Button asChild variant="secondary" className="w-full">
                         <Link href="/dashboard" onClick={() => setIsMenuOpen(false)}>My Dashboard</Link>
                       </Button>
                    )}
                    {!isUserLoading && !user && (
                      <Button asChild size="lg" className="w-full rounded-full font-bold shadow-lg transition-transform hover:scale-105 bg-accent text-accent-foreground hover:bg-accent/90">
                        <Link href="/login" onClick={() => setIsMenuOpen(false)}>Apply Now</Link>
                      </Button>
                    )}
                  </div>
                </nav>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
