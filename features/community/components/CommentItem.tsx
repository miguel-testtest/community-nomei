import { useEffect, useRef, useState } from "react";
import { twMerge } from "tailwind-merge";
import { PostComment } from "@/api/community/community.types";
import { Textarea } from "@/components/UI/TextArea";
import { LuReply } from "react-icons/lu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/UI/Tooltip";
import { formatDateTime } from "@/lib/utils";
import { LuPencil } from "react-icons/lu";
import { useCommentReplies } from "@/api/community/queries/useCommentReplies";
import { Spinner } from "@/components/common/Spinner";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { HiOutlineDotsVertical } from "react-icons/hi";
import { HiExclamationTriangle } from "react-icons/hi2";
import { LuBan, LuTrash2 } from "react-icons/lu";
import { useCurrentUser } from "@/api/user/queries/useCurrentUser";
import { CommunityMemberRole } from "@/api/community/enums/community-member-role.enum";
import { useDeleteComment } from "@/api/community/mutations/useDeleteComment";
import { useUpdateComment } from "@/api/community/mutations/useUpdateComment";
import { formatUserName } from "../utils/userHelpers";
import { Avatar } from "@/components/common/Avatar";
import { useRelativeTime } from "@/hooks/useRelativeTime";
import { useCreateCommentReport } from "@/api/community/mutations/useCreateCommentReport";
import { ReportModal } from "./ReportModal";
import { toast } from "react-hot-toast";
import {
  useCreateConversation,
  convertToConversation,
} from "@/api/community/mutations/useCreateConversation";
import { Conversation } from "@/api/community/community.types";
import { CommunityConversationType } from "@/api/community/enums/community-conversation-type.enum";
import { FlaggedContentContainer } from "./FlaggedContentContainer";
import { CommentReactions } from "./CommentReactions";

interface CommentItemProps {
  comment: PostComment;
  isReply?: boolean;
  depth?: number;
  communityId: string;
  postId: string;
  replyingTo: string | null;
  replyContent: string;
  isCreatingComment: boolean;
  onUpdateComment: (updated: PostComment) => void;
  onDeleteComment: (commentId: string) => void;
  onReplyClick: (id: string) => void;
  onCancelReply: () => void;
  onReplyContentChange: (value: string) => void;
  onSubmitReply: () => void;
  onLoadMoreReplies: (commentId: string) => void;
  isLoadingReplies: boolean;
  currentRepliesSkip: number;
  onRepliesLoaded: (commentId: string, newSkip: number) => void;
  replyInputRef: React.RefObject<HTMLTextAreaElement | null>;
  handleKeyDown: (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    onSubmit: () => void,
    onCancel?: () => void,
  ) => void;
  isMember?: boolean | undefined;
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

interface CommentTimestampProps {
  createdAt: string;
}

function CommentTimestamp({ createdAt }: CommentTimestampProps) {
  const relativeTime = useRelativeTime(createdAt);
  return (
    <span className="cursor-default text-xs text-muted-foreground">{relativeTime}</span>
  );
}

const MAX_DEPTH = 2;

export function CommentItem({
  comment,
  isReply = false,
  depth = 0,
  communityId,
  postId,
  replyingTo,
  replyContent,
  isCreatingComment,
  onUpdateComment,
  onDeleteComment,
  onReplyClick,
  onCancelReply,
  onReplyContentChange,
  onSubmitReply,
  onLoadMoreReplies,
  isLoadingReplies,
  currentRepliesSkip,
  onRepliesLoaded,
  replyInputRef,
  handleKeyDown,
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
}: CommentItemProps) {
  const { data: currentUser } = useCurrentUser();
  const { mutate: deleteComment } = useDeleteComment();
  const { mutate: updateComment, isPending: isUpdatingComment } =
    useUpdateComment();
  const { mutate: createCommentReport } = useCreateCommentReport();
  const { mutate: createConversation, isPending: isCreatingChat } =
    useCreateConversation();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [isReporting, setIsReporting] = useState(false);
  const editInputRef = useRef<HTMLTextAreaElement>(null);
  const userName = formatUserName(
    comment.user?.firstName,
    comment.user?.lastName,
  );
  const profilePicture = comment.user?.profilePicture;
  const isCurrentUserComment = currentUser && comment.userId === currentUser.id;

  const commentAuthorMember = community?.members.find(
    (member: { userId: string; role: CommunityMemberRole }) =>
      member.userId === comment.userId,
  );
  const commentAuthorRole = commentAuthorMember?.role;
  const isBanned = bannedUserIds?.has(comment.userId) ?? false;

  const canBanOrRemove =
    canModerate &&
    !!currentUser &&
    comment.userId !== currentUser.id &&
    commentAuthorRole !== CommunityMemberRole.OWNER;

  const handleBanCommentAuthor = () => {
    if (onBanUser && comment.user) {
      onBanUser(comment.userId, comment.user);
    }
  };

  const handleRemoveCommentAuthor = () => {
    if (onRemoveUser && comment.user) {
      const fullName = formatUserName(
        comment.user.firstName,
        comment.user.lastName,
      );
      onRemoveUser(comment.userId, fullName);
    }
  };
  const isReplyingToThis = replyingTo === comment.id;
  const totalReplies = comment.stats?.replies || 0;
  const loadedRepliesCount = comment.replies?.length || 0;
  const hasMoreReplies = totalReplies > loadedRepliesCount;
  const canReply = depth < MAX_DEPTH;
  const isFlaggedForViewer = !!comment.isSafetyRisk && !canModerate;

  const handleReportComment = () => {
    setIsReporting(true);
  };

  const handleCloseReportModal = () => {
    setIsReporting(false);
  };

  const handleSubmitReport = async (reason: string) => {
    createCommentReport(
      {
        communityId,
        postId,
        commentId: comment.id,
        reason,
      },
      {
        onSuccess: () => {
          toast.success("Report submitted. Thanks for your feedback.");
          setIsReporting(false);
        },
        onError: () => {
          toast.error("Failed to submit report. Please try again.");
        },
      },
    );
  };

  const { data: repliesResponse } = useCommentReplies({
    communityId,
    postId,
    commentId: comment.id,
    skip: currentRepliesSkip,
    take: COMMENTS_PER_PAGE,
    enabled: isLoadingReplies && hasMoreReplies,
  });

  const lastProcessedRepliesRef = useRef<string | null>(null);
  const commentRef = useRef(comment);
  const onUpdateCommentRef = useRef(onUpdateComment);
  const onRepliesLoadedRef = useRef(onRepliesLoaded);

  useEffect(() => {
    commentRef.current = comment;
  }, [comment]);

  useEffect(() => {
    onUpdateCommentRef.current = onUpdateComment;
    onRepliesLoadedRef.current = onRepliesLoaded;
  }, [onUpdateComment, onRepliesLoaded]);

  useEffect(() => {
    if (!repliesResponse || !repliesResponse.items.length) return;

    const currentComment = commentRef.current;
    const repliesKey = `${currentComment.id}-${currentRepliesSkip}-${repliesResponse.items.length}`;
    if (lastProcessedRepliesRef.current === repliesKey) return;

    const combinedReplies = [...(currentComment.replies || []), ...repliesResponse.items];
    const sortedReplies = [...combinedReplies].sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateA - dateB;
    });

    const updatedComment = {
      ...currentComment,
      replies: sortedReplies,
    };
    onUpdateCommentRef.current(updatedComment);
    onRepliesLoadedRef.current(
      currentComment.id,
      currentRepliesSkip + repliesResponse.items.length,
    );
    lastProcessedRepliesRef.current = repliesKey;
  }, [repliesResponse, currentRepliesSkip]);

  const handleSaveEdit = () => {
    if (!editContent.trim() || isUpdatingComment) return;
    updateComment(
      {
        communityId,
        postId,
        commentId: comment.id,
        content: editContent.trim(),
      },
      {
        onSuccess: (updated) => {
          onUpdateComment(updated);
          setIsEditing(false);
          setEditContent("");
        },
      },
    );
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditContent("");
  };

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit();
    }
    if (e.key === "Escape") {
      handleCancelEdit();
    }
  };

  const handleOpenChatWithUser = () => {
    if (isFlaggedForViewer) return;
    if (!currentUser || !onConversationCreated || isCreatingChat || !canCreateDirectChat) return;
    if (comment.userId === currentUser.id) {
      toast.error("You cannot start a chat with yourself");
      return;
    }

    const existingDM = conversations?.find((conv) => {
      if (conv.type !== CommunityConversationType.ONE_ON_ONE) return false;
      const participantIds = conv.participants.map((p) => p.userId);
      return (
        participantIds.includes(currentUser.id) &&
        participantIds.includes(comment.userId) &&
        participantIds.length === 2
      );
    });

    if (existingDM) {
      onConversationCreated(existingDM);
      return;
    }

    createConversation(
      {
        communityId,
        payload: {
          type: CommunityConversationType.ONE_ON_ONE,
          participantIds: [comment.userId],
        },
      },
      {
        onSuccess: (data) => {
          const conversation = convertToConversation(data);
          onConversationCreated(conversation);
        },
        onError: () => {
          toast.error("Failed to create chat. Please try again.");
        },
      },
    );
  };

  return (
    <div
      data-comment-id={comment.id}
      className={twMerge(
        "relative flex w-full items-start gap-3",
        isReply && "mt-3 sm:pl-11",
      )}
    >
      {isReply && (
        <>
          <div className="bg-zen-pearl-dark absolute top-0 bottom-0 left-0 -ml-[44px] w-0.5 max-sm:hidden"></div>
          <div className="bg-zen-pearl-dark absolute top-4 left-0 -ml-[44px] h-0.5 w-[44px] max-sm:hidden"></div>
        </>
      )}
      {currentUser &&
      comment.user?.id &&
      comment.user.id !== currentUser.id &&
      isMember &&
      canCreateDirectChat &&
      onConversationCreated &&
      !isFlaggedForViewer ? (
        <Tooltip delayDuration={500}>
          <TooltipTrigger asChild>
            <button
              onClick={handleOpenChatWithUser}
              disabled={isCreatingChat}
              className={twMerge(
                "cursor-pointer transition-opacity hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed",
              )}
              aria-label={`Send message to ${userName}`}
            >
              <Avatar
                firstName={comment.user?.firstName}
                lastName={comment.user?.lastName}
                profilePicture={profilePicture}
                userId={comment.user?.id}
                size="sm"
                alt={userName}
              />
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Click to send a message</p>
          </TooltipContent>
        </Tooltip>
      ) : (
        <Avatar
          firstName={comment.user?.firstName}
          lastName={comment.user?.lastName}
          profilePicture={profilePicture}
          userId={comment.user?.id}
          size="sm"
          alt={userName}
        />
      )}

      <div className="min-w-0 flex-1">
        <div>
          <FlaggedContentContainer
            isFlagged={!!comment.isSafetyRisk}
            canViewFlaggedContent={canModerate}
            className="rounded-lg"
          >
            <div>
              <div className={twMerge(
                "rounded-xl border border-border bg-muted/40 p-3 transition-colors duration-150 hover:bg-muted/70",
                isReply && "max-sm:rounded-l-none max-sm:border-l-2 max-sm:border-l-emerald-400/50",
              )}>
                <div className="mb-1.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
                {currentUser &&
                comment.user?.id &&
                comment.user.id !== currentUser.id &&
                isMember &&
                canCreateDirectChat &&
                onConversationCreated &&
                !isFlaggedForViewer ? (
                  <Tooltip delayDuration={500}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={handleOpenChatWithUser}
                        disabled={isCreatingChat}
                        className={twMerge(
                          "text-foreground text-sm font-semibold text-left cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
                        )}
                        aria-label={`Send message to ${userName}`}
                      >
                        {userName}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Click to send a message</p>
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <span className="text-foreground text-sm font-semibold">
                    {userName}
                  </span>
                )}
                <div className="ml-auto flex shrink-0 items-center gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1.5">
                        <CommentTimestamp createdAt={comment.createdAt} />
                        {comment.isEdited && (
                          <LuPencil
                            size={10}
                            className="text-muted-foreground/70"
                            aria-label="Edited"
                          />
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="flex flex-col gap-1">
                        <span>{formatDateTime(comment.createdAt)}</span>
                        {comment.isEdited && (
                          <span className="text-xs text-muted-foreground/70">Edited</span>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                  {(isCurrentUserComment || (isMember && !isCurrentUserComment)) &&
                    !isFlaggedForViewer && (
                    <Menu as="div" className="relative">
                      <MenuButton className="text-muted-foreground/70 hover:text-muted-foreground">
                        <HiOutlineDotsVertical
                          size={16}
                          className="cursor-pointer"
                        />
                      </MenuButton>
                      <MenuItems className="absolute right-0 z-10 mt-2 w-32 origin-top-right rounded-xl bg-card shadow-lg">
                        <div className="py-1">
                          {isCurrentUserComment ? (
                            <>
                              <MenuItem>
                                {({ focus }) => (
                                  <button
                                    className={twMerge(
                                      "text-foreground flex w-full cursor-pointer items-center px-4 py-2 text-sm",
                                      focus && "bg-foreground/4",
                                    )}
                                    onClick={() => {
                                      setIsEditing(true);
                                      setEditContent(comment.content);
                                      setTimeout(() => {
                                        editInputRef.current?.focus();
                                      }, 0);
                                    }}
                                  >
                                    Edit
                                  </button>
                                )}
                              </MenuItem>
                              <MenuItem>
                                {({ focus }) => (
                                  <button
                                    className={twMerge(
                                      "flex w-full cursor-pointer items-center px-4 py-2 text-sm text-red-600",
                                      focus && "bg-red-50",
                                    )}
                                    onClick={() => {
                                      deleteComment(
                                        {
                                          communityId,
                                          postId,
                                          commentId: comment.id,
                                        },
                                        {
                                          onSuccess: () => {
                                            onDeleteComment(comment.id);
                                          },
                                        },
                                      );
                                    }}
                                  >
                                    Delete
                                  </button>
                                )}
                              </MenuItem>
                            </>
                          ) : (
                            <>
                              {isMember && (
                                <MenuItem>
                                  {({ focus }) => (
                                    <button
                                      className={twMerge(
                                        "flex w-full cursor-pointer items-center gap-2 px-4 py-2 text-sm text-orange-600",
                                        focus && "bg-orange-50",
                                      )}
                                      onClick={handleReportComment}
                                    >
                                      <HiExclamationTriangle className="h-4 w-4" />
                                      Report
                                    </button>
                                  )}
                                </MenuItem>
                              )}
                              {canBanOrRemove && onBanUser && !isBanned && (
                                <MenuItem>
                                  {({ focus }) => (
                                    <button
                                      className={twMerge(
                                        "flex w-full cursor-pointer items-center gap-2 px-4 py-2 text-sm text-red-600",
                                        focus && "bg-red-50",
                                      )}
                                      onClick={handleBanCommentAuthor}
                                    >
                                      <LuBan className="h-4 w-4" />
                                      Ban user
                                    </button>
                                  )}
                                </MenuItem>
                              )}
                              {canBanOrRemove && onRemoveUser && (
                                <MenuItem>
                                  {({ focus }) => (
                                    <button
                                      className={twMerge(
                                        "flex w-full cursor-pointer items-center gap-2 px-4 py-2 text-sm text-red-600",
                                        focus && "bg-red-50",
                                      )}
                                      onClick={handleRemoveCommentAuthor}
                                    >
                                      <LuTrash2 className="h-4 w-4" />
                                      Remove user
                                    </button>
                                  )}
                                </MenuItem>
                              )}
                            </>
                          )}
                        </div>
                      </MenuItems>
                    </Menu>
                  )}
                </div>
              </div>
              {isEditing ? (
                <div className="mt-2">
                  <Textarea
                    ref={editInputRef}
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    onKeyDown={handleEditKeyDown}
                    className="mb-2 w-full text-sm"
                    fullWidth
                    rows={2}
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={handleCancelEdit}
                      disabled={isUpdatingComment}
                      className="px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      disabled={!editContent.trim() || isUpdatingComment}
                      className="bg-accent text-foreground hover:bg-primary-hover rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isUpdatingComment ? "Saving..." : "Save"}
                    </button>
                  </div>
                </div>
              ) : (
                <p
                  className="text-sm leading-relaxed break-words whitespace-pre-wrap text-foreground/70"
                  style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}
                >
                  {comment.content || ""}
                </p>
              )}

                <CommentReactions
                  reactions={comment.reactions || []}
                  communityId={communityId}
                  postId={postId}
                  commentId={comment.id}
                  className="mt-2"
                  isMember={isMember && !isFlaggedForViewer}
                  showContainer={true}
                  showAddButton={true}
                  onReactionsChange={(reactions) => {
                    onUpdateComment({
                      ...comment,
                      reactions,
                    });
                  }}
                />
              </div>

              {!commentsDisabled &&
                !isFlaggedForViewer &&
                (isMember && canReply ? (
                  <button
                    onClick={() => onReplyClick(comment.id)}
                    className="hover:text-accent mt-2 flex items-center gap-1 text-xs text-muted-foreground transition-colors"
                  >
                    <LuReply size={14} />
                    <span>Reply</span>
                  </button>
                ) : canReply ? null : (
                  <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground/70">
                    <LuReply size={14} />
                    <span>Maximum reply depth reached</span>
                  </div>
                ))}

              {isReplyingToThis &&
                isMember &&
                !commentsDisabled &&
                !isFlaggedForViewer && (
                  <div className="border-accent mt-3 ml-0 border-l-2 pl-3">
                    <div className="mb-2 text-xs text-muted-foreground">
                      Replying to{" "}
                      <span className="text-accent font-semibold">{userName}</span>
                    </div>
                    <div className="flex items-end gap-2">
                      <div className="flex-1">
                        <Textarea
                          ref={replyInputRef}
                          value={replyContent}
                          onChange={(e) => onReplyContentChange(e.target.value)}
                          onKeyDown={(e) =>
                            handleKeyDown(e, onSubmitReply, onCancelReply)
                          }
                          placeholder="Write a reply..."
                          className="w-full text-sm"
                          fullWidth
                          rows={1}
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={onSubmitReply}
                          disabled={!replyContent.trim() || isCreatingComment}
                          className="bg-accent text-foreground hover:bg-primary-hover rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isCreatingComment ? "Replying..." : "Reply"}
                        </button>
                        <button
                          onClick={onCancelReply}
                          disabled={isCreatingComment}
                          className="px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}
            </div>
          </FlaggedContentContainer>
        </div>

        {comment.replies && comment.replies.length > 0 && (
          <div className="relative mt-3 pl-0">
            <div className="bg-zen-pearl-dark absolute top-0 bottom-0 left-0 -ml-[44px] w-0.5 max-sm:hidden"></div>
            {comment.replies.map((reply) => (
              <div key={reply.id} className="relative">
                <CommentItem
                  comment={reply}
                  isReply={true}
                  depth={depth + 1}
                  communityId={communityId}
                  postId={postId}
                  replyingTo={replyingTo}
                  replyContent={replyContent}
                  isCreatingComment={isCreatingComment}
                  onUpdateComment={(updated) => {
                    const updatedComment = {
                      ...comment,
                      replies:
                        comment.replies?.map((r) =>
                          r.id === updated.id ? updated : r,
                        ) || [],
                    };
                    onUpdateComment(updatedComment);
                  }}
                  onDeleteComment={(deletedId) => {
                    const updatedComment = {
                      ...comment,
                      replies:
                        comment.replies?.filter((r) => r.id !== deletedId) ||
                        [],
                      stats: {
                        ...comment.stats,
                        replies: Math.max(0, (comment.stats?.replies || 0) - 1),
                      },
                    };
                    onUpdateComment(updatedComment);
                  }}
                  onReplyClick={onReplyClick}
                  onCancelReply={onCancelReply}
                  onReplyContentChange={onReplyContentChange}
                  onSubmitReply={onSubmitReply}
                  onLoadMoreReplies={onLoadMoreReplies}
                  isLoadingReplies={false}
                  currentRepliesSkip={0}
                  onRepliesLoaded={onRepliesLoaded}
                  replyInputRef={replyInputRef}
                  handleKeyDown={handleKeyDown}
                  isMember={isMember}
                  canModerate={canModerate}
                  commentsDisabled={commentsDisabled}
                  canCreateDirectChat={canCreateDirectChat}
                  {...(community ? { community } : {})}
                  {...(onBanUser ? { onBanUser } : {})}
                  {...(onRemoveUser ? { onRemoveUser } : {})}
                  {...(bannedUserIds ? { bannedUserIds } : {})}
                  {...(conversations && conversations.length > 0 && { conversations })}
                  {...(onConversationCreated && { onConversationCreated })}
                />
              </div>
            ))}
          </div>
        )}

        {hasMoreReplies && !isReply && !isFlaggedForViewer && (
          <div className="mt-3">
            <button
              onClick={() => onLoadMoreReplies(comment.id)}
              disabled={isLoadingReplies}
              className="group flex items-center gap-1.5 text-xs font-medium text-emerald-500 transition-colors hover:text-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoadingReplies ? (
                <>
                  <Spinner size={14} />
                  <span>Loading...</span>
                </>
              ) : (
                <span className="group-hover:underline">
                  {loadedRepliesCount === 0
                    ? `View replies (${totalReplies})`
                    : `View more replies (${totalReplies - loadedRepliesCount} more)`}
                </span>
              )}
            </button>
          </div>
        )}
      </div>

      {isReporting && (
        <ReportModal
          isOpen={isReporting}
          onClose={handleCloseReportModal}
          onSubmit={handleSubmitReport}
          title="Report comment"
        />
      )}
    </div>
  );
}
