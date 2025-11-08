import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Users } from 'lucide-react';

const MembershipSection = ({ className }: { className?: string }) => {
  return (
    <section id="membership" className={cn("container", className)}>
      <div className="mx-auto max-w-4xl rounded-xl bg-primary p-8 text-center text-primary-foreground shadow-2xl md:p-12">
        <Users className="mx-auto h-16 w-16 text-accent mb-4" />
        <h2 className="font-headline text-3xl font-bold tracking-tighter sm:text-4xl">
          Join Our Cooperative Family
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-primary-foreground/80">
          Become part of a trusted financial network with access to exclusive rates, valuable insights, and profit-sharing benefits that empower your financial journey.
        </p>
        <div className="mt-8">
          <Button asChild size="lg" className="rounded-full font-bold shadow-lg transition-transform hover:scale-105 bg-accent text-accent-foreground hover:bg-accent/90">
            <Link href="#application">Become a Member</Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default MembershipSection;
