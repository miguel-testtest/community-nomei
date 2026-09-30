import { ComponentProps, forwardRef } from "react";
import { twMerge } from "tailwind-merge";

export type InputProps = {
  error?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
} & ComponentProps<"input">;

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      error = false,
      disabled = false,
      fullWidth = false,
      className,
      maxLength,
      ...props
    },
    ref,
  ) => {
    return (
      <input
        ref={ref}
        maxLength={maxLength}
        className={twMerge(
          "h-3.375rem border-foreground/22 text-foreground placeholder:text-muted-foreground focus:border-klein-500 rounded-2xl border-1 bg-card px-4 py-3 focus:ring-0 focus:outline-none",
          error && "border-red-500",
          disabled && "bg-muted hover:cursor-not-allowed",
          fullWidth && "w-full",
          className,
        )}
        disabled={disabled}
        {...props}
      />
    );
  },
);
