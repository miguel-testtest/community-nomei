import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { toast } from "react-hot-toast";
import { Popover, PopoverButton, PopoverPanel } from "@headlessui/react";
import { Avatar } from "@/components/common/Avatar";
import { usePlan } from "@/api/plan/queries/usePlan";
import { useAuthStore } from "@/stores/useAuthStore";
import { isSuperAdmin } from "@/api/user/privileges";
import { PostForm } from "./PostForm";
import { ActionButton } from "./ActionButton";
import { PostComposerPlanPickerModal } from "./PostComposerPlanPickerModal";
import { PostPlanAttachmentCard } from "./PostPlanAttachmentCard";
import { PostMediaType } from "@/api/community/community.types";
import { PostPlanAttachment } from "../types/post-plan-attachment.type";
import { LuX, LuPaperclip, LuPlus } from "react-icons/lu";
import { twMerge } from "tailwind-merge";
import { ROUTES } from "@/routes/paths";
import {
  extractFirstPlanPanelLink,
  removePlanPanelUrlFromText,
} from "../utils/extractPlanPanelLinkFromText";

interface PostComposerProps {
  currentUserName: string;
  currentUserFirstName?: string;
  currentUserLastName?: string;
  currentUserProfilePicture: string | null;
  currentUserId: string;
  content: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  media: {
    inputRef: React.RefObject<HTMLInputElement | null>;
    previewUrl: string | null;
    type: PostMediaType | null;
    handleSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
    clear: () => void;
  };
  isCreatingPost: boolean;
  isUploadingMedia: boolean;
  attachedPlan: PostPlanAttachment | null;
  onAttachPlan: (attachment: PostPlanAttachment) => void;
  onClearAttachedPlan: () => void;
}

export function PostComposer({
  currentUserName,
  currentUserFirstName,
  currentUserLastName,
  currentUserProfilePicture,
  currentUserId,
  content,
  onChange,
  onSubmit,
  onCancel,
  textareaRef,
  media,
  isCreatingPost,
  isUploadingMedia,
  attachedPlan,
  onAttachPlan,
  onClearAttachedPlan,
}: PostComposerProps) {
  const disableMediaUpload = isCreatingPost || isUploadingMedia;
  const [isPlanPickerOpen, setIsPlanPickerOpen] = useState(false);
  const planLinkAttachGenerationRef = useRef(0);
  const lastPastedPlanIdFromLinkRef = useRef<string | null>(null);
  const [pastedLinkPlan, setPastedLinkPlan] = useState<{
    planId: string;
    conversationId: string;
    generation: number;
  } | null>(null);

  const planFromPastedLinkQuery = usePlan(pastedLinkPlan?.planId ?? "");
  const currentUser = useAuthStore((state) => state.user);
  const canAttachPlan = useCallback(
    (plan: { userId: string; isPublic?: boolean }) =>
      plan.userId === currentUser?.id ||
      (isSuperAdmin(currentUser?.role) && Boolean(plan.isPublic)),
    [currentUser?.id, currentUser?.role],
  );

  useEffect(() => {
    if (!pastedLinkPlan) {
      return;
    }
    const previousPlanId = lastPastedPlanIdFromLinkRef.current;
    lastPastedPlanIdFromLinkRef.current = pastedLinkPlan.planId;
    if (previousPlanId === pastedLinkPlan.planId) {
      void planFromPastedLinkQuery.refetch();
    }
  }, [pastedLinkPlan, planFromPastedLinkQuery.refetch]);

  useEffect(() => {
    if (!pastedLinkPlan) {
      return;
    }
    if (!planFromPastedLinkQuery.isFetched) {
      return;
    }
    if (pastedLinkPlan.generation !== planLinkAttachGenerationRef.current) {
      return;
    }
    if (planFromPastedLinkQuery.isError) {
      setPastedLinkPlan(null);
      return;
    }
    const planData = planFromPastedLinkQuery.data;
    if (!planData?.name) {
      setPastedLinkPlan(null);
      return;
    }
    if (!canAttachPlan(planData)) {
      toast.error("You don't have permission to share this plan.");
      setPastedLinkPlan(null);
      return;
    }
    onAttachPlan({
      planId: pastedLinkPlan.planId,
      planName: planData.name,
      conversationId: pastedLinkPlan.conversationId,
    });
    setPastedLinkPlan(null);
  }, [
    onAttachPlan,
    pastedLinkPlan,
    planFromPastedLinkQuery.data,
    planFromPastedLinkQuery.isError,
    planFromPastedLinkQuery.isFetched,
    canAttachPlan,
  ]);

  const canSubmit =
    content.trim().length > 0 || attachedPlan !== null;

  const handleContentChange = useCallback(
    (value: string) => {
      const link = extractFirstPlanPanelLink(value);
      if (!link) {
        onChange(value);
        return;
      }
      const cleaned = removePlanPanelUrlFromText(value, link);
      onChange(cleaned);
      const generation = ++planLinkAttachGenerationRef.current;
      onAttachPlan({
        planId: link.planId,
        planName: "Plan",
        conversationId: link.conversationId,
      });
      setPastedLinkPlan({
        planId: link.planId,
        conversationId: link.conversationId,
        generation,
      });
    },
    [onChange, onAttachPlan],
  );

  let postButtonLabel = "Post";
  if (isUploadingMedia) {
    postButtonLabel = "Uploading...";
  } else if (isCreatingPost) {
    postButtonLabel = "Posting...";
  }

  return (
    <motion.div
      layout
      initial={false}
      className="rounded-[var(--radius)] border border-border bg-card p-6 shadow-[var(--shadow)]"
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        duration: 0.4,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      <input
        ref={media.inputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp,video/mp4"
        onChange={media.handleSelect}
        className="hidden"
        id="post-media-input"
        disabled={disableMediaUpload}
      />
      <div className="flex items-start gap-4">
        <Avatar
          firstName={currentUserFirstName}
          lastName={currentUserLastName}
          profilePicture={currentUserProfilePicture}
          userId={currentUserId}
          size="lg"
          alt={currentUserName}
        />
        <div className="min-w-0 flex-1">
          <h3 className="text-foreground mb-3 text-lg font-semibold">
            {currentUserName}
          </h3>
          <PostForm
            content={content}
            onChange={handleContentChange}
            onSubmit={onSubmit}
            textareaRef={textareaRef}
          />

          {media.previewUrl && media.type && (
            <div className="relative mb-3">
              <button
                onClick={media.clear}
                className="absolute top-2 right-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
                aria-label="Remove media"
                type="button"
              >
                <LuX className="h-4 w-4" />
              </button>
              {media.type === PostMediaType.IMAGE ? (
                <img
                  src={media.previewUrl}
                  alt="Preview"
                  className="max-h-[500px] w-full rounded-xl object-cover"
                />
              ) : (
                <video
                  src={media.previewUrl}
                  controls
                  preload="metadata"
                  className="max-h-[500px] w-full rounded-xl"
                />
              )}
            </div>
          )}

          {attachedPlan ? (
            <PostPlanAttachmentCard
              title={attachedPlan.planName}
              to={`${ROUTES.PLAN_TEMPLATE_PREVIEW}/${attachedPlan.planId}`}
              subtitle="Included when you post"
              onRemove={onClearAttachedPlan}
            />
          ) : null}

          <div className="mb-3 flex w-full min-w-0 flex-wrap items-center gap-y-2">
            <div className="flex min-w-0 shrink-0 items-center gap-1">
              <label
                htmlFor="post-media-input"
                className={twMerge(
                  "flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                  disableMediaUpload &&
                    "pointer-events-none cursor-not-allowed opacity-50",
                )}
                aria-label="Add media"
              >
                <LuPaperclip className="h-5 w-5" />
              </label>
              <Popover className="relative">
                {({ close }) => (
                  <>
                    <PopoverButton
                      type="button"
                      disabled={disableMediaUpload}
                      className={twMerge(
                        "flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                        disableMediaUpload &&
                          "cursor-not-allowed opacity-50",
                      )}
                      aria-label="Add to post"
                    >
                      <LuPlus className="h-5 w-5" />
                    </PopoverButton>
                    <PopoverPanel
                      anchor="top start"
                      className="z-50 mb-2 w-40 rounded-lg border border-border bg-card py-1 shadow-lg"
                    >
                      <button
                        type="button"
                        className="text-foreground hover:bg-muted/50 w-full px-3 py-2 text-left text-sm font-medium transition-colors"
                        onClick={() => {
                          close();
                          setIsPlanPickerOpen(true);
                        }}
                      >
                        Plan
                      </button>
                    </PopoverPanel>
                  </>
                )}
              </Popover>
            </div>
            <div className="ml-auto flex shrink-0 items-center gap-2">
              <ActionButton onClick={onCancel} disabled={disableMediaUpload}>
                Cancel
              </ActionButton>
              <ActionButton
                onClick={onSubmit}
                disabled={!canSubmit || disableMediaUpload}
                variant="primary"
              >
                {postButtonLabel}
              </ActionButton>
            </div>
          </div>
        </div>
      </div>
      <PostComposerPlanPickerModal
        open={isPlanPickerOpen}
        onClose={() => setIsPlanPickerOpen(false)}
        onPickPlan={(plan) => {
          onAttachPlan({
            planId: plan.id,
            planName: plan.name,
            conversationId: plan.conversationId,
          });
          setIsPlanPickerOpen(false);
        }}
      />
    </motion.div>
  );
}
