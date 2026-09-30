import { useCallback, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "react-router";
import { Spinner } from "@/components/common/Spinner";
import { PostComments } from "./PostComments";
import { PostReactions } from "./PostReactions";
import { useCurrentUser } from "@/api/user/queries/useCurrentUser";
import { useCreatePostComment } from "@/api/community/mutations/useCreatePostComment";
import { useDeletePost } from "@/api/community/mutations/useDeletePost";
import { ReportModal } from "./ReportModal";
import { Button } from "@/components/common/Button";
import { CommunityMemberRole } from "@/api/community/enums/community-member-role.enum";
import {
  getPostCommentsCount,
  getPostReactions,
} from "../utils/postHelpers";
import { Post, PostComment, UserBasicInfo } from "@/api/community/community.types";
import { usePost } from "@/api/community/queries/usePost";
import { usePostComments } from "@/api/community/queries/usePostComments";
import { Conversation } from "@/api/community/community.types";
import { countMainComments } from "../utils/commentHelpers";
import { useStartConversation } from "../hooks/useStartConversation";
import { ImagePreviewModal } from "./ImagePreviewModal";
import { CommunityPostBody } from "./CommunityPostBody";
import { PostHeader, PostHeaderAvatar } from "./PostHeader";
import { useImagePreview } from "../hooks/useImagePreview";
import { usePostReport } from "../hooks/usePostReport";
import { usePostModeration } from "../hooks/usePostModeration";
import { usePostEdit } from "../hooks/usePostEdit";
import { PostEditForm } from "./PostEditForm";
import { LuArrowLeft } from "react-icons/lu";
import { FlaggedContentContainer } from "./FlaggedContentContainer";

interface PostDetailProps {
  communityId: string;
  postId: string;
  isMember?: boolean;
  canModerate?: boolean;
  community?: {
    members: Array<{
      userId: string;
      role: CommunityMemberRole;
    }>;
  };
  onBanUser?: (userId: string, user: UserBasicInfo) => void;
  onRemoveUser?: (userId: string, fullName: string) => void;
  conversations?: Conversation[];
  onConversationCreated?: (conversation: Conversation) => void;
  bannedUserIds?: Set<string>;
  canCreateDirectChat?: boolean;
}


export function PostDetail({
  communityId,
  postId,
  isMember = true,
  canModerate = false,
  community,
  onBanUser,
  onRemoveUser,
  conversations = [],
  onConversationCreated,
  bannedUserIds,
  canCreateDirectChat = true,
}: PostDetailProps) {
  const [searchParams, setSearchParams] = useSearchParams();
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


  const { previewImageUrl, handleImageClick, handleClosePreview } =
    useImagePreview();

  const {
    reportingPostId,
    handleReportPost,
    handleCloseReportModal,
    handleSubmitReport,
  } = usePostReport({ communityId });

  const { data: post, isLoading: isLoadingPost, error: postError } = usePost({
    communityId,
    postId,
  });

  const totalComments = post?.stats?.totalComments || 0;
  const initialComments = post?.comments || [];

  const { data: commentsResponse, isLoading: isLoadingComments } =
    usePostComments({
      communityId,
      postId,
      skip: initialComments.length,
      take: Math.max(100, totalComments - initialComments.length),
      enabled: !!post && totalComments > initialComments.length,
    });

  const allComments = useMemo(() => {
    if (commentsResponse?.items && commentsResponse.items.length > 0) {
      return [...initialComments, ...commentsResponse.items];
    }
    return initialComments;
  }, [initialComments, commentsResponse?.items]);

  const commentId = searchParams.get("commentId");
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!commentId || isLoadingComments) return;

    const findCommentInTree = (
      comments: typeof allComments,
      targetId: string,
    ): boolean => {
      for (const comment of comments) {
        if (comment.id === targetId) return true;
        if (comment.replies && findCommentInTree(comment.replies, targetId)) {
          return true;
        }
      }
      return false;
    };

    const scrollToComment = () => {
      const scrollContainer = scrollContainerRef.current;
      if (!scrollContainer) return false;

      const element = scrollContainer.querySelector(
        `[data-comment-id="${commentId}"]`,
      ) as HTMLElement | null;

      if (!element) return false;

      const containerRect = scrollContainer.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      const scrollTop =
        scrollContainer.scrollTop +
        (elementRect.top - containerRect.top) -
        containerRect.height / 2 +
        elementRect.height / 2;

      scrollContainer.scrollTo({
        top: Math.max(0, scrollTop),
        behavior: "smooth",
      });

      element.classList.add("ring-2", "ring-purple-700");
      setTimeout(() => {
        element.classList.remove("ring-2", "ring-purple-700");
      }, 3000);

      return true;
    };

    const commentExists = findCommentInTree(allComments, commentId);
    if (!commentExists && allComments.length === 0) return;

    const timeoutId = setTimeout(() => {
      if (!scrollToComment()) {
        setTimeout(() => {
          scrollToComment();
        }, 500);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [commentId, allComments, isLoadingComments]);

  const { mutate: createComment, isPending: isCreatingComment } =
    useCreatePostComment();
  const { mutate: deletePost } = useDeletePost();

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

  const handleGoBack = useCallback(() => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete("postId");
    newParams.delete("commentId");
    setSearchParams(newParams, { replace: true });
  }, [searchParams, setSearchParams]);


  const handleDeletePost = useCallback(
    (postId: string) => {
      deletePost(
        {
          communityId,
          postId,
        },
        {
          onSuccess: () => {
            handleGoBack();
          },
        },
      );
    },
    [communityId, deletePost, handleGoBack],
  );

  const currentUserMember = community?.members.find(
    (member: { userId: string; role: CommunityMemberRole }) =>
      member.userId === currentUser?.id,
  );
  const currentUserRole = currentUserMember?.role;

  const {
    postAuthorRole,
    canBanOrRemove,
    handleBanPostAuthor,
    handleRemovePostAuthor,
  } = usePostModeration({
    post: post || ({} as Post),
    currentUserId: currentUser?.id,
    currentUserRole,
    community,
    onBanUser,
    onRemoveUser,
  });

  if (isLoadingPost) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (postError || !post) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <p className="text-red-500">Error loading post</p>
        <Button variant="secondary" onClick={handleGoBack}>
          Go back
        </Button>
      </div>
    );
  }

  const isEditing = editingPostId === post.id;
  const isAuthor = currentUser && post.userId === currentUser.id;

  const canReport = !!currentUser && isMember && !isAuthor;

  const canStartConversation =
    currentUser &&
    post.user?.id &&
    post.user.id !== currentUser.id &&
    isMember &&
    canCreateDirectChat &&
    onConversationCreated;

  const handleAddComment = (
    content: string,
    parentId?: string | null,
    onSuccess?: (newComment: PostComment) => void,
  ) => {
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
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="mb-4 flex items-center gap-3">
        <button
          onClick={handleGoBack}
          className="flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Go back to feed"
        >
          <LuArrowLeft size={20} />
          <span className="text-sm font-medium">Back to feed</span>
        </button>
      </div>

      <div
        ref={scrollContainerRef}
        className="scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent flex-1 overflow-y-auto"
      >
        <div className="mx-auto w-full max-w-4xl px-7 pb-6 md:px-10">
          <FlaggedContentContainer
            isFlagged={!!post.isSafetyRisk}
            canViewFlaggedContent={canModerate}
            className="rounded-lg"
            obfuscationLevel="strong"
            showViewerTooltip={false}
          >
          <div className="overflow-hidden rounded-lg border border-border bg-card p-6 shadow-md">
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
                  {...(postAuthorRole !== undefined ? { postAuthorRole } : {})}
                  {...(canBanOrRemove ? { onBan: handleBanPostAuthor } : {})}
                  {...(canBanOrRemove ? { onRemove: handleRemovePostAuthor } : {})}
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
                    onUndoRemoveMedia={() => setRemovingMediaFromEdit(false)}
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
                <div className="flex gap-6 text-sm">
                  <span className="font-medium text-muted-foreground">
                    {getPostCommentsCount(post)}
                  </span>
                  <span className="text-muted-foreground">Comments</span>
                </div>
                <PostComments
                  comments={allComments}
                  totalDirectComments={countMainComments(allComments)}
                  postId={post.id}
                  communityId={communityId}
                  isCreatingComment={isCreatingComment}
                  isMember={isMember}
                  canModerate={canModerate}
                  community={community}
                  canCreateDirectChat={canCreateDirectChat}
                  {...(onBanUser ? { onBanUser } : {})}
                  {...(onRemoveUser ? { onRemoveUser } : {})}
                  {...(conversations &&
                    conversations.length > 0 && { conversations })}
                  {...(onConversationCreated && {
                    onConversationCreated,
                  })}
                  {...(bannedUserIds ? { bannedUserIds } : {})}
                  onAddComment={handleAddComment}
                />
                {isLoadingComments && (
                  <div className="mt-4 flex justify-center">
                    <Spinner />
                  </div>
                )}
              </div>
            </div>
          </div>
          </FlaggedContentContainer>
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

