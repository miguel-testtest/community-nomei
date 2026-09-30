import { useState } from "react";
import { Modal } from "@/components/UI/Modal";
import { Button } from "@/components/common/Button";

interface RejectMemberModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason?: string) => void;
  memberName: string;
  isLoading?: boolean;
}

const MAX_REASON_LENGTH = 240;

export function RejectMemberModal({
  open,
  onClose,
  onConfirm,
  memberName,
  isLoading = false,
}: RejectMemberModalProps) {
  const [reason, setReason] = useState("");

  const handleConfirm = () => {
    onConfirm(reason.trim() || undefined);
    setReason(""); // Reset for next time
  };

  const handleClose = () => {
    setReason("");
    onClose();
  };

  const remainingChars = MAX_REASON_LENGTH - reason.length;

  return (
    <Modal open={open} setClose={handleClose}>
      <div className="mx-auto max-w-md rounded-lg bg-card p-8">
        <h2 className="text-foreground mb-2 text-xl font-semibold">
          Reject Member Request
        </h2>
        <p className="text-foreground mb-6 text-sm">
          Are you sure you want to reject <strong>{memberName}</strong>'s
          request to join?
        </p>

        <div className="mb-6">
          <label
            htmlFor="reject-reason"
            className="text-foreground mb-2 block text-sm font-medium"
          >
            Reason (optional)
          </label>
          <textarea
            id="reject-reason"
            value={reason}
            onChange={(e) => {
              if (e.target.value.length <= MAX_REASON_LENGTH) {
                setReason(e.target.value);
              }
            }}
            placeholder="Provide a reason for rejection..."
            className="w-full rounded-lg border border-border p-3 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 text-foreground"
            rows={4}
            maxLength={MAX_REASON_LENGTH}
          />
          <p
            className={`mt-1 text-right text-xs ${
              remainingChars < 20 ? "text-red-500" : "text-muted-foreground"
            }`}
          >
            {remainingChars} characters remaining
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={handleClose}
            disabled={isLoading}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirm}
            disabled={isLoading}
            className="flex-1"
          >
            {isLoading ? "Rejecting..." : "Reject Request"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

