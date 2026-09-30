import { useState } from "react";
import { Modal } from "@/components/UI/Modal";
import { Button } from "@/components/common/Button";
import { Textarea } from "@/components/UI/TextArea";

type ReportModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void> | void;
  title?: string;
};

export function ReportModal({
  isOpen,
  onClose,
  onSubmit,
  title = "Report content",
}: ReportModalProps) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = () => {
    if (isSubmitting) return;
    setReason("");
    setError("");
    onClose();
  };

  const handleSubmit = async () => {
    const trimmedReason = reason.trim();
    if (trimmedReason.length === 0) {
      setError("Please provide a reason for reporting this content.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      await onSubmit(trimmedReason);
      setReason("");
      setError("");
      onClose();
    } catch (error) {
      setError("Failed to submit report. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal open={isOpen} setClose={handleClose}>
      <div className="mx-auto max-w-md rounded-2xl bg-card p-6 shadow-lg">
        <h2 className="text-foreground mb-4 text-xl font-semibold">{title}</h2>
        <p className="text-muted-foreground mb-4 text-sm">
          Please tell us why you are reporting this content. This field is
          required.
        </p>
        <div className="mb-4">
          <Textarea
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (error) setError("");
            }}
            placeholder="Enter your reason for reporting..."
            className="min-h-[6rem]"
            fullWidth
            disabled={isSubmitting}
            error={!!error}
          />
          {error && (
            <p className="mt-2 text-sm text-red-500">{error}</p>
          )}
        </div>
        <div className="flex gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            className="flex-1"
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleSubmit}
            className="flex-1"
            disabled={isSubmitting || reason.trim().length === 0}
          >
            {isSubmitting ? "Submitting..." : "Submit"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

