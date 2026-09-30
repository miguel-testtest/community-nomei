import { Modal } from "@/components/UI/Modal";
import { Button } from "@/components/common/Button";
import { useLeaveConversation } from "@/api/community/mutations/useLeaveConversation";
import { toast } from "react-hot-toast";
import { HiExclamationTriangle } from "react-icons/hi2";

interface LeaveConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  communityId: string;
  conversationId: string;
  conversationName?: string;
  onSuccess?: () => void;
}

export function LeaveConversationModal({
  isOpen,
  onClose,
  communityId,
  conversationId,
  conversationName,
  onSuccess,
}: LeaveConversationModalProps) {
  const { mutate: leaveConversation, isPending: isLeavingConversation } =
    useLeaveConversation();

  const handleClose = () => {
    if (isLeavingConversation) return;
    onClose();
  };

  const handleLeave = () => {
    leaveConversation(
      { communityId, conversationId },
      {
        onSuccess: () => {
          toast.success("You have left the conversation");
          onClose();
          onSuccess?.();
        },
        onError: () => {
          toast.error("Failed to leave conversation. Please try again.");
          onClose();
        },
      },
    );
  };

  return (
    <Modal open={isOpen} setClose={handleClose}>
      <div className="mx-auto max-w-md rounded-2xl bg-card p-6 text-center shadow-lg">
        <div className="mb-4 flex items-center justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <HiExclamationTriangle className="h-6 w-6 text-red-600" />
          </div>
        </div>
        <h2 className="text-foreground mb-4 text-xl font-semibold">
          Leave Group Conversation
        </h2>
        <p className="text-muted-foreground mb-4 text-sm">
          Are you sure you want to leave {conversationName ? `"${conversationName}"` : "this group conversation"}?
        </p>
        <div className="mb-6 rounded-lg bg-red-50 p-4 text-left">
          <p className="text-red-800 text-sm font-medium mb-2">
            Warning:
          </p>
          <ul className="text-red-700 text-sm space-y-1 list-disc list-inside">
            <li>You will not be able to rejoin this conversation</li>
            <li>You will lose access to the conversation history</li>
            <li>You will no longer receive messages from this group</li>
          </ul>
        </div>
        <div className="flex gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            className="flex-1"
            disabled={isLeavingConversation}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleLeave}
            className="flex-1 bg-red-600 !text-white hover:bg-red-700"
            disabled={isLeavingConversation}
          >
            {isLeavingConversation ? "Leaving..." : "Leave Conversation"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
