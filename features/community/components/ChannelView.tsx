import { useEffect, useRef, useCallback, useState, useLayoutEffect, useMemo, Fragment } from "react";
import { twMerge } from "tailwind-merge";
import { motion, AnimatePresence } from "motion/react";
import { useInfiniteChannelMessages } from "@/api/community/queries/useInfiniteChannelMessages";
import { Channel, ChannelMessage } from "@/api/community/community.types";
import { GroupedMessageType } from "../enums/grouped-message-type.enum";
import { Spinner } from "@/components/common/Spinner";
import { useCurrentUser } from "@/api/user/queries/useCurrentUser";
import { LuMessageSquare } from "react-icons/lu";
import { ChannelThreadPanel } from "./ChannelThreadPanel";
import { useCommunityChannelUnreadCounts } from "@/api/community/queries/useCommunityChannelUnreadCounts";
import { formatUserName } from "../utils/userHelpers";
import { Avatar } from "@/components/common/Avatar";
import {
  loadMoreIfNoScroll,
  scrollToBottom,
  scrollToBottomIfNearBottom,
} from "../utils/scrollHelpers";
import { groupMessagesByDate, formatMessageTime } from "../utils/messageHelpers";
import { useCommunitySocket, registerActiveChannel, unregisterActiveChannel } from "../hooks/useCommunitySocket";
import { CommunitySocketEvent } from "../enums/community-socket-event.enum";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/UI/Tooltip";
import { formatDateTime } from "@/lib/utils";
import { useMarkChannelAsRead } from "@/api/community/mutations/useMarkChannelAsRead";
import { useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/api/queryKeys";
import { MessageContent } from "./MessageContent";
import { useMessageMediaField } from "../hooks/useMessageMediaField";
import { useUploadChannelMessageAttachment, getUploadChannelMessageAttachmentErrorMessage } from "@/api/community/mutations/useUploadChannelMessageAttachment";
import { PostMediaRenderer } from "./PostMediaRenderer";
import { toast } from "react-hot-toast";
import { useImagePreview } from "../hooks/useImagePreview";
import { ImagePreviewModal } from "./ImagePreviewModal";
import { MessageComposer } from "./MessageComposer";
import { CommunityMessageType } from "../enums/community-message-type.enum";
import { useJoinChannel } from "@/api/community/mutations/useJoinChannel";
import { Button } from "@/components/common/Button";
import { LuLogIn } from "react-icons/lu";
import { useMessageReport } from "../hooks/useMessageReport";
import { ReportModal } from "./ReportModal";
import { MessageMenu } from "./MessageMenu";
import { useScrollToMessage } from "../hooks/useScrollToMessage";
import { CommunityMemberRole } from "@/api/community/enums/community-member-role.enum";
import { useChannelMessageThread } from "@/api/community/queries/useChannelMessageThread";
import { canReplyToMessage } from "../utils/channelReplyHelpers";
import { ProtectedChannel } from "../enums/protected-channel.enum";
import { FlaggedContentContainer, FLAGGED_CONTENT_TOOLTIP_TEXT } from "./FlaggedContentContainer";
import { DeleteChannelMessageModal } from "./DeleteChannelMessageModal";
import { SafetyRiskBadge } from "@/components/common/SafetyRiskBadge";
import { useEditWindowTimer } from "../hooks/useEditWindowTimer";

interface ChannelViewProps {
  communityId: string;
  channel: Channel;
  initialMessageId?: string;
  shouldOpenThread?: boolean;
  canModerate?: boolean;
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
  bannedUserIds?: Set<string>;
  community?: {
    members: Array<{
      userId: string;
      role: CommunityMemberRole;
    }>;
  };
}

export function ChannelView({ 
  communityId, 
  channel, 
  initialMessageId,
  shouldOpenThread = false,
  canModerate = false,
  onBanUser,
  onRemoveUser,
  bannedUserIds,
  community,
}: ChannelViewProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  const previousScrollHeightRef = useRef<number>(0);
  const shouldPreserveScrollRef = useRef(false);
  const isRestoringScrollRef = useRef(false);
  const { data: currentUser } = useCurrentUser();
  const [messageText, setMessageText] = useState("");
  const [openThreadMessage, setOpenThreadMessage] = useState<ChannelMessage | null>(null);
  const [messageIdToDelete, setMessageIdToDelete] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editMessageContent, setEditMessageContent] = useState("");
  const [editError, setEditError] = useState<string | null>(null);

  const {
    reportingMessageId,
    handleReportMessage,
    handleCloseReportModal,
    handleSubmitReport,
  } = useMessageReport({
    communityId,
    channelId: channel.id,
  });
  const { mutate: markChannelAsRead } = useMarkChannelAsRead({
    communityId,
  });

  const queryClient = useQueryClient();
  const { data: channelUnreadCounts } = useCommunityChannelUnreadCounts({
    communityId,
  });

  const isOwnedChannel = channel.isOwned === true;
  const { mutate: joinChannel, isPending: isJoiningChannel } = useJoinChannel();

  const {
    data,
    isLoading: isLoadingMessages,
    error: messagesError,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteChannelMessages({
    communityId,
    channelId: channel.id,
    enabled: isOwnedChannel,
  });

  const { sendChannelMessage, editChannelMessage, isConnected, socket } = useCommunitySocket({
    communityId,
    enabled: !!communityId,
    registerListeners: false,
  });

  const messageMedia = useMessageMediaField();
  const messageMediaClearRef = useRef(messageMedia.clear);
  messageMediaClearRef.current = messageMedia.clear;
  const { mutate: uploadChannelMessageAttachment, isPending: isUploadingMedia } = useUploadChannelMessageAttachment();
  const { previewImageUrl, handleImageClick, handleClosePreview } = useImagePreview();

  const shouldFetchThread = !!initialMessageId;
  const { data: threadData } = useChannelMessageThread({
    communityId,
    channelId: channel.id,
    messageId: initialMessageId || "",
    enabled: shouldFetchThread,
  });

  const threadParentMessage = threadData?.pages?.[0]?.parentMessage;


  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleNewMessage = () => {
      setShowUnreadSeparator(false);
    };

    socket.on(CommunitySocketEvent.CHANNEL_MESSAGE_SENT, handleNewMessage);

    return () => {
      socket.off(CommunitySocketEvent.CHANNEL_MESSAGE_SENT, handleNewMessage);
    };
  }, [socket, isConnected]);
  const sendMessage = useCallback(
    (content: string, replyToId?: string, attachmentIds?: string[]) => {
      sendChannelMessage(channel.id, content, replyToId, attachmentIds);
      markChannelAsRead({ channelId: channel.id });
      setShowUnreadSeparator(false);
    },
    [sendChannelMessage, channel.id, markChannelAsRead],
  );

  const handleJoin = () => {
    joinChannel(
      {
        communityId,
        channelId: channel.id,
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: [
              QUERY_KEYS.COMMUNITY.CHANNELS,
              { communityId },
            ],
          });
        },
      },
    );
  };

  const handleSendMessage = useCallback(() => {
    const hasContent = messageText.trim().length > 0;
    const hasAttachments = messageMedia.files.length > 0;
    
    if (!hasContent && !hasAttachments) return;
    if (!isConnected) return;
    if (isUploadingMedia) return;

    const contentToSend = messageText.trim() || "";

    const sendWithAttachments = (attachmentIds: string[]) => {
      sendMessage(contentToSend, undefined, attachmentIds);
      setMessageText("");
      messageMedia.clear();
    };

    if (messageMedia.files.length > 0) {
      const uploadPromises = messageMedia.files.map((mediaFile) => 
        new Promise<string>((resolve, reject) => {
          uploadChannelMessageAttachment(
            {
              communityId,
              channelId: channel.id,
              file: mediaFile.file,
            },
            {
              onSuccess: (uploadedMedia) => {
                resolve(uploadedMedia.id);
              },
              onError: (error) => {
                const message = getUploadChannelMessageAttachmentErrorMessage(error);
                if (message) {
                  toast.error(message);
                }
                reject(error);
              },
            },
          );
        })
      );

      Promise.all(uploadPromises)
        .then((attachmentIds) => {
          sendWithAttachments(attachmentIds);
        })
        .catch(() => {
        });
    } else {
      sendWithAttachments([]);
    }
  }, [messageText, messageMedia.files, isConnected, isUploadingMedia, communityId, channel.id, uploadChannelMessageAttachment, sendMessage]);

  const pages = data?.pages ?? [];
  const messages = [...pages].reverse().flatMap((p) => [...p.items].reverse()).filter(Boolean);

  const previousChannelId = useRef(channel.id);
  const previousInitialMessageId = useRef<string | undefined>(initialMessageId);
  const initialMessageIdProcessedRef = useRef(false);
  const [isChangingChannel, setIsChangingChannel] = useState(false);
  const isInitialLoadRef = useRef(true);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEditWindowTimer(messages);

  const resetChannelState = useCallback(() => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = null;
    }
    setIsChangingChannel(true);
    setMessageText("");
    messageMediaClearRef.current();
    shouldPreserveScrollRef.current = false;
    previousScrollHeightRef.current = 0;
    isInitialLoadRef.current = true;
    isRestoringScrollRef.current = false;
  }, []);

  const restoreScrollPosition = useCallback(() => {
    if (!shouldPreserveScrollRef.current || previousScrollHeightRef.current === 0) {
      return false;
    }

    isRestoringScrollRef.current = true;
    requestAnimationFrame(() => {
      if (scrollContainerRef.current) {
        const currentScrollTop = scrollContainerRef.current.scrollTop;
        const heightDifference = scrollContainerRef.current.scrollHeight - previousScrollHeightRef.current;
        
        if (heightDifference > 0) {
          scrollContainerRef.current.scrollTop = currentScrollTop + heightDifference;
        }
        
        setTimeout(() => {
          isRestoringScrollRef.current = false;
        }, 50);
      }
    });
    
    shouldPreserveScrollRef.current = false;
    previousScrollHeightRef.current = 0;
    return true;
  }, []);

  const scrollToBottomOnInitialLoad = useCallback(() => {
    if (!isInitialLoadRef.current) {
      return null;
    }

    const timeoutId = scrollToBottom(scrollContainerRef, 100);
    if (timeoutId) {
      setTimeout(() => {
        isInitialLoadRef.current = false;
      }, 100);
    }
    
    return timeoutId;
  }, []);

  const scrollToBottomIfNear = useCallback(() => {
    return scrollToBottomIfNearBottom(scrollContainerRef, 100, 50);
  }, []);

  const handleScrollToLoadMore = useCallback(() => {
    if (isChangingChannel) {
      return;
    }
    
    if (!scrollContainerRef.current) {
      return;
    }

    const container = scrollContainerRef.current;
    const { scrollTop } = container;
    
    if (!hasNextPage || isFetchingNextPage || loadingRef.current) {
      return;
    }

    if (scrollTop < 200) {
      loadingRef.current = true;
      shouldPreserveScrollRef.current = true;
      previousScrollHeightRef.current = container.scrollHeight;
      
      fetchNextPage().finally(() => {
        loadingRef.current = false;
      });
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, isChangingChannel]);


  useEffect(() => {
    if (previousChannelId.current !== channel.id) {
      previousChannelId.current = channel.id;
      resetChannelState();
      setOpenThreadMessage(null);
    }

    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = null;
      }
    };
  }, [channel.id, resetChannelState]);

  useLayoutEffect(() => {
    if (!scrollContainerRef.current || isChangingChannel || isLoadingMessages) {
      return;
    }

    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = null;
    }

    const wasRestored = restoreScrollPosition();
    
    if (!wasRestored && !isFetchingNextPage && messages.length > 0 && !isRestoringScrollRef.current) {
      if (isInitialLoadRef.current) {
        scrollTimeoutRef.current = scrollToBottomOnInitialLoad();
      } else {
        scrollTimeoutRef.current = scrollToBottomIfNear();
      }
    }

    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = null;
      }
    };
  }, [messages.length, isLoadingMessages, isFetchingNextPage, isChangingChannel, restoreScrollPosition, scrollToBottomOnInitialLoad, scrollToBottomIfNear]);

  useEffect(() => {
    if (isChangingChannel && !isLoadingMessages) {
      setIsChangingChannel(false);
    }
  }, [isChangingChannel, isLoadingMessages]);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    scrollContainer.addEventListener("scroll", handleScrollToLoadMore);
    return () => scrollContainer.removeEventListener("scroll", handleScrollToLoadMore);
  }, [handleScrollToLoadMore]);

  useEffect(() => {
    if (isInitialLoadRef.current || isRestoringScrollRef.current || isFetchingNextPage || isLoadingMessages || isChangingChannel) {
      return;
    }
    
    const timeoutId = setTimeout(() => {
      loadMoreIfNoScroll({
        scrollContainerRef,
        isLoading: isLoadingMessages,
        hasNextPage,
        isFetchingNextPage,
        loadingRef,
        fetchNextPage,
      });
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, [messages.length, isLoadingMessages, hasNextPage, isFetchingNextPage, fetchNextPage, isChangingChannel]);

  const groupedMessages = groupMessagesByDate(messages);

  const currentUserMember = useMemo(() => {
    if (!currentUser?.id || !community?.members) return null;
    return community.members.find(
      (member) => member.userId === currentUser.id,
    );
  }, [currentUser?.id, community?.members]);

  const currentUserRole = currentUserMember?.role ?? null;
  const isFeedbackChannel = channel.name.toLowerCase() === ProtectedChannel.FEEDBACK;

  const canDeleteMessages =
    canModerate &&
    (currentUserRole === CommunityMemberRole.OWNER ||
      currentUserRole === CommunityMemberRole.MODERATOR);

  const handleRequestDeleteMessage = (messageId: string) => {
    setMessageIdToDelete(messageId);
  };

  const handleCloseDeleteMessageModal = () => {
    setMessageIdToDelete(null);
  };

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
    editChannelMessage(channel.id, messageId, trimmed);
    setEditingMessageId(null);
    setEditMessageContent("");
    setEditError(null);
  };

  const getCurrentChannelUnreadCount = () => {
    return channelUnreadCounts?.find(
      (item) => item.channelId === channel.id,
    )?.unreadCount || 0;
  };

  const calculateFirstUnreadMessageIndex = (
    totalMessages: number,
    unreadCount: number,
    shouldShowSeparator: boolean,
  ) => {
    const hasUnreadMessages = unreadCount > 0 && totalMessages > 0 && shouldShowSeparator;
    if (!hasUnreadMessages) return -1;
    return Math.max(0, totalMessages - unreadCount);
  };

  const shouldShowUnreadSeparator = (unreadCount: number) => {
    return unreadCount > 0;
  };

  const initialUnreadCountRef = useRef<number | null>(null);
  const previousChannelIdRef = useRef<string>(channel.id);
  const [showUnreadSeparator, setShowUnreadSeparator] = useState(false);

  const currentUnreadCount = getCurrentChannelUnreadCount();

  useEffect(() => {
    const hasChannelChanged = previousChannelIdRef.current !== channel.id;
    const isFirstLoad = initialUnreadCountRef.current === null;

    if (hasChannelChanged || isFirstLoad) {
      previousChannelIdRef.current = channel.id;
      initialUnreadCountRef.current = currentUnreadCount;
      setShowUnreadSeparator(shouldShowUnreadSeparator(currentUnreadCount));
    }
  }, [channel.id, currentUnreadCount]);

  const initialUnreadCount = initialUnreadCountRef.current || 0;
  const firstUnreadMessageIndex = calculateFirstUnreadMessageIndex(
    messages.length,
    initialUnreadCount,
    showUnreadSeparator,
  );

  const hasUnreadMessages = initialUnreadCount > 0 && firstUnreadMessageIndex >= 0 && showUnreadSeparator;

  useEffect(() => {
    if (!channel.id) return;
    registerActiveChannel(channel.id);
    markChannelAsRead({ channelId: channel.id });
    
    queryClient.invalidateQueries({
      queryKey: [
        QUERY_KEYS.COMMUNITY.GET_CHANNEL_MESSAGES,
        { communityId, channelId: channel.id, limit: 20 },
      ],
    });
    
    return () => {
      unregisterActiveChannel(channel.id);
    };
  }, [channel.id, communityId, markChannelAsRead, queryClient]);

  useEffect(() => {
    if (previousChannelId.current !== channel.id) {
      previousChannelId.current = channel.id;
    }
  }, [channel.id]);

  useEffect(() => {
    if (previousChannelId.current !== channel.id) {
      previousChannelId.current = channel.id;
      initialMessageIdProcessedRef.current = false;
    }
  }, [channel.id]);

  useEffect(() => {
    if (previousInitialMessageId.current !== initialMessageId) {
      previousInitialMessageId.current = initialMessageId;
      initialMessageIdProcessedRef.current = false;
      
      if (initialMessageId) {
        queryClient.invalidateQueries({
          queryKey: [
            QUERY_KEYS.COMMUNITY.GET_CHANNEL_MESSAGE_THREAD,
            {
              communityId,
              channelId: channel.id,
              messageId: initialMessageId,
              limit: 20,
            },
          ],
        });
      }
    }
  }, [initialMessageId, communityId, channel.id, queryClient]);

  useEffect(() => {
    if (!initialMessageId || !shouldOpenThread || initialMessageIdProcessedRef.current) {
      return;
    }

    if (initialMessageIdProcessedRef.current && openThreadMessage?.id === initialMessageId) {
      return;
    }

    const message = messages.find((m) => m.id === initialMessageId);
    
    if (message) {
      setOpenThreadMessage(message);
      initialMessageIdProcessedRef.current = true;
      return;
    }

    if (threadParentMessage && threadParentMessage.id === initialMessageId) {
      setOpenThreadMessage(threadParentMessage);
      initialMessageIdProcessedRef.current = true;
    }
  }, [initialMessageId, shouldOpenThread, messages, threadParentMessage, openThreadMessage]);

  useEffect(() => {
    if (openThreadMessage?.isSafetyRisk && !canModerate) {
      setOpenThreadMessage(null);
    }
  }, [openThreadMessage, canModerate]);

  useScrollToMessage({
    containerRef: scrollContainerRef,
    messages,
    initialMessageId,
    hasNextPage: hasNextPage ?? false,
    isLoading: isLoadingMessages,
    isFetchingNextPage: isFetchingNextPage ?? false,
    fetchNextPage: fetchNextPage,
  });

  useEffect(() => {
    if (openThreadMessage?.id) {
      queryClient.invalidateQueries({
        queryKey: [
          QUERY_KEYS.COMMUNITY.GET_CHANNEL_MESSAGE_THREAD,
          {
            communityId,
            channelId: channel.id,
            messageId: openThreadMessage.id,
            limit: 20,
          },
        ],
      });
    }
  }, [openThreadMessage?.id, communityId, channel.id, queryClient]);

  const scrollToBottomMain = useCallback(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, []);

  return (
    <div className="flex h-full w-full bg-background overflow-hidden">
      <motion.div
        className="flex flex-col h-full bg-background overflow-hidden"
        initial={false}
        animate={{
          width: openThreadMessage ? "calc(100% - 28rem)" : "100%",
        }}
        transition={{
          duration: 0.3,
          ease: [0.16, 1, 0.3, 1],
        }}
        style={{ minWidth: 0 }}
      >
        <div className="px-4 py-3 flex-shrink-0 border-b border-border bg-background">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-foreground">
                #{channel.name}
              </h2>
              {channel.description && (
                <span className="text-sm text-muted-foreground">
                  {channel.description}
                </span>
              )}
            </div>
          </div>
        </div>

        <div
          ref={scrollContainerRef}
          className="flex-1 p-4 overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent bg-background"
        >
        {(() => {
          if (channel.isOwned !== true) {
            return (
              <div className="flex flex-col items-center justify-center h-full gap-4">
                <div className="flex flex-col items-center gap-2">
                  <div className="text-lg font-semibold text-foreground">
                    You left this channel
                  </div>
                  <div className="text-muted-foreground text-sm text-center">
                    You don't have access to view messages in #{channel.name}
                  </div>
                </div>
                <Button
                  variant="primary"
                  onClick={handleJoin}
                  disabled={isJoiningChannel}
                  className="flex items-center gap-2"
                >
                  <LuLogIn className="h-4 w-4" />
                  {isJoiningChannel ? "Joining..." : "Rejoin channel"}
                </Button>
              </div>
            );
          }

          if (isLoadingMessages || isChangingChannel) {
            return (
              <div className="flex items-center justify-center h-full">
                <Spinner />
              </div>
            );
          }

          if (messagesError) {
            return (
              <div className="flex items-center justify-center h-full">
                <div className="text-red-500">Error loading messages</div>
              </div>
            );
          }

          if (!messages || messages.length === 0) {
            return (
              <div className="flex flex-col items-center justify-center h-full">
                <div className="text-lg font-semibold text-foreground mb-2">
                  WELCOME TO #{channel.name.toUpperCase()}
                </div>
                <div className="text-muted-foreground text-sm">
                  This is the start of the #{channel.name} channel.
                </div>
              </div>
            );
          }

          return (
          <div className="space-y-6">
            {!hasNextPage && (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="text-lg font-semibold text-foreground mb-2">
                  WELCOME TO #{channel.name.toUpperCase()}
                </div>
                <div className="text-muted-foreground text-sm">
                  This is the start of the #{channel.name} channel.
                </div>
              </div>
            )}
            
            {groupedMessages.map((item) => {
              if (item.type === GroupedMessageType.DATE) {
                return (
                  <div key={`date-${item.date}`} className="flex items-center justify-center py-2">
                    <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                      {item.date}
                    </span>
                  </div>
                );
              }

              const message = item.message;
              const messageIndex = messages.findIndex((m) => m.id === message.id);
              const isFirstUnread = hasUnreadMessages && messageIndex === firstUnreadMessageIndex;
              const isSent = message.userId === currentUser?.id;
              const userName = formatUserName(
                message.user?.firstName,
                message.user?.lastName,
              );
              const profilePicture = message.user?.profilePicture;
              const messageTime = formatMessageTime(message.createdAt);
              
              const messageAuthorMember = community?.members.find(
                (member: { userId: string; role: CommunityMemberRole }) =>
                  member.userId === message.userId,
              );
              const messageAuthorRole = messageAuthorMember?.role;
              const isDeleted = !!message.deletedAt;
              const isMemberFlagged = !!message.isSafetyRisk && !canModerate;
              const isMessageInteractionBlocked = isMemberFlagged;
              const isModeratorFlagged =
                !!message.isSafetyRisk && canModerate;
              const shouldShowModeratorBadge = isModeratorFlagged;
              const canReplyToThisMessage = canReplyToMessage(
                channel.name,
                currentUserRole,
                message.userId,
                currentUser?.id,
              ) && !isMessageInteractionBlocked;

              const messageTextColor = (isDeleted || isMemberFlagged) ? "text-muted-foreground" : "text-foreground";

              const messageMenuProps = {
                message,
                currentUserId: currentUser?.id ?? "",
                onEdit: getEditHandler(message),
                onReport: () => handleReportMessage(message.id),
                ...(canModerate ? { canModerate: true } : {}),
                ...(messageAuthorRole !== undefined ? { messageAuthorRole } : {}),
                ...(onBanUser && message.user ? { onBan: () => onBanUser(message.userId, message.user) } : {}),
                ...(onRemoveUser && message.user
                  ? {
                      onRemove: () => {
                        const fullName = formatUserName(message.user.firstName, message.user.lastName);
                        onRemoveUser(message.userId, fullName);
                      },
                    }
                  : {}),
                ...(bannedUserIds ? { bannedUserIds } : {}),
                ...((canDeleteMessages || isSent)
                  ? {
                      canDeleteMessage: true,
                      onDeleteMessage: () => handleRequestDeleteMessage(message.id),
                      isDeleted,
                    }
                  : {}),
              };

              const isEditing = editingMessageId === message.id;

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
                    canReplyToThisMessage
                      ? "cursor-pointer hover:opacity-90 transition-opacity"
                      : "",
                    isSent ? "rounded-tr-none bg-primary/20" : "rounded-tl-none bg-muted",
                  )}
                  onClick={canReplyToThisMessage ? () => setOpenThreadMessage(message) : undefined}
                >
                  <MessageContent
                    content={message.content || ""}
                    textColor={messageTextColor}
                  />
                  {message.isEdited && !isDeleted && (
                    <span className="text-xs text-muted-foreground/70 italic ml-1">(edited)</span>
                  )}
                </div>
              );

              return (
                <Fragment key={message.id}>
                  <AnimatePresence>
                    {isFirstUnread && (
                      <motion.div
                        key={`unread-separator-${message.id}`}
                        initial={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                        className="flex items-center gap-3 py-4 overflow-hidden"
                      >
                        <div className="flex-1 border-t border-emerald-500"></div>
                        <span className="text-xs font-semibold text-emerald-500 px-3 py-1 bg-emerald-50 rounded-full">
                          New messages
                        </span>
                        <div className="flex-1 border-t border-emerald-500"></div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <FlaggedContentContainer
                    isFlagged={isModeratorFlagged}
                    canViewFlaggedContent={canModerate}
                    className="rounded-lg"
                    moderatorTooltipText={message.safetyRiskReason}
                    obfuscationLevel="light"
                    showModeratorFrame={false}
                    showModeratorBadge={false}
                  >
                    <div
                      data-message-id={message.id}
                      className={twMerge("flex gap-3 group", isSent ? "justify-end" : "justify-start")}
                    >
                      {!isSent && (
                        <div className="flex-shrink-0">
                          <Avatar
                            firstName={message.user?.firstName}
                            lastName={message.user?.lastName}
                            profilePicture={profilePicture}
                            userId={message.user?.id}
                            size="sm"
                            alt={userName}
                          />
                        </div>
                      )}
                      <div className={twMerge("flex flex-col max-w-[70%] min-w-0", isSent ? "items-end" : "items-start")}>
                        {isSent && (
                          <div className="flex items-center gap-2 mb-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="cursor-default text-xs text-muted-foreground">{messageTime}</span>
                              </TooltipTrigger>
                              <TooltipContent>
                                {formatDateTime(message.createdAt)}
                              </TooltipContent>
                            </Tooltip>
                            <span className="text-sm font-semibold text-foreground">You</span>
                            {shouldShowModeratorBadge && (
                              <SafetyRiskBadge
                                className="ml-0.5"
                                tooltipText={message.safetyRiskReason || "Flagged unsafe content"}
                              />
                            )}
                          </div>
                        )}
                        {!isSent && (
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-semibold text-foreground">{userName}</span>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="cursor-default text-xs text-muted-foreground">{messageTime}</span>
                              </TooltipTrigger>
                              <TooltipContent>
                                {formatDateTime(message.createdAt)}
                              </TooltipContent>
                            </Tooltip>
                            {shouldShowModeratorBadge && (
                              <SafetyRiskBadge
                                className="ml-0.5"
                                tooltipText={message.safetyRiskReason || "Flagged unsafe content"}
                              />
                            )}
                          </div>
                        )}
                        <div className="group/message">
                          {message.attachments && message.attachments.length > 0 && (
                            <div>
                              <PostMediaRenderer
                                media={message.attachments}
                                maxHeight="max-h-[300px]"
                                className=""
                                onImageClick={handleImageClick}
                              />
                            </div>
                          )}
                          {message.content && message.content.trim() && (
                            <div className="flex items-center min-w-0">
                              {isSent && (
                                <div
                                  className="flex items-center gap-1 flex-shrink-0 transition-opacity duration-200 ease-[0.16,1,0.3,1] opacity-0 group-hover/message:opacity-100 [@media(hover:none)]:opacity-100 mr-1"
                                >
                                  {canReplyToThisMessage && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <button
                                          onClick={() => setOpenThreadMessage(message)}
                                          className="p-1.5 rounded-full bg-accent hover:bg-primary-hover transition-colors flex items-center gap-1"
                                        >
                                          <LuMessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                                          {(message.stats?.replies ?? 0) > 0 && (
                                            <span className="text-xs text-muted-foreground">{message.stats?.replies}</span>
                                          )}
                                        </button>
                                      </TooltipTrigger>
                                      <TooltipContent>View thread</TooltipContent>
                                    </Tooltip>
                                  )}
                                  {currentUser?.id && !isMessageInteractionBlocked && (
                                    <div className="flex items-center justify-center">
                                      <MessageMenu {...messageMenuProps} />
                                    </div>
                                  )}
                                </div>
                              )}
                              {isMemberFlagged ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    {messageBubble}
                                  </TooltipTrigger>
                                  <TooltipContent side="top">{FLAGGED_CONTENT_TOOLTIP_TEXT}</TooltipContent>
                                </Tooltip>
                              ) : messageBubble}
                              {!isSent && (
                                <div
                                  className="flex items-center flex-shrink-0 transition-opacity duration-200 ease-[0.16,1,0.3,1] opacity-0 group-hover/message:opacity-100 [@media(hover:none)]:opacity-100 ml-1 gap-1"
                                >
                                  {canReplyToThisMessage && (
                                  <Tooltip>
                                      <TooltipTrigger asChild>
                                        <button
                                          onClick={() => setOpenThreadMessage(message)}
                                          className="p-1.5 rounded-full bg-accent hover:bg-primary-hover transition-colors flex items-center justify-center gap-1"
                                        >
                                          <LuMessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                                          {(message.stats?.replies ?? 0) > 0 && (
                                            <span className="text-xs text-muted-foreground">{message.stats?.replies}</span>
                                          )}
                                        </button>
                                      </TooltipTrigger>
                                      <TooltipContent>View thread</TooltipContent>
                                    </Tooltip>
                                  )}
                                {currentUser?.id && !isMessageInteractionBlocked && (
                                  <div className="flex items-center justify-center">
                                    <MessageMenu {...messageMenuProps} />
                                  </div>
                                )}
                              </div>
                              )}
                            </div>
                          )}
                          {!message.content && message.attachments && message.attachments.length > 0 && (
                            <div className="flex items-center min-w-0 mt-1">
                              {isSent && canReplyToThisMessage && (
                                <div
                                  className="flex items-center flex-shrink-0 transition-opacity duration-200 ease-[0.16,1,0.3,1] opacity-0 group-hover/message:opacity-100 [@media(hover:none)]:opacity-100 mr-1"
                                >
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        onClick={() => setOpenThreadMessage(message)}
                                        className="p-1.5 rounded-full bg-accent hover:bg-primary-hover transition-colors flex items-center gap-1"
                                      >
                                        <LuMessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                                        {(message.stats?.replies ?? 0) > 0 && (
                                          <span className="text-xs text-muted-foreground">{message.stats?.replies}</span>
                                        )}
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent>View thread</TooltipContent>
                                  </Tooltip>
                                </div>
                              )}
                              {!isSent && canReplyToThisMessage && (
                                <div
                                  className="flex items-center flex-shrink-0 transition-opacity duration-200 ease-[0.16,1,0.3,1] opacity-0 group-hover/message:opacity-100 [@media(hover:none)]:opacity-100 ml-1 gap-1"
                                >
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        onClick={() => setOpenThreadMessage(message)}
                                        className="p-1.5 rounded-full bg-accent hover:bg-primary-hover transition-colors flex items-center gap-1"
                                      >
                                        <LuMessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                                        {(message.stats?.replies ?? 0) > 0 && (
                                          <span className="text-xs text-muted-foreground">{message.stats?.replies}</span>
                                        )}
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent>View thread</TooltipContent>
                                  </Tooltip>
                                </div>
                              )}
                              {currentUser?.id && !isMessageInteractionBlocked && (
                                <div className="flex items-center justify-center ml-2">
                                  <MessageMenu {...messageMenuProps} />
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        {(message.stats?.replies ?? 0) > 0 && canReplyToThisMessage && (
                          <button
                            onClick={() => setOpenThreadMessage(message)}
                            className={twMerge(
                              "mt-1 text-xs flex items-center gap-1 hover:opacity-80 transition-opacity",
                              isSent ? "self-end" : "self-start"
                            )}
                            style={{ color: 'var(--color-emerald-500)' }}
                          >
                            <LuMessageSquare className="h-3 w-3" style={{ color: 'var(--color-emerald-500)' }} />
                            <span>{message.stats?.replies} {message.stats?.replies === 1 ? "reply" : "replies"}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </FlaggedContentContainer>
                </Fragment>
              );
            })}
            <div ref={messagesEndRef} />
            
            {isFetchingNextPage && (
              <div className="flex justify-center py-4">
                <Spinner />
              </div>
            )}
          </div>
          );
        })()}
      </div>

      <div className="px-4 pt-4 pb-10 flex-shrink-0">
        {channel.isOwned !== true ? (
          <div className="flex items-center justify-center gap-2 bg-muted/50 px-4 py-3 border border-border rounded-xl">
            <span className="text-sm text-muted-foreground">
              You don't belong to this channel
            </span>
          </div>
        ) : (
          <MessageComposer
            mode={CommunityMessageType.CHANNEL}
            text={messageText}
            onTextChange={setMessageText}
            onSend={handleSendMessage}
            isConnected={isConnected}
            isUploading={isUploadingMedia}
            placeholder={`Message #${channel.name}`}
            media={messageMedia}
            className="bg-background"
            sendLabel={isFeedbackChannel ? "Submit Feedback" : undefined}
          />
        )}
      </div>
      </motion.div>
      <AnimatePresence>
        {openThreadMessage && (
          <ChannelThreadPanel
            communityId={communityId}
            channelId={channel.id}
            channelName={channel.name}
            parentMessage={openThreadMessage}
            currentUserId={currentUser?.id || ""}
            currentUserRole={currentUserRole}
            onClose={() => setOpenThreadMessage(null)}
            onMessageSent={scrollToBottomMain}
            shouldRefetch={!!initialMessageId}
          />
        )}
      </AnimatePresence>
      {messageIdToDelete && (
        <DeleteChannelMessageModal
          isOpen={!!messageIdToDelete}
          onClose={handleCloseDeleteMessageModal}
          communityId={communityId}
          channelId={channel.id}
          messageId={messageIdToDelete}
        />
      )}
      {reportingMessageId && (
        <ReportModal
          isOpen={!!reportingMessageId}
          onClose={handleCloseReportModal}
          onSubmit={handleSubmitReport}
          title="Report message"
        />
      )}
      {previewImageUrl && (
        <ImagePreviewModal
          imageUrl={previewImageUrl}
          onClose={handleClosePreview}
        />
      )}
    </div>
  );
};
