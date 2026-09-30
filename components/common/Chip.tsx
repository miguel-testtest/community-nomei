import { ComponentProps } from "react";
import { twMerge } from "tailwind-merge";

type ChipProps = ComponentProps<"button"> & {
  selected?: boolean;
};

export function Chip({ selected = false, className, children, ...props }: ChipProps) {
  return (
    <button
      type="button"
      className={twMerge(
        "cursor-pointer select-none whitespace-nowrap rounded-[1.25rem] border-[1.5px] px-3.5 py-1.5 text-xs font-semibold transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50",
        selected
          ? "border-primary bg-accent text-accent-foreground hover:enabled:bg-primary hover:enabled:text-white"
          : "border-border bg-card text-muted-foreground hover:enabled:border-primary/50 hover:enabled:bg-accent hover:enabled:text-accent-foreground",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
