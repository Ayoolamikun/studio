import { cn } from "@/lib/utils";
import ApplicationForm from "./ApplicationForm";

const ApplicationSection = ({ className }: { className?: string }) => {
  return (
    <section id="application" className={cn("container", className)}>
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="font-headline text-3xl font-bold tracking-tighter sm:text-4xl text-primary">
          Apply in Minutes
        </h2>
        <p className="mt-4 text-muted-foreground md:text-lg">
          Fill out the form below to get started on your loan application. Our team will review it and get back to you shortly.
        </p>
      </div>
      <div className="mt-12 mx-auto max-w-3xl">
        <ApplicationForm />
      </div>
    </section>
  );
};

export default ApplicationSection;
