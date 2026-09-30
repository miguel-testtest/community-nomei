import { Link } from "react-router";
import { LuListTree, LuX } from "react-icons/lu";
import { twMerge } from "tailwind-merge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/UI/Tooltip";

const PLAN_ATTACHMENT_PRIVACY_TOOLTIP =
  "Only the plan template will be shared. Tasks and personal information are not included.";

export interface PostPlanAttachmentCardProps {
  title: string;
  to: string;
  subtitle: string;
  onRemove?: () => void;
}

export function PostPlanAttachmentCard({
  title,
  to,
  subtitle,
  onRemove,
}: PostPlanAttachmentCardProps) {
  const inner = (
    <>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-card text-muted-foreground shadow-sm ring-1 ring-gray-100">
        <LuListTree className="h-4 w-4" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </>
  );

  const shellClassName = twMerge(
    "relative mb-3 flex w-full items-center gap-3 rounded-xl border border-border bg-muted/50 px-3 py-2.5 md:w-fit md:max-w-sm",
    onRemove !== undefined && "pr-12",
    onRemove === undefined &&
      "transition-colors hover:border-border hover:bg-muted",
  );

  if (onRemove !== undefined) {
    return (
      <div className={shellClassName}>
        <Tooltip delayDuration={200}>
          <TooltipTrigger asChild>
            <Link
              to={to}
              className="flex min-w-0 flex-1 items-center gap-3 rounded-lg outline-none"
            >
              {inner}
            </Link>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[240px] text-left">
            {PLAN_ATTACHMENT_PRIVACY_TOOLTIP}
          </TooltipContent>
        </Tooltip>
        <button
          type="button"
          onClick={onRemove}
          className="absolute top-2 right-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
          aria-label="Remove attached plan"
        >
          <LuX className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <Link to={to} className={shellClassName}>
      {inner}
    </Link>
  );
}
