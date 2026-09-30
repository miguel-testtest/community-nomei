import { useState } from "react";
import { LuCheck, LuX, LuArrowLeft } from "react-icons/lu";
import { isAxiosError } from "axios";
import { useCommunityMemberRequests } from "@/api/community/queries/useCommunityMemberRequests";
import { useCommunityMemberAppeals } from "@/api/community/queries/useCommunityMemberAppeals";
import { MemberRequestStatus } from "@/api/community/enums/member-request-status.enum";
import { useApproveMemberRequest } from "@/api/community/mutations/useApproveMemberRequest";
import { useRejectMemberRequest } from "@/api/community/mutations/useRejectMemberRequest";
import { formatUserName, getUserInitials } from "../utils/userHelpers";
import { Button } from "@/components/common/Button";
import { twMerge } from "tailwind-merge";
import { toast } from "react-hot-toast";
import { RejectMemberModal } from "./RejectMemberModal";
import { AppealsList } from "./AppealsList";

type MemberRequestsListProps = {
  communityId: string;
  onClose: () => void;
};

type RejectModalState = {
  open: boolean;
  userId: string | null;
  memberName: string | null;
};

type MemberRequestsSectionHeaderProps = {
  variant: "standalone" | "compact";
};

function MemberRequestsSectionHeader({
  variant,
}: MemberRequestsSectionHeaderProps) {
  const title = "Member Requests";
  const description = "Review and manage pending member requests.";

  if (variant === "standalone") {
    return (
      <>
        <h2 className="text-foreground mb-2 text-2xl font-semibold">{title}</h2>
        <p className="text-muted-foreground text-sm">{description}</p>
      </>
    );
  }

  return (
    <div className="flex-shrink-0">
      <h2 className="text-foreground mb-1 text-lg font-semibold">{title}</h2>
      <p className="text-muted-foreground text-xs">{description}</p>
    </div>
  );
}

export function MemberRequestsList({
  communityId,
  onClose,
}: MemberRequestsListProps) {
  const { data: requests, isLoading, isError } = useCommunityMemberRequests({
    communityId,
  });

  const { data: appeals, isLoading: isLoadingAppeals } =
    useCommunityMemberAppeals({
      communityId,
    });

  const { mutate: approveRequest, isPending: isApproving } =
    useApproveMemberRequest();
  const { mutate: rejectRequest, isPending: isRejecting } =
    useRejectMemberRequest();

  const [rejectModal, setRejectModal] = useState<RejectModalState>({
    open: false,
    userId: null,
    memberName: null,
  });

  const pendingRequests = requests?.filter(
    (request) => request.status === MemberRequestStatus.PENDING,
  ) ?? [];

  const hasPendingAppeals = appeals && appeals.length > 0;

  const handleApproveRequest = (userId: string) => {
    approveRequest(
      { communityId, userId },
      {
        onSuccess: () => {
          toast.success("Member request approved successfully");
        },
        onError: (error: unknown) => {
          if (isAxiosError(error)) {
            const message = error.response?.data?.message;
            toast.error(
              typeof message === "string"
                ? message
                : "Failed to approve request. Please try again.",
            );
          } else {
            toast.error("Failed to approve request. Please try again.");
          }
        },
      },
    );
  };

  const handleOpenRejectModal = (userId: string, memberName: string) => {
    setRejectModal({
      open: true,
      userId,
      memberName,
    });
  };

  const handleCloseRejectModal = () => {
    setRejectModal({
      open: false,
      userId: null,
      memberName: null,
    });
  };

  const handleConfirmReject = (reason?: string) => {
    if (!rejectModal.userId) return;

    rejectRequest(
      { communityId, userId: rejectModal.userId, reason: reason ?? "" },
      {
        onSuccess: () => {
          const message = reason
            ? `Request rejected. Reason: ${reason}`
            : "Request rejected";
          toast.success(message);
          handleCloseRejectModal();
        },
        onError: (error: unknown) => {
          if (isAxiosError(error)) {
            const status = error.response?.status;
            const message = error.response?.data?.message;

            if (status === 401 || status === 403) {
              toast.error("You don't have permission to reject requests.");
            } else if (status === 404) {
              toast.error("Request not found.");
            } else {
              toast.error(
                typeof message === "string"
                  ? message
                  : "Failed to reject request. Please try again.",
              );
            }
          } else {
            toast.error("Failed to reject request. Please try again.");
          }
          handleCloseRejectModal();
        },
      },
    );
  };

  if (isLoading || isLoadingAppeals) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground text-sm">Loading requests...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-red-500">Failed to load requests</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-2 xl:gap-4">
      <div className="flex-shrink-0">
        <div className="mb-4 flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Go back to members"
          >
            <LuArrowLeft size={20} />
            <span className="text-sm font-medium">Back</span>
          </button>
        </div>
        {!hasPendingAppeals && (
          <MemberRequestsSectionHeader variant="standalone" />
        )}
      </div>

      <div
        className={twMerge(
          "flex min-h-0 flex-1 gap-4 overflow-hidden",
          hasPendingAppeals && "flex-col member-requests-layout-row",
        )}
      >
        <div
          className={twMerge(
            "flex min-h-0 flex-col",
            hasPendingAppeals
              ? "h-1/2 w-full gap-2 member-requests-layout-col"
              : "flex-1",
          )}
        >
          {hasPendingAppeals && (
            <MemberRequestsSectionHeader variant="compact" />
          )}
          <div
            className={twMerge(
              "flex min-h-0 flex-col rounded-lg border border-border bg-card",
              hasPendingAppeals ? "flex-1" : "",
            )}
          >
          <div className="flex-shrink-0 border-b border-border bg-muted/50 px-2 py-3 sm:px-4">
            <div className="grid min-w-[400px] grid-cols-12 items-center gap-2 sm:gap-4">
              <div className="col-span-4">
                <span className="text-foreground text-xs font-semibold tracking-wide uppercase">
                  Name
                </span>
              </div>
              <div className="col-span-3 hidden sm:block">
                <span className="text-foreground text-xs font-semibold tracking-wide uppercase">
                  Email
                </span>
              </div>
              <div className="col-span-3">
                <span className="text-foreground text-xs font-semibold tracking-wide uppercase">
                  Status
                </span>
              </div>
              <div className="col-span-2" />
            </div>
          </div>

          <div className="flex min-h-0 flex-1 overflow-x-auto">
            {pendingRequests.length === 0 ? (
              <div className="flex w-full items-center justify-center py-12">
                <p className="text-muted-foreground text-sm">No pending requests</p>
              </div>
            ) : (
              <div className="flex-1">
                <div className="scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent flex-1">
                  {pendingRequests.map((request, index) => {
                    const fullName = formatUserName(
                      request.user.firstName,
                      request.user.lastName,
                    );
                    const initials = getUserInitials(
                      request.user.firstName,
                      request.user.lastName,
                    );
                    const email = request.user.email;

                    return (
                      <div
                        key={request.id}
                        className={twMerge(
                          "hover:bg-surface border-b border-border px-2 py-4 transition-colors sm:px-4",
                          index === pendingRequests.length - 1 && "border-b-0",
                        )}
                      >
                        <div className="grid grid-cols-12 items-center gap-2 sm:gap-4">
                          <div className="col-span-4 flex items-center gap-2 sm:gap-3">
                            {request.user.profilePicture ? (
                              <img
                                src={request.user.profilePicture}
                                alt={fullName}
                                className="h-8 w-8 flex-shrink-0 rounded-full object-cover sm:h-10 sm:w-10"
                              />
                            ) : (
                              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-400 to-pink-400 text-xs font-bold text-white sm:h-10 sm:w-10 sm:text-sm">
                                {initials}
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="text-foreground truncate text-sm font-medium sm:text-base">
                                {fullName}
                              </p>
                            </div>
                          </div>
                          <div className="col-span-3 hidden sm:block">
                            <p className="text-muted-foreground truncate text-xs sm:text-sm">
                              {email}
                            </p>
                          </div>
                          <div className="col-span-3">
                            <span className="inline-block rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-700 sm:px-3">
                              {request.status}
                            </span>
                          </div>
                          <div className="col-span-2 flex items-center justify-end gap-2">
                            <Button
                              type="button"
                              variant="primary"
                              onClick={() => handleApproveRequest(request.userId)}
                              disabled={isApproving || isRejecting}
                              className="flex h-8 items-center gap-1 px-3 text-xs"
                            >
                              <LuCheck className="h-5 w-5" />
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() =>
                                handleOpenRejectModal(request.userId, fullName)
                              }
                              disabled={isApproving || isRejecting}
                              className="flex h-8 w-8 items-center justify-center p-0"
                            >
                              <LuX className="h-5 w-5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          </div>
        </div>

        {hasPendingAppeals && (
          <div className="mb-2 h-1/2 w-full member-requests-layout-col-full">
            <AppealsList communityId={communityId} />
          </div>
        )}
      </div>

      <RejectMemberModal
        open={rejectModal.open}
        onClose={handleCloseRejectModal}
        onConfirm={handleConfirmReject}
        memberName={rejectModal.memberName || "this user"}
        isLoading={isRejecting}
      />
    </div>
  );
}
