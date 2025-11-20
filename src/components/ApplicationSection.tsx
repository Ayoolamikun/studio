
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

const ApplicationSection = ({ className }: { className?: string }) => {
  return (
    <section id="application" className={cn("container", className)}>
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="font-headline text-3xl font-bold tracking-tighter sm:text-4xl text-primary">
          Ready to Get Started?
        </h2>
        <p className="mt-4 text-muted-foreground md:text-lg">
          Our streamlined application process takes only minutes. Click the button below to go to our secure application page.
        </p>
         <div className="mt-8">
            <Button asChild size="lg" className="rounded-full font-bold shadow-lg transition-transform hover:scale-105 bg-accent text-accent-foreground hover:bg-accent/90">
                <Link href="/apply">
                    Apply in Minutes
                    <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
            </Button>
        </div>
      </div>
    </section>
  );
};

export default ApplicationSection;
