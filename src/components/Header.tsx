"use client";

import Link from 'next/link';
import { useState } from 'react';
import { Menu } from 'lucide-react';
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
  <Link href={href} onClick={onClick} className="font-medium text-foreground/80 transition-colors hover:text-primary text-lg">
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
                  <SheetTitle>
                    <Logo />
                  </SheetTitle>
              </SheetHeader>
              <div className="p-4 mt-8">
                <nav className="flex flex-col items-start gap-6">
                  {navLinks.map((link) => (
                    <NavLink key={link.name} href={link.href} onClick={() => setIsMenuOpen(false)}>
                      {link.name}
                    </NavLink>
                  ))}
                  
                  <hr className='w-full border-border'/>

                  {!isUserLoading && !user && (
                    <>
                      <NavLink href="/login" onClick={() => setIsMenuOpen(false)}>
                        Login
                      </NavLink>
                      <NavLink href="/apply" onClick={() => setIsMenuOpen(false)}>
                        Sign Up
                      </NavLink>
                    </>
                  )}

                  {!isUserLoading && user && (
                    <Button asChild variant="secondary" className="w-full text-lg h-12">
                      <Link href="/dashboard" onClick={() => setIsMenuOpen(false)}>My Dashboard</Link>
                    </Button>
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
