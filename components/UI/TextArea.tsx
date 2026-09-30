import { ComponentProps, forwardRef, useLayoutEffect, useRef } from "react";
import { twMerge } from "tailwind-merge";

export type TextareaProps = {
  error?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
} & ComponentProps<"textarea">;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      error = false,
      disabled = false,
      fullWidth = false,
      className,
      value,
      ...props
    },
    ref,
  ) => {
    const internalRef = useRef<HTMLTextAreaElement>(null);

    useLayoutEffect(() => {
      const textarea = internalRef.current;
      if (textarea) {
        textarea.style.height = "inherit";
        textarea.style.height = `${textarea.scrollHeight}px`;
      }
    }, [value]);

    return (
      <textarea
        ref={(node) => {
          (
            internalRef as React.MutableRefObject<HTMLTextAreaElement | null>
          ).current = node;
          if (typeof ref === "function") {
            ref(node);
          } else if (ref) {
            ref.current = node;
          }
        }}
        value={value}
        className={twMerge(
          "border-foreground/22 text-foreground placeholder:text-muted-foreground focus:border-klein-500 max-h-[4.5rem] min-h-[3.25rem] resize-none overflow-y-auto rounded-2xl border-1 bg-card px-4 py-3 [-ms-overflow-style:none] [scrollbar-width:none] focus:ring-0 focus:outline-none [&::-webkit-scrollbar]:hidden",
          error && "border-red-500",
          disabled && "bg-muted hover:cursor-not-allowed",
          fullWidth && "w-full",
          className,
        )}
        disabled={disabled}
        rows={1}
        {...props}
      />
    );
  },
);
