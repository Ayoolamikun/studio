import Link from "next/link";
import { Banknote } from "lucide-react";
import { cn } from "@/lib/utils";

const Logo = ({ className }: { className?: string }) => {
  return (
    <Link
      href="/"
      className={cn(
        "flex items-center gap-2 text-xl font-bold text-primary",
        className
      )}
    >
      <Banknote className="h-6 w-6 text-accent" />
      <span className="font-headline">Corporate Magnate</span>
    </Link>
  );
};

export default Logo;
