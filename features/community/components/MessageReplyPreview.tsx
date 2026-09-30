import { DirectMessage, ChannelMessage } from "@/api/community/community.types";
import { formatUserName } from "../utils/userHelpers";
import { twMerge } from "tailwind-merge";
import { MessageContent } from "./MessageContent";
import { PostMediaType } from "@/api/community/community.types";
import { FlaggedContentContainer } from "./FlaggedContentContainer";

interface MessageReplyPreviewProps {
  message: DirectMessage | ChannelMessage;
  currentUserId: string;
  onClick?: () => void;
  isFlagged?: boolean;
  canViewFlaggedContent?: boolean;
  moderatorTooltipText?: string | undefined;
  obfuscationLevel?: "light" | "default" | "strong";
}

export function MessageReplyPreview({
  message,
  currentUserId,
  onClick,
  isFlagged = false,
  canViewFlaggedContent = false,
  moderatorTooltipText,
  obfuscationLevel = "default",
}: MessageReplyPreviewProps) {
  const isSent = message.userId !== null && message.userId === currentUserId;
  const userName = formatUserName(
    message.user?.firstName,
    message.user?.lastName,
  );
  const isInteractionBlocked = isFlagged && !canViewFlaggedContent;
  const canClick = !!onClick && !isInteractionBlocked;

  return (
    <FlaggedContentContainer
      isFlagged={isFlagged}
      canViewFlaggedContent={canViewFlaggedContent}
      className="rounded-md"
      moderatorTooltipText={moderatorTooltipText}
      obfuscationLevel={obfuscationLevel}
    >
      <div
        className={twMerge(
          "mb-2 border-l-2 pl-3 text-xs min-w-0",
          isSent ? "border-accent" : "border-border",
          canClick ? "cursor-pointer hover:opacity-80" : "cursor-default",
        )}
        onClick={canClick ? onClick : undefined}
      >
        <div className="flex items-center gap-1 text-muted-foreground">
          <span className="font-semibold truncate">
            {isSent ? "You" : userName}
          </span>
        </div>
        {message.content && message.content.trim() && (
          <div
            className="break-words overflow-hidden"
            style={{
              wordBreak: "break-word",
              overflowWrap: "break-word",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            <MessageContent
              content={message.content}
              textSize="xs"
              textColor="text-muted-foreground"
              compact={true}
            />
          </div>
        )}
        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-1">
            {message.attachments.some((att) => att.type === PostMediaType.IMAGE) ? (
              <div className="flex items-center gap-1 text-muted-foreground text-xs">
                <span>Image</span>
                {message.attachments.filter((att) => att.type === PostMediaType.IMAGE)
                  .length > 1 && (
                  <span>
                    (
                    {
                      message.attachments.filter(
                        (att) => att.type === PostMediaType.IMAGE,
                      ).length
                    }
                    )
                  </span>
                )}
              </div>
            ) : message.attachments.some(
                (att) => att.type === PostMediaType.VIDEO,
              ) ? (
              <div className="flex items-center gap-1 text-muted-foreground text-xs">
                <span>Video</span>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </FlaggedContentContainer>
  );
}
