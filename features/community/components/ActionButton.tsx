import { twMerge } from "tailwind-merge";

interface ActionButtonProps {
  onClick: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary";
  children: React.ReactNode;
  className?: string;
}

export function ActionButton({
  onClick,
  disabled = false,
  variant = "secondary",
  children,
  className,
}: ActionButtonProps) {
  const baseClasses =
    variant === "primary"
      ? "bg-accent text-foreground hover:bg-primary-hover rounded-lg px-5 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
      : "px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground hover:underline disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={twMerge(baseClasses, className)}
    >
      {children}
    </button>
  );
}
