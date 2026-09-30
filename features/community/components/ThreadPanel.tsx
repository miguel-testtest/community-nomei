import { useEffect, useRef, useCallback, useState } from "react";
import { twMerge } from "tailwind-merge";
import { motion, AnimatePresence } from "motion/react";
import { DirectMessage } from "@/api/community/community.types";
import { useMessageThread } from "@/api/community/queries/useMessageThread";
import { useMessageReplyCount } from "@/api/community/queries/useMessageReplyCount";
import { useCommunitySocket } from "../hooks/useCommunitySocket";
import { formatUserName } from "../utils/userHelpers";
import { Avatar } from "@/components/common/Avatar";
import { Spinner } from "@/components/common/Spinner";
import { LuX, LuSend, LuPencil } from "react-icons/lu";
import { toast } from "react-hot-toast";
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
import { MessageContent } from "./MessageContent";
import { FlaggedContentContainer } from "./FlaggedContentContainer";
import { useEditWindowTimer } from "../hooks/useEditWindowTimer";

interface ThreadPanelProps {
  communityId: string;
  conversationId: string;
  parentMessage: DirectMessage;
  currentUserId: string;
  onClose: () => void;
  onMessageSent?: () => void;
  canViewFlaggedContent?: boolean;
  applySafetyRiskStyling?: boolean;
}

export function ThreadPanel({
  communityId,
  conversationId,
  parentMessage,
  currentUserId,
  onClose,
  onMessageSent,
  canViewFlaggedContent = false,
  applySafetyRiskStyling = false,
}: ThreadPanelProps) {
  const isParentMessageBlocked =
    applySafetyRiskStyling &&
    !!parentMessage.isSafetyRisk &&
    !canViewFlaggedContent;
  const { isMobile } = useResponsive();
  const [replyText, setReplyText] = useState("");
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editMessageContent, setEditMessageContent] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const {
    data: threadData,
    isLoading: isLoadingThread,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useMessageThread({
    communityId,
    conversationId,
    messageId: parentMessage.id,
  });

  const { data: replyCountData } = useMessageReplyCount({
    communityId,
    conversationId,
    messageId: parentMessage.id,
  });

  const { sendDMMessage, isConnected, editDMMessage } = useCommunitySocket({
    communityId,
    enabled: !!communityId,
    registerListeners: false,
  });

  const pages = threadData?.pages ?? [];
  const threadMessages = pages.flatMap((p) => p.items).filter(Boolean);

  useEditWindowTimer(threadMessages);

  useEffect(() => {
    if (threadMessages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [threadMessages.length]);

  const handleStartEdit = useCallback((message: DirectMessage) => {
    setEditingMessageId(message.id);
    setEditMessageContent(message.content ?? "");
    setEditError(null);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingMessageId(null);
    setEditMessageContent("");
    setEditError(null);
  }, []);

  const handleSaveEdit = useCallback((messageId: string) => {
    const trimmed = editMessageContent.trim();
    if (!trimmed) {
      setEditError("Message can't be empty.");
      return;
    }
    if (!isConnected) {
      toast.error("Not connected. Please try again.");
      return;
    }
    editDMMessage(conversationId, messageId, trimmed);
    setEditingMessageId(null);
    setEditMessageContent("");
    setEditError(null);
  }, [editMessageContent, isConnected, editDMMessage, conversationId]);

  const handleSendReply = useCallback(() => {
    if (replyText.trim() && isConnected) {
      sendDMMessage(conversationId, replyText.trim(), parentMessage.id);
      setReplyText("");
      setTimeout(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
        onMessageSent?.();
      }, 100);
    }
  }, [replyText, isConnected, sendDMMessage, conversationId, parentMessage.id, onMessageSent]);

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

  const renderMessage = (message: DirectMessage, index: number) => {
    const isSent = message.userId !== null && message.userId === currentUserId;
    const isEditing = editingMessageId === message.id;
    const isMessageFlagged = applySafetyRiskStyling && !!message.isSafetyRisk;
    const messageUserName = formatUserName(
      message.user?.firstName,
      message.user?.lastName,
    );
    const messageProfilePicture = message.user?.profilePicture;

    const prevMessage = index > 0 ? threadMessages[index - 1] : null;
    const showTimestamp = shouldShowTimestamp(message, prevMessage);
    const messageTime = formatMessageTime(message.createdAt);

    return (
      <FlaggedContentContainer
        key={message.id}
        isFlagged={isMessageFlagged}
        canViewFlaggedContent={canViewFlaggedContent}
        className="rounded-lg"
        moderatorTooltipText={message.safetyRiskReason}
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
          <div className="group/message flex items-center gap-2">
            {isSent && !isEditing && !!message.editableUntil && new Date(message.editableUntil) > new Date() && (
              <div className="opacity-0 group-hover/message:opacity-100 transition-opacity duration-200 flex-shrink-0">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => handleStartEdit(message)}
                      className="p-1.5 rounded-full transition-colors"
                      style={{ backgroundColor: "var(--color-accent)" }}
                    >
                      <LuPencil className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Edit</TooltipContent>
                </Tooltip>
              </div>
            )}
            {isEditing ? (
              <div className="flex flex-col gap-1 min-w-[200px]">
                <textarea
                  className="w-full px-2 py-1 text-sm border border-border rounded resize-none focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-card text-foreground"
                  value={editMessageContent}
                  rows={2}
                  ref={(el) => { if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } }}
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
                  "px-4 py-2 rounded-lg overflow-hidden inline-block max-w-full min-w-0",
                  isSent ? "rounded-tr-none bg-primary/20" : "rounded-tl-none bg-muted"
                )}
              >
                <MessageContent content={message.content || ""} />
                {message.isEdited && (
                  <span className="text-xs text-muted-foreground/70 italic ml-1">(edited)</span>
                )}
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
          <div className="bg-muted/50 rounded-lg p-3 border border-border min-w-0">
            <MessageReplyPreview
              message={parentMessage}
              currentUserId={currentUserId}
              isFlagged={applySafetyRiskStyling && !!parentMessage.isSafetyRisk}
              canViewFlaggedContent={canViewFlaggedContent}
              moderatorTooltipText={parentMessage.safetyRiskReason}
            />
          </div>
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

        <div className="px-4 pt-4 pb-10 flex-shrink-0 border-t border-border">
          {isParentMessageBlocked ? (
            <div className="flex items-center justify-center bg-muted/50 px-4 py-3 border border-border rounded-xl">
              <span className="text-sm text-muted-foreground">
                This content was flagged as unsafe
              </span>
            </div>
          ) : (
            <div
              className="flex items-center gap-2 bg-card px-4 py-2 border border-border rounded-xl"
            >
              <input
                type="text"
                placeholder="Reply to thread..."
                className="flex-1 min-w-0 focus:outline-none text-foreground bg-transparent"
                value={replyText}
                onChange={(e) => {
                  if (e.target.value.length <= 2000) {
                    setReplyText(e.target.value);
                  }
                }}
                maxLength={2000}
                onKeyPress={(e) => {
                  if (e.key === "Enter" && replyText.trim() && isConnected) {
                    handleSendReply();
                  }
                }}
              />
              <button
                onClick={handleSendReply}
                className="px-4 py-2 bg-accent text-foreground rounded-lg hover:bg-primary-hover transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!replyText.trim() || !isConnected}
              >
                <LuSend className="h-4 w-4 text-foreground" />
                <span className="text-foreground">Send</span>
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
