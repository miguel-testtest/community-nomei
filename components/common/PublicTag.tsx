import { twMerge } from "tailwind-merge";

type PublicTagProps = {
  className?: string;
};

export function PublicTag({ className }: PublicTagProps) {
  return (
    <span
      className={twMerge(
        "bg-accent text-accent-foreground rounded-full px-2 py-0.5 text-2xs font-medium leading-none",
        className,
      )}
    >
      Public
    </span>
  );
}
