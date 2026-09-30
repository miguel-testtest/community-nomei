import { useState } from "react";
import { twMerge } from "tailwind-merge";
import { Modal } from "@/components/UI/Modal";
import { Button } from "@/components/common/Button";
import { Textarea } from "@/components/UI/TextArea";
import { UserBasicInfo } from "@/api/community/community.types";
import { formatUserName } from "../utils/userHelpers";
import { BanDuration, BAN_DURATION_OPTIONS } from "../constants/banDuration";

type BanUserModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    reason: string;
    bannedUntil: string | null;
  }) => Promise<void> | void;
  user: UserBasicInfo;
};

export function BanUserModal({
  isOpen,
  onClose,
  onSubmit,
  user,
}: BanUserModalProps) {
  const [reason, setReason] = useState("");
  const [duration, setDuration] = useState<BanDuration>("24h");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [touched, setTouched] = useState(false);

  const userName = formatUserName(user.firstName, user.lastName);

  const trimmedReason = reason.trim();
  const hasReason = trimmedReason.length > 0;
  const showError = touched && !hasReason;
  const errorMessage = showError
    ? "Please provide a reason for banning this user."
    : error;

  const handleClose = () => {
    if (isSubmitting) return;
    setReason("");
    setDuration("24h");
    setError("");
    setTouched(false);
    onClose();
  };

  const getHoursFromDuration = (duration: BanDuration): number => {
    switch (duration) {
      case "24h":
        return 24;
      case "7d":
        return 168;
      case "30d":
        return 720;
      default:
        return 720;
    }
  };

  const calculateBannedUntil = (duration: BanDuration): string | null => {
    if (duration === "permanent") {
      return null;
    }

    const now = new Date();
    const hours = getHoursFromDuration(duration);
    const bannedUntil = new Date(now.getTime() + hours * 60 * 60 * 1000);
    return bannedUntil.toISOString();
  };

  const handleReasonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setReason(e.target.value);
    if (error) setError("");
    if (!touched) setTouched(true);
  };

  const handleReasonBlur = () => {
    setTouched(true);
  };

  const handleSubmit = async () => {
    if (!hasReason) {
      setTouched(true);
      setError("Please provide a reason for banning this user.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const bannedUntil = calculateBannedUntil(duration);
      await onSubmit({ reason: trimmedReason, bannedUntil });
      setReason("");
      setDuration("24h");
      setError("");
      setTouched(false);
      onClose();
    } catch (error) {
      setError("Failed to ban user. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal open={isOpen} setClose={handleClose}>
      <div className="mx-auto max-w-md rounded-2xl bg-card p-6 shadow-lg">
        <h2 className="text-foreground mb-4 text-xl font-semibold">
          Ban {userName} from this community
        </h2>
        <p className="text-muted-foreground mb-4 text-sm">
          Please provide a reason for banning this user. This action can be
          reversed later.
        </p>
        <div className="mb-4">
          <label
            htmlFor="ban-reason"
            className="text-foreground mb-2 block text-sm font-medium"
          >
            Reason (required)
          </label>
          <Textarea
            id="ban-reason"
            value={reason}
            onChange={handleReasonChange}
            onBlur={handleReasonBlur}
            placeholder="Enter the reason for banning this user..."
            className="min-h-[6rem]"
            fullWidth
            disabled={isSubmitting}
            error={!!errorMessage}
            required
          />
          {errorMessage && (
            <p className="mt-2 text-sm text-red-500">{errorMessage}</p>
          )}
        </div>
        <div className="mb-4">
          <label
            htmlFor="ban-duration"
            className="text-foreground mb-2 block text-sm font-medium"
          >
            Ban Duration
          </label>
          <select
            id="ban-duration"
            value={duration}
            onChange={(e) => setDuration(e.target.value as BanDuration)}
            disabled={isSubmitting}
            className="focus:border-accent focus:ring-accent text-foreground w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:ring-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          >
            {BAN_DURATION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
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
            className={twMerge(
              "flex-1",
              (!hasReason || isSubmitting) && "!cursor-not-allowed !opacity-50",
            )}
            disabled={isSubmitting || !hasReason}
          >
            {isSubmitting ? "Banning..." : "Ban User"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
