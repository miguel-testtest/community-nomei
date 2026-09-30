import { Modal } from "@/components/UI/Modal";
import { Button } from "@/components/common/Button";
import { useLeaveChannel } from "@/api/community/mutations/useLeaveChannel";
import { toast } from "react-hot-toast";

interface LeaveChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
  communityId: string;
  channelId: string;
  channelName?: string;
  onSuccess?: () => void;
}

export function LeaveChannelModal({
  isOpen,
  onClose,
  communityId,
  channelId,
  channelName,
  onSuccess,
}: LeaveChannelModalProps) {
  const { mutate: leaveChannel, isPending: isLeavingChannel } =
    useLeaveChannel();

  const handleClose = () => {
    if (isLeavingChannel) return;
    onClose();
  };

  const handleLeave = () => {
    leaveChannel(
      { communityId, channelId },
      {
        onSuccess: () => {
          toast.success("You have left the channel");
          onClose();
          onSuccess?.();
        },
        onError: () => {
          toast.error("Failed to leave channel. Please try again.");
          onClose();
        },
      },
    );
  };

  return (
    <Modal open={isOpen} setClose={handleClose}>
      <div className="mx-auto max-w-md rounded-2xl bg-card p-6 text-center shadow-lg">
        <h2 className="text-foreground mb-4 text-xl font-semibold">
          Leave Channel
        </h2>
        <p className="text-muted-foreground mb-4 text-sm">
          Are you sure you want to leave #{channelName || "this channel"}?
        </p>
        <div className="mb-6 rounded-lg bg-muted/50 p-4 text-left">
          <p className="text-foreground/70 text-sm">
            <strong>What happens when you leave:</strong>
          </p>
          <ul className="text-muted-foreground text-sm space-y-1 mt-2 list-disc list-inside">
            <li>You will not be able to read messages in this channel</li>
            <li>You will not be able to send messages in this channel</li>
            <li>You can rejoin this channel anytime you want</li>
          </ul>
        </div>
        <div className="flex gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            className="flex-1"
            disabled={isLeavingChannel}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleLeave}
            className="flex-1"
            disabled={isLeavingChannel}
          >
            {isLeavingChannel ? "Leaving..." : "Leave Channel"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
