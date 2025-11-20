import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PlaceHolderImages } from '@/lib/placeholder-images';

const HeroSection = () => {
  const heroImage = PlaceHolderImages.find(p => p.id === 'hero-background');

  return (
    <section className="relative h-[80vh] min-h-[500px] w-full flex items-center justify-center text-center text-white">
      {heroImage && (
        <Image
          src={heroImage.imageUrl}
          alt={heroImage.description}
          fill
          className="object-cover"
          priority
          data-ai-hint={heroImage.imageHint}
        />
      )}
      <div className="absolute inset-0 bg-primary/70 backdrop-brightness-75" />
      <div className="relative z-10 container mx-auto px-4">
        <h1 className="font-headline text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl text-shadow-lg">
          Empowering Nigerians Through Financial Freedom
        </h1>
        <p className="mx-auto mt-6 max-w-[700px] text-lg text-primary-foreground/90 md:text-xl">
          Access flexible loans and secure investment opportunities with total transparency and ease.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
          <Button asChild size="lg" className="rounded-full font-bold shadow-lg transition-transform hover:scale-105 bg-accent text-accent-foreground hover:bg-accent/90">
            <Link href="#application">Apply for Loan</Link>
          </Button>
          <Button asChild variant="secondary" size="lg" className="rounded-full font-bold shadow-lg transition-transform hover:scale-105">
            <Link href="#investments">Start Investing</Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
