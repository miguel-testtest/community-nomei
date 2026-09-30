import { Avatar } from "@/components/common/Avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/UI/Tooltip";
import { getFullName } from "@/utils/userUtils";
import { Popover, PopoverButton, PopoverPanel } from "@headlessui/react";
import { LuPlus } from "react-icons/lu";
import { twMerge } from "tailwind-merge";
import { COMMON_EMOJIS } from "../utils/constants";
import {
  formatReactionUserNames,
  groupReactionsByEmoji,
  ReactionItem,
} from "../utils/reactionHelpers";

interface ReactionsBarProps {
  reactions: ReactionItem[];
  onReactionClick: (emoji: string) => void;
  isPending?: boolean;
  isMember?: boolean;
  className?: string | undefined;
  tone?: "default" | "comment";
  showAddButton?: boolean;
  showContainer?: boolean;
  currentUserId?: string | undefined;
  maxVisibleGroups?: number;
}

export function ReactionsBar({
  reactions,
  onReactionClick,
  isPending = false,
  isMember = true,
  className,
  tone = "default",
  showAddButton = true,
  showContainer = true,
  currentUserId,
  maxVisibleGroups,
}: ReactionsBarProps) {
  const reactionsByEmoji = groupReactionsByEmoji(reactions);
  const isCommentTone = tone === "comment";

  const sortedEntries = Object.entries(reactionsByEmoji).sort((a, b) => {
    const aHasCurrentUser =
      !!currentUserId && a[1].some((reaction) => reaction.userId === currentUserId);
    const bHasCurrentUser =
      !!currentUserId && b[1].some((reaction) => reaction.userId === currentUserId);

    if (aHasCurrentUser !== bHasCurrentUser) {
      return aHasCurrentUser ? -1 : 1;
    }

    return b[1].length - a[1].length;
  });

  const visibleEntries =
    maxVisibleGroups && maxVisibleGroups > 0
      ? sortedEntries.slice(0, maxVisibleGroups)
      : sortedEntries;
  const hiddenEntries =
    maxVisibleGroups && maxVisibleGroups > 0
      ? sortedEntries.slice(maxVisibleGroups)
      : [];

  const addButtonClass = twMerge(
    "flex items-center justify-center rounded-full border transition-colors duration-150 active:scale-95",
    isCommentTone ? "h-7 w-7" : "h-9 w-9",
    isCommentTone
      ? "border-zen-pearl-dark bg-zen-pearl text-foreground/65 hover:border-border hover:bg-surface hover:text-foreground/80"
      : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground/70",
  );

  const hiddenCounterClass = twMerge(
    "inline-flex items-center rounded-full border font-semibold",
    isCommentTone ? "h-7 px-2 text-[10px]" : "h-9 px-2.5 text-xs",
    isCommentTone
      ? "border-zen-pearl-dark bg-zen-pearl text-foreground/65"
      : "border-border bg-card text-muted-foreground",
  );

  const containerClassName = twMerge(
    "flex flex-wrap items-center gap-1 sm:gap-2",
    isCommentTone && "min-h-7 transition-opacity duration-150",
    !showContainer &&
      (isCommentTone ? "pointer-events-none select-none opacity-0" : "hidden"),
    className,
  );

  return (
    <div className={containerClassName} aria-hidden={!showContainer}>
      {visibleEntries.map(([emoji, reactionList]) => {
        const count = reactionList.length;
        const userNamesText = formatReactionUserNames(reactionList);
        const currentUserReacted =
          !!currentUserId &&
          reactionList.some((reaction) => reaction.userId === currentUserId);

        const reactionButtonClass = twMerge(
          "flex items-center gap-1 rounded-full border transition-colors duration-150 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50",
          isCommentTone ? "h-7 px-2" : "h-9 px-2.5",
          isCommentTone
            ? currentUserReacted
              ? "border-border bg-surface text-foreground hover:border-zen-pearl-dark hover:bg-muted"
              : "border-zen-pearl-dark bg-zen-pearl text-foreground/80 hover:border-border hover:bg-surface"
            : "border-border bg-card text-foreground/70 hover:bg-muted",
        );

        const usersWithProfiles = reactionList
          .map((reaction) => reaction.user)
          .filter((user): user is NonNullable<ReactionItem["user"]> => !!user);
        const visibleUsers = usersWithProfiles.slice(0, 5);
        const hiddenUsersCount = usersWithProfiles.length - visibleUsers.length;

        return (
          <Tooltip key={emoji}>
            <TooltipTrigger asChild>
              <button
                onClick={() => onReactionClick(emoji)}
                disabled={isPending || !isMember}
                className={reactionButtonClass}
              >
                <span className={isCommentTone ? "text-compact" : "text-base"}>
                  {emoji}
                </span>
                <span
                  className={twMerge(
                    "font-medium",
                    isCommentTone ? "text-[10px]" : "text-sm",
                  )}
                >
                  {count}
                </span>
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <div className="w-56 text-xs text-white">
                <div className="mb-1 flex items-center justify-between">
                  <div className="font-semibold">
                    {emoji} {count} {count === 1 ? "reaction" : "reactions"}
                  </div>
                  {currentUserReacted && (
                    <span className="text-[10px] font-semibold text-emerald-300">
                      You reacted
                    </span>
                  )}
                </div>

                {visibleUsers.length > 0 ? (
                  <div className="mt-2 space-y-1.5">
                    {visibleUsers.map((user) => {
                      const fullName = getFullName(user.firstName, user.lastName);
                      const isCurrentUser = currentUserId === user.id;

                      return (
                        <div key={user.id} className="flex items-center gap-2">
                          <Avatar
                            firstName={user.firstName}
                            lastName={user.lastName}
                            profilePicture={user.profilePicture}
                            userId={user.id}
                            size="xs"
                            alt={fullName}
                          />
                          <span className="line-clamp-1 text-2xs text-muted">
                            {fullName}
                          </span>
                          {isCurrentUser && (
                            <span className="text-[10px] font-medium text-emerald-300">
                              You
                            </span>
                          )}
                        </div>
                      );
                    })}

                    {hiddenUsersCount > 0 && (
                      <div className="pt-1 text-[10px] text-border">
                        +{hiddenUsersCount} more
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mt-1 text-2xs text-border">
                    {userNamesText} reacted with {emoji}
                  </div>
                )}

                <div className="mt-2 text-[10px] text-border">
                  {isMember ? "Click to toggle reaction" : "Join the community to react"}
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        );
      })}

      {hiddenEntries.length > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={hiddenCounterClass}>+{hiddenEntries.length}</span>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <div className="text-xs text-white">
              <div className="mb-1 font-semibold">More reactions</div>
              <div className="space-y-1">
                {hiddenEntries.map(([emoji, items]) => (
                  <div key={emoji} className="flex items-center gap-2">
                    <span>{emoji}</span>
                    <span className="text-border">{items.length}</span>
                  </div>
                ))}
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      )}

      {isMember && showAddButton && (
        <Popover className="relative">
          {({ close }) => (
            <>
              <PopoverButton className={addButtonClass}>
                <LuPlus
                  size={isCommentTone ? 12 : 14}
                  className={twMerge(
                    "text-muted-foreground",
                    isCommentTone && "text-foreground/65",
                  )}
                />
              </PopoverButton>
              <PopoverPanel
                anchor="bottom start"
                className="z-50 mt-2 rounded-lg border border-border bg-card p-3 shadow-lg"
              >
                <div className="grid grid-cols-5 gap-2">
                  {COMMON_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      className="flex h-8 w-8 items-center justify-center rounded text-lg transition-colors hover:bg-muted"
                      onClick={() => {
                        onReactionClick(emoji);
                        close();
                      }}
                      disabled={isPending}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </PopoverPanel>
            </>
          )}
        </Popover>
      )}
    </div>
  );
}
