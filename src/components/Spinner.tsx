import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface SpinnerProps {
  size?: "small" | "medium" | "large";
}

export function Spinner({ size = "medium" }: SpinnerProps) {
  return (
    <Loader2
      className={cn("animate-spin text-primary", {
        "h-6 w-6": size === "small",
        "h-8 w-8": size === "medium",
        "h-12 w-12": size === "large",
      })}
    />
  );
}
