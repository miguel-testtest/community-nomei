import { useState } from "react";
import { IoMdClose } from "react-icons/io";
import { Modal } from "@/components/UI/Modal";
import { Button } from "@/components/common/Button";
import { DetailCard } from "./DetailCard";
import { AppealRequestModal } from "./AppealRequestModal";
import { SuccessModal } from "@/features/profile/components/SuccessModal";
import { useCommunityMember } from "@/api/community/queries/useCommunityMember";

interface RequestRejectedModalProps {
  open: boolean;
  onClose: () => void;
  communityId: string;
  userId: string;
}

function getSuccessDescription(appealMessage: string | undefined): string {
  if (appealMessage) {
    return `Your review request has been submitted successfully.\n\nYour message:\n${appealMessage}`;
  }
  return "Your review request has been submitted successfully.";
}

export function RequestRejectedModal({
  open,
  onClose,
  communityId,
  userId,
}: RequestRejectedModalProps) {
  const [showAppealModal, setShowAppealModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [appealMessage, setAppealMessage] = useState<string | undefined>();

  const { data: memberData } = useCommunityMember({
    communityId,
    userId,
    enabled: open && !!communityId && !!userId,
  });

  const hasAppealRequested = !!memberData?.appealRequestedAt;
  const existingAppealMessage = memberData?.appealMessage ?? null;
  const rejectedReason =
    memberData?.rejectedReason ?? memberData?.rejectionReason ?? null;

  const handleReview = () => {
    setShowAppealModal(true);
  };

  const handleAppealSuccess = (message?: string) => {
    setShowAppealModal(false);
    setAppealMessage(message);
    setShowSuccessModal(true);
  };

  const handleAppealClose = () => {
    setShowAppealModal(false);
  };

  const handleSuccessClose = () => {
    setShowSuccessModal(false);
    setAppealMessage(undefined);
    onClose();
  };

  if (!open) {
    return null;
  }

  const reviewAlreadyRequestedValue =
    existingAppealMessage !== null
      ? `Your Appeal Message:\n\n${existingAppealMessage}`
      : "A review request has been submitted.";

  return (
    <>
      <Modal open={open} setClose={onClose}>
        <div className="relative flex max-h-[calc(100dvh-2rem)] w-full max-w-[36.25rem] flex-col overflow-hidden rounded-md bg-card">
          <div className="flex flex-shrink-0 flex-col gap-3 p-6 pb-0">
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-primary absolute right-5 top-5 hover:cursor-pointer focus:outline-none"
              aria-label="Close dialog"
            >
              <IoMdClose className="h-6 w-6" />
            </button>
            <h2 className="text-foreground pr-8 text-xl font-semibold">
              Request Rejected
            </h2>
            <p className="text-foreground">
              Your request to join this community was not approved.
            </p>
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 py-4">
            <div className="flex flex-col gap-4">
              {rejectedReason !== null && (
                <DetailCard label="Reason" value={rejectedReason} />
              )}
              {hasAppealRequested && (
                <DetailCard
                  label="Review Already Requested"
                  value={reviewAlreadyRequestedValue}
                  variant="highlight"
                />
              )}
            </div>
          </div>

          <div className="flex flex-shrink-0 justify-end gap-2 border-t border-border bg-card p-4 sm:p-6">
            {!hasAppealRequested && (
              <Button
                variant="secondary"
                onClick={handleReview}
                className="py-2"
              >
                Request Review
              </Button>
            )}
            <Button variant="primary" onClick={onClose} className="py-2">
              Close
            </Button>
          </div>
        </div>
      </Modal>

      <AppealRequestModal
        open={showAppealModal}
        onClose={handleAppealClose}
        onSuccess={handleAppealSuccess}
        communityId={communityId}
        userId={userId}
        {...(rejectedReason !== null && { rejectionReason: rejectedReason })}
      />

      <SuccessModal
        open={showSuccessModal}
        onClose={handleSuccessClose}
        title="Review Request Submitted"
        description={getSuccessDescription(appealMessage)}
      />
    </>
  );
}
