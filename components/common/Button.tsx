import { ComponentProps } from "react";
import { twMerge } from "tailwind-merge";

type ButtonProps = ComponentProps<"button"> & {
  variant?: "primary" | "secondary" | "tertiary" | "outline" | "ghost" | "delete";
};

export function Button({
  className,
  children,
  variant = "primary",
  ...props
}: ButtonProps) {
  const variantStyles = {
    primary:
      "bg-accent text-accent-foreground hover:enabled:bg-primary hover:enabled:text-white",
    secondary: "bg-foreground text-background hover:enabled:opacity-85",
    tertiary:
      "border border-accent-foreground bg-transparent text-accent-foreground hover:enabled:bg-accent",
    outline:
      "border border-foreground bg-transparent text-foreground hover:enabled:bg-foreground hover:enabled:text-white",
    ghost:
      "border border-border bg-transparent text-muted-foreground hover:enabled:border-primary/40 hover:enabled:bg-primary/10 hover:enabled:text-primary",
    delete: "bg-destructive text-white hover:enabled:opacity-85",
  };

  return (
    <button
      type="button"
      className={twMerge(
        "cursor-pointer rounded-3xl px-5.5 py-2.5 text-compact font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-40",
        variantStyles[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
