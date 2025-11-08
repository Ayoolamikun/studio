import { cn } from "@/lib/utils";
import ApplicationForm from "./ApplicationForm";

const ApplicationSection = ({ className }: { className?: string }) => {
  return (
    <section id="application" className={cn("container", className)}>
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="font-headline text-3xl font-bold tracking-tighter sm:text-4xl text-primary">
          Start Your Journey With Us
        </h2>
        <p className="mt-4 text-muted-foreground md:text-lg">
          Fill out the form below to apply for a loan, start an investment, or become a member.
        </p>
      </div>
      <div className="mx-auto mt-12 max-w-3xl">
        <ApplicationForm />
      </div>
    </section>
  );
};

export default ApplicationSection;
