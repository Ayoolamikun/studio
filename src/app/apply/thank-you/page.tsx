
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import Logo from '@/components/Logo';

export default function ThankYouPage() {
  return (
    <div className="flex min-h-screen flex-col bg-secondary/50 items-center justify-center p-4">
        <div className="absolute top-8">
            <Logo />
        </div>
        <div className="text-center">
            <h1 className="font-headline text-3xl text-primary">Thank You</h1>
            <p className="mt-4 text-muted-foreground">This page is being rebuilt.</p>
            <Button asChild size="lg" className="mt-8">
              <Link href="/">
                  Go Home
              </Link>
            </Button>
        </div>
        <div className="absolute bottom-8 text-center text-sm text-muted-foreground">
             <p>&copy; 2024 Corporate Magnate Cooperative Society Ltd. All Rights Reserved.</p>
        </div>
    </div>
  );
}
