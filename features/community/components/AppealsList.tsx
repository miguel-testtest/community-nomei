import { useState } from "react";
import { useCommunityMemberAppeals } from "@/api/community/queries/useCommunityMemberAppeals";
import { CommunityMemberWithAppeal } from "@/api/community/community.types";
import { formatUserName } from "../utils/userHelpers";
import { Avatar } from "@/components/common/Avatar";
import { Button } from "@/components/common/Button";
import { twMerge } from "tailwind-merge";
import { ReviewRequestDetailModal } from "./ReviewRequestDetailModal";

type AppealsListProps = {
  communityId: string;
};

type DetailModalState = {
  open: boolean;
  userId: string | null;
};

type AppealRowProps = {
  appeal: CommunityMemberWithAppeal;
  isLast: boolean;
  onViewDetail: (userId: string) => void;
};

function AppealRow({ appeal, isLast, onViewDetail }: AppealRowProps) {
  const fullName = formatUserName(
    appeal.user.firstName,
    appeal.user.lastName,
  );
  const formattedDate = new Date(appeal.appealRequestedAt).toLocaleDateString(
    "en-GB",
    { month: "short", day: "numeric", year: "numeric" },
  );

  return (
    <div
      className={twMerge(
        "hover:bg-surface border-b border-border px-2 py-4 transition-colors sm:px-4",
        isLast && "border-b-0",
      )}
    >
      <div className="grid grid-cols-12 items-center gap-2 sm:gap-4">
        <div className="col-span-5 flex items-center gap-2 sm:gap-3">
          <Avatar
            firstName={appeal.user.firstName}
            lastName={appeal.user.lastName}
            profilePicture={appeal.user.profilePicture}
            userId={appeal.userId}
            size="sm"
            alt={fullName}
            className="sm:h-10 sm:w-10 sm:text-sm"
          />
          <div className="min-w-0 flex-1">
            <p className="text-foreground truncate text-sm font-medium sm:text-base">
              {fullName}
            </p>
          </div>
        </div>
        <div className="col-span-4 hidden sm:block">
          <p className="text-muted-foreground truncate text-xs sm:text-sm">
            {formattedDate}
          </p>
        </div>
        <div className="col-span-3 flex items-center justify-end">
          <Button
            type="button"
            variant="secondary"
            onClick={() => onViewDetail(appeal.userId)}
            className="flex h-7 items-center gap-1 px-2 text-xs sm:px-3"
          >
            View Detail
          </Button>
        </div>
      </div>
    </div>
  );
}

export function AppealsList({ communityId }: AppealsListProps) {
  const { data: appeals, isLoading, isError } = useCommunityMemberAppeals({
    communityId,
  });

  const [detailModal, setDetailModal] = useState<DetailModalState>({
    open: false,
    userId: null,
  });

  const handleViewDetail = (userId: string) => {
    setDetailModal({
      open: true,
      userId,
    });
  };

  const handleCloseDetailModal = () => {
    setDetailModal({
      open: false,
      userId: null,
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground text-sm">Loading appeals...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-red-500">Failed to load appeals</p>
      </div>
    );
  }

  if (!appeals || appeals.length === 0) {
    return null;
  }

  return (
    <div className="flex h-full flex-col gap-2 overflow-hidden">
      <div className="flex-shrink-0">
        <h3 className="text-foreground mb-1 text-lg font-semibold">
          Review Requests
        </h3>
        <p className="text-muted-foreground text-xs">
          Review requests from rejected member applications.
        </p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col rounded-lg border border-border bg-card">
        <div className="flex-shrink-0 border-b border-border bg-muted/50 px-2 py-3 sm:px-4">
          <div className="grid min-w-[200px] grid-cols-12 items-center gap-2 sm:gap-4">
            <div className="col-span-5">
              <span className="text-foreground text-xs font-semibold tracking-wide uppercase">
                Name
              </span>
            </div>
            <div className="col-span-4 hidden sm:block">
              <span className="text-foreground text-xs font-semibold tracking-wide uppercase">
                Requested
              </span>
            </div>
            <div className="col-span-3" />
          </div>
        </div>

        <div className="flex min-h-0 flex-1 overflow-x-auto">
          <div className="flex-1">
            <div className="scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent flex-1">
              {appeals.map((appeal, index) => (
                <AppealRow
                  key={appeal.id}
                  appeal={appeal}
                  isLast={index === appeals.length - 1}
                  onViewDetail={handleViewDetail}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {detailModal.userId && (
        <ReviewRequestDetailModal
          open={detailModal.open}
          onClose={handleCloseDetailModal}
          communityId={communityId}
          userId={detailModal.userId}
        />
      )}
    </div>
  );
}
