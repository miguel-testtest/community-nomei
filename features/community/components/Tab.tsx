import { ReactNode } from "react";
import { twMerge } from "tailwind-merge";

type TabProps = {
  isActive: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
  ariaLabel?: string;
  className?: string;
};

export function Tab({
  isActive,
  onClick,
  icon,
  label,
  ariaLabel,
  className,
}: TabProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={twMerge(
        "text-foreground flex flex-shrink-0 cursor-pointer flex-col items-center gap-1.5 px-3 py-2 transition sm:gap-2 sm:px-4 sm:py-3",
        isActive && "border-foreground text-foreground border-b-2",
        className,
      )}
      aria-label={ariaLabel || label}
    >
      <div className="flex h-10 flex-shrink-0 items-center justify-center sm:h-12">
        {icon}
      </div>
      <span className="whitespace-nowrap text-center text-xs leading-tight font-medium sm:text-sm">
        {label}
      </span>
    </button>
  );
}
