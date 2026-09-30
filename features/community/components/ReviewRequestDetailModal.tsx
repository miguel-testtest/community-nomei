import { IoMdClose } from "react-icons/io";
import { isAxiosError } from "axios";
import { Modal } from "@/components/UI/Modal";
import { Button } from "@/components/common/Button";
import { useCommunityMember } from "@/api/community/queries/useCommunityMember";
import { useApproveMemberRequest } from "@/api/community/mutations/useApproveMemberRequest";
import { usePermanentRejectMemberRequest } from "@/api/community/mutations/usePermanentRejectMemberRequest";
import { toast } from "react-hot-toast";
import { formatDateTime } from "@/lib/utils";
import { DetailCard } from "./DetailCard";
import { formatUserName } from "../utils/userHelpers";

interface ReviewRequestDetailModalProps {
  open: boolean;
  onClose: () => void;
  communityId: string;
  userId: string;
}

export function ReviewRequestDetailModal({
  open,
  onClose,
  communityId,
  userId,
}: ReviewRequestDetailModalProps) {
  const { data: memberData, isLoading } = useCommunityMember({
    communityId,
    userId,
    enabled: open && !!communityId && !!userId,
  });

  const { mutate: approveRequest, isPending: isApproving } =
    useApproveMemberRequest();

  const { mutate: permanentRejectRequest, isPending: isRejecting } =
    usePermanentRejectMemberRequest();

  const handleApprove = () => {
    approveRequest(
      { communityId, userId },
      {
        onSuccess: () => {
          toast.success("Member request approved successfully");
          onClose();
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

  const handlePermanentReject = () => {
    permanentRejectRequest(
      { communityId, userId },
      {
        onSuccess: () => {
          toast.success("Member request permanently rejected");
          onClose();
        },
        onError: (error: unknown) => {
          if (isAxiosError(error)) {
            const message = error.response?.data?.message;
            toast.error(
              typeof message === "string"
                ? message
                : "Failed to reject request. Please try again.",
            );
          } else {
            toast.error("Failed to reject request. Please try again.");
          }
        },
      },
    );
  };

  if (!open) {
    return null;
  }

  const requestDate = memberData?.createdAt
    ? formatDateTime(memberData.createdAt)
    : "N/A";

  let rejectionDate = "N/A";
  if (memberData?.bannedAt) {
    rejectionDate = formatDateTime(memberData.bannedAt);
  } else if (memberData?.updatedAt) {
    rejectionDate = formatDateTime(memberData.updatedAt);
  }

  let rejectedBy = "N/A";
  if (memberData?.resolvedBy) {
    rejectedBy = formatUserName(
      memberData.resolvedBy.firstName,
      memberData.resolvedBy.lastName,
    );
  } else if (memberData?.bannedBy) {
    rejectedBy = formatUserName(
      memberData.bannedBy.firstName,
      memberData.bannedBy.lastName,
    );
  }

  const rejectionReason =
    memberData?.rejectedReason ||
    memberData?.rejectionReason ||
    memberData?.bannedReason ||
    "N/A";
  const appealMessage = memberData?.appealMessage ?? null;
  const hasAppealMessage = Boolean(appealMessage);

  return (
    <Modal open={open} setClose={onClose}>
      <div className="relative flex max-h-[calc(100dvh-2rem)] w-full max-w-[36.25rem] flex-col overflow-hidden rounded-md bg-card">
        <div className="flex flex-shrink-0 flex-col gap-3 p-6 pb-0">
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-primary absolute right-5 top-5 hover:cursor-pointer focus:outline-none disabled:opacity-60"
            aria-label="Close dialog"
            disabled={isApproving || isRejecting}
          >
            <IoMdClose className="h-6 w-6" />
          </button>
          <h2 className="text-foreground pr-8 text-xl font-semibold">
            Review Request Details
          </h2>
          <p className="text-foreground">
            Review the details of this membership request appeal.
          </p>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground text-sm">Loading details...</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <DetailCard label="Request Date" value={requestDate} />
              <DetailCard label="Rejection Date" value={rejectionDate} />
              <DetailCard label="Rejected By" value={rejectedBy} />
              <DetailCard label="Rejection Reason" value={rejectionReason} />
              {hasAppealMessage && (
                <DetailCard
                  label="Appeal Message"
                  value={appealMessage ?? ""}
                  variant="highlight"
                />
              )}
            </div>
          )}
        </div>

        <div className="flex flex-shrink-0 justify-end gap-2 border-t border-border bg-card p-4 sm:p-6">
          <Button
            variant="secondary"
            onClick={handlePermanentReject}
            disabled={isApproving || isRejecting}
            className="py-2"
          >
            {isRejecting ? "Rejecting..." : "Reject Permanently"}
          </Button>
          <Button
            variant="primary"
            onClick={handleApprove}
            disabled={isApproving || isRejecting}
            className="py-2"
          >
            {isApproving ? "Approving..." : "Approve Request"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
