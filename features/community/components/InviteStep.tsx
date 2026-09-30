import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LuPlus } from "react-icons/lu";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/UI/Input";
import {
  CommunityInviteFormValues,
  communityInviteSchema,
} from "@/features/community/schema/community-invite.schema";

type InviteStepProps = {
  title?: string;
  description?: string;
  initialInvites?: string[];
  onInvitesChange?: (values: string[]) => void;
  onSkip: () => void;
  onCreate: (validInvites: string[]) => void;
  isCreating?: boolean;
};

export function InviteStep({
  title = "Invite members",
  description = "Get the most out of your community by inviting your friends and family.",
  initialInvites,
  onInvitesChange,
  onSkip,
  onCreate,
  isCreating = false,
}: InviteStepProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    reset,
    setValue,
  } = useForm<CommunityInviteFormValues>({
    resolver: zodResolver(communityInviteSchema),
    mode: "onBlur",
    defaultValues: {
      invites:
        initialInvites && initialInvites.length > 0
          ? initialInvites
          : ["", "", ""],
    },
  });

  useEffect(() => {
    if (initialInvites) {
      reset({
        invites: initialInvites.length > 0 ? initialInvites : ["", "", ""],
      });
    }
  }, [initialInvites, reset]);

  const lastEmittedInvitesRef = useRef<string[]>([]);
  useEffect(() => {
    if (!onInvitesChange) {
      return;
    }
    const subscription = watch((value) => {
      const normalizedInvites = (value.invites ?? []).map(
        (invite) => invite ?? "",
      );
      const previous = lastEmittedInvitesRef.current;
      const hasChanged =
        normalizedInvites.length !== previous.length ||
        normalizedInvites.some((invite, index) => invite !== previous[index]);
      if (!hasChanged) {
        return;
      }
      lastEmittedInvitesRef.current = normalizedInvites;
      onInvitesChange(normalizedInvites);
    });
    return () => subscription.unsubscribe();
  }, [watch, onInvitesChange]);

  const invites = watch("invites") ?? [];
  const hasAtLeastOneEmail = invites.some(
    (invite) => (invite ?? "").trim().length > 0,
  );
  const isBusy = isCreating || isSubmitting;

  const handleAddEmail = () => {
    setValue("invites", [...invites, ""]);
  };

  const handleSubmitInvites = handleSubmit((values) => {
    const normalizedInvites = values.invites
      .map((invite) => invite.trim())
      .filter(Boolean);
    onCreate(normalizedInvites);
  });

  return (
    <form
      onSubmit={handleSubmitInvites}
      className="bg-surface flex w-full max-w-[32rem] flex-col justify-center gap-4 rounded-3xl px-6 py-8 text-center shadow-sm lg:text-left"
      noValidate
    >
      <div className="flex flex-col items-center gap-4 text-center">
        <h2 className="text-foreground text-3xl">{title}</h2>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>

      <div className="flex flex-col gap-4 text-left">
        {invites.map((_, index) => (
          <div key={`invite-${index}`} className="flex flex-col gap-1">
            <label
              htmlFor={`invite-email-${index}`}
              className="text-muted-foreground text-xs font-semibold"
            >
              Email #{index + 1}
            </label>
            <Input
              id={`invite-email-${index}`}
              type="email"
              placeholder="Enter member email"
              fullWidth
              {...register(`invites.${index}` as const)}
            />
            {errors.invites?.[index]?.message && (
              <p className="text-xs font-medium text-red-500">
                {errors.invites[index]?.message}
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="text-foreground flex items-center justify-end text-sm">
        <Button
          type="button"
          variant="outline"
          className="flex items-center gap-2 border-none px-0 text-sm hover:bg-transparent"
          onClick={handleAddEmail}
          disabled={isBusy}
        >
          <LuPlus size={16} />
          Add more
        </Button>
      </div>

      {errors.invites?.message && (
        <p className="text-xs font-medium text-red-500">
          {errors.invites.message}
        </p>
      )}

      <div className="mt-2 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="secondary"
          className="w-full sm:w-auto md:min-w-[8rem]"
          onClick={onSkip}
          disabled={isBusy}
        >
          Skip
        </Button>
        <Button
          type="submit"
          variant="primary"
          className="w-full sm:w-auto md:min-w-[8rem]"
          disabled={isBusy || !hasAtLeastOneEmail}
        >
          {isBusy ? "Creating..." : "Create"}
        </Button>
      </div>
    </form>
  );
}
