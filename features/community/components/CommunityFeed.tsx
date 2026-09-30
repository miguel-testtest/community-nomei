import { useInfiniteCommunityPosts } from "@/api/community/queries/useInfiniteCommunityPosts";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Spinner } from "@/components/common/Spinner";
import { twMerge } from "tailwind-merge";
import { PostComments } from "./PostComments";
import { PostReactions } from "./PostReactions";
import { useCurrentUser } from "@/api/user/queries/useCurrentUser";
import { useCreatePost } from "@/api/community/mutations/useCreatePost";
import { useCreatePostComment } from "@/api/community/mutations/useCreatePostComment";
import { useDeletePost } from "@/api/community/mutations/useDeletePost";
import {
  useUploadPostMedia,
  getUploadErrorMessage,
} from "@/api/community/mutations/useUploadPostMedia";
import { usePostMediaField } from "../hooks/usePostMediaField";
import { ReportModal } from "./ReportModal";
import { toast } from "react-hot-toast";
import { isAxiosError } from "axios";
import { motion, AnimatePresence } from "motion/react";
import { CommunityMemberRole } from "@/api/community/enums/community-member-role.enum";
import { MemberRequestStatus } from "@/api/community/enums/member-request-status.enum";
import { formatUserName } from "../utils/userHelpers";
import { useStartConversation } from "../hooks/useStartConversation";
import { Conversation } from "@/api/community/community.types";
import {
  handleScrollToLoadMore,
  loadMoreIfNoScroll,
} from "../utils/scrollHelpers";
import {
  ANIMATION_DELAY,
  SCROLL_DELAY,
  DELETE_ANIMATION_DELAY,
  ANIMATION_VARIANTS,
  TRANSITION_CONFIG,
  getAnimationInitial,
  getAnimationAnimate,
} from "../utils/animationHelpers";
import {
  getPostCommentsCount,
  getPostDirectCommentsCount,
  getPostReactions,
  getPostComments,
} from "../utils/postHelpers";
import { Button } from "@/components/common/Button";
import { useScrollToPost } from "../hooks/useScrollToPost";
import { PostComposer } from "./PostComposer";
import { CommunityPostBody } from "./CommunityPostBody";
import { PostPlanAttachment } from "../types/post-plan-attachment.type";
import { ImagePreviewModal } from "./ImagePreviewModal";
import { PostHeader, PostHeaderAvatar } from "./PostHeader";
import { useImagePreview } from "../hooks/useImagePreview";
import { usePostReport } from "../hooks/usePostReport";
import { canBanOrRemoveMember } from "../utils/moderationHelpers";
import { usePostEdit } from "../hooks/usePostEdit";
import { PostEditForm } from "./PostEditForm";
import { FlaggedContentContainer } from "./FlaggedContentContainer";

interface CommunityFeedProps {
  communityId: string;
  isMember?: boolean;
  onJoin?: () => void;
  isJoining?: boolean;
  requestStatus?: MemberRequestStatus | null | undefined;
  initialPostId?: string;
  canModerate?: boolean | undefined;
  community?:
    | {
        members: Array<{
          userId: string;
          role: CommunityMemberRole;
        }>;
        stats?: {
          members: number;
          posts: number;
        };
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
  canCreatePost?: boolean | undefined;
  commentsDisabled?: boolean | undefined;
  canCreateDirectChat?: boolean | undefined;
}


export function CommunityFeed({
  communityId,
  isMember = true,
  onJoin,
  isJoining = false,
  requestStatus,
  initialPostId,
  canModerate = false,
  community,
  onBanUser,
  onRemoveUser,
  conversations = [],
  onConversationCreated,
  bannedUserIds,
  canCreatePost = true,
  commentsDisabled = false,
  canCreateDirectChat = true,
}: CommunityFeedProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const postTextareaRef = useRef<HTMLTextAreaElement>(null);
  const loadingRef = useRef(false);
  const editPostTextareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: currentUser } = useCurrentUser();
  const { startConversation, isCreatingChat } = useStartConversation({
    currentUserId: currentUser?.id,
    communityId,
    conversations,
    onConversationCreated,
    isMember,
    canCreateDirectChat,
  });

  const [newPostContent, setNewPostContent] = useState("");
  const [newPostAttachedPlan, setNewPostAttachedPlan] =
    useState<PostPlanAttachment | null>(null);
  const [animatingPostIds, setAnimatingPostIds] = useState<Set<string>>(
    new Set(),
  );
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);

  const newPostMedia = usePostMediaField();
  const { mutate: uploadPostMedia, isPending: isUploadingNewPostMedia } =
    useUploadPostMedia();

  const {
    editingPostId,
    editPostContent,
    setEditPostContent,
    removingMediaFromEdit,
    setRemovingMediaFromEdit,
    editPostMedia,
    isUpdatingPost,
    isUploadingMedia,
    handleSavePostEdit,
    handleCancelPostEdit,
    handleEditMediaSelect,
    handleStartEdit,
    handleEditPostKeyDown,
  } = usePostEdit({ communityId });

  const { previewImageUrl, handleImageClick, handleClosePreview } =
    useImagePreview();

  const {
    reportingPostId,
    handleReportPost,
    handleCloseReportModal,
    handleSubmitReport,
  } = usePostReport({ communityId });

  const { mutate: createPost, isPending: isCreatingPost } = useCreatePost();
  const { mutate: createComment, isPending: isCreatingComment } =
    useCreatePostComment();
  const { mutate: deletePost } = useDeletePost();

  const {
    data,
    isLoading,
    error,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteCommunityPosts({
    communityId,
    enabled: true,
  });

  const pages = useMemo(() => data?.pages ?? [], [data?.pages]);
  const posts = useMemo(
    () => pages.flatMap((page) => page.items).filter(Boolean),
    [pages],
  );
  const handleScroll = useCallback(() => {
    handleScrollToLoadMore({
      scrollContainerRef,
      hasNextPage,
      isFetchingNextPage,
      isLoading,
      fetchNextPage,
      loadingRef,
    });
  }, [hasNextPage, isFetchingNextPage, isLoading, fetchNextPage]);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    scrollContainer.addEventListener("scroll", handleScroll);
    return () => scrollContainer.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  useEffect(() => {
    loadMoreIfNoScroll({
      scrollContainerRef,
      isLoading,
      hasNextPage,
      isFetchingNextPage,
      loadingRef,
      fetchNextPage,
    });
  }, [posts.length, hasNextPage, isFetchingNextPage, isLoading, fetchNextPage]);

  useScrollToPost({
    containerRef: scrollContainerRef,
    posts,
    ...(initialPostId && { initialPostId }),
    hasNextPage,
    isLoading,
    isFetchingNextPage,
    fetchNextPage,
  });

  const removeAnimatingPost = useCallback((postId: string) => {
    setAnimatingPostIds((prev) => {
      const next = new Set(prev);
      next.delete(postId);
      return next;
    });
  }, []);

  const addAnimatingPost = useCallback((postId: string) => {
    setAnimatingPostIds((prev) => new Set(prev).add(postId));
  }, []);

  const scrollToTop = useCallback(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  }, []);

  const handleCreatePost = useCallback(() => {
    const hasText = newPostContent.trim().length > 0;
    const hasPlan = newPostAttachedPlan !== null;
    if ((!hasText && !hasPlan) || isCreatingPost || isUploadingNewPostMedia) {
      return;
    }

    const contentToPost = newPostContent.trim();

    const createPostWithMedia = (mediaIds?: string[]) => {
      createPost(
        {
          communityId,
          content: contentToPost,
          ...(mediaIds && mediaIds.length > 0 ? { mediaIds } : {}),
          ...(newPostAttachedPlan
            ? { planId: newPostAttachedPlan.planId }
            : {}),
        },
        {
          onSuccess: (newPost) => {
            setNewPostContent("");
            setNewPostAttachedPlan(null);
            newPostMedia.clear();
            addAnimatingPost(newPost.id);
            setTimeout(() => {
              scrollToTop();
              setTimeout(() => {
                removeAnimatingPost(newPost.id);
              }, ANIMATION_DELAY);
            }, SCROLL_DELAY);
          },
          onError: (error) => {
            if (
              isAxiosError<{ message?: string }>(error) &&
              error.response?.status === 400
            ) {
              toast.error(
                "Plan not found or you do not have access to attach it",
              );
            }
          },
        },
      );
    };
    if (newPostMedia.file) {
      uploadPostMedia(
        {
          communityId,
          file: newPostMedia.file,
        },
        {
          onSuccess: (uploadedMedia) => {
            createPostWithMedia([uploadedMedia.id]);
          },
          onError: (error) => {
            const message = getUploadErrorMessage(error);
            if (message) {
              toast.error(message);
            }
          },
        },
      );
    } else {
      createPostWithMedia();
    }
  }, [
    newPostContent,
    newPostAttachedPlan,
    isCreatingPost,
    isUploadingNewPostMedia,
    communityId,
    createPost,
    uploadPostMedia,
    newPostMedia.file,
    newPostMedia.clear,
    addAnimatingPost,
    removeAnimatingPost,
    scrollToTop,
  ]);


  const handleDeletePost = useCallback(
    (postId: string) => {
      setDeletingPostId(postId);
      deletePost(
        {
          communityId,
          postId,
        },
        {
          onSuccess: () => {
            setTimeout(() => {
              setDeletingPostId(null);
            }, DELETE_ANIMATION_DELAY);
          },
          onError: () => {
            setDeletingPostId(null);
          },
        },
      );
    },
    [communityId, deletePost],
  );


  const handleFocusPostInput = useCallback(() => {
    postTextareaRef.current?.focus();
    scrollToTop();
  }, [scrollToTop]);


  const currentUserName = useMemo(
    () => formatUserName(currentUser?.firstName, currentUser?.lastName, "You"),
    [currentUser?.firstName, currentUser?.lastName],
  );

  const currentUserProfilePicture = currentUser?.profilePicture || null;

  return (
    <div className="flex h-full flex-col gap-2 overflow-hidden xl:gap-4">
      <div className="flex shrink-0 items-start justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Feed</h2>
          <p className="text-sm text-muted-foreground">
            {community?.stats?.members !== undefined
              ? `${community.stats.members} ${community.stats.members === 1 ? "member" : "members"}`
              : "Community feed"}
          </p>
        </div>
        {!isMember && onJoin && (
          <Button
            type="button"
            variant="primary"
            onClick={onJoin}
            disabled={isJoining || requestStatus === MemberRequestStatus.PENDING}
            className={twMerge(
              "px-4 py-1.5 text-sm font-semibold",
              (isJoining || requestStatus === MemberRequestStatus.PENDING) &&
                "cursor-not-allowed hover:cursor-not-allowed",
            )}
          >
            {isJoining
              ? "Joining..."
              : requestStatus === MemberRequestStatus.PENDING
                ? "Request Pending"
                : "Join Community"}
          </Button>
        )}
        {!isMember && !onJoin && (
          <p className="text-sm text-destructive">
            You are banned from this community.
          </p>
        )}
      </div>

      <div
        ref={scrollContainerRef}
        className="scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent flex-1 overflow-y-auto"
      >
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 py-6">
        {isMember && currentUser && canCreatePost && (
          <PostComposer
            currentUserName={currentUserName}
            currentUserFirstName={currentUser.firstName}
            currentUserLastName={currentUser.lastName}
            currentUserProfilePicture={currentUserProfilePicture}
            currentUserId={currentUser.id}
            content={newPostContent}
            onChange={setNewPostContent}
            onSubmit={handleCreatePost}
            onCancel={() => {
              setNewPostContent("");
              setNewPostAttachedPlan(null);
              newPostMedia.clear();
            }}
            textareaRef={postTextareaRef}
            media={{
              inputRef: newPostMedia.inputRef,
              previewUrl: newPostMedia.previewUrl,
              type: newPostMedia.type,
              handleSelect: newPostMedia.handleSelect,
              clear: newPostMedia.clear,
            }}
            isCreatingPost={isCreatingPost}
            isUploadingMedia={isUploadingMedia}
            attachedPlan={newPostAttachedPlan}
            onAttachPlan={setNewPostAttachedPlan}
            onClearAttachedPlan={() => setNewPostAttachedPlan(null)}
          />
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Spinner />
          </div>
        )}

        {!isLoading && error && (
          <div className="flex items-center justify-center py-12">
            <div className="text-sm text-destructive">Error loading posts</div>
          </div>
        )}

        {!isLoading && !error && (!posts || posts.length === 0) && (
          <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <span className="h-[10px] w-[10px] rounded-full bg-yellow" />
            </div>
            <div className="flex flex-col items-center gap-1">
              <p className="text-base font-semibold text-foreground">No posts yet</p>
              <p className="text-compact text-muted-foreground">
                {isMember && canCreatePost
                  ? "Be the first to share something with the community!"
                  : "No posts have been shared yet"}
              </p>
            </div>
            {isMember && canCreatePost && (
              <Button variant="secondary" onClick={handleFocusPostInput}>
                Create first post
              </Button>
            )}
          </div>
        )}

        {!isLoading && !error && posts && posts.length > 0 && (
          <>
            <AnimatePresence mode="popLayout">
              {posts.map((post) => {
                const isNewPost = animatingPostIds.has(post.id);
                const isDeleting = post.id === deletingPostId;
                const isEditing = editingPostId === post.id;

                const isAuthor = currentUser && post.userId === currentUser.id;

                const currentUserMember = community?.members.find(
                  (member: { userId: string; role: CommunityMemberRole }) =>
                    member.userId === currentUser?.id,
                );
                const currentUserRole = currentUserMember?.role;

                const postAuthorMember = community?.members.find(
                  (member: { userId: string; role: CommunityMemberRole }) =>
                    member.userId === post.userId,
                );
                const postAuthorRole = postAuthorMember?.role;

                const canBanOrRemove = canBanOrRemoveMember(
                  currentUserRole,
                  currentUser?.id,
                  post.userId,
                  postAuthorRole,
                );

                const handleBanPostAuthor = () => {
                  if (onBanUser && post.user) {
                    onBanUser(post.userId, post.user);
                  }
                };

                const handleRemovePostAuthor = () => {
                  if (onRemoveUser && post.user) {
                    const fullName = formatUserName(
                      post.user.firstName,
                      post.user.lastName,
                    );
                    onRemoveUser(post.userId, fullName);
                  }
                };

                const canReport = !!currentUser && isMember && !isAuthor;

                const canStartConversation =
                  currentUser &&
                  post.user?.id &&
                  post.user.id !== currentUser.id &&
                  isMember &&
                  canCreateDirectChat &&
                  onConversationCreated;

                return (
                  <motion.div
                    key={post.id}
                    data-post-id={post.id}
                    layout
                    initial={getAnimationInitial(isNewPost)}
                    animate={getAnimationAnimate({ isDeleting, isNewPost })}
                    exit={ANIMATION_VARIANTS.exit}
                    transition={TRANSITION_CONFIG}
                  >
                    <FlaggedContentContainer
                      isFlagged={!!post.isSafetyRisk}
                      canViewFlaggedContent={canModerate}
                      className="rounded-lg"
                      obfuscationLevel="strong"
                      showViewerTooltip={false}
                    >
                      <div className="overflow-hidden rounded-[var(--radius)] border border-border bg-card p-6 shadow-[var(--shadow)] transition-[background,border-color] duration-150 hover:border-border/80 hover:bg-muted/20">
                        <div className="flex items-start gap-4">
                          <PostHeaderAvatar
                            post={post}
                            canStartConversation={!!canStartConversation}
                            onStartConversation={() => startConversation(post.userId)}
                            isCreatingChat={isCreatingChat}
                          />
                          <div className="min-w-0 flex-1">
                            <PostHeader
                              post={post}
                              currentUserId={currentUser?.id}
                              canStartConversation={!!canStartConversation}
                              onStartConversation={() => startConversation(post.userId)}
                              isCreatingChat={isCreatingChat}
                              onEdit={() => handleStartEdit(post)}
                              onDelete={() => handleDeletePost(post.id)}
                              onReport={
                                canReport ? () => handleReportPost(post.id) : undefined
                              }
                              canModerate={canModerate}
                              {...(postAuthorRole !== undefined
                                ? { postAuthorRole }
                                : {})}
                              {...(canBanOrRemove ? { onBan: handleBanPostAuthor } : {})}
                              {...(canBanOrRemove
                                ? { onRemove: handleRemovePostAuthor }
                                : {})}
                              {...(bannedUserIds ? { bannedUserIds } : {})}
                            />
                            {isEditing ? (
                              <PostEditForm
                                post={post}
                                editPostContent={editPostContent}
                                onEditContentChange={setEditPostContent}
                                onEditKeyDown={(event) =>
                                  handleEditPostKeyDown(event, post.id)
                                }
                                onSave={() => handleSavePostEdit(post.id)}
                                onCancel={handleCancelPostEdit}
                                textareaRef={editPostTextareaRef}
                                removingMediaFromEdit={removingMediaFromEdit}
                                onRemoveMedia={() => setRemovingMediaFromEdit(true)}
                                onUndoRemoveMedia={() =>
                                  setRemovingMediaFromEdit(false)
                                }
                                editPostMedia={editPostMedia}
                                onMediaSelect={handleEditMediaSelect}
                                isUpdatingPost={isUpdatingPost}
                                isUploadingMedia={isUploadingMedia}
                              />
                            ) : (
                              <CommunityPostBody
                                content={post.content || ""}
                                plan={post.plan}
                                media={post.media}
                                onImageClick={handleImageClick}
                              />
                            )}
                            <div className="mb-3">
                              <PostReactions
                                reactions={getPostReactions(post)}
                                communityId={communityId}
                                postId={post.id}
                                isMember={isMember}
                              />
                            </div>
                            {!commentsDisabled && (
                              <div className="flex gap-6 text-sm">
                                <button className="flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground">
                                  <span className="font-medium">
                                    {getPostCommentsCount(post)}
                                  </span>
                                  <span className="text-muted-foreground">Comments</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                        <PostComments
                          className="sm:ml-16"
                          comments={getPostComments(post)}
                          totalDirectComments={getPostDirectCommentsCount(post)}
                          postId={post.id}
                          communityId={communityId}
                          isCreatingComment={isCreatingComment}
                          isMember={isMember}
                          canModerate={canModerate}
                          community={community}
                          commentsDisabled={commentsDisabled}
                          canCreateDirectChat={canCreateDirectChat}
                          {...(onBanUser ? { onBanUser } : {})}
                          {...(onRemoveUser ? { onRemoveUser } : {})}
                          {...(conversations &&
                            conversations.length > 0 && { conversations })}
                          {...(onConversationCreated && {
                            onConversationCreated,
                          })}
                          {...(bannedUserIds ? { bannedUserIds } : {})}
                          onAddComment={(content, parentId, onSuccess) => {
                            createComment(
                              {
                                communityId,
                                postId: post.id,
                                content,
                                parentId: parentId ?? undefined,
                              },
                              {
                                onSuccess: (newComment) => {
                                  onSuccess?.(newComment);
                                },
                              },
                            );
                          }}
                        />
                      </div>
                    </FlaggedContentContainer>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            {isFetchingNextPage && (
              <div className="flex justify-center py-4">
                <Spinner />
              </div>
            )}
          </>
        )}
        </div>
      </div>

      {previewImageUrl && (
        <ImagePreviewModal
          imageUrl={previewImageUrl}
          onClose={handleClosePreview}
        />
      )}

      {reportingPostId && (
        <ReportModal
          isOpen={!!reportingPostId}
          onClose={handleCloseReportModal}
          onSubmit={handleSubmitReport}
          title="Report post"
        />
      )}
    </div>
  );
}
