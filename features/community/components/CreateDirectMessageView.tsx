import { useState, useMemo } from "react";
import { twMerge } from "tailwind-merge";
import { LuSearch, LuX, LuUsers } from "react-icons/lu";
import { Avatar } from "@/components/common/Avatar";
import { useCommunityMembers } from "@/api/community/queries/useCommunityMembers";
import {
  useCreateConversation,
  convertToConversation,
} from "@/api/community/mutations/useCreateConversation";
import { useCurrentUser } from "@/api/user/queries/useCurrentUser";
import { Spinner } from "@/components/common/Spinner";
import { formatUserName } from "../utils/userHelpers";
import { Conversation } from "@/api/community/community.types";
import { CommunityConversationType } from "@/api/community/enums/community-conversation-type.enum";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/UI/Tooltip";
import { useCommunityAccess } from "@/api/community/queries/useCommunityAccess";

interface CreateDirectMessageViewProps {
  communityId: string;
  onConversationCreated: (conversation: Conversation) => void;
  onlineUserIds?: string[];
  onClose: () => void;
}

export function CreateDirectMessageView({
  communityId,
  onConversationCreated,
  onlineUserIds = [],
  onClose,
}: CreateDirectMessageViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isGroupMode, setIsGroupMode] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const { data: currentUser } = useCurrentUser();
  const { data: access } = useCommunityAccess(communityId);
  const { data: members, isLoading } = useCommunityMembers({
    communityId,
    isMember: access?.isMember ?? false,
  });
  const { mutate: createConversation, isPending } = useCreateConversation();
  const onlineUsersSet = useMemo(() => new Set(onlineUserIds), [onlineUserIds]);

  const membersList = Array.isArray(members) ? members : [];

  const filteredMembers = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return membersList.filter((member) => {
      if (currentUser?.id != null && member.userId === currentUser.id) {
        return false;
      }
      const fullName = formatUserName(
        member.user?.firstName,
        member.user?.lastName,
      ).toLowerCase();
      return fullName.includes(query);
    });
  }, [membersList, currentUser, searchQuery]);

  const handleSelectUser = (userId: string) => {
    if (!currentUser || isPending) return;

    if (isGroupMode) {
      setSelectedUserIds((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(userId)) {
          newSet.delete(userId);
        } else {
          newSet.add(userId);
        }
        return newSet;
      });
    } else {
      createConversation(
        {
          communityId,
          payload: {
            type: CommunityConversationType.ONE_ON_ONE,
            participantIds: [userId],
          },
        },
        {
          onSuccess: (data) => {
            const conversation = convertToConversation(data);
            onConversationCreated(conversation);
          },
        },
      );
    }
  };

  const handleCreateGroupChat = () => {
    if (!currentUser || isPending || selectedUserIds.size === 0) return;

    if (selectedUserIds.size < 1) return;

    createConversation(
      {
        communityId,
        payload: {
          type: CommunityConversationType.GROUP,
          participantIds: Array.from(selectedUserIds),
        },
      },
      {
        onSuccess: (data) => {
          const conversation = convertToConversation(data);
          setIsGroupMode(false);
          setSelectedUserIds(new Set());
          onConversationCreated(conversation);
        },
      },
    );
  };

  const handleToggleGroupMode = () => {
    setIsGroupMode((prev) => !prev);
    setSelectedUserIds(new Set());
  };

  const getSelectedMembers = useMemo(() => {
    return membersList.filter((member) => selectedUserIds.has(member.userId));
  }, [membersList, selectedUserIds]);

  return (
    <div className="flex flex-col h-full w-full bg-background">
      <div className="px-4 py-3 flex-shrink-0 border-b border-border bg-background flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-foreground">New Message</h2>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleToggleGroupMode}
                className="p-2 rounded-lg bg-accent/50 hover:bg-accent/60 transition-colors"
              >
                <LuUsers className="h-5 w-5 text-foreground" />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>New group chat</p>
            </TooltipContent>
          </Tooltip>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-muted rounded-lg transition-colors"
        >
          <LuX className="h-5 w-5 text-muted-foreground" />
        </button>
      </div>

      {isGroupMode && (
        <div className="px-4 py-3 flex-shrink-0 border-b border-border bg-background">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground font-medium">Selected:</span>
            {getSelectedMembers.length > 0 ? (
              getSelectedMembers.map((member) => {
                const userName = formatUserName(
                  member.user?.firstName,
                  member.user?.lastName,
                );
                return (
                  <div
                    key={member.id}
                    className="flex items-center gap-2 bg-muted rounded-full px-3 py-1"
                  >
                    <span className="text-sm text-foreground">{userName}</span>
                    <button
                      onClick={() => {
                        setSelectedUserIds((prev) => {
                          const newSet = new Set(prev);
                          newSet.delete(member.userId);
                          return newSet;
                        });
                      }}
                      className="hover:bg-muted rounded-full p-0.5 transition-colors"
                    >
                      <LuX className="h-3 w-3 text-muted-foreground" />
                    </button>
                  </div>
                );
              })
            ) : (
              <span className="text-sm text-muted-foreground/70">No members selected</span>
            )}
          </div>
        </div>
      )}

      <div className="px-4 py-3 flex-shrink-0 border-b border-border bg-background">
        <div className="relative">
          <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
          <input
            type="text"
            placeholder={isGroupMode ? "Search and select members..." : "Search members..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent text-foreground"
          />
        </div>
      </div>

      {isGroupMode && (
        <div className="px-4 py-3 flex-shrink-0 border-b border-border bg-background">
          <button
            onClick={handleCreateGroupChat}
            disabled={isPending || selectedUserIds.size === 0}
            className={twMerge(
              "w-full px-4 py-2 bg-accent text-white rounded-lg hover:bg-primary-hover transition-colors font-semibold",
              (isPending || selectedUserIds.size === 0) &&
                "opacity-50 cursor-not-allowed"
            )}
          >
            {isPending ? "Creating..." : `Create group chat${selectedUserIds.size > 0 ? ` (${selectedUserIds.size})` : ""}`}
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Spinner />
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-muted-foreground text-center">
              {searchQuery
                ? "No members found matching your search"
                : "No members available"}
            </div>
          </div>
        ) : (
          <div className="py-2">
            {filteredMembers.map((member) => {
              const userName = formatUserName(
                member.user?.firstName,
                member.user?.lastName,
              );
              const profilePicture = member.user?.profilePicture;
              const isOnline = onlineUsersSet.has(member.userId);

              const isSelected = selectedUserIds.has(member.userId);

              return (
                <button
                  key={member.id}
                  onClick={() => handleSelectUser(member.userId)}
                  disabled={isPending && !isGroupMode}
                  className={twMerge(
                    "w-full px-4 py-3 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left",
                    isPending && !isGroupMode && "opacity-50 cursor-not-allowed",
                    isGroupMode && isSelected && "bg-accent/10",
                  )}
                >
                  <Avatar
                    firstName={member.user?.firstName}
                    lastName={member.user?.lastName}
                    profilePicture={profilePicture}
                    userId={member.user?.id}
                    size="md"
                    alt={userName}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-foreground truncate">
                      {userName}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={twMerge(
                          "h-2 w-2 rounded-full",
                          isOnline ? "bg-emerald-500" : "bg-border",
                        )}
                      />
                      <span className="text-xs text-muted-foreground">
                        {isOnline ? "Online" : "Offline"}
                      </span>
                    </div>
                  </div>
                  {isGroupMode && (
                    <div
                      className={twMerge(
                        "w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0",
                        isSelected
                          ? "bg-accent border-accent"
                          : "border-border"
                      )}
                    >
                      {isSelected && (
                        <div className="w-2 h-2 bg-card rounded-full" />
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
