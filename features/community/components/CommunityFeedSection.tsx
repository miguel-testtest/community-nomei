import { useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { formatDistanceToNow } from "date-fns";
import { Play } from "lucide-react";
import { LuListTree } from "react-icons/lu";
import { cn } from "@/lib/utils";
import { useInfiniteCommunityFeed } from "@/api/community/queries/useInfiniteCommunityFeed";
import { ROUTES } from "@/routes/paths";
import { PostComment, PostMediaType } from "@/api/community/community.types";
import { useCommunityDiscoveryBackNavigationState } from "@/features/community/hooks/useCommunityDiscoveryBackNavigationState";
import { Button } from "@/components/common/Button";
import { PostReactions } from "@/features/community/components/PostReactions";
import { PostComments } from "@/features/community/components/PostComments";
import { useAuthStore } from "@/stores/useAuthStore";
import { useCreatePostComment } from "@/api/community/mutations/useCreatePostComment";

type PostItem = ReturnType<typeof useInfiniteCommunityFeed>["data"] extends
  | { pages: Array<{ items: Array<infer T> }> }
  | undefined
  ? T
  : never;

const TYPE_DOT: Record<string, string> = {
  Photo: "var(--color-post-photo)",
  Video: "var(--color-teal-800)",
  Plan: "var(--color-orange)",
  Discussion: "var(--color-primary)",
};

function getPostType(post: PostItem): string {
  const hasImage = post.media?.some((mediaItem) => mediaItem.type === PostMediaType.IMAGE);
  const hasVideo = post.media?.some((mediaItem) => mediaItem.type === PostMediaType.VIDEO);
  const hasPlan = !!post.plan;
  if (hasVideo) return "Video";
  if (hasImage) return "Photo";
  if (hasPlan) return "Plan";
  return "Discussion";
}

function getFirstImage(post: PostItem) {
  return post.media?.find((mediaItem) => mediaItem.type === PostMediaType.IMAGE);
}

function getFirstVideo(post: PostItem) {
  return post.media?.find((mediaItem) => mediaItem.type === PostMediaType.VIDEO);
}

function FeedPostCard({ post, index }: { post: PostItem; index: number }) {
  const navigate = useNavigate();
  const backNavigationState = useCommunityDiscoveryBackNavigationState();
  const currentUserId = useAuthStore((state) => state.user?.id);
  const { mutate: createComment, isPending: isCreatingComment } =
    useCreatePostComment();

  const type = getPostType(post);
  const firstImage = getFirstImage(post);
  const firstVideo = getFirstVideo(post);
  const timeAgo = formatDistanceToNow(new Date(post.createdAt), {
    addSuffix: false,
  });

  function handlePostClick() {
    navigate(`${ROUTES.COMMUNITY}/${post.communityId}?postId=${post.id}`, {
      state: backNavigationState,
    });
  }

  function handlePlanClick(e: React.MouseEvent) {
    e.stopPropagation();
    navigate(`${ROUTES.PLAN_TEMPLATE_PREVIEW}/${post.plan!.id}`);
  }

  function handlePostKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") handlePostClick();
  }

  function handlePlanKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.stopPropagation();
      navigate(`${ROUTES.PLAN_TEMPLATE_PREVIEW}/${post.plan!.id}`);
    }
  }

  function handleAddComment(
    content: string,
    parentId?: string | null,
    onSuccess?: (newComment: PostComment) => void,
  ) {
    createComment(
      { communityId: post.communityId, postId: post.id, content, parentId },
      { onSuccess: (newComment) => onSuccess?.(newComment) },
    );
  }

  return (
    <article
      className="animate-coach-fade-up flex w-full flex-col rounded-[var(--radius)] border border-border bg-card shadow-[var(--shadow)] transition-[background,border-color] duration-150 hover:bg-muted/40"
      style={{ animationDelay: `${index * 0.06}s` }}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={handlePostClick}
        onKeyDown={handlePostKeyDown}
        className="flex cursor-pointer gap-3 rounded-t-[var(--radius)] px-5 pt-4 pb-3"
      >
        {post.user.profilePicture ? (
          <img
            src={post.user.profilePicture}
            alt={`${post.user.firstName} ${post.user.lastName}`}
            className="mt-0.5 h-9 w-9 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
            {post.user.firstName[0]}
            {post.user.lastName[0]}
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-sm font-semibold text-foreground">
              {post.user.firstName} {post.user.lastName}
            </span>
            <div className="flex items-center gap-1 text-2xs text-muted-foreground">
              <span
                className="h-[5px] w-[5px] shrink-0 rounded-full"
                style={{ background: TYPE_DOT[type] }}
              />
              {type}
            </div>
            {post.community?.name && (
              <>
                <span className="text-2xs text-muted-foreground">in</span>
                <span className="text-2xs font-semibold text-yellow">
                  {post.community.name}
                </span>
              </>
            )}
            <span className="ml-auto shrink-0 text-2xs text-muted-foreground">
              {timeAgo}
            </span>
          </div>

          <p
            className={cn(
              "text-sm leading-relaxed text-muted-foreground",
              !firstImage && !firstVideo && "line-clamp-4",
              (firstImage || firstVideo) && "line-clamp-2",
            )}
          >
            {post.content}
          </p>

          {firstImage && (
            <img
              src={firstImage.url}
              alt=""
              className="mt-1 w-full rounded-lg"
            />
          )}

          {firstVideo && (
            <div className="relative mt-1 max-h-48 w-full overflow-hidden rounded-lg bg-black/40">
              {firstVideo.thumbnailUrl ? (
                <img
                  src={firstVideo.thumbnailUrl}
                  alt=""
                  className="max-h-48 w-full object-cover"
                />
              ) : (
                <div className="h-32 w-full bg-teal-800/20" />
              )}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50">
                  <Play className="h-4 w-4 fill-white text-white" />
                </div>
              </div>
            </div>
          )}

          {post.plan && (
            <div
              role="button"
              tabIndex={0}
              onClick={handlePlanClick}
              onKeyDown={handlePlanKeyDown}
              className="mt-1 flex w-full cursor-pointer items-center gap-2 rounded-xl border border-border bg-muted/50 px-3 py-2.5 transition-colors hover:bg-border md:w-fit md:max-w-sm"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-card text-orange shadow-sm ring-1 ring-gray-100">
                <LuListTree className="h-4 w-4" />
              </div>
              <span className="truncate text-sm font-medium text-foreground">
                {post.plan.name}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="px-5 pb-4 pl-[3.25rem]">
        <div className="mb-3">
          <PostReactions
            reactions={post.reactions}
            communityId={post.communityId}
            postId={post.id}
            currentUserId={currentUserId}
          />
        </div>
        <PostComments
          comments={post.comments ?? []}
          totalDirectComments={post.stats.directComments}
          postId={post.id}
          communityId={post.communityId}
          onAddComment={handleAddComment}
          isCreatingComment={isCreatingComment}
        />
      </div>
    </article>
  );
}

type CommunityFeedSectionProps = {
  onGoToDiscover: () => void;
};

export function CommunityFeedSection({ onGoToDiscover }: CommunityFeedSectionProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteCommunityFeed({ fullData: true });

  const posts = data?.pages.flatMap((page) => page.items) ?? [];

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center py-16">
        <p className="text-compact text-muted-foreground">Loading feed...</p>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
          <span className="h-[10px] w-[10px] rounded-full bg-yellow" />
        </div>
        <div className="flex flex-col items-center gap-1 text-center">
          <p className="text-base font-semibold text-foreground">No posts yet</p>
          <p className="text-compact text-muted-foreground">
            Join communities to start seeing posts here
          </p>
        </div>
        <Button variant="secondary" onClick={onGoToDiscover}>
          Discover communities
        </Button>
      </div>
    );
  }

  return (
    <div className="scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent flex flex-1 flex-col gap-3 overflow-y-auto px-7 py-6 md:px-10">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
        {posts.map((post, index) => (
          <FeedPostCard key={post.id} post={post} index={index} />
        ))}

        <div ref={sentinelRef} className="py-3 text-center">
          {isFetchingNextPage && (
            <span className="text-compact text-muted-foreground">Loading more...</span>
          )}
        </div>
      </div>
    </div>
  );
}
