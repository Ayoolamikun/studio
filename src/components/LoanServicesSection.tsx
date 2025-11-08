import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ArrowRight } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';

const loanServices = [
  {
    title: 'Personal Loan',
    description: 'For individuals with valid collateral, providing financial flexibility for personal projects and needs.',
    imageId: 'loan-personal'
  },
  {
    title: 'Civil Servant Loan',
    description: 'Tailored for government employees, requiring a payslip or employment verification for quick access to funds.',
    imageId: 'loan-civil'
  },
  {
    title: 'SME Loan',
    description: 'Fuel your business growth with our SME loans, designed for registered businesses with verified documents.',
    imageId: 'loan-sme'
  },
];

const LoanServicesSection = ({ className }: { className?: string }) => {
  return (
    <section id="loans" className={cn("container", className)}>
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="font-headline text-3xl font-bold tracking-tighter sm:text-4xl text-primary">
          Flexible Loans for Every Need
        </h2>
        <p className="mt-4 text-muted-foreground md:text-lg">
          Whether you're an individual, a civil servant, or a business owner, we have a loan solution for you.
        </p>
      </div>

      <div className="mt-12 grid gap-8 md:grid-cols-3">
        {loanServices.map((service, index) => {
            const image = PlaceHolderImages.find(p => p.id === service.imageId);
            return (
              <Card key={index} className="flex flex-col overflow-hidden shadow-lg transition-transform hover:scale-105 hover:shadow-2xl">
                {image && (
                  <div className="relative h-48 w-full">
                    <Image
                      src={image.imageUrl}
                      alt={service.title}
                      fill
                      className="object-cover"
                      data-ai-hint={image.imageHint}
                    />
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="font-headline text-2xl text-primary">{service.title}</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow">
                    <CardDescription>{service.description}</CardDescription>
                </CardContent>
                <CardFooter>
                  <Button asChild className="w-full font-bold bg-accent text-accent-foreground hover:bg-accent/90">
                    <Link href="#application">
                      Apply Now <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            )
        })}
      </div>
    </section>
  );
};

export default LoanServicesSection;
