import { HiOutlineExclamationTriangle } from "react-icons/hi2";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/UI/Tooltip";
import { twMerge } from "tailwind-merge";

const DEFAULT_TOOLTIP_TEXT = "This content has been flagged as problematic";

type SafetyRiskBadgeProps = {
  className?: string;
  tooltipText?: string;
};

export function SafetyRiskBadge({
  className,
  tooltipText = DEFAULT_TOOLTIP_TEXT,
}: SafetyRiskBadgeProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={twMerge(
            "inline-flex flex-shrink-0 cursor-default text-red-500",
            className,
          )}
          aria-label={tooltipText}
        >
          <HiOutlineExclamationTriangle size={18} />
        </span>
      </TooltipTrigger>
      <TooltipContent side="top">{tooltipText}</TooltipContent>
    </Tooltip>
  );
}
