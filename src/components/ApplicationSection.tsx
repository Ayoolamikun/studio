import { cn } from "@/lib/utils";
import Link from "next/link";
import { Button } from "./ui/button";

const ApplicationSection = ({ className }: { className?: string }) => {
  return (
    <section id="application" className={cn("container", className)}>
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="font-headline text-3xl font-bold tracking-tighter sm:text-4xl text-primary">
          Ready to Get Started?
        </h2>
        <p className="mt-4 text-muted-foreground md:text-lg">
          Create an account or log in to apply for a loan, view your dashboard, and manage your finances with us.
        </p>
         <Button asChild size="lg" className="mt-8 rounded-full font-bold shadow-lg transition-transform hover:scale-105 bg-accent text-accent-foreground hover:bg-accent/90">
            <Link href="/login">Apply for a Loan</Link>
          </Button>
      </div>
    </section>
  );
};

export default ApplicationSection;
