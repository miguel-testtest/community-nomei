import { useEffect, useRef, useCallback, useState, useLayoutEffect } from "react";
import { twMerge } from "tailwind-merge";
import { motion, AnimatePresence } from "motion/react";
import { ChannelMessage } from "@/api/community/community.types";
import { useChannelMessageThread } from "@/api/community/queries/useChannelMessageThread";
import { useChannelMessageReplyCount } from "@/api/community/queries/useChannelMessageReplyCount";
import { useCommunitySocket } from "../hooks/useCommunitySocket";
import { formatUserName } from "../utils/userHelpers";
import { Avatar } from "@/components/common/Avatar";
import { Spinner } from "@/components/common/Spinner";
import { LuX, LuSend } from "react-icons/lu";
import { toast } from "react-hot-toast";
import { useEditWindowTimer } from "../hooks/useEditWindowTimer";
import { shouldShowTimestamp, formatMessageTime } from "../utils/messageHelpers";
import { formatDateTime } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/UI/Tooltip";
import { MessageReplyPreview } from "./MessageReplyPreview";
import { TRANSITION_CONFIG } from "../utils/animationHelpers";
import { useResponsive } from "@/hooks/useResponsive";
import { Textarea } from "@/components/UI/TextArea";
import { handleTextareaKeyDown } from "../utils/keyboardHelpers";
import { MessageContent } from "./MessageContent";
import { MessageFormatToolbar } from "./MessageFormatToolbar";
import { useMessageReport } from "../hooks/useMessageReport";
import { ReportModal } from "./ReportModal";
import { MessageMenu } from "./MessageMenu";
import { CommunityMemberRole } from "@/api/community/enums/community-member-role.enum";
import { canReplyToMessage } from "../utils/channelReplyHelpers";
import { FlaggedContentContainer, FLAGGED_CONTENT_TOOLTIP_TEXT } from "./FlaggedContentContainer";

interface ChannelThreadPanelProps {
  communityId: string;
  channelId: string;
  channelName: string;
  parentMessage: ChannelMessage;
  currentUserId: string;
  currentUserRole: CommunityMemberRole | null;
  onClose: () => void;
  onMessageSent?: () => void;
  shouldRefetch?: boolean;
}

export function ChannelThreadPanel({
  communityId,
  channelId,
  channelName,
  parentMessage,
  currentUserId,
  currentUserRole,
  onClose,
  onMessageSent,
  shouldRefetch,
}: ChannelThreadPanelProps) {
  const canViewFlaggedContent =
    currentUserRole === CommunityMemberRole.OWNER ||
    currentUserRole === CommunityMemberRole.MODERATOR;
  const isParentMessageBlocked =
    !!parentMessage.isSafetyRisk && !canViewFlaggedContent;
  const canReply = canReplyToMessage(
    channelName,
    currentUserRole,
    parentMessage.userId,
    currentUserId,
  ) && !isParentMessageBlocked;
  const { isMobile } = useResponsive();
  const [replyText, setReplyText] = useState("");
  const replyTextareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const {
    data: threadData,
    isLoading: isLoadingThread,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    refetch: refetchThread,
  } = useChannelMessageThread({
    communityId,
    channelId,
    messageId: parentMessage.id,
  });

  const { data: replyCountData } = useChannelMessageReplyCount({
    communityId,
    channelId,
    messageId: parentMessage.id,
  });

  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editMessageContent, setEditMessageContent] = useState("");
  const [editError, setEditError] = useState<string | null>(null);

  const { sendChannelMessage, editChannelMessage, isConnected } = useCommunitySocket({
    communityId,
    enabled: !!communityId,
    registerListeners: false,
  });

  const handleStartEdit = (message: ChannelMessage) => {
    setEditingMessageId(message.id);
    setEditMessageContent(message.content ?? "");
    setEditError(null);
  };

  const getEditHandler = (message: ChannelMessage) =>
    message.editableUntil && new Date(message.editableUntil) > new Date()
      ? () => handleStartEdit(message)
      : undefined;

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditMessageContent("");
    setEditError(null);
  };

  const handleSaveEdit = (messageId: string) => {
    const trimmed = editMessageContent.trim();
    if (!trimmed) {
      setEditError("Message can't be empty.");
      return;
    }
    if (!isConnected) {
      toast.error("Not connected. Please try again.");
      return;
    }
    editChannelMessage(channelId, messageId, trimmed);
    setEditingMessageId(null);
    setEditMessageContent("");
    setEditError(null);
  };

  const {
    reportingMessageId,
    handleReportMessage,
    handleCloseReportModal,
    handleSubmitReport,
  } = useMessageReport({
    communityId,
    channelId,
  });

  const pages = threadData?.pages ?? [];
  const threadMessages = pages.flatMap((p) => p.items).filter(Boolean);

  const previousShouldRefetchRef = useRef(false);

  useEditWindowTimer(threadMessages);

  useEffect(() => {
    if (shouldRefetch && !previousShouldRefetchRef.current) {
      previousShouldRefetchRef.current = true;
      refetchThread();
    } else if (!shouldRefetch) {
      previousShouldRefetchRef.current = false;
    }
  }, [shouldRefetch, refetchThread]);

  useEffect(() => {
    if (threadMessages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [threadMessages.length]);

  useLayoutEffect(() => {
    const textarea = replyTextareaRef.current;
    if (textarea && !replyText) {
      textarea.style.height = "2.5rem";
    }
  }, [replyText]);

  const handleSendReply = useCallback(() => {
    if (replyText.trim() && isConnected) {
      sendChannelMessage(channelId, replyText.trim(), parentMessage.id);
      setReplyText("");
      setTimeout(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
        onMessageSent?.();
      }, 100);
    }
  }, [replyText, isConnected, sendChannelMessage, channelId, parentMessage.id, onMessageSent]);

  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;

    const container = scrollContainerRef.current;
    const { scrollTop } = container;

    if (scrollTop < 200 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    scrollContainer.addEventListener("scroll", handleScroll);
    return () => scrollContainer.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const renderMessagesContent = () => {
    if (isLoadingThread && threadMessages.length === 0) {
      return (
        <div className="flex items-center justify-center h-full">
          <Spinner />
        </div>
      );
    }

    if (threadMessages.length === 0) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-muted-foreground text-sm">
            No replies yet. Start the conversation!
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {threadMessages.map((message, index) =>
          renderMessage(message, index)
        )}
        <div ref={messagesEndRef} />
        {isFetchingNextPage && (
          <div className="flex justify-center py-4">
            <Spinner />
          </div>
        )}
      </div>
    );
  };

  const renderMessage = (message: ChannelMessage, index: number) => {
    const isSent = message.userId === currentUserId;
    const isMemberFlagged = !!message.isSafetyRisk && !canViewFlaggedContent;
    const isMessageInteractionBlocked = isMemberFlagged;
    const isModeratorFlagged =
      !!message.isSafetyRisk && canViewFlaggedContent;
    const messageUserName = formatUserName(
      message.user?.firstName,
      message.user?.lastName,
    );
    const messageProfilePicture = message.user?.profilePicture;

    const prevMessage = index > 0 ? threadMessages[index - 1] : null;
    const showTimestamp = shouldShowTimestamp(message, prevMessage);
    const messageTime = formatMessageTime(message.createdAt);

    const isEditing = editingMessageId === message.id;
    const isDeleted = !!message.deletedAt;

    const messageBubble = isEditing ? (
      <div className="flex flex-col gap-1 w-full min-w-[200px]">
        <textarea
          className="w-full px-3 py-2 text-sm border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-card text-foreground"
          value={editMessageContent}
          rows={2}
          ref={(el) => {
            if (el) {
              el.focus();
              el.setSelectionRange(el.value.length, el.value.length);
            }
          }}
          onChange={(e) => { setEditMessageContent(e.target.value); setEditError(null); }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSaveEdit(message.id);
            } else if (e.key === "Escape") {
              handleCancelEdit();
            }
          }}
        />
        {editError && (
          <span className="text-xs text-red-500">{editError}</span>
        )}
        <div className="flex items-center justify-between gap-2">
          <span className="hidden sm:block text-xs text-muted-foreground/70">Enter to save · Esc to cancel</span>
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={handleCancelEdit}
              className="px-3 py-1 text-xs text-muted-foreground rounded-lg border border-border hover:bg-muted/50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleSaveEdit(message.id)}
              className="px-3 py-1 text-xs text-foreground/70 rounded-lg transition-colors" style={{ backgroundColor: 'var(--color-accent)' }}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    ) : (
      <div
        className={twMerge(
          "px-4 py-2 rounded-lg overflow-hidden inline-block max-w-full min-w-0 border",
          isModeratorFlagged
            ? "border-red-500/60"
            : "border-transparent",
          isSent ? "rounded-tr-none bg-primary/20" : "rounded-tl-none bg-muted"
        )}
      >
        <MessageContent
          content={message.content || ""}
          {...(isMemberFlagged ? { textColor: "text-muted-foreground" } : {})}
        />
        {message.isEdited && !isDeleted && (
          <span className="text-xs text-muted-foreground/70 italic ml-1">(edited)</span>
        )}
      </div>
    );

    return (
      <FlaggedContentContainer
        key={message.id}
        isFlagged={isModeratorFlagged}
        canViewFlaggedContent={canViewFlaggedContent}
        className="rounded-lg"
        moderatorTooltipText={message.safetyRiskReason}
        obfuscationLevel="light"
        showModeratorFrame={false}
      >
        <div
          className={twMerge(
            "flex gap-3",
            isSent ? "justify-end" : "justify-start"
          )}
        >
          {!isSent && showTimestamp && (
            <div className="flex-shrink-0">
              <Avatar
                firstName={message.user?.firstName}
                lastName={message.user?.lastName}
                profilePicture={messageProfilePicture}
                userId={message.user?.id}
                size="sm"
                alt={messageUserName}
              />
            </div>
          )}
          {!isSent && !showTimestamp && <div className="flex-shrink-0 w-8"></div>}
          <div
            className={twMerge(
              "flex flex-col max-w-[70%] min-w-0",
              isSent ? "items-end" : "items-start"
            )}
          >
            {isSent && showTimestamp && (
              <div className="flex items-center gap-2 mb-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="cursor-default text-xs text-muted-foreground">
                      {messageTime}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    {formatDateTime(message.createdAt)}
                  </TooltipContent>
                </Tooltip>
                <span className="text-sm font-semibold text-foreground">You</span>
              </div>
            )}
            {!isSent && showTimestamp && (
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold text-foreground">
                  {messageUserName}
                </span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="cursor-default text-xs text-muted-foreground">
                      {messageTime}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    {formatDateTime(message.createdAt)}
                  </TooltipContent>
                </Tooltip>
              </div>
            )}
            <div className="group/message flex items-center min-w-0">
              {isMemberFlagged ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    {messageBubble}
                  </TooltipTrigger>
                  <TooltipContent side="top">{FLAGGED_CONTENT_TOOLTIP_TEXT}</TooltipContent>
                </Tooltip>
              ) : messageBubble}
              {isSent && !isMessageInteractionBlocked && (
                <div className="flex items-center flex-shrink-0 transition-opacity duration-200 ease-[0.16,1,0.3,1] opacity-100 sm:opacity-0 sm:group-hover/message:opacity-100 ml-1">
                  <MessageMenu
                    message={message}
                    currentUserId={currentUserId}
                    onEdit={getEditHandler(message)}
                    isDeleted={isDeleted}
                  />
                </div>
              )}
              {!isSent && !isMessageInteractionBlocked && (
                <div 
                  className="flex items-center flex-shrink-0 transition-opacity duration-200 ease-[0.16,1,0.3,1] opacity-0 group-hover/message:opacity-100 [@media(hover:none)]:opacity-100 ml-1"
                >
                  <MessageMenu
                    message={message}
                    currentUserId={currentUserId}
                    onReport={() => handleReportMessage(message.id)}
                    onEdit={getEditHandler(message)}
                    isDeleted={isDeleted}
                  />
                </div>
              )}
            </div>
          </div>
          {isSent && showTimestamp && (
            <div className="flex-shrink-0">
              <Avatar
                firstName={message.user?.firstName}
                lastName={message.user?.lastName}
                profilePicture={messageProfilePicture}
                userId={message.user?.id}
                size="sm"
                alt="You"
              />
            </div>
          )}
          {isSent && !showTimestamp && <div className="flex-shrink-0 w-8"></div>}
        </div>
      </FlaggedContentContainer>
    );
  };

  return (
    <AnimatePresence>
      {isMobile && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/30 z-10"
          onClick={onClose}
        />
      )}
      <motion.div
        initial={{ width: 0, opacity: 0 }}
        animate={{ width: isMobile ? "100%" : "28rem", opacity: 1 }}
        exit={{ width: 0, opacity: 0 }}
        transition={TRANSITION_CONFIG}
        className={twMerge(
          "border-l border-border bg-background flex flex-col shadow-lg overflow-hidden flex-shrink-0",
          isMobile ? "fixed inset-y-0 right-0 z-10" : "h-full"
        )}
      >
        <div className="p-4 flex-shrink-0 bg-background border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-foreground">
              Thread
            </h3>
            <button
              onClick={onClose}
              className="p-1 hover:bg-muted rounded-full transition-colors"
            >
              <LuX className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>
          {isParentMessageBlocked ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="bg-muted/50 rounded-lg p-3 border border-border min-w-0">
                  <MessageReplyPreview
                    message={parentMessage}
                    currentUserId={currentUserId}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent side="top">{FLAGGED_CONTENT_TOOLTIP_TEXT}</TooltipContent>
            </Tooltip>
          ) : (
            <div className="bg-muted/50 rounded-lg p-3 border border-border min-w-0">
              <MessageReplyPreview
                message={parentMessage}
                currentUserId={currentUserId}
                isFlagged={!!parentMessage.isSafetyRisk && canViewFlaggedContent}
                canViewFlaggedContent={canViewFlaggedContent}
                moderatorTooltipText={parentMessage.safetyRiskReason}
                obfuscationLevel="light"
              />
            </div>
          )}
          {replyCountData && replyCountData.count > 0 && (
            <div className="mt-2 text-xs text-muted-foreground">
              {replyCountData.count} {replyCountData.count === 1 ? "reply" : "replies"}
            </div>
          )}
        </div>

        <div
          ref={scrollContainerRef}
          className="flex-1 p-4 overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent bg-background"
        >
          {renderMessagesContent()}
        </div>

        {canReply ? (
          <div className="px-4 pt-4 pb-10 flex-shrink-0 border-t border-border">
            <div
              className={twMerge(
                "flex bg-card px-4 py-2 border gap-2",
                isMobile ? "flex-col" : "items-center",
              )}
              style={{ borderRadius: "12px" }}
            >
              <Textarea
                ref={replyTextareaRef}
                placeholder="Reply to thread..."
                className={twMerge(
                  "bg-transparent border-0 focus:ring-0 p-0 resize-none min-w-0 placeholder:text-muted-foreground/50",
                  isMobile ? "w-full flex-1 min-h-[2.5rem]" : "flex-1",
                )}
                value={replyText}
                onChange={(e) => {
                  if (e.target.value.length <= 2000) {
                    setReplyText(e.target.value);
                  }
                }}
                maxLength={2000}
                onKeyDown={(e) => {
                  handleTextareaKeyDown(e, () => {
                    if (replyText.trim() && isConnected) {
                      handleSendReply();
                    }
                  });
                }}
                rows={1}
                style={{
                  minHeight: "2rem",
                  height: replyText ? "auto" : "2.5rem",
                  lineHeight: "1.5rem",
                  paddingTop: "0.625rem",
                  paddingBottom: "0.625rem",
                  verticalAlign: "middle",
                }}
              />
              <div
                className={twMerge(
                  "flex items-center",
                  isMobile
                    ? "justify-end gap-2 w-full flex-shrink-0"
                    : "gap-2",
                )}
              >
                <MessageFormatToolbar
                  textareaRef={replyTextareaRef}
                  onValueChange={(value) => {
                    if (value.length <= 2000) {
                      setReplyText(value);
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleSendReply}
                  className="px-4 py-2 bg-accent text-foreground rounded-lg hover:bg-primary-hover transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                  disabled={!replyText.trim() || !isConnected}
                >
                  <LuSend className="h-4 w-4 text-foreground" />
                  <span className="text-foreground">Send</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="px-4 pt-4 pb-10 flex-shrink-0 border-t border-border">
            <div className="flex items-center justify-center bg-muted/50 px-4 py-3 border border-border rounded-xl">
              <span className="text-sm text-muted-foreground">
                {isParentMessageBlocked
                  ? FLAGGED_CONTENT_TOOLTIP_TEXT
                  : "Only owners and moderators can reply in this channel"}
              </span>
            </div>
          </div>
        )}
      </motion.div>
      {reportingMessageId && (
        <ReportModal
          isOpen={!!reportingMessageId}
          onClose={handleCloseReportModal}
          onSubmit={handleSubmitReport}
          title="Report message"
        />
      )}
    </AnimatePresence>
  );
}
