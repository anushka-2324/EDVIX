import { cn } from "@/lib/utils";

export function Avatar({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "bg-primary/10 text-primary inline-flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold",
        className
      )}
    >
      {children}
    </div>
  );
}
