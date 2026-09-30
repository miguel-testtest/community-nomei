import { Modal } from "@/components/UI/Modal";
import { Button } from "@/components/common/Button";
import { toast } from "react-hot-toast";
import { useDeleteDmMessage } from "@/api/community/mutations/useDeleteDmMessage";

interface DeleteDmMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  communityId: string;
  conversationId: string;
  messageId: string;
}

export function DeleteDmMessageModal({
  isOpen,
  onClose,
  communityId,
  conversationId,
  messageId,
}: DeleteDmMessageModalProps) {
  const { mutate: deleteDmMessage, isPending: isDeleting } =
    useDeleteDmMessage();

  const handleClose = () => {
    if (isDeleting) return;
    onClose();
  };

  const handleConfirmDelete = () => {
    deleteDmMessage(
      { communityId, conversationId, messageId },
      {
        onSuccess: () => {
          toast.success("Message deleted.");
          onClose();
        },
        onError: () => {
          toast.error("Failed to delete message. Please try again.");
        },
      },
    );
  };

  return (
    <Modal open={isOpen} setClose={handleClose}>
      <div className="mx-auto max-w-md rounded-2xl bg-card p-6 text-center shadow-lg">
        <h2 className="text-foreground mb-4 text-xl font-semibold">
          Delete message
        </h2>
        <p className="text-muted-foreground mb-6 text-sm">
          This message will be deleted for everyone in this conversation. This
          action cannot be undone.
        </p>
        <div className="flex gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            className="flex-1"
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleConfirmDelete}
            className="flex-1 bg-red-600 !text-white hover:bg-red-700"
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete message"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
