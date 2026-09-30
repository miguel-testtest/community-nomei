import { useState, useEffect, useRef, useCallback } from "react";
import { useCommunityChannels } from "@/api/community/queries/useCommunityChannels";
import { useInfiniteChannelMessages } from "@/api/community/queries/useInfiniteChannelMessages";
import { Channel } from "@/api/community/community.types";
import { formatDistanceToNow } from "date-fns";
import { enGB } from "date-fns/locale";
import { Spinner } from "@/components/common/Spinner";
import { useResponsive } from "@/hooks/useResponsive";
import { twMerge } from "tailwind-merge";
import { getFullName } from "@/utils/userUtils";
import { Avatar } from "@/components/common/Avatar";
import { MessageContent } from "./MessageContent";

interface CommunityChannelProps {
  communityId: string;
}

export function CommunityChannel({
  communityId,
}: CommunityChannelProps) {
  const { isMobile, isMedium } = useResponsive();
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  const {
    data: channels,
    isLoading: isLoadingChannels,
    error: channelsError,
  } = useCommunityChannels({ communityId });

  const {
    data,
    isLoading: isLoadingMessages,
    error: messagesError,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteChannelMessages({
    communityId,
    channelId: selectedChannel?.id || "",
  });

  const pages = data?.pages ?? [];
  const messages = pages.flatMap((p) => p.items).filter(Boolean);

  if (channels && channels.length > 0 && !selectedChannel) {
    setSelectedChannel(channels[0]);
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

  if (isLoadingChannels) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading channels...</div>
      </div>
    );
  }

  if (channelsError) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-red-500">Error loading channels</div>
      </div>
    );
  }

  if (!channels || channels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="text-muted-foreground mb-4">No channels available</div>
        <button className="px-4 py-2 bg-accent text-foreground rounded-lg hover:bg-primary-hover transition-colors">
          Create first channel
        </button>
      </div>
    );
  }

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
          <h2 className="text-xl font-bold text-foreground">Channels</h2>
          <button className="px-3 py-1 bg-accent text-foreground text-sm rounded-lg hover:bg-primary-hover transition-colors">
            + New
          </button>
        </div>

        <div className="space-y-2">
          {channels.map((channel) => (
            <button
              key={channel.id}
              onClick={() => setSelectedChannel(channel)}
              className={twMerge(
                "w-full text-left p-3 rounded-lg transition-colors text-foreground",
                selectedChannel?.id === channel.id
                  ? "bg-accent"
                  : "hover:bg-muted"
              )}
            >
              <div className="font-semibold mb-1">#{channel.name}</div>
              {channel.description && (
                <div
                  className={twMerge(
                    "text-sm",
                    selectedChannel?.id === channel.id
                      ? "text-muted-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  {channel.description}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className={twMerge(
        "lg:col-span-2 flex flex-col bg-card rounded-lg border border-border shadow-md overflow-hidden",
        isMobile || isMedium ? "h-[calc(100dvh-200px)]" : "h-full"
      )}>
        {selectedChannel ? (
          <>
            <div className="p-4 border-b flex-shrink-0">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold mb-1 text-foreground">
                    #{selectedChannel.name}
                  </h2>
                  {selectedChannel.description && (
                    <p className="text-muted-foreground mb-2">
                      {selectedChannel.description}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div
              ref={scrollContainerRef}
              className="flex-1 p-4 overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent"
            >
              {isLoadingMessages && (
                <div className="flex items-center justify-center h-full">
                  <Spinner />
                </div>
              )}

              {!isLoadingMessages && messagesError && (
                <div className="flex items-center justify-center h-full">
                  <div className="text-red-500">Error loading messages</div>
                </div>
              )}

              {!isLoadingMessages && !messagesError && (!messages || messages.length === 0) && (
                <div className="flex items-center justify-center h-full">
                  <div className="text-muted-foreground">
                    No messages in this channel yet
                  </div>
                </div>
              )}

              {!isLoadingMessages && !messagesError && messages && messages.length > 0 && (
                <div className="space-y-4">
                  {messages.map((message) => {
                    const userName = getFullName(
                      message.user?.firstName,
                      message.user?.lastName,
                      "Unknown user"
                    );
                    const profilePicture = message.user?.profilePicture;

                    return (
                      <div key={message.id} className="flex gap-3">
                        <Avatar
                          firstName={message.user?.firstName}
                          lastName={message.user?.lastName}
                          profilePicture={profilePicture}
                          userId={message.user?.id}
                          size="md"
                          alt={userName}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2 mb-1">
                            <span className="font-semibold text-foreground">{userName}</span>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(message.createdAt), {
                                addSuffix: true,
                                locale: enGB,
                              })}
                            </span>
                          </div>
                          <MessageContent content={message.content || ""} />
                        </div>
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
            Select a channel to view messages
          </div>
        )}
      </div>
    </div>
  );
}
