import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { IoMdClose } from "react-icons/io";
import { Modal } from "@/components/UI/Modal";
import { Button } from "@/components/common/Button";
import { ErrorText } from "@/components/common/ErrorText";
import { Textarea } from "@/components/UI/TextArea";
import { DetailCard } from "./DetailCard";
import { useAppealMemberRequest } from "@/api/community/mutations/useAppealMemberRequest";
import {
  type AppealRequestFormValues,
  appealRequestSchema,
  MAX_APPEAL_MESSAGE_LENGTH,
} from "@/features/community/schema/appeal-request.schema";

interface AppealRequestModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (message?: string) => void;
  communityId: string;
  userId: string;
  rejectionReason?: string | null;
}

const LOW_CHAR_THRESHOLD = 50;

const DEFAULT_VALUES: AppealRequestFormValues = {
  message: "",
};

export function AppealRequestModal({
  open,
  onClose,
  onSuccess,
  communityId,
  userId,
  rejectionReason,
}: AppealRequestModalProps) {
  const { mutate: appealRequest, isPending } = useAppealMemberRequest();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<AppealRequestFormValues>({
    resolver: zodResolver(appealRequestSchema),
    defaultValues: DEFAULT_VALUES,
  });

  useEffect(() => {
    if (open) {
      reset(DEFAULT_VALUES);
    }
  }, [open, reset]);

  const messageValue = watch("message") ?? "";
  const remainingChars = MAX_APPEAL_MESSAGE_LENGTH - messageValue.length;
  const isLowChars = remainingChars < LOW_CHAR_THRESHOLD;
  const characterCountClassName = isLowChars ? "text-red-500" : "text-muted-foreground";

  const onSubmit = (values: AppealRequestFormValues): void => {
    const trimmedMessage = values.message.trim();
    appealRequest(
      {
        communityId,
        userId,
        ...(trimmedMessage && { message: trimmedMessage }),
      },
      {
        onSuccess: () => {
          onSuccess(trimmedMessage || undefined);
          reset(DEFAULT_VALUES);
        },
      },
    );
  };

  const handleClose = (): void => {
    reset(DEFAULT_VALUES);
    onClose();
  };

  if (!open) {
    return null;
  }

  const submitButtonLabel = isPending ? "Submitting..." : "Submit Review";

  return (
    <Modal open={open} setClose={handleClose}>
      <div className="relative flex max-w-[36.25rem] flex-col gap-6 rounded-md bg-card p-6">
        <button
          onClick={handleClose}
          className="text-muted-foreground hover:text-primary absolute right-5 top-5 hover:cursor-pointer focus:outline-none"
          aria-label="Close dialog"
          disabled={isPending}
        >
          <IoMdClose className="h-6 w-6" />
        </button>

        <div className="flex flex-col gap-3">
          <h2 className="text-foreground text-xl font-semibold">
            Request Review
          </h2>

          <p className="text-foreground">
            You can submit a review request for your rejected membership
            application.
          </p>
        </div>

        {rejectionReason != null && (
          <DetailCard label="Rejection Reason" value={rejectionReason} />
        )}

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-6"
          noValidate
        >
          <div className="flex flex-col gap-2">
            <label
              htmlFor="appeal-message"
              className="text-foreground text-sm font-medium"
            >
              Your Response (optional)
            </label>
            <Textarea
              id="appeal-message"
              placeholder="Write your response to the rejection..."
              className="min-h-[6rem]"
              fullWidth
              disabled={isPending}
              rows={4}
              error={!!errors.message}
              {...register("message")}
            />
            <div className="flex items-center justify-between">
              {errors.message ? (
                <ErrorText className="text-xs">
                  {errors.message.message}
                </ErrorText>
              ) : (
                <span />
              )}
              <p className={`text-xs ${characterCountClassName}`}>
                {remainingChars} characters remaining
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={handleClose}
              disabled={isPending}
              className="py-2"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isPending}
              className="py-2"
            >
              {submitButtonLabel}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
