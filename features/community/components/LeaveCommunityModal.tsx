import { Modal } from "@/components/UI/Modal";
import { Button } from "@/components/common/Button";
import { useLeaveCommunity } from "@/api/community/mutations/useLeaveCommunity";
import { toast } from "react-hot-toast";

interface LeaveCommunityModalProps {
  isOpen: boolean;
  onClose: () => void;
  communityId: string;
  onSuccess?: () => void;
}

export function LeaveCommunityModal({
  isOpen,
  onClose,
  communityId,
  onSuccess,
}: LeaveCommunityModalProps) {
  const { mutate: leaveCommunity, isPending: isLeavingCommunity } =
    useLeaveCommunity();

  const handleClose = () => {
    if (isLeavingCommunity) return;
    onClose();
  };

  const handleLeave = () => {
    leaveCommunity(
      { communityId },
      {
        onSuccess: () => {
          toast.success("You have left the community");
          onClose();
          onSuccess?.();
        },
        onError: () => {
          toast.error("Failed to leave community. Please try again.");
          onClose();
        },
      },
    );
  };

  return (
    <Modal open={isOpen} setClose={handleClose}>
      <div className="mx-auto max-w-md rounded-2xl bg-card p-6 text-center shadow-lg">
        <h2 className="text-foreground mb-4 text-xl font-semibold">
          Leave Community
        </h2>
        <p className="text-muted-foreground mb-6 text-sm">
          Are you sure you want to leave this community? You will no longer have
          access to its content.
        </p>
        <div className="flex gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            className="flex-1"
            disabled={isLeavingCommunity}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleLeave}
            className="flex-1"
            disabled={isLeavingCommunity}
          >
            {isLeavingCommunity ? "Leaving..." : "Leave"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
