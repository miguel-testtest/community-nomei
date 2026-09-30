import {
  useEffect,
  useRef,
  useCallback,
  useState,
  useLayoutEffect,
  Fragment,
} from "react";
import { twMerge } from "tailwind-merge";
import { motion, AnimatePresence } from "motion/react";
import { useInfiniteConversationMessages } from "@/api/community/queries/useInfiniteConversationMessages";
import { Conversation, DirectMessage } from "@/api/community/community.types";
import { CommunityConversationType } from "@/api/community/enums/community-conversation-type.enum";
import { GroupedMessageType } from "../enums/grouped-message-type.enum";
import { CommunityPresenceStatus } from "../enums/community-presence-status.enum";
import { Spinner } from "@/components/common/Spinner";
import {
  LuUsers,
  LuReply,
  LuMessageSquare,
  LuX,
  LuChevronDown,
  LuCheck,
  LuCheckCheck,
  LuTrash2,
  LuPencil,
} from "react-icons/lu";
import { formatUserName } from "../utils/userHelpers";
import { Avatar } from "@/components/common/Avatar";
import {
  loadMoreIfNoScroll,
  scrollToBottom,
  scrollToBottomIfNearBottom,
} from "../utils/scrollHelpers";
import { toTimestamp } from "../utils/dateHelpers";
import { shouldShowTimestamp, formatMessageTime, groupMessagesByDate } from "../utils/messageHelpers";
import { useCommunitySocket, registerActiveConversation, unregisterActiveConversation } from "../hooks/useCommunitySocket";
import { GROUP_CHAT_DEFAULT_LABEL } from "../utils/constants";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/UI/Tooltip";
import { formatDateTime } from "@/lib/utils";
import { truncateText } from "@/shared/utils/truncateText";
import { MessageReplyPreview } from "./MessageReplyPreview";
import { ThreadPanel } from "./ThreadPanel";
import { CommunitySocketEvent } from "../enums/community-socket-event.enum";
import { useMarkConversationAsRead } from "@/api/community/mutations/useMarkConversationAsRead";
import { DeleteDmMessageModal } from "./DeleteDmMessageModal";
import { useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/api/queryKeys";
import { useMarkConversationNotificationsAsRead } from "@/api/community/mutations/useMarkConversationNotificationsAsRead";
import { MessageContent } from "./MessageContent";
import { useMessageMediaField } from "../hooks/useMessageMediaField";
import { useUploadDirectMessageAttachment, getUploadDirectMessageAttachmentErrorMessage } from "@/api/community/mutations/useUploadDirectMessageAttachment";
import { PostMediaRenderer } from "./PostMediaRenderer";
import { toast } from "react-hot-toast";
import { useImagePreview } from "../hooks/useImagePreview";
import { ImagePreviewModal } from "./ImagePreviewModal";
import { MessageComposer } from "./MessageComposer";
import { CommunityMessageType } from "../enums/community-message-type.enum";
import { FlaggedContentContainer } from "./FlaggedContentContainer";
import { Popover, PopoverButton, PopoverPanel } from "@headlessui/react";
import { SafetyRiskBadge } from "@/components/common/SafetyRiskBadge";
import { useEditWindowTimer } from "../hooks/useEditWindowTimer";

interface DirectMessageViewProps {
  communityId: string;
  conversation: Conversation;
  currentUserId: string;
  onlineUserIds?: string[];
  userPresenceById?: Record<string, CommunityPresenceStatus>;
  canViewFlaggedContent?: boolean;
}

function smoothSetScrollTop(
  el: HTMLElement,
  target: number,
  opts?: { durationMs?: number; maxDelta?: number },
) {
  const durationMs = opts?.durationMs ?? 140;
  const maxDelta = opts?.maxDelta ?? 500;
  const start = el.scrollTop;
  const delta = target - start;

  if (Math.abs(delta) > maxDelta) {
    el.scrollTop = target;
    return;
  }

  const startTime = performance.now();
  const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

  const step = (now: number) => {
    const t = Math.min(1, (now - startTime) / durationMs);
    el.scrollTop = start + delta * easeOutCubic(t);
    if (t < 1) requestAnimationFrame(step);
  };

  requestAnimationFrame(step);
}

export function DirectMessageView({
  communityId,
  conversation,
  currentUserId,
  onlineUserIds = [],
  userPresenceById: externalUserPresenceById = {},
  canViewFlaggedContent = false,
}: DirectMessageViewProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  const lastFetchAtRef = useRef<number>(0);
  const anchorMessageIdRef = useRef<string | null>(null);
  const anchorOffsetTopRef = useRef<number>(0);
  const shouldAnchorRestoreRef = useRef(false);
  const [messageText, setMessageText] = useState("");
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editMessageContent, setEditMessageContent] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [replyingToMessage, setReplyingToMessage] =
    useState<DirectMessage | null>(null);
  const [openThreadMessage, setOpenThreadMessage] =
    useState<DirectMessage | null>(null);
  const [showNewMessagesIndicator, setShowNewMessagesIndicator] =
    useState(false);
  const initialUnreadCountRef = useRef<number | null>(null);
  const [showUnreadSeparator, setShowUnreadSeparator] = useState(false);
  const isInitialLoadRef = useRef(true);
  const isRestoringScrollRef = useRef(false);
  const lastMessageCountRef = useRef<number>(0);
  const lastMessageIdRef = useRef<string | null>(null);
  const isFetchingHistoryRef = useRef<boolean>(false);
  const shouldAutoScrollRef = useRef<boolean>(false);
  const previousConversationIdRef = useRef<string | null>(null);
  const typingStopTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const participantNamesByIdRef = useRef<Record<string, string>>({});
  const isTypingRef = useRef(false);
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});
  const [dmMessageIdToDelete, setDmMessageIdToDelete] = useState<string | null>(null);
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
  const activeMessageTimerRef = useRef<NodeJS.Timeout | null>(null);

  const queryClient = useQueryClient();
  const isOwnedConversation = conversation.isOwned !== false;
  const isGroupChat = conversation.type === CommunityConversationType.GROUP;
  const shouldApplySafetyRisk = isGroupChat;

  const {
    data,
    isLoading: isLoadingMessages,
    error: messagesError,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteConversationMessages({
    communityId,
    conversationId: conversation.id,
    enabled: isOwnedConversation,
  });

  const { mutate: markConversationAsRead } = useMarkConversationAsRead({
    communityId,
  });

  const { mutate: markConversationNotificationsAsRead } =
    useMarkConversationNotificationsAsRead({
      communityId,
    });

  const {
    sendDMMessage,
    isConnected,
    socket,
    sendTypingStart,
    sendTypingStop,
    editDMMessage,
    userPresenceById: socketUserPresenceById,
  } = useCommunitySocket({
    communityId,
    enabled: !!communityId,
    registerListeners: false,
  });

  const messageMedia = useMessageMediaField();
  const messageMediaClearRef = useRef(messageMedia.clear);
  messageMediaClearRef.current = messageMedia.clear;
  const { mutate: uploadDirectMessageAttachment, isPending: isUploadingMedia } = useUploadDirectMessageAttachment();
  const { previewImageUrl, handleImageClick, handleClosePreview } = useImagePreview();

  const pages = data?.pages ?? [];
  const rawMessages = [...pages]
    .reverse()
    .flatMap((p) => [...p.items].reverse())
    .filter(Boolean);

  const messages = Array.from(
    new Map(rawMessages.map((m) => [m.id, m])).values(),
  );
  
  const groupedMessages = groupMessagesByDate(messages);

  const now = useEditWindowTimer(messages);

  useEffect(() => {
    return () => {
      if (activeMessageTimerRef.current) clearTimeout(activeMessageTimerRef.current);
    };
  }, []);

  useEffect(() => {
    participantNamesByIdRef.current = conversation.participants.reduce<
      Record<string, string>
    >((accumulator, participant) => {
      accumulator[participant.userId] = formatUserName(
        participant.user?.firstName,
        participant.user?.lastName,
        "Someone",
      );
      return accumulator;
    }, {});
  }, [conversation.participants]);

  const initialUnreadCount = initialUnreadCountRef.current || 0;
  const firstUnreadMessageIndex =
    initialUnreadCount > 0 && messages.length > 0 && showUnreadSeparator
      ? Math.max(0, messages.length - initialUnreadCount)
      : -1;
  const hasUnreadMessages =
    initialUnreadCount > 0 &&
    firstUnreadMessageIndex >= 0 &&
    showUnreadSeparator;

  type GroupedMessage = (typeof groupedMessages)[number];
  const isMessageItem = (
    item: GroupedMessage,
  ): item is Extract<GroupedMessage, { type: GroupedMessageType.MESSAGE }> => {
    return item.type === GroupedMessageType.MESSAGE;
  };

  const scrollToBottomMain = useCallback(() => {
    const container = scrollContainerRef.current;
    if (container) {
      smoothSetScrollTop(container, container.scrollHeight, {
        durationMs: 160,
        maxDelta: 900,
      });
    }
    setShowNewMessagesIndicator(false);
  }, []);

  const checkIfNearBottom = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return true;
    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    return distanceFromBottom < 100;
  }, []);

  const stopTyping = useCallback(() => {
    if (typingStopTimeoutRef.current) {
      clearTimeout(typingStopTimeoutRef.current);
      typingStopTimeoutRef.current = null;
    }

    if (!isTypingRef.current) {
      return;
    }

    sendTypingStop(conversation.id);
    isTypingRef.current = false;
  }, [conversation.id, sendTypingStop]);

  const startTyping = useCallback(() => {
    if (!isConnected || conversation.isOwned === false) {
      return;
    }

    if (!isTypingRef.current) {
      sendTypingStart(conversation.id);
      isTypingRef.current = true;
    }

    if (typingStopTimeoutRef.current) {
      clearTimeout(typingStopTimeoutRef.current);
    }

    typingStopTimeoutRef.current = setTimeout(() => {
      if (isTypingRef.current) {
        sendTypingStop(conversation.id);
        isTypingRef.current = false;
      }
      typingStopTimeoutRef.current = null;
    }, 1500);
  }, [conversation.id, conversation.isOwned, isConnected, sendTypingStart, sendTypingStop]);

  const sendMessage = useCallback(
    (content: string, replyToId?: string, attachmentIds?: string[]) => {
      sendDMMessage(conversation.id, content, replyToId, attachmentIds);
      markConversationAsRead({ conversationId: conversation.id });
      stopTyping();
      setShowUnreadSeparator(false);
      setReplyingToMessage(null);
      setTimeout(() => {
        scrollToBottomMain();
      }, 100);
    },
    [sendDMMessage, conversation.id, markConversationAsRead, scrollToBottomMain, stopTyping],
  );

  const handleSendMessage = useCallback(() => {
    const hasContent = messageText.trim().length > 0;
    const hasAttachments = messageMedia.files.length > 0;
    
    if (!hasContent && !hasAttachments) return;
    if (!isConnected) return;
    if (isUploadingMedia) return;
    if (
      replyingToMessage &&
      shouldApplySafetyRisk &&
      !!replyingToMessage.isSafetyRisk &&
      !canViewFlaggedContent
    ) {
      return;
    }

    const contentToSend = messageText.trim() || "";

    const sendWithAttachments = (attachmentIds: string[]) => {
      sendMessage(contentToSend, replyingToMessage?.id, attachmentIds);
      setMessageText("");
      messageMedia.clear();
    };

    if (messageMedia.files.length > 0) {
      const uploadPromises = messageMedia.files.map((mediaFile) => 
        new Promise<string>((resolve, reject) => {
          uploadDirectMessageAttachment(
            {
              communityId,
              conversationId: conversation.id,
              file: mediaFile.file,
            },
            {
              onSuccess: (uploadedMedia) => {
                resolve(uploadedMedia.id);
              },
              onError: (error) => {
                const message = getUploadDirectMessageAttachmentErrorMessage(error);
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
  }, [messageText, messageMedia.files, isConnected, isUploadingMedia, communityId, conversation.id, uploadDirectMessageAttachment, sendMessage, replyingToMessage, shouldApplySafetyRisk, canViewFlaggedContent]);

  useEffect(() => {
    if (messageText.trim().length > 0) {
      startTyping();
      return;
    }

    stopTyping();
  }, [messageText, startTyping, stopTyping]);

  useEffect(() => {
    return () => {
      stopTyping();
    };
  }, [stopTyping]);

  const getOtherParticipant = (conv: Conversation) => {
    return conv.participants.find((p) => p.userId !== currentUserId);
  };
  const getGroupChatTitle = (): string => {
    if (!isGroupChat) return "";
    const otherParticipants = conversation.participants.filter(
      (p) => p.userId !== currentUserId,
    );

    if (otherParticipants.length === 0) return GROUP_CHAT_DEFAULT_LABEL;

    const names = otherParticipants
      .map((p) => p.user?.firstName || "Unknown")
      .filter(Boolean);

    const title = names.join(", ");
    const GROUP_CHAT_TITLE_MAX_LENGTH = 60;

    return truncateText(title, GROUP_CHAT_TITLE_MAX_LENGTH);
  };

  useEffect(() => {
    const unreadCount = conversation.unreadCount || 0;
    initialUnreadCountRef.current = unreadCount;
    setShowUnreadSeparator(unreadCount > 0);
    isInitialLoadRef.current = true;
    isRestoringScrollRef.current = false;
    setShowNewMessagesIndicator(false);
    shouldAutoScrollRef.current = false;
    lastMessageIdRef.current = null;
    lastMessageCountRef.current = 0;
    isFetchingHistoryRef.current = false;
    shouldAnchorRestoreRef.current = false;
    anchorMessageIdRef.current = null;
    anchorOffsetTopRef.current = 0;
    loadingRef.current = false;
    lastFetchAtRef.current = 0;
    setTypingUsers({});
    
    if (previousConversationIdRef.current !== null && previousConversationIdRef.current !== conversation.id) {
      messageMediaClearRef.current();
    }
    previousConversationIdRef.current = conversation.id;
  }, [conversation.id, conversation.unreadCount]);
  useEffect(() => {
    isFetchingHistoryRef.current = isFetchingNextPage;
    if (isFetchingNextPage) {
      setShowNewMessagesIndicator(false);
    }
  }, [isFetchingNextPage]);

  useEffect(() => {
    if (replyingToMessage) {
      messageMediaClearRef.current();
    }
  }, [replyingToMessage]);

  useEffect(() => {
    if (
      replyingToMessage &&
      shouldApplySafetyRisk &&
      !!replyingToMessage.isSafetyRisk &&
      !canViewFlaggedContent
    ) {
      setReplyingToMessage(null);
    }
  }, [replyingToMessage, shouldApplySafetyRisk, canViewFlaggedContent]);

  useEffect(() => {
    if (
      openThreadMessage &&
      shouldApplySafetyRisk &&
      !!openThreadMessage.isSafetyRisk &&
      !canViewFlaggedContent
    ) {
      setOpenThreadMessage(null);
    }
  }, [openThreadMessage, shouldApplySafetyRisk, canViewFlaggedContent]);

  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleNewMessage = (message: DirectMessage) => {
      if (message.conversationId !== conversation.id) return;
      if (isFetchingHistoryRef.current) return;

      setShowUnreadSeparator(false);

      const isNearBottom = checkIfNearBottom();

      if (isNearBottom) {
        shouldAutoScrollRef.current = true;
        lastMessageIdRef.current = message.id;
      } else {
        setShowNewMessagesIndicator(true);
      }
    };

    const handleTypingStarted = (payload: {
      conversationId: string;
      userId: string;
      firstName?: string;
      lastName?: string;
    }) => {
      if (payload.conversationId !== conversation.id) return;
      if (payload.userId === currentUserId) return;

      const payloadName = formatUserName(
        payload.firstName,
        payload.lastName,
        "",
      );
      const fallbackName =
        participantNamesByIdRef.current[payload.userId] || "Someone";
      const displayName = payloadName || fallbackName;

      setTypingUsers((previous) => ({
        ...previous,
        [payload.userId]: displayName,
      }));
    };

    const handleTypingStopped = (payload: {
      conversationId: string;
      userId: string;
    }) => {
      if (payload.conversationId !== conversation.id) return;

      setTypingUsers((previous) => {
        if (!previous[payload.userId]) {
          return previous;
        }

        const nextTypingUsers = { ...previous };
        delete nextTypingUsers[payload.userId];
        return nextTypingUsers;
      });
    };

    socket.on(CommunitySocketEvent.DM_MESSAGE_SENT, handleNewMessage);
    socket.on(CommunitySocketEvent.DM_TYPING_STARTED, handleTypingStarted);
    socket.on(CommunitySocketEvent.DM_TYPING_STOPPED, handleTypingStopped);

    return () => {
      socket.off(CommunitySocketEvent.DM_MESSAGE_SENT, handleNewMessage);
      socket.off(CommunitySocketEvent.DM_TYPING_STARTED, handleTypingStarted);
      socket.off(CommunitySocketEvent.DM_TYPING_STOPPED, handleTypingStopped);
      shouldAutoScrollRef.current = false;
      lastMessageIdRef.current = null;
      setTypingUsers({});
    };
  }, [
    socket,
    isConnected,
    conversation.id,
    checkIfNearBottom,
    currentUserId,
  ]);

  useEffect(() => {
    if (!conversation.id) return;
    registerActiveConversation(conversation.id);
    markConversationAsRead({ conversationId: conversation.id });
    markConversationNotificationsAsRead({ conversationId: conversation.id });

    queryClient.invalidateQueries({
      queryKey: [
        QUERY_KEYS.COMMUNITY.GET_CONVERSATION_MESSAGES,
        { communityId, conversationId: conversation.id, limit: 20 },
      ],
    });

    return () => {
      unregisterActiveConversation(conversation.id);
    };
  }, [
    conversation.id,
    communityId,
    markConversationAsRead,
    markConversationNotificationsAsRead,
    queryClient,
  ]);

  useLayoutEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    if (isLoadingMessages) return;
    if (shouldAnchorRestoreRef.current && anchorMessageIdRef.current) {
      isRestoringScrollRef.current = true;

      const anchorId = anchorMessageIdRef.current;
      const anchorEl = container.querySelector<HTMLElement>(
        `[data-message-id="${anchorId}"]`,
      );

      if (anchorEl) {
        const newScrollTop = anchorEl.offsetTop - anchorOffsetTopRef.current;

        smoothSetScrollTop(container, newScrollTop, {
          durationMs: 120,
          maxDelta: 260,
        });
      }

      shouldAnchorRestoreRef.current = false;
      anchorMessageIdRef.current = null;
      anchorOffsetTopRef.current = 0;

      setTimeout(() => {
        isRestoringScrollRef.current = false;
      }, 0);

      return;
    }
  }, [messages.length, isLoadingMessages]);

  useLayoutEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || isLoadingMessages) return;

    let scrollTimeoutId: NodeJS.Timeout | null = null;

    if (
      isInitialLoadRef.current &&
      !isFetchingNextPage &&
      messages.length > 0
    ) {
      scrollToBottom(scrollContainerRef, 100);
      scrollTimeoutId = setTimeout(() => {
        isInitialLoadRef.current = false;
      }, 100);

      lastMessageCountRef.current = messages.length;
      return () => {
        if (scrollTimeoutId) clearTimeout(scrollTimeoutId);
      };
    }

    if (isRestoringScrollRef.current) return;

    const lastMessage = messages[messages.length - 1];
    const hasNewMessage = messages.length > lastMessageCountRef.current;
    const isNewMessageFromSocket = shouldAutoScrollRef.current && 
          hasNewMessage &&
          lastMessage?.id === lastMessageIdRef.current;
    if (isNewMessageFromSocket) {
      scrollTimeoutId = setTimeout(() => {
        const c = scrollContainerRef.current;
        if (c) {
          smoothSetScrollTop(c, c.scrollHeight, {
            durationMs: 160,
            maxDelta: 900,
          });
        }
        setShowNewMessagesIndicator(false);
        shouldAutoScrollRef.current = false;
        lastMessageIdRef.current = null;
      }, 50);
    } else {
      const isNearBottom = checkIfNearBottom();
      if (isNearBottom) {
        scrollToBottomIfNearBottom(scrollContainerRef, 100, 50);
        setShowNewMessagesIndicator(false);
      }
    }
    lastMessageCountRef.current = messages.length;

    return () => {
      if (scrollTimeoutId) {
        clearTimeout(scrollTimeoutId);
      }
    };
  }, [messages.length, isLoadingMessages, isFetchingNextPage, checkIfNearBottom]);

  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    if (checkIfNearBottom()) {
      setShowNewMessagesIndicator(false);
    }
    if (!hasNextPage || isFetchingNextPage || isLoadingMessages) return;
    if (loadingRef.current) return;
    const TOP_THRESHOLD = 80;
    if (container.scrollTop > TOP_THRESHOLD) return;

    const now = Date.now();
    if (now - lastFetchAtRef.current < 250) return;
    lastFetchAtRef.current = now;
    const messageEls = Array.from(
      container.querySelectorAll<HTMLElement>("[data-message-id]"),
    );
    let anchorEl: HTMLElement | null = null;
    for (const el of messageEls) {
      const elTop = el.offsetTop;
      const elBottom = elTop + el.offsetHeight;

      if (elBottom > container.scrollTop) {
        anchorEl = el;
        break;
      }
    }

    if (anchorEl) {
      anchorMessageIdRef.current = anchorEl.getAttribute("data-message-id");
      anchorOffsetTopRef.current = anchorEl.offsetTop - container.scrollTop;
      shouldAnchorRestoreRef.current = true;
    } else {
      shouldAnchorRestoreRef.current = false;
      anchorMessageIdRef.current = null;
      anchorOffsetTopRef.current = 0;
    }
    loadingRef.current = true;
    fetchNextPage().finally(() => {
      loadingRef.current = false;
    });
  }, [hasNextPage, isFetchingNextPage, isLoadingMessages, fetchNextPage, checkIfNearBottom]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  useEffect(() => {
    if (isInitialLoadRef.current || isRestoringScrollRef.current || isFetchingNextPage || isLoadingMessages) {
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
    }, 120);
    return () => clearTimeout(timeoutId);
  }, [messages.length, hasNextPage, isFetchingNextPage, isLoadingMessages, fetchNextPage]);

  const otherUser = getOtherParticipant(conversation);
  if (!isGroupChat && !otherUser) return null;
  const onlineUsersSet = new Set(onlineUserIds);
  const mergedUserPresenceById = {
    ...externalUserPresenceById,
    ...socketUserPresenceById,
  };

  const resolvePresenceStatus = (
    userId: string | undefined,
  ): CommunityPresenceStatus => {
    if (!userId) {
      return CommunityPresenceStatus.OFFLINE;
    }

    const knownStatus = mergedUserPresenceById[userId];
    if (
      knownStatus === CommunityPresenceStatus.ONLINE ||
      knownStatus === CommunityPresenceStatus.AWAY
    ) {
      return knownStatus;
    }

    return onlineUsersSet.has(userId)
      ? CommunityPresenceStatus.ONLINE
      : CommunityPresenceStatus.OFFLINE;
  };

  const userName = isGroupChat
    ? getGroupChatTitle()
    : formatUserName(
        otherUser?.user?.firstName,
        otherUser?.user?.lastName,
      );
  const profilePicture = otherUser?.user?.profilePicture;
  const otherUserPresenceStatus = resolvePresenceStatus(otherUser?.userId);
  const otherUserStatusLabel =
    otherUserPresenceStatus === CommunityPresenceStatus.AWAY
      ? "Away"
      : otherUserPresenceStatus === CommunityPresenceStatus.ONLINE
        ? "Online"
        : "Offline";
  const lastSentMessageId =
    [...messages].reverse().find((message) => message.userId === currentUserId)
      ?.id ?? null;

  const typingNames = Object.values(typingUsers).filter(Boolean);
  const typingIndicatorText =
    typingNames.length === 0
      ? null
      : typingNames.length === 1
        ? `${typingNames[0]} is typing...`
        : typingNames.length === 2
          ? `${typingNames[0]}, ${typingNames[1]} are typing...`
          : "Several people are typing...";

  const renderHeaderAvatar = () => {
    if (isGroupChat) {
      return (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/20 flex-shrink-0">
          <LuUsers className="h-6 w-6 text-foreground" />
        </div>
      );
    }
    return (
      <div className="relative">
        <Avatar
          firstName={otherUser?.user?.firstName}
          lastName={otherUser?.user?.lastName}
          profilePicture={profilePicture}
          userId={otherUser?.user?.id}
          size="lg"
          alt={userName}
        />
      </div>
    );
  };

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
    editDMMessage(conversation.id, messageId, trimmed);
    setEditingMessageId(null);
    setEditMessageContent("");
    setEditError(null);
  }, [editMessageContent, isConnected, editDMMessage, conversation.id]);

  const renderMessageItem = (
    message: (typeof messages)[number],
    groupedIndex: number,
  ) => {
    if (isGroupChat && message.isSystemMessage) {
      return (
        <div key={message.id} className="flex items-center justify-center py-2">
          <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
            {message.content}
          </span>
        </div>
      );
    }

    const isSent = message.userId !== null && message.userId === currentUserId;
    const isDeleted = !!message.deletedAt;
    const canDeleteDm = isSent && !isDeleted && !message.isSystemMessage;
    const isEditing = editingMessageId === message.id;
    const messageUserName = formatUserName(
      message.user?.firstName,
      message.user?.lastName,
    );
    const messageProfilePicture = message.user?.profilePicture;
    const hasReplies = (message.stats?.replies ?? 0) > 0;
    const isReply = !!message.replyToId;
    const isMessageInteractionBlocked =
      shouldApplySafetyRisk && !!message.isSafetyRisk && !canViewFlaggedContent;
    const activeRecipients = conversation.participants.filter(
      (participant) => participant.userId !== currentUserId && !participant.leftAt,
    );
    const messageTimestamp = toTimestamp(message.createdAt);
    const readRecipients = activeRecipients
      .filter((participant) => toTimestamp(participant.lastReadAt) >= messageTimestamp)
      .sort(
        (recipientA, recipientB) =>
          toTimestamp(recipientB.lastReadAt) - toTimestamp(recipientA.lastReadAt),
      );
    const readCount = readRecipients.length;
    const deliveredCount = activeRecipients.filter(
      (participant) => toTimestamp(participant.lastDeliveredAt) >= messageTimestamp,
    ).length;

    const statusType =
      readCount > 0 ? "READ" : deliveredCount > 0 ? "RECEIVED" : "SENT";
    const statusLabel = isGroupChat
      ? statusType === "READ"
        ? `Read by ${readCount}`
        : statusType === "RECEIVED"
          ? `Received by ${deliveredCount}`
          : "Sent"
      : statusType === "READ"
        ? "Read"
      : statusType === "RECEIVED"
          ? "Received"
          : "Sent";
    const shouldShowStatus =
      isSent && activeRecipients.length > 0 && message.id === lastSentMessageId;
    const shouldShowModeratorBadge =
      shouldApplySafetyRisk && !!message.isSafetyRisk && canViewFlaggedContent;

    let prevMessage = null;
    for (let i = groupedIndex - 1; i >= 0; i--) {
      const prevItem = groupedMessages[i];
      if (isMessageItem(prevItem)) {
        prevMessage = prevItem.message;
        break;
      }
    }
    const showTimestamp = shouldShowTimestamp(message, prevMessage);
    const messageTime = formatMessageTime(message.createdAt);

    function handleActivateMessage(e: React.MouseEvent) {
      e.stopPropagation();
      if (activeMessageTimerRef.current) clearTimeout(activeMessageTimerRef.current);
      setActiveMessageId(message.id);
      activeMessageTimerRef.current = setTimeout(() => setActiveMessageId(null), 3000);
    }

    return (
      <FlaggedContentContainer
        key={message.id}
        isFlagged={shouldApplySafetyRisk && !!message.isSafetyRisk}
        canViewFlaggedContent={canViewFlaggedContent}
        className="rounded-lg"
        moderatorTooltipText={message.safetyRiskReason}
        showModeratorBadge={false}
      >
      <div
        data-message-id={message.id}
        className={twMerge("flex gap-3 group", isSent ? "justify-end" : "justify-start")}
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
        {!isSent && !showTimestamp && <div className="w-8 flex-shrink-0" />}

        <div
          className={twMerge(
            "flex max-w-[70%] min-w-0 flex-col",
            isSent ? "items-end" : "items-start",
          )}
        >
          {isSent && showTimestamp && (
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
          {!isSent && showTimestamp && (
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-semibold text-foreground">{messageUserName}</span>
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
          {isReply && message.replyTo && (
            <div className="mb-2">
              <MessageReplyPreview
                message={message.replyTo}
                currentUserId={currentUserId}
                isFlagged={
                  shouldApplySafetyRisk && !!message.replyTo?.isSafetyRisk
                }
                canViewFlaggedContent={canViewFlaggedContent}
                moderatorTooltipText={message.replyTo?.safetyRiskReason}
                onClick={() => {
                  if (isMessageInteractionBlocked) return;
                  const parentMessage = messages.find(m => m.id === message.replyToId);
                  if (parentMessage) {
                    setOpenThreadMessage(parentMessage);
                  }
                }}
              />
            </div>
          )}
          <div
            className="group/message"
            onClick={handleActivateMessage}
          >
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
            {(isDeleted ||
              (message.content && message.content.trim()) ||
              isEditing) && (
              <div className="flex items-center gap-2 min-w-0">
                {isSent && !isMessageInteractionBlocked && !isEditing && (
                  <div className={twMerge("flex items-center gap-1 flex-shrink-0 transition-opacity duration-200 ease-[0.16,1,0.3,1] opacity-0 pointer-events-none group-hover/message:opacity-100 group-hover/message:pointer-events-auto", activeMessageId === message.id && "opacity-100 pointer-events-auto")}>
                    <div className="flex items-center gap-1 whitespace-nowrap">
                      {!isDeleted && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => setReplyingToMessage(message)}
                              className="p-1.5 rounded-full bg-accent hover:bg-primary-hover transition-colors"
                            >
                              <LuReply className="h-3.5 w-3.5 text-muted-foreground" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>Reply</TooltipContent>
                        </Tooltip>
                      )}
                      {canDeleteDm && !!message.editableUntil && new Date(message.editableUntil) > now && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => handleStartEdit(message)}
                              className="p-1.5 rounded-full bg-accent hover:bg-primary-hover transition-colors"
                            >
                              <LuPencil className="h-3.5 w-3.5 text-muted-foreground" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>Edit</TooltipContent>
                        </Tooltip>
                      )}
                      {canDeleteDm && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => setDmMessageIdToDelete(message.id)}
                              className="p-1.5 rounded-full bg-accent hover:bg-primary-hover transition-colors"
                            >
                              <LuTrash2 className="h-3.5 w-3.5 text-muted-foreground" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>Delete message</TooltipContent>
                        </Tooltip>
                      )}
                      {hasReplies && !isDeleted && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => setOpenThreadMessage(message)}
                              className="p-1.5 rounded-full bg-accent hover:bg-primary-hover transition-colors flex items-center gap-1"
                            >
                              <LuMessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">{message.stats?.replies}</span>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>View thread</TooltipContent>
                        </Tooltip>
                      )}
                    </div>
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
                      "px-4 py-2 rounded-lg overflow-hidden inline-block min-w-0",
                      isSent ? "rounded-tr-none bg-primary/20" : "rounded-tl-none bg-muted"
                    )}
                  >
                    {isDeleted ? (
                      <span className="italic text-sm text-muted-foreground/70">This message was deleted</span>
                    ) : (
                      <>
                        <MessageContent content={message.content} />
                        {message.isEdited ? (
                          <span className="text-xs text-muted-foreground/70 italic ml-1">(edited)</span>
                        ) : null}
                      </>
                    )}
                  </div>
                )}
                {!isSent && !isMessageInteractionBlocked && (
                  <div className={twMerge("flex items-center gap-1 flex-shrink-0 transition-opacity duration-200 ease-[0.16,1,0.3,1] opacity-0 pointer-events-none group-hover/message:opacity-100 group-hover/message:pointer-events-auto", activeMessageId === message.id && "opacity-100 pointer-events-auto")}>
                    <div className="flex items-center gap-1 whitespace-nowrap">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => setReplyingToMessage(message)}
                            className="p-1.5 rounded-full bg-accent hover:bg-primary-hover transition-colors"
                          >
                            <LuReply className="h-3.5 w-3.5 text-muted-foreground" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>Reply</TooltipContent>
                      </Tooltip>
                      {hasReplies && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => setOpenThreadMessage(message)}
                              className="p-1.5 rounded-full bg-accent hover:bg-primary-hover transition-colors flex items-center gap-1"
                            >
                              <LuMessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">{message.stats?.replies}</span>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>View thread</TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
            {!message.content && message.attachments && message.attachments.length > 0 && (
              <div className="flex items-center gap-2 min-w-0">
                {isSent && !isMessageInteractionBlocked && !isEditing && (
                  <div
                    className={twMerge("flex items-center gap-1 flex-shrink-0 transition-opacity duration-200 ease-[0.16,1,0.3,1] opacity-0 pointer-events-none group-hover/message:opacity-100 group-hover/message:pointer-events-auto", activeMessageId === message.id && "opacity-100 pointer-events-auto")}
                  >
                    <div className="flex items-center gap-1 whitespace-nowrap">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => setReplyingToMessage(message)}
                            className="p-1.5 rounded-full bg-accent hover:bg-primary-hover transition-colors"
                          >
                            <LuReply className="h-3.5 w-3.5 text-muted-foreground" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>Reply</TooltipContent>
                      </Tooltip>
                      {canDeleteDm && (
                        <>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => handleStartEdit(message)}
                                className="p-1.5 rounded-full bg-accent hover:bg-primary-hover transition-colors"
                              >
                                <LuPencil className="h-3.5 w-3.5 text-muted-foreground" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>Edit</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => setDmMessageIdToDelete(message.id)}
                                className="p-1.5 rounded-full bg-accent hover:bg-primary-hover transition-colors"
                              >
                                <LuTrash2 className="h-3.5 w-3.5 text-muted-foreground" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>Delete message</TooltipContent>
                          </Tooltip>
                        </>
                      )}
                      {hasReplies && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => setOpenThreadMessage(message)}
                              className="p-1.5 rounded-full bg-accent hover:bg-primary-hover transition-colors flex items-center gap-1"
                            >
                              <LuMessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">{message.stats?.replies}</span>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>View thread</TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                )}
                {!isSent && !isMessageInteractionBlocked && (
                  <div className={twMerge("flex items-center gap-1 flex-shrink-0 transition-opacity duration-200 ease-[0.16,1,0.3,1] opacity-0 pointer-events-none group-hover/message:opacity-100 group-hover/message:pointer-events-auto", activeMessageId === message.id && "opacity-100 pointer-events-auto")}>
                    <div className="flex items-center gap-1 whitespace-nowrap">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => setReplyingToMessage(message)}
                            className="p-1.5 rounded-full bg-accent hover:bg-primary-hover transition-colors"
                          >
                            <LuReply className="h-3.5 w-3.5 text-muted-foreground" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>Reply</TooltipContent>
                      </Tooltip>
                      {hasReplies && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => setOpenThreadMessage(message)}
                              className="p-1.5 rounded-full bg-accent hover:bg-primary-hover transition-colors flex items-center gap-1"
                            >
                              <LuMessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">{message.stats?.replies}</span>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>View thread</TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          {hasReplies && !isMessageInteractionBlocked && (
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
          {shouldShowStatus && (
            <div
              className={twMerge(
                "mt-1 flex items-center gap-1 text-2xs",
                statusType === "READ" ? "text-emerald-600" : "text-muted-foreground",
              )}
            >
              {statusType === "SENT" ? (
                <LuCheck className="h-3 w-3" />
              ) : (
                <LuCheckCheck className="h-3 w-3" />
              )}
              {isGroupChat && statusType === "READ" && readRecipients.length > 0 ? (
                <Popover className="relative">
                  <PopoverButton className="cursor-pointer text-2xs font-medium hover:opacity-80">
                    {statusLabel}
                  </PopoverButton>
                  <PopoverPanel className="absolute bottom-5 right-0 z-20 w-56 rounded-lg border border-border bg-card p-3 shadow-lg">
                    <div className="mb-2 text-xs font-semibold text-foreground">
                      Read by
                    </div>
                    <div className="flex max-h-48 flex-col gap-2 overflow-y-auto">
                      {readRecipients.map((recipient) => (
                        <div
                          key={`${message.id}-${recipient.userId}`}
                          className="flex items-center justify-between gap-2"
                        >
                          <span className="truncate text-xs text-foreground">
                            {formatUserName(
                              recipient.user?.firstName,
                              recipient.user?.lastName,
                            )}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {formatMessageTime(recipient.lastReadAt)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </PopoverPanel>
                </Popover>
              ) : (
                <span className="text-2xs font-medium">{statusLabel}</span>
              )}
            </div>
          )}
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
        {isSent && !showTimestamp && (
          <div className="flex-shrink-0 w-8"></div>
        )}
      </div>
      </FlaggedContentContainer>
    );
  };

  const renderMessagesContent = () => {
    if (conversation.isOwned === false) {
      return (
        <div className="flex flex-col items-center justify-center h-full">
          <div className="text-lg font-semibold text-foreground mb-2">
            You left this conversation
          </div>
          <div className="text-muted-foreground text-sm">
            You don't have access to view messages in this conversation
          </div>
        </div>
      );
    }

    if (isLoadingMessages) {
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
        <div className="flex items-center justify-center h-full">
          <div className="text-muted-foreground">
            No messages in this conversation yet
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {groupedMessages.map((item, groupedIndex) => {
          if (item.type === GroupedMessageType.DATE) {
            return (
              <div key={`date-${item.date}`} className="flex items-center justify-center py-2">
                <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                  {item.date}
                </span>
              </div>
            );
          }

          const messageIndex = messages.findIndex((m) => m.id === item.message.id);
          const isFirstUnread = hasUnreadMessages && messageIndex === firstUnreadMessageIndex;
          
          return (
            <Fragment key={`msgwrap-${item.message.id}`}>
              <AnimatePresence>
                {isFirstUnread && (
                  <motion.div
                    key={`unread-separator-${item.message.id}`}
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
              {renderMessageItem(item.message, groupedIndex)}
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
  };

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
        <div className="p-4 flex-shrink-0 bg-background">
          <div className="flex items-center gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              {renderHeaderAvatar()}
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold text-foreground truncate">{userName}</h2>
                {!isGroupChat && (
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <span
                      className={twMerge(
                        "h-2 w-2 rounded-full",
                        otherUserPresenceStatus === CommunityPresenceStatus.ONLINE
                          ? "bg-emerald-500"
                          : otherUserPresenceStatus === CommunityPresenceStatus.AWAY
                            ? "bg-amber-400"
                            : "bg-border",
                      )}
                    />
                    <span className="text-xs text-muted-foreground">
                      {otherUserStatusLabel}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div
          ref={scrollContainerRef}
          className="flex-1 p-4 overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent bg-background"
        >
          {renderMessagesContent()}
        </div>

        <div className="px-4 pt-4 pb-10 flex-shrink-0 relative">
          <AnimatePresence>
            {showNewMessagesIndicator && (
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{
                  duration: 0.2,
                  ease: [0.16, 1, 0.3, 1],
                }}
                onClick={() => {
                  scrollToBottomMain();
                  setShowNewMessagesIndicator(false);
                }}
                className="absolute -top-12 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 rounded-full shadow-md hover:shadow-lg transition-shadow z-10"
                style={{ backgroundColor: "white", color: "var(--color-emerald-500)" }}
              >
                <span className="text-xs font-medium">New messages</span>
                <LuChevronDown className="h-3.5 w-3.5" />
              </motion.button>
            )}
            {replyingToMessage && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: "auto", marginBottom: "0.5rem" }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                transition={{
                  duration: 0.2,
                  ease: [0.16, 1, 0.3, 1],
                  opacity: { duration: 0.15 },
                }}
                className="overflow-hidden"
              >
                <div className="bg-muted/50 rounded-lg p-3 border border-border relative">
                  <button
                    onClick={() => setReplyingToMessage(null)}
                    className="absolute top-2 right-2 p-1 hover:bg-muted rounded-full transition-colors"
                  >
                    <LuX className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                  <div className="pr-6">
                    <div className="text-xs text-muted-foreground mb-1">Replying to</div>
                    <MessageReplyPreview
                      message={replyingToMessage}
                      currentUserId={currentUserId}
                      isFlagged={
                        shouldApplySafetyRisk && !!replyingToMessage.isSafetyRisk
                      }
                      canViewFlaggedContent={canViewFlaggedContent}
                      moderatorTooltipText={replyingToMessage.safetyRiskReason}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          {conversation.isOwned === false ? (
            <div className="flex items-center justify-center gap-2 bg-muted/50 px-4 py-3 border border-border rounded-xl">
              <span className="text-sm text-muted-foreground">
                You don't belong to this conversation
              </span>
            </div>
          ) : (
            <>
              {typingIndicatorText && (
                <div className="mb-2 flex items-center gap-1.5 px-1 text-xs text-muted-foreground">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                  <span>{typingIndicatorText}</span>
                </div>
              )}
              <MessageComposer
                mode={CommunityMessageType.DM}
                text={messageText}
                onTextChange={setMessageText}
                onSend={handleSendMessage}
                onTextBlur={stopTyping}
                isConnected={isConnected}
                isUploading={isUploadingMedia}
                placeholder="Type a message..."
                media={messageMedia}
                disableAttachments={!!replyingToMessage}
                replyingLabel={replyingToMessage ? "Type a reply..." : undefined}
              />
            </>
          )}
        </div>
      </motion.div>
      <AnimatePresence>
        {openThreadMessage && (
          <ThreadPanel
            communityId={communityId}
            conversationId={conversation.id}
            parentMessage={openThreadMessage}
            currentUserId={currentUserId}
            canViewFlaggedContent={canViewFlaggedContent}
            applySafetyRiskStyling={isGroupChat}
            onClose={() => setOpenThreadMessage(null)}
            onMessageSent={scrollToBottomMain}
          />
        )}
      </AnimatePresence>
      {previewImageUrl && (
        <ImagePreviewModal
          imageUrl={previewImageUrl}
          onClose={handleClosePreview}
        />
      )}
      {dmMessageIdToDelete && (
        <DeleteDmMessageModal
          isOpen={!!dmMessageIdToDelete}
          onClose={() => setDmMessageIdToDelete(null)}
          communityId={communityId}
          conversationId={conversation.id}
          messageId={dmMessageIdToDelete}
        />
      )}
    </div>
  );
}
