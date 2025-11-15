"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MoveUpRight } from 'lucide-react';
import { useUser } from '@/firebase';


const FloatingCta = () => {
  const [isVisible, setIsVisible] = useState(false);
  const { user, isUserLoading } = useUser();

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.scrollY > 500) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);

    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);
  
  if(isUserLoading || user) return null;

  return (
    <div className={cn(
      "fixed bottom-6 right-6 z-50 transition-opacity duration-300",
      isVisible ? "opacity-100" : "opacity-0 pointer-events-none"
    )}>
      <Button asChild size="lg" className="rounded-full font-bold shadow-2xl transition-transform hover:scale-110 bg-accent text-accent-foreground hover:bg-accent/90">
        <Link href="/login">
          Apply Now
          <MoveUpRight className="ml-2 h-5 w-5" />
        </Link>
      </Button>
    </div>
  );
};

export default FloatingCta;
