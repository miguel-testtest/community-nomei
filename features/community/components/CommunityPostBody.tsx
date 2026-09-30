import type { CommunityPostPlan, PostMedia } from "@/api/community/community.types";
import { PostMediaRenderer } from "./PostMediaRenderer";
import { CommunityPostPlanAttachment } from "./CommunityPostPlanAttachment";

export interface CommunityPostBodyProps {
  content: string;
  plan?: CommunityPostPlan | null | undefined;
  media?: PostMedia[] | undefined;
  onImageClick?: (imageUrl: string) => void;
}

export function CommunityPostBody({
  content,
  plan,
  media,
  onImageClick,
}: CommunityPostBodyProps) {
  const trimmedContent = content.trim();
  const mediaItems = media ?? [];
  const hasMedia = mediaItems.length > 0;

  return (
    <>
      {trimmedContent ? (
        <p className="mb-4 break-words [overflow-wrap:anywhere] whitespace-pre-wrap text-foreground/70">
          {content}
        </p>
      ) : null}
      {plan !== undefined && plan !== null ? (
        <CommunityPostPlanAttachment plan={plan} />
      ) : null}
      {hasMedia ? (
        <PostMediaRenderer
          media={mediaItems}
          {...(onImageClick !== undefined ? { onImageClick } : {})}
        />
      ) : null}
    </>
  );
}
