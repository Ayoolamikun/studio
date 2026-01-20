
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Leaf, Gem, Crown } from 'lucide-react';

const investmentTiers = [
  {
    name: 'Gold',
    icon: Gem,
    range: '₦0 – ₦10M',
    returns: 'Up to 2.9% Annual Returns',
    color: 'text-yellow-500',
    featured: true,
  },
  {
    name: 'Platinum',
    icon: Crown,
    range: '₦10M+',
    returns: '2.89–3.5% Annual Returns',
    color: 'text-blue-400',
  },
];

const InvestmentPlansSection = ({ className }: { className?: string }) => {
  return (
    <section id="investments" className={cn("container", className)}>
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-headline text-3xl font-bold tracking-tighter sm:text-4xl text-primary">
            Grow Your Wealth with Confidence
          </h2>
          <p className="mt-4 text-muted-foreground md:text-lg">
            Our fixed-rate investment plans offer secure and transparent returns for every level of investor.
          </p>
        </div>

        <div className="mt-12 grid gap-8 md:grid-cols-2 md:items-start justify-center">
          {investmentTiers.map((tier) => (
            <Card
              key={tier.name}
              className={cn(
                'flex flex-col text-center shadow-lg transition-all max-w-sm mx-auto',
                tier.featured ? 'border-2 border-primary scale-105 shadow-2xl z-10' : 'hover:scale-105'
              )}
            >
              <CardHeader>
                <tier.icon className={cn('mx-auto h-12 w-12 mb-4', tier.color)} />
                <CardTitle className="font-headline text-3xl">{tier.name}</CardTitle>
                <CardDescription className="text-lg font-semibold">{tier.range}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-2xl font-bold text-primary">{tier.returns}</p>
              </CardContent>
              <CardFooter>
                <Button asChild className={cn('w-full font-bold', tier.featured ? 'bg-primary' : 'bg-accent text-accent-foreground hover:bg-accent/90')}>
                  <Link href="/invest/apply">Get Started</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
    </section>
  );
};

export default InvestmentPlansSection;
