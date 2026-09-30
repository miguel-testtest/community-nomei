import { LuListTree } from "react-icons/lu";
import { twMerge } from "tailwind-merge";
import { usePlan } from "@/api/plan/queries/usePlan";
import type { CommunityPostPlan } from "@/api/community/community.types";
import { ROUTES } from "@/routes/paths";
import { PostPlanAttachmentCard } from "./PostPlanAttachmentCard";

interface CommunityPostPlanAttachmentProps {
  plan: CommunityPostPlan;
}

const shellClassName =
  "mb-3 flex w-full items-center gap-3 rounded-xl border border-border bg-muted/50 px-3 py-2.5 md:w-fit md:max-w-sm";

export function CommunityPostPlanAttachment({
  plan,
}: CommunityPostPlanAttachmentProps) {
  const { data: fullPlan, isPending, isError } = usePlan(plan.id);

  if (isPending) {
    return (
      <div
        className={twMerge(shellClassName, "opacity-75")}
        aria-busy="true"
        aria-label="Loading plan link"
      >
        <div className="flex h-9 w-9 shrink-0 animate-pulse rounded-lg bg-muted" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="h-3.5 max-w-[12rem] animate-pulse rounded bg-muted" />
          <div className="h-3 max-w-[8rem] animate-pulse rounded bg-muted" />
        </div>
      </div>
    );
  }

  if (isError || fullPlan === undefined) {
    return (
      <div className={shellClassName}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-card text-muted-foreground shadow-sm ring-1 ring-gray-100">
          <LuListTree className="h-4 w-4" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{plan.name}</p>
          <p className="text-xs text-muted-foreground">Plan link unavailable</p>
        </div>
      </div>
    );
  }

  return (
    <PostPlanAttachmentCard
      title={plan.name}
      to={`${ROUTES.PLAN_TEMPLATE_PREVIEW}/${fullPlan.id}`}
      subtitle="Open plan"
    />
  );
}
