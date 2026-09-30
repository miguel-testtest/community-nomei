import { cn } from "@/lib/utils";

export interface DetailCardProps {
  label: string;
  value: string;
  variant?: "default" | "highlight";
}

export function DetailCard({
  label,
  value,
  variant = "default",
}: DetailCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-lg p-4",
        variant === "highlight" ? "bg-blue-50" : "bg-muted/50",
      )}
    >
      <p className="text-foreground font-semibold">{label}</p>
      <p className="text-foreground whitespace-pre-wrap text-sm">{value}</p>
    </div>
  );
}
