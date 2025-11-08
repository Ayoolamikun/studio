import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { cn } from '@/lib/utils';

const testimonials = [
  {
    quote: "Corporate Magnate helped me grow my savings while funding my business goals. Their transparency is top-notch!",
    name: "Tunde A.",
    role: "Civil Servant, Bayelsa",
    avatarId: "testimonial-1",
  },
  {
    quote: "Trustworthy and reliable! I highly recommend their investment plans. I've seen consistent returns.",
    name: "Ngozi O.",
    role: "SME Owner",
    avatarId: "testimonial-2",
  },
];

const TestimonialsSection = ({ className }: { className?: string }) => {
  return (
    <section id="testimonials" className={cn("bg-secondary/50 py-20", className)}>
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-headline text-3xl font-bold tracking-tighter sm:text-4xl text-primary">
            What Our Members Are Saying
          </h2>
          <p className="mt-4 text-muted-foreground md:text-lg">
            Real stories from people we've empowered.
          </p>
        </div>

        <div className="mt-12 grid gap-8 md:grid-cols-1 lg:grid-cols-2">
          {testimonials.map((testimonial, index) => {
            const avatarImage = PlaceHolderImages.find(p => p.id === testimonial.avatarId);
            return (
              <Card key={index} className="shadow-lg">
                <CardContent className="p-6 text-center">
                  <blockquote className="text-lg italic text-foreground/80">
                    "{testimonial.quote}"
                  </blockquote>
                  <div className="mt-6 flex flex-col items-center justify-center gap-4">
                    {avatarImage && (
                      <Image
                        src={avatarImage.imageUrl}
                        alt={`Avatar of ${testimonial.name}`}
                        width={64}
                        height={64}
                        className="rounded-full"
                        data-ai-hint={avatarImage.imageHint}
                      />
                    )}
                    <div>
                      <p className="font-bold text-primary">{testimonial.name}</p>
                      <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
