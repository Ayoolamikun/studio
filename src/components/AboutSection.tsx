import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { cn } from '@/lib/utils';

const AboutSection = ({ className }: { className?: string }) => {
  const aboutImage = PlaceHolderImages.find(p => p.id === 'about-teamwork');

  return (
    <section id="about" className={cn("container", className)}>
      <div className="grid md:grid-cols-2 gap-12 items-center">
        <div className="space-y-4">
          <h2 className="font-headline text-3xl font-bold tracking-tighter sm:text-4xl text-primary">Who We Are</h2>
          <p className="text-muted-foreground md:text-lg">
            Corporate Magnate is a cooperative society empowering Nigerians through ethical financial solutions. We believe in transparency, accountability, and sustainable wealth creation for our members and community.
          </p>
          <Button variant="link" className="px-0 text-lg text-accent-foreground font-bold">
            Learn More &rarr;
          </Button>
        </div>
        <div className="flex justify-center">
          {aboutImage && (
            <Image
              src={aboutImage.imageUrl}
              alt={aboutImage.description}
              width={600}
              height={400}
              className="rounded-xl shadow-2xl object-cover"
              data-ai-hint={aboutImage.imageHint}
            />
          )}
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
