import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { LuX } from "react-icons/lu";
import { twMerge } from "tailwind-merge";
import { Modal } from "@/components/UI/Modal";
import { Spinner } from "@/components/common/Spinner";
import { PublicTag } from "@/components/common/PublicTag";
import { PlanWithTasksAndMilestones } from "@/api/plan/plan.types";
import { useInfinitePlans } from "@/api/plan/queries/useInfinitePlans";
import { useAuthStore } from "@/stores/useAuthStore";
import { isSuperAdmin } from "@/api/user/privileges";
import {
  handleScrollToLoadMore,
  loadMoreIfNoScroll,
} from "../utils/scrollHelpers";

interface PostComposerPlanPickerModalProps {
  open: boolean;
  onClose: () => void;
  onPickPlan: (plan: PlanWithTasksAndMilestones) => void;
}

export function PostComposerPlanPickerModal({
  open,
  onClose,
  onPickPlan,
}: PostComposerPlanPickerModalProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  const currentUser = useAuthStore((state) => state.user);
  const canSeeOthersPublicPlans = isSuperAdmin(currentUser?.role);

  const {
    data,
    isLoading,
    isError,
    error,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfinitePlans({ enabled: open });

  const pages = useMemo(() => data?.pages ?? [], [data?.pages]);
  const items = useMemo(
    () =>
      pages
        .flatMap((page) => page.items)
        .filter(Boolean)
        .filter(
          (plan) =>
            plan.userId === currentUser?.id ||
            (canSeeOthersPublicPlans && plan.isPublic),
        ),
    [pages, currentUser?.id, canSeeOthersPublicPlans],
  );

  const handleScroll = useCallback(() => {
    handleScrollToLoadMore({
      scrollContainerRef,
      hasNextPage: hasNextPage ?? false,
      isFetchingNextPage,
      isLoading,
      fetchNextPage,
      loadingRef,
    });
  }, [hasNextPage, isFetchingNextPage, isLoading, fetchNextPage]);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    scrollContainer.addEventListener("scroll", handleScroll);
    return () => scrollContainer.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  useEffect(() => {
    loadMoreIfNoScroll({
      scrollContainerRef,
      isLoading,
      hasNextPage: hasNextPage ?? false,
      isFetchingNextPage,
      loadingRef,
      fetchNextPage,
    });
  }, [items.length, hasNextPage, isFetchingNextPage, isLoading, fetchNextPage]);

  let fetchErrorDescription = "";
  if (isError) {
    if (error instanceof Error && error.message.trim()) {
      fetchErrorDescription = error.message;
    } else {
      fetchErrorDescription =
        "An error occurred while fetching plans. Please try again later.";
    }
  }

  let listBody: ReactNode;
  if (isLoading) {
    listBody = (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  } else if (isError) {
    listBody = (
      <p className="text-muted-foreground px-2 py-8 text-center text-sm text-red-500">
        {fetchErrorDescription}
      </p>
    );
  } else if (items.length === 0) {
    listBody = (
      <p className="text-muted-foreground px-2 py-8 text-center text-sm">
        No plans yet
      </p>
    );
  } else {
    listBody = (
      <ul className="flex flex-col gap-1">
        {items.map((plan) => (
          <li key={plan.id}>
            <button
              type="button"
              onClick={() => onPickPlan(plan)}
              className={twMerge(
                "flex w-full items-start justify-between gap-2 rounded-xl border border-transparent px-3 py-3 text-left transition-colors",
                "hover:border-border hover:bg-muted/50",
              )}
            >
              <span className="text-foreground min-w-0 flex-1 break-words text-sm font-medium">
                {plan.name}
              </span>
              {plan.isPublic ? (
                <span className="shrink-0 pt-0.5">
                  <PublicTag />
                </span>
              ) : null}
            </button>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <Modal open={open} setClose={onClose}>
      <div className="mx-auto flex max-h-[min(32rem,80vh)] w-full max-w-md flex-col rounded-2xl bg-card shadow-lg">
        <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-foreground text-lg font-semibold">
            Select a plan
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <LuX className="h-5 w-5" />
          </button>
        </div>

        <div
          ref={scrollContainerRef}
          className="scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent min-h-0 flex-1 overflow-y-auto px-4 py-3"
        >
          {listBody}

          {isFetchingNextPage && !isLoading ? (
            <div className="flex justify-center py-4">
              <Spinner />
            </div>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}
