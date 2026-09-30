import { useState, useEffect, useRef, useCallback } from "react";
import { useCommunityConversations } from "@/api/community/queries/useCommunityConversations";
import { useInfiniteConversationMessages } from "@/api/community/queries/useInfiniteConversationMessages";
import { Conversation, DirectMessage } from "@/api/community/community.types";
import { GroupedMessageType } from "../enums/grouped-message-type.enum";
import { formatDistanceToNow } from "date-fns";
import { enGB } from "date-fns/locale";
import { Spinner } from "@/components/common/Spinner";
import { useResponsive } from "@/hooks/useResponsive";
import { twMerge } from "tailwind-merge";
import { getFullName } from "@/utils/userUtils";
import { Avatar } from "@/components/common/Avatar";
import { groupMessagesByDate } from "../utils/messageHelpers";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/UI/Tooltip";
import { formatDateTime } from "@/lib/utils";
import { MessageContent } from "./MessageContent";
import { MessageMenu } from "./MessageMenu";
import { useCommunitySocket } from "../hooks/useCommunitySocket";
import { toast } from "react-hot-toast";

interface CommunityDirectMessageProps {
  communityId: string;
  currentUserId: string;
}

export function CommunityDirectMessage({
  communityId,
  currentUserId,
}: CommunityDirectMessageProps) {
  const { isMobile, isMedium } = useResponsive();
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editMessageContent, setEditMessageContent] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  const { editDMMessage, isConnected } = useCommunitySocket({
    communityId,
    enabled: !!communityId,
    registerListeners: false,
  });

  const {
    data: conversations,
    isLoading: isLoadingConversations,
    error: conversationsError,
  } = useCommunityConversations({ communityId });

  const {
    data,
    isLoading: isLoadingMessages,
    error: messagesError,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteConversationMessages({
    communityId,
    conversationId: selectedConversation?.id || "",
  });

  const pages = data?.pages ?? [];
  const messages = pages.flatMap((p) => p.items).filter(Boolean);
  const groupedMessages = groupMessagesByDate(messages);

  if (conversations && conversations.length > 0 && !selectedConversation) {
    setSelectedConversation(conversations[0]);
  }

  useEffect(() => {
    if (messages && messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
    }
  }, [messages]);

  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) {
      return;
    }

    const container = scrollContainerRef.current;
    const { scrollTop } = container;

    if (!hasNextPage || isFetchingNextPage || loadingRef.current) {
      return;
    }

    if (scrollTop < 200 && hasNextPage && !isFetchingNextPage && !loadingRef.current) {
      loadingRef.current = true;
      fetchNextPage().finally(() => {
        loadingRef.current = false;
      });
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    scrollContainer.addEventListener("scroll", handleScroll);
    return () => scrollContainer.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  useEffect(() => {
    if (
      !scrollContainerRef.current ||
      isLoadingMessages ||
      !hasNextPage ||
      isFetchingNextPage
    ) {
      return;
    }

    const { scrollHeight, clientHeight } = scrollContainerRef.current;
    const hasScroll = scrollHeight > clientHeight;

    if (
      !hasScroll &&
      hasNextPage &&
      !isFetchingNextPage &&
      !loadingRef.current
    ) {
      loadingRef.current = true;
      fetchNextPage().finally(() => {
        loadingRef.current = false;
      });
    }
  }, [messages.length, hasNextPage, isFetchingNextPage, isLoadingMessages, fetchNextPage]);

  const handleStartEdit = useCallback((message: DirectMessage) => {
    setEditingMessageId(message.id);
    setEditMessageContent(message.content ?? "");
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingMessageId(null);
    setEditMessageContent("");
  }, []);

  const handleSaveEdit = useCallback((messageId: string) => {
    const trimmed = editMessageContent.trim();
    if (!trimmed) return;
    if (!isConnected) {
      toast.error("Not connected. Please try again.");
      return;
    }
    if (selectedConversation) {
      editDMMessage(selectedConversation.id, messageId, trimmed);
    }
    setEditingMessageId(null);
    setEditMessageContent("");
  }, [editMessageContent, isConnected, editDMMessage, selectedConversation]);

  if (isLoadingConversations) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading conversations...</div>
      </div>
    );
  }

  if (conversationsError) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-red-500">Error loading conversations</div>
      </div>
    );
  }

  if (!conversations || conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="text-muted-foreground mb-4">No conversations yet</div>
        <button className="px-4 py-2 bg-accent text-foreground rounded-lg hover:bg-primary-hover transition-colors">
          Start conversation
        </button>
      </div>
    );
  }

  const getOtherParticipant = (conversation: Conversation) => {
    return conversation.participants.find((p) => p.userId !== currentUserId);
  };

  return (
    <div className={twMerge(
      "grid grid-cols-1 lg:grid-cols-3 gap-6",
      isMobile || isMedium ? "h-[calc(100dvh-200px)]" : "h-full"
    )}>
      <div className={twMerge(
        "lg:col-span-1 p-4 overflow-y-auto bg-card rounded-lg border border-border shadow-md",
        (isMobile || isMedium) && "max-h-[300px] lg:max-h-none"
      )}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-foreground">Messages</h2>
          <button className="px-3 py-1 bg-accent text-foreground text-sm rounded-lg hover:bg-primary-hover transition-colors">
            + New
          </button>
        </div>

        <div className="space-y-2">
          {conversations.map((conversation) => {
            const otherUser = getOtherParticipant(conversation);
            if (!otherUser) return null;

            const userName = otherUser.user
              ? `${otherUser.user.firstName} ${otherUser.user.lastName}`.trim()
              : "Unknown user";
            const profilePicture = otherUser.user?.profilePicture;

            return (
              <button
                key={conversation.id}
                onClick={() => setSelectedConversation(conversation)}
                className={twMerge(
                  "w-full text-left p-3 rounded-lg transition-colors",
                  selectedConversation?.id === conversation.id
                    ? "bg-accent/10 border-2 border-accent"
                    : "hover:bg-muted"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="relative">
                    <Avatar
                      firstName={otherUser.user?.firstName}
                      lastName={otherUser.user?.lastName}
                      profilePicture={profilePicture}
                      userId={otherUser.user?.id}
                      size="lg"
                      alt={userName}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-semibold truncate text-foreground">{userName}</span>
                      {conversation.unreadCount > 0 && (
                        <span className="bg-purple-700 text-white text-xs px-2 py-0.5 rounded-full ml-2">
                          {conversation.unreadCount}
                        </span>
                      )}
                    </div>
                    {conversation.lastMessage && (
                      <>
                        <p className="text-sm text-muted-foreground truncate">
                          {conversation.lastMessage.content || ""}
                        </p>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(
                            new Date(conversation.lastMessage.createdAt),
                            {
                              addSuffix: true,
                              locale: enGB,
                            },
                          )}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className={twMerge(
        "lg:col-span-2 flex flex-col bg-card rounded-lg border border-border shadow-md overflow-hidden",
        isMobile || isMedium ? "h-[calc(100dvh-200px)]" : "h-full"
      )}>
        {selectedConversation ? (
          <>
            <div className="p-4 border-b flex-shrink-0">
              {(() => {
                const otherUser = getOtherParticipant(selectedConversation);
                if (!otherUser) return null;

                const userName = getFullName(
                  otherUser.user?.firstName,
                  otherUser.user?.lastName,
                  "Unknown user"
                );
                const profilePicture = otherUser.user?.profilePicture;

                return (
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar
                        firstName={otherUser.user?.firstName}
                        lastName={otherUser.user?.lastName}
                        profilePicture={profilePicture}
                        userId={otherUser.user?.id}
                        size="lg"
                        alt={userName}
                      />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-foreground">{userName}</h2>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div
              ref={scrollContainerRef}
              className="flex-1 p-4 overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent"
            >
              {isLoadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <Spinner />
                </div>
              ) : messagesError ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-red-500">Error loading messages</div>
                </div>
              ) : !messages || messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-muted-foreground">
                    No messages in this conversation yet
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
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
                    const isSent = message.userId !== null && message.userId === currentUserId;
                    const userName = getFullName(
                      message.user?.firstName,
                      message.user?.lastName,
                      "Unknown user"
                    );

                    const isEditing = editingMessageId === message.id;

                    return (
                      <div
                        key={message.id}
                        className={twMerge("flex items-end gap-1", isSent ? "justify-end" : "justify-start")}
                      >
                        <div
                          className={twMerge(
                            "max-w-[70%] min-w-0 rounded-lg px-4 py-2 overflow-hidden w-full",
                            isSent
                              ? "bg-accent text-foreground"
                              : "bg-muted text-foreground"
                          )}
                        >
                          {!isSent && (
                            <p className="font-semibold text-sm mb-1">
                              {userName}
                            </p>
                          )}
                          {isEditing ? (
                            <div className="flex flex-col gap-1">
                              <textarea
                                className="w-full px-2 py-1 text-sm border border-border rounded resize-none focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-card text-foreground"
                                value={editMessageContent}
                                rows={2}
                                ref={(el) => { if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } }}
                                onChange={(e) => setEditMessageContent(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSaveEdit(message.id);
                                  } else if (e.key === "Escape") {
                                    handleCancelEdit();
                                  }
                                }}
                              />
                              <span className="text-xs text-muted-foreground">Enter to save · Esc to cancel</span>
                            </div>
                          ) : (
                            <>
                              <MessageContent content={message.content || ""} />
                              {message.isEdited && (
                                <span className="text-xs text-muted-foreground/70 italic ml-1">(edited)</span>
                              )}
                            </>
                          )}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <p
                                className={twMerge(
                                  "cursor-default text-xs mt-1",
                                  isSent ? "text-muted-foreground" : "text-muted-foreground"
                                )}
                              >
                                {formatDistanceToNow(new Date(message.createdAt), {
                                  addSuffix: true,
                                  locale: enGB,
                                })}
                              </p>
                            </TooltipTrigger>
                            <TooltipContent>
                              {formatDateTime(message.createdAt)}
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        {isSent && (
                          <MessageMenu
                            message={message}
                            currentUserId={currentUserId}
                            onEdit={() => handleStartEdit(message)}
                          />
                        )}
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                  
                  {isFetchingNextPage && (
                    <div className="flex justify-center py-4">
                      <Spinner />
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-4 border-t flex-shrink-0">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-foreground placeholder:text-muted-foreground/50"
                />
                <button className="px-6 py-2 bg-accent text-foreground rounded-lg hover:bg-primary-hover transition-colors">
                  Send
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Select a conversation to view messages
          </div>
        )}
      </div>
    </div>
  );
}
