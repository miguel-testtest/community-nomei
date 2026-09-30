import { ReactNode } from "react";
import { twMerge } from "tailwind-merge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/UI/Tooltip";
import { SafetyRiskBadge } from "@/components/common/SafetyRiskBadge";
import { HiOutlineExclamationTriangle } from "react-icons/hi2";

export const FLAGGED_CONTENT_TOOLTIP_TEXT = "This content was flagged as unsafe by our safety system";
const MODERATOR_TOOLTIP_TEXT = "Flagged unsafe content";

interface FlaggedContentContainerProps {
  isFlagged: boolean;
  canViewFlaggedContent: boolean;
  children: ReactNode;
  className?: string;
  obfuscationLevel?: "light" | "default" | "strong";
  moderatorTooltipText?: string | undefined;
  showViewerTooltip?: boolean;
  showModeratorFrame?: boolean;
  showModeratorBadge?: boolean;
}

export function FlaggedContentContainer({
  isFlagged,
  canViewFlaggedContent,
  children,
  className,
  obfuscationLevel = "default",
  moderatorTooltipText,
  showViewerTooltip = true,
  showModeratorFrame = true,
  showModeratorBadge = true,
}: FlaggedContentContainerProps) {
  if (!isFlagged) {
    return <>{children}</>;
  }

  if (canViewFlaggedContent) {
    return (
      <div className={twMerge("relative rounded-lg", className)}>
        {children}
        {showModeratorFrame && (
          <div className="pointer-events-none absolute inset-0 rounded-[inherit] border border-red-500/60 bg-red-50/25" />
        )}
        {showModeratorBadge && (
          <div className="absolute top-2 right-2 z-10">
            <SafetyRiskBadge
              tooltipText={moderatorTooltipText || MODERATOR_TOOLTIP_TEXT}
            />
          </div>
        )}
      </div>
    );
  }

  const isStrongObfuscation = obfuscationLevel === "strong";
  const isLightObfuscation = obfuscationLevel === "light";

  return (
    <div className={twMerge("relative overflow-hidden rounded-lg", className)}>
      <div
        className={twMerge(
          "pointer-events-none select-none",
          isStrongObfuscation
            ? "blur-[3px] saturate-0 contrast-95 brightness-95"
            : isLightObfuscation
              ? "blur-[2px] saturate-92 contrast-96 brightness-98"
              : "blur-md saturate-50",
        )}
      >
        {children}
      </div>
      {isStrongObfuscation && (
        <div className="pointer-events-none absolute inset-0 z-[11] flex items-center justify-center rounded-[inherit]">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-100/95 px-3 py-1 text-xs font-semibold text-amber-900 shadow-sm">
            <HiOutlineExclamationTriangle className="h-3.5 w-3.5" />
            Flagged unsafe content
          </span>
        </div>
      )}
      {showViewerTooltip ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={twMerge(
                "absolute inset-0 z-10 cursor-not-allowed rounded-[inherit]",
                isStrongObfuscation
                  ? "bg-card/12"
                  : isLightObfuscation
                    ? "bg-card/8"
                    : "bg-card/10",
              )}
            />
          </TooltipTrigger>
          <TooltipContent side="top">{FLAGGED_CONTENT_TOOLTIP_TEXT}</TooltipContent>
        </Tooltip>
      ) : (
        <div
          className={twMerge(
            "absolute inset-0 z-10 cursor-not-allowed rounded-[inherit]",
            isStrongObfuscation
              ? "bg-card/12"
              : isLightObfuscation
                ? "bg-card/8"
              : "bg-card/10",
          )}
        />
      )}
    </div>
  );
}
