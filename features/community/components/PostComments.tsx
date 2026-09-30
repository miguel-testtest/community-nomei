import { useState, useRef, useEffect, useCallback } from "react";
import { twMerge } from "tailwind-merge";
import { useQueryClient } from "@tanstack/react-query";
import { PostComment } from "@/api/community/community.types";
import { Textarea } from "@/components/UI/TextArea";
import { usePostComments } from "@/api/community/queries/usePostComments";
import { Spinner } from "@/components/common/Spinner";
import { CommentItem } from "./CommentItem";
import { useAuthStore } from "@/stores/useAuthStore";
import { QUERY_KEYS } from "@/api/queryKeys";
import { CommunityMemberRole } from "@/api/community/enums/community-member-role.enum";
import {
  countMainComments,
  updateCommentInTree,
  removeCommentFromTree,
  addReplyToComment,
  sortMainCommentsByDate,
} from "../utils/commentHelpers";
import { handleTextareaKeyDown } from "../utils/keyboardHelpers";
import { Conversation } from "@/api/community/community.types";

interface PostCommentsProps {
  comments: PostComment[];
  totalDirectComments: number;
  postId: string;
  communityId: string;
  className?: string;
  onAddComment?: (
    content: string,
    parentId?: string | null,
    onSuccess?: (newComment: PostComment) => void,
  ) => void;
  isCreatingComment?: boolean;
  isMember?: boolean;
  canModerate?: boolean | undefined;
  community?:
    | {
        members: Array<{
          userId: string;
          role: CommunityMemberRole;
        }>;
      }
    | undefined;
  onBanUser?: (
    userId: string,
    user: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      profilePicture: string | null;
    },
  ) => void;
  onRemoveUser?: (userId: string, fullName: string) => void;
  conversations?: Conversation[];
  onConversationCreated?: (conversation: Conversation) => void;
  bannedUserIds?: Set<string>;
  commentsDisabled?: boolean;
  canCreateDirectChat?: boolean;
}

const COMMENTS_PER_PAGE = 10;

export function PostComments({
  comments: initialComments,
  totalDirectComments: initialTotalDirectComments,
  postId,
  communityId,
  className,
  onAddComment,
  isCreatingComment = false,
  isMember = true,
  canModerate = false,
  community,
  onBanUser,
  onRemoveUser,
  conversations = [],
  onConversationCreated,
  bannedUserIds,
  commentsDisabled = false,
  canCreateDirectChat = true,
}: PostCommentsProps) {
  const initialMainCount = countMainComments(initialComments || []);

  const [loadedComments, setLoadedComments] = useState<PostComment[]>(
    initialComments || [],
  );
  const [locallyCreatedCommentIds, setLocallyCreatedCommentIds] = useState<Set<string>>(
    new Set(),
  );
  const [skip, setSkip] = useState(initialMainCount);
  const [shouldLoadMore, setShouldLoadMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(
    initialTotalDirectComments > initialMainCount,
  );
  const [totalDirectComments, setTotalDirectComments] = useState(
    initialTotalDirectComments,
  );
  const [loadingRepliesFor, setLoadingRepliesFor] = useState<string | null>(
    null,
  );
  const [repliesSkip, setRepliesSkip] = useState<Record<string, number>>({});
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [commentContent, setCommentContent] = useState("");
  const replyInputRef = useRef<HTMLTextAreaElement>(null);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const previousProfilePictureRef = useRef<string | null | undefined>(
    undefined,
  );

  const { data: commentsResponse, isLoading: isLoadingComments } =
    usePostComments({
      communityId,
      postId,
      skip,
      take: COMMENTS_PER_PAGE,
      enabled: shouldLoadMore,
    });

  useEffect(() => {
    if (initialComments && initialComments.length > 0) {
      const initialMainCount = countMainComments(initialComments);
      setLoadedComments((prevLoaded) => {
        const loadedMainCount = countMainComments(prevLoaded);
        if (initialMainCount > loadedMainCount || loadedMainCount === 0) {
          const serverCommentIds = new Set(initialComments.map((c) => c.id));
          setLocallyCreatedCommentIds((prev) => {
            const filtered = new Set<string>();
            prev.forEach((id) => {
              if (!serverCommentIds.has(id)) {
                filtered.add(id);
              }
            });
            return filtered;
          });
          setSkip(initialMainCount);
          setHasMore(initialTotalDirectComments > initialMainCount);
          setTotalDirectComments(initialTotalDirectComments);
          const sortedComments = sortMainCommentsByDate(initialComments);
          return sortedComments;
        }
        return prevLoaded;
      });
    }
  }, [initialComments, initialTotalDirectComments]);

  useEffect(() => {
    if (commentsResponse) {
      if (commentsResponse.items.length > 0) {
        setLoadedComments((prev) => {
          const existingCommentIds = new Set(prev.map((c) => c.id));
          const newCommentsFromServer = commentsResponse.items.filter(
            (comment) => !existingCommentIds.has(comment.id),
          );
          
          if (newCommentsFromServer.length === 0) {
            return prev;
          }

          const serverCommentIds = new Set(newCommentsFromServer.map((c) => c.id));
          setLocallyCreatedCommentIds((prevIds) => {
            const filtered = new Set<string>();
            prevIds.forEach((id) => {
              if (!serverCommentIds.has(id)) {
                filtered.add(id);
              }
            });
            return filtered;
          });

          const combinedComments = [...prev, ...newCommentsFromServer];
          const sortedComments = sortMainCommentsByDate(combinedComments);
          return sortedComments;
        });
        setSkip(commentsResponse.skip + commentsResponse.items.length);
      }
      setHasMore(commentsResponse.hasMore);
      setTotalDirectComments(commentsResponse.total);
      setIsLoadingMore(false);
      setShouldLoadMore(false);
    }
  }, [commentsResponse]);

  const resetCommentsOnProfilePictureChange = useCallback(() => {
    if (!currentUser) return;

    const currentProfilePicture = currentUser.profilePicture ?? null;
    if (currentProfilePicture !== previousProfilePictureRef.current) {
      queryClient.removeQueries({
        queryKey: [
          QUERY_KEYS.COMMUNITY.GET_POST_COMMENTS,
          { communityId, postId },
        ],
      });
      const initialMainCount = countMainComments(initialComments || []);
      const sortedInitialComments = sortMainCommentsByDate(initialComments || []);
      setLoadedComments(sortedInitialComments);
      setLocallyCreatedCommentIds(new Set());
      setSkip(initialMainCount);
      setHasMore(initialTotalDirectComments > initialMainCount);
      setTotalDirectComments(initialTotalDirectComments);
      setRepliesSkip({});
      setShouldLoadMore(false);
      setIsLoadingMore(false);
      previousProfilePictureRef.current = currentProfilePicture;
    }
  }, [
    currentUser,
    initialComments,
    initialTotalDirectComments,
    communityId,
    postId,
    queryClient,
  ]);

  useEffect(() => {
    resetCommentsOnProfilePictureChange();
  }, [
    currentUser?.profilePicture,
    currentUser?.id,
    resetCommentsOnProfilePictureChange,
  ]);

  const getServerLoadedMainCommentsCount = (): number => {
    return loadedComments.filter(
      (comment) => comment.parentId === null && !locallyCreatedCommentIds.has(comment.id),
    ).length;
  };

  const getLocallyCreatedMainCommentsCount = (): number => {
    return loadedComments.filter(
      (comment) => comment.parentId === null && locallyCreatedCommentIds.has(comment.id),
    ).length;
  };

  const serverLoadedMainCommentsCount = getServerLoadedMainCommentsCount();
  const locallyCreatedMainCommentsCount = getLocallyCreatedMainCommentsCount();
  const remainingComments =
    totalDirectComments > 0
      ? Math.max(0, totalDirectComments - serverLoadedMainCommentsCount - locallyCreatedMainCommentsCount)
      : 0;

  const handleLoadMore = () => {
    if (isLoadingMore || isLoadingComments) return;
    setIsLoadingMore(true);
    setSkip(serverLoadedMainCommentsCount);
    setShouldLoadMore(true);
  };

  const handleLoadMoreReplies = (commentId: string) => {
    if (loadingRepliesFor === commentId) return;
    const currentSkip =
      repliesSkip[commentId] ||
      loadedComments.find((c) => c.id === commentId)?.replies?.length ||
      0;
    setRepliesSkip((prev) => ({ ...prev, [commentId]: currentSkip }));
    setLoadingRepliesFor(commentId);
  };

  const handleRepliesLoaded = useCallback(
    (commentId: string, newSkip: number) => {
      setRepliesSkip((prev) => ({ ...prev, [commentId]: newSkip }));
      setLoadingRepliesFor(null);
    },
    [],
  );

  const handleReplyClick = (commentId: string) => {
    if (replyingTo === commentId) {
      setReplyingTo(null);
      setReplyContent("");
    } else {
      setReplyingTo(commentId);
      setReplyContent("");
      setTimeout(() => replyInputRef.current?.focus(), 0);
    }
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
    setReplyContent("");
  };

  const handleSubmitReply = () => {
    if (
      replyContent.trim() &&
      onAddComment &&
      replyingTo &&
      !isCreatingComment
    ) {
      onAddComment(replyContent.trim(), replyingTo, (newReply) => {
        setLoadedComments((prev) =>
          addReplyToComment(prev, replyingTo, newReply),
        );
        setReplyContent("");
        setReplyingTo(null);
      });
    }
  };

  const handleSubmitComment = () => {
    if (commentContent.trim() && onAddComment && !isCreatingComment) {
      onAddComment(commentContent.trim(), null, (newComment) => {
        setLocallyCreatedCommentIds((prev) => new Set(prev).add(newComment.id));
        setLoadedComments((prev) => {
          const updatedComments = [...prev, newComment];
          return sortMainCommentsByDate(updatedComments);
        });
        setTotalDirectComments((prev) => prev + 1);
        setCommentContent("");
      });
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    onSubmit: () => void,
    onCancel?: () => void,
  ) => {
    handleTextareaKeyDown(e, onSubmit, onCancel);
  };

  const handleUpdateComment = useCallback((updated: PostComment) => {
    setLoadedComments((prev) => updateCommentInTree(prev, updated));
  }, []);

  const handleDeleteComment = useCallback((commentId: string) => {
    setLoadedComments((prev) => {
      const wasMainComment = prev.some(
        (c) => c.id === commentId && !c.parentId,
      );
      if (wasMainComment) {
        setTotalDirectComments((current) => Math.max(0, current - 1));
        setLocallyCreatedCommentIds((prevIds) => {
          const updated = new Set(prevIds);
          updated.delete(commentId);
          return updated;
        });
      }
      return removeCommentFromTree(prev, commentId);
    });
  }, []);

  const hasComments = loadedComments.length > 0;

  return (
    <div className={twMerge("mt-4 border-t border-border pt-4", className)}>
      {hasComments && (
        <>
          <div className="space-y-3">
            {loadedComments.map((comment) => (
              <div
                key={comment.id}
                className="relative pl-0"
                data-comment-id={comment.id}
              >
                <CommentItem
                  comment={comment}
                  depth={0}
                  communityId={communityId}
                  postId={postId}
                  replyingTo={replyingTo}
                  replyContent={replyContent}
                  isCreatingComment={isCreatingComment}
                  onUpdateComment={handleUpdateComment}
                  onDeleteComment={handleDeleteComment}
                  onReplyClick={handleReplyClick}
                  onCancelReply={handleCancelReply}
                  onReplyContentChange={setReplyContent}
                  onSubmitReply={handleSubmitReply}
                  onLoadMoreReplies={handleLoadMoreReplies}
                  isLoadingReplies={loadingRepliesFor === comment.id}
                  currentRepliesSkip={
                    repliesSkip[comment.id] || comment.replies?.length || 0
                  }
                  onRepliesLoaded={handleRepliesLoaded}
                  replyInputRef={replyInputRef}
                  handleKeyDown={handleKeyDown}
                  isMember={isMember}
                  canModerate={canModerate}
                  community={community}
                  commentsDisabled={commentsDisabled}
                  canCreateDirectChat={canCreateDirectChat}
                  {...(onBanUser && { onBanUser })}
                  {...(onRemoveUser && { onRemoveUser })}
                  {...(conversations &&
                    conversations.length > 0 && { conversations })}
                  {...(onConversationCreated && { onConversationCreated })}
                  {...(bannedUserIds ? { bannedUserIds } : {})}
                />
              </div>
            ))}
          </div>

          {hasMore && (
            <div className="mt-4">
              <button
                onClick={handleLoadMore}
                disabled={isLoadingMore || isLoadingComments}
                className="group flex items-center gap-1.5 text-sm font-medium text-emerald-500 transition-colors hover:text-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoadingMore || isLoadingComments ? (
                  <>
                    <Spinner size={16} />
                    <span>Loading...</span>
                  </>
                ) : (
                  <span className="group-hover:underline">
                    View more comments (
                    {remainingComments > 0
                      ? `${remainingComments} more`
                      : "more"}
                    )
                  </span>
                )}
              </button>
            </div>
          )}
        </>
      )}

      {isMember && !commentsDisabled && (
        <div
          className={twMerge(
            hasComments && "mt-4 border-t border-border pt-4",
            !hasComments && "mt-0",
          )}
        >
          <div className="flex w-full items-end gap-2.5">
            <div className="flex flex-1 items-end">
              <Textarea
                ref={commentInputRef}
                value={commentContent}
                onChange={(e) => setCommentContent(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, handleSubmitComment)}
                placeholder="Write a comment..."
                className="w-full text-sm"
                fullWidth
                rows={1}
              />
            </div>
            <button
              onClick={handleSubmitComment}
              disabled={!commentContent.trim() || isCreatingComment}
              className="bg-accent text-foreground hover:bg-primary-hover flex min-h-[3.25rem] shrink-0 items-center justify-center rounded-lg px-5 text-sm font-semibold whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isCreatingComment ? "Posting..." : "Post"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
