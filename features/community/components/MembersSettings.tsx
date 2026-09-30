import { useState, useMemo, useEffect } from "react";
import {
  Listbox,
  ListboxButton,
  ListboxOptions,
  ListboxOption,
} from "@headlessui/react";
import { useSearchParams } from "react-router";
import { useDebounce } from "use-debounce";
import {
  LuCopy,
  LuMail,
  LuMailPlus,
  LuTrash2,
  LuCheck,
  LuBan,
  LuUserPlus,
  LuChevronDown,
} from "react-icons/lu";
import { toast } from "react-hot-toast";
import { ROUTES } from "@/routes/paths";
import { useInfiniteCommunityMembers } from "@/api/community/queries/useInfiniteCommunityMembers";
import { InfiniteScroll } from "@/components/common/InfiniteScroll";
import { SearchBar } from "./SearchBar";
import { Button } from "@/components/common/Button";
import { formatUserName, getUserInitials } from "../utils/userHelpers";
import { CommunityMemberRole } from "@/api/community/enums/community-member-role.enum";
import { MemberRequestStatus } from "@/api/community/enums/member-request-status.enum";
import {
  COMMUNITY_MEMBER_ROLE_LABELS,
  COMMUNITY_MEMBER_ROLE_COLORS,
} from "../constants/communityMemberRole";
import { twMerge } from "tailwind-merge";
import { Modal } from "@/components/UI/Modal";
import { Textarea } from "@/components/UI/TextArea";
import { useCurrentUser } from "@/api/user/queries/useCurrentUser";
import { useUpdateCommunityMemberRole } from "@/api/community/mutations/useUpdateCommunityMemberRole";
import { useInviteCommunityMembers } from "@/api/community/mutations/useInviteCommunityMembers";
import { Conversation } from "@/api/community/community.types";
import { CommunityConversationType } from "@/api/community/enums/community-conversation-type.enum";
import {
  useCreateConversation,
  convertToConversation,
} from "@/api/community/mutations/useCreateConversation";
import { useCommunityBannedUsers } from "@/api/community/queries/useCommunityBannedUsers";
import { useCommunityMemberRequests } from "@/api/community/queries/useCommunityMemberRequests";
import { useCommunityModerationController } from "@/features/community/hooks/useCommunityModerationController";
import { canBanOrRemoveMember } from "@/features/community/utils/moderationHelpers";
import { MemberRequestsList } from "./MemberRequestsList";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { HiOutlineDotsVertical } from "react-icons/hi";
import { useCommunityAccess } from "@/api/community/queries/useCommunityAccess";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/UI/Tooltip";
import { parseEmailsFromString } from "../utils/emailHelpers";
import { CommunityPresenceStatus } from "../enums/community-presence-status.enum";

type MembersSettingsProps = {
  communityId: string;
  conversations?: Conversation[];
  onlineUserIds?: string[];
  userPresenceById?: Record<string, CommunityPresenceStatus>;
  onConversationCreated: (conversation: Conversation) => void;
  canCreateDirectChat?: boolean;
};

export function MembersSettings({
  communityId,
  conversations = [],
  onlineUserIds = [],
  userPresenceById = {},
  onConversationCreated,
  canCreateDirectChat = true,
}: MembersSettingsProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isSendInviteModalOpen, setIsSendInviteModalOpen] = useState(false);
  const [rawEmails, setRawEmails] = useState("");
  const [updatingRoleUserId, setUpdatingRoleUserId] = useState<string | null>(
    null,
  );
  const [activeMenuIndex, setActiveMenuIndex] = useState<number | null>(null);
  const [showMemberRequests, setShowMemberRequests] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [debouncedSearchQuery] = useDebounce(searchQuery, 300);

  useEffect(() => {
    const showRequests = searchParams.get("showRequests");
    if (showRequests === "true") {
      setShowMemberRequests(true);
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("showRequests");
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const { data: currentUser } = useCurrentUser();
  const { data: access } = useCommunityAccess(communityId);
  const { mutate: updateMemberRole } = useUpdateCommunityMemberRole();
  const { mutate: createConversation, isPending: isCreatingChat } =
    useCreateConversation();
    const { mutate: inviteMembers, isPending: isInviting } =
    useInviteCommunityMembers();
    const {
      requestBanUser,
      requestRemoveUser,
      requestUnbanUser,
      moderationModals,
    } = useCommunityModerationController({ communityId });
  const {
    data,
    isLoading,
    isError,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteCommunityMembers({
    communityId,
    isMember: access?.isMember ?? false,
    search: debouncedSearchQuery.trim() || undefined,
  });

  const pages = data?.pages ?? [];
  const rawMembers = pages.flatMap((p) => p.items ?? []);
  const allMembers = useMemo(
    () => rawMembers.filter((m): m is NonNullable<typeof m> => m?.user != null),
    [rawMembers],
  );
  const total = pages[0]?.total ?? allMembers.length;
  const currentUserRole = access?.role ?? null;

  const isOwnerOrModerator =
    access?.role === CommunityMemberRole.OWNER ||
    access?.role === CommunityMemberRole.MODERATOR;

  const { data: bannedUsers } = useCommunityBannedUsers({
    communityId,
    enabled: isOwnerOrModerator,
  });

  const { data: memberRequests } = useCommunityMemberRequests({
    communityId,
    enabled: isOwnerOrModerator,
  });

  const pendingRequestsCount = useMemo(() => {
    return (
      memberRequests?.filter(
        (request) => request.status === MemberRequestStatus.PENDING,
      ).length ?? 0
    );
  }, [memberRequests]);

  const bannedUserIds = new Set(
    bannedUsers?.map((bannedUser) => bannedUser.userId) ?? [],
  );

  const bannedUsersMap = new Map(
    bannedUsers?.map((bannedUser) => [bannedUser.userId, bannedUser]) ?? [],
  );
  const onlineUsersSet = useMemo(() => new Set(onlineUserIds), [onlineUserIds]);

  const visibleMemberIds = useMemo(
    () => allMembers.map((member) => member.user.id),
    [allMembers],
  );

  const areAllVisibleSelected =
    visibleMemberIds.length > 0 &&
    visibleMemberIds.every((id) => selectedUserIds.includes(id));

  const handleToggleSelectMember = (userId: string) => {
    setSelectedUserIds((previousSelected) =>
      previousSelected.includes(userId)
        ? previousSelected.filter((id) => id !== userId)
        : [...previousSelected, userId],
    );
  };

  const handleToggleSelectAllVisible = () => {
    setSelectedUserIds((previousSelected) => {
      if (areAllVisibleSelected) {
        return previousSelected.filter((id) => !visibleMemberIds.includes(id));
      }
      const nextSelected = new Set(previousSelected);
      visibleMemberIds.forEach((id) => nextSelected.add(id));
      return Array.from(nextSelected);
    });
  };

  const hasSelection = selectedUserIds.length > 0;

  const handleToggleRowSelection = (userId: string) => {
    handleToggleSelectMember(userId);
  };

  const handleBulkCreateChat = () => {
    if (!currentUser || isCreatingChat) return;

    const filteredSelectedIds = selectedUserIds.filter(
      (id) => id !== currentUser.id,
    );

    if (filteredSelectedIds.length === 0) {
      if (selectedUserIds.includes(currentUser.id)) {
        toast.error("You cannot start a chat with yourself");
      }
      return;
    }

    if (filteredSelectedIds.length === 1) {
      const otherUserId = filteredSelectedIds[0];
      const existingDM = conversations?.find((conv) => {
        if (conv.type !== CommunityConversationType.ONE_ON_ONE) return false;
        const participantIds = conv.participants.map((p) => p.userId);
        return (
          participantIds.includes(currentUser.id) &&
          participantIds.includes(otherUserId) &&
          participantIds.length === 2
        );
      });

      if (existingDM) {
        onConversationCreated(existingDM);
        setSelectedUserIds([]);
        return;
      }

      createConversation(
        {
          communityId,
          payload: {
            type: CommunityConversationType.ONE_ON_ONE,
            participantIds: [otherUserId],
          },
        },
        {
          onSuccess: (data) => {
            const conversation = convertToConversation(data);
            onConversationCreated(conversation);
            setSelectedUserIds([]);
          },
        },
      );
    } else {
      createConversation(
        {
          communityId,
          payload: {
            type: CommunityConversationType.GROUP,
            participantIds: filteredSelectedIds,
          },
        },
        {
          onSuccess: (data) => {
            const conversation = convertToConversation(data);
            onConversationCreated(conversation);
            setSelectedUserIds([]);
          },
        },
      );
    }
  };

  const handleCopyInviteLink = async () => {
    if (
      typeof window === "undefined" ||
      typeof navigator === "undefined" ||
      !navigator.clipboard
    ) {
      toast.error("Unable to copy link. Please copy it manually.");
      return;
    }

    const link = `${window.location.origin}${ROUTES.COMMUNITY}/${communityId}`;
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Invite link copied to clipboard!");
    } catch {
      toast.error("Failed to copy invite link");
    }
  };

  const handleSendInvites = () => {
    setIsSendInviteModalOpen(true);
  };

  const handleCloseSendInviteModal = () => {
    if (isInviting) {
      return;
    }
    setIsSendInviteModalOpen(false);
    setRawEmails("");
  };

  const handleConfirmSendInvite = () => {
    const emails = parseEmailsFromString(rawEmails);

    if (emails.length === 0) {
      toast.error("Please enter at least one valid email address.");
      return;
    }

    inviteMembers(
      {
        communityId,
        params: {
          emails,
        },
      },
      {
        onSuccess: (result) => {
          let message = `Invitations sent successfully`;
          if (result.totalFailed > 0) {
            message += `. Failed to send invitations to ${result.totalFailed} emails`;
          }
          toast.success(message);
          handleCloseSendInviteModal();
        },
        onError: (error: any) => {
          let errorMessage = "Error sending invitations. Please try again.";

          if (error?.response?.status === 404) {
            errorMessage =
              "Invite endpoint not found. Please verify the backend endpoint is implemented.";
          } else if (error?.response?.data?.message) {
            errorMessage = error.response.data.message;
          } else if (error?.message) {
            errorMessage = error.message;
          }

          toast.error(errorMessage);
        },
      },
    );
  };

  const handleChangeMemberRole = (
    memberUserId: string,
    newRole: CommunityMemberRole,
  ) => {
    if (!communityId) {
      return;
    }

    setUpdatingRoleUserId(memberUserId);

    updateMemberRole(
      {
        communityId,
        userId: memberUserId,
        role: newRole,
      },
      {
        onSuccess: () => {
          toast.success("Member role updated successfully");
        },
        onError: () => {
          toast.error("Unable to change member role. Please try again later.");
        },
        onSettled: () => {
          setUpdatingRoleUserId(null);
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground text-sm">Loading members...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-destructive">Failed to load members</p>
      </div>
    );
  }

  if (showMemberRequests) {
    return (
      <MemberRequestsList
        communityId={communityId}
        onClose={() => setShowMemberRequests(false)}
      />
    );
  }

  return (
    <div className="flex h-full flex-col gap-2 pb-4 xl:gap-4">
      <div className="flex-shrink-0">
        <h2 className="text-2xl font-semibold text-foreground">
          Members
        </h2>
        <p className="text-sm text-muted-foreground">
          Manage your community members and their roles.
        </p>
      </div>

      <div className="flex shrink-0 flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {(isOwnerOrModerator || (hasSelection && access?.isMember && canCreateDirectChat)) && (
            <div className="flex flex-wrap items-center gap-2">
              {isOwnerOrModerator && (
                <>
                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => setShowMemberRequests(true)}
                    className="relative flex items-center gap-2 px-3 py-2 text-sm"
                  >
                    <LuUserPlus className="h-4 w-4" />
                    <span>View Requests</span>
                    {pendingRequestsCount > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-yellow text-xs font-bold text-black">
                        {pendingRequestsCount > 9 ? "9+" : pendingRequestsCount}
                      </span>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleCopyInviteLink}
                    className="flex items-center gap-2 px-3 py-2 text-sm"
                  >
                    <LuCopy className="h-4 w-4" />
                    <span>Copy invite link</span>
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    onClick={handleSendInvites}
                    className="flex items-center gap-2 px-3 py-2 text-sm"
                  >
                    <LuMail className="h-4 w-4" />
                    <span>Send invites</span>
                  </Button>
                </>
              )}
              {hasSelection && access?.isMember && canCreateDirectChat && (
                <Button
                  type="button"
                  variant="primary"
                  className="flex items-center gap-2 px-3 py-2 text-sm"
                  onClick={handleBulkCreateChat}
                  disabled={isCreatingChat}
                >
                  {isCreatingChat ? "Creating..." : "Create chat"}
                </Button>
              )}
            </div>
          )}
          <div className={twMerge("shrink-0", isOwnerOrModerator || (hasSelection && access?.isMember && canCreateDirectChat) ? "w-full sm:w-[220px]" : "w-full")}>
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search members..."
            />
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
        <span className="shrink-0 text-compact text-muted-foreground">
          {hasSelection
            ? `${selectedUserIds.length} selected`
            : `${total} ${total === 1 ? "member" : "members"}`}
        </span>

        <div className="flex min-h-0 flex-1 flex-col rounded-lg border border-border bg-card">
          <div className="flex-shrink-0 border-b border-border bg-muted/50 px-2 py-3 sm:px-4">
            <div className="grid min-w-[400px] grid-cols-12 items-center gap-2 sm:gap-4">
              <div className="col-span-1 flex items-center">
                <div className="relative">
                  <input
                    type="checkbox"
                    className="checked:border-accent checked:bg-accent focus:ring-accent h-4 w-4 appearance-none rounded border-2 border-border bg-card focus:ring-2 focus:ring-offset-0"
                    checked={areAllVisibleSelected}
                    onChange={handleToggleSelectAllVisible}
                    aria-label="Select all members"
                  />
                  {areAllVisibleSelected && (
                    <LuCheck className="pointer-events-none absolute top-0 left-0 h-4 w-4 text-white" />
                  )}
                </div>
              </div>
              <div className="col-span-6">
                <span className="text-foreground text-xs font-semibold tracking-wide uppercase">
                  Name
                </span>
              </div>
              <div className="col-span-4">
                <span className="text-foreground text-xs font-semibold tracking-wide uppercase">
                  Role
                </span>
              </div>
              <div className="col-span-1" />
            </div>
          </div>

          <div className="flex min-h-0 flex-1 overflow-x-auto">
            {allMembers.length === 0 ? (
              <div className="flex w-full items-center justify-center py-12">
                <p className="text-muted-foreground text-sm">
                  {debouncedSearchQuery
                    ? "No members found matching your search"
                    : "No members yet"}
                </p>
              </div>
            ) : (
              <div className="flex-1">
                <InfiniteScroll
                  items={allMembers}
                  hasNextPage={hasNextPage}
                  isFetchingNextPage={isFetchingNextPage}
                  onLoadMore={() => fetchNextPage()}
                  estimateSize={() => 72}
                  enableVariableHeights={false}
                  className="scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent flex-1"
                  height="100%"
                  loadingText="Loading more members..."
                  endText="All members loaded"
                  getRowStyle={(index) =>
                    index === activeMenuIndex ? { zIndex: 50 } : undefined
                  }
                  renderItem={({ item: member, index }) => {
                    const fullName = formatUserName(
                      member.user.firstName,
                      member.user.lastName,
                    );
                    const initials = getUserInitials(
                      member.user.firstName,
                      member.user.lastName,
                    );
                    const role = member.role as CommunityMemberRole;
                    const roleLabel =
                      COMMUNITY_MEMBER_ROLE_LABELS[role] || role;
                    const roleColor =
                      COMMUNITY_MEMBER_ROLE_COLORS[role] ||
                      COMMUNITY_MEMBER_ROLE_COLORS[CommunityMemberRole.MEMBER];
                    const knownPresenceStatus = userPresenceById[member.userId];
                    const presenceStatus =
                      knownPresenceStatus === CommunityPresenceStatus.AWAY ||
                      knownPresenceStatus === CommunityPresenceStatus.ONLINE
                        ? knownPresenceStatus
                        : onlineUsersSet.has(member.userId)
                          ? CommunityPresenceStatus.ONLINE
                          : null;

                    const isOnline = presenceStatus !== null;
                    const isAway = presenceStatus === CommunityPresenceStatus.AWAY;
                    const presenceLabel = isOnline
                      ? isAway
                        ? "Away"
                        : "Online"
                      : "Offline";

                    return (
                      <div
                        key={member.id}
                        className={twMerge(
                          "hover:bg-surface cursor-pointer border-b border-border px-2 py-4 transition-colors sm:px-4",
                          index === allMembers.length - 1 && "border-b-0",
                        )}
                        role="button"
                        tabIndex={0}
                        onClick={() => handleToggleRowSelection(member.user.id)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            handleToggleRowSelection(member.user.id);
                          }
                        }}
                      >
                        <div className="grid grid-cols-12 items-center gap-2 sm:gap-4">
                          <div className="col-span-1">
                            <div className="relative">
                              <input
                                type="checkbox"
                                className="checked:border-accent checked:bg-accent focus:ring-accent h-4 w-4 appearance-none rounded border-2 border-border bg-card focus:ring-2 focus:ring-offset-0"
                                checked={selectedUserIds.includes(
                                  member.user.id,
                                )}
                                onClick={(event) => event.stopPropagation()}
                                onChange={() =>
                                  handleToggleSelectMember(member.user.id)
                                }
                                aria-label={`Select ${fullName}`}
                              />
                              {selectedUserIds.includes(member.user.id) && (
                                <LuCheck className="pointer-events-none absolute top-0 left-0 h-4 w-4 text-white" />
                              )}
                            </div>
                          </div>
                          <div className="col-span-6 flex items-center gap-2 sm:gap-3">
                            {member.user.profilePicture ? (
                              <img
                                src={member.user.profilePicture}
                                alt={fullName}
                                className="h-8 w-8 flex-shrink-0 rounded-full object-cover sm:h-10 sm:w-10"
                              />
                            ) : (
                              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-yellow/10 text-xs font-bold text-yellow sm:h-10 sm:w-10 sm:text-sm">
                                {initials}
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="text-foreground truncate text-sm font-medium sm:text-base">
                                  {fullName}
                                </p>
                                <span
                                  className={twMerge(
                                    "h-2 w-2 flex-shrink-0 rounded-full",
                                    isOnline
                                      ? isAway
                                        ? "bg-amber-400"
                                        : "bg-emerald-500"
                                      : "bg-border",
                                  )}
                                  aria-label={presenceLabel}
                                />
                                {bannedUserIds.has(member.userId) && (
                                  <span className="flex-shrink-0 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                                    Banned
                                  </span>
                                )}
                              </div>
                              <p className="text-muted-foreground truncate text-2xs sm:text-xs">
                                {presenceLabel}
                              </p>
                            </div>
                          </div>
                          <div className="col-span-4">
                            {currentUserRole === CommunityMemberRole.OWNER &&
                            member.role !== CommunityMemberRole.OWNER &&
                            member.user.id !== currentUser?.id ? (
                              <div
                                onClick={(event) => event.stopPropagation()}
                                onKeyDown={(event) => event.stopPropagation()}
                              >
                                <Listbox
                                  value={role}
                                  onChange={(value) =>
                                    handleChangeMemberRole(
                                      member.user.id,
                                      value,
                                    )
                                  }
                                  disabled={
                                    updatingRoleUserId === member.user.id
                                  }
                                >
                                  <ListboxButton className="border-border bg-card text-foreground focus:border-accent focus:ring-accent inline-flex h-8 max-w-[10rem] cursor-pointer items-center justify-between gap-2 rounded-full border px-3 text-xs font-medium focus:ring-2 focus:outline-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 sm:text-sm">
                                    <span className="truncate">
                                      {COMMUNITY_MEMBER_ROLE_LABELS[role]}
                                    </span>
                                    <LuChevronDown className="text-foreground/50 size-3.5 shrink-0" />
                                  </ListboxButton>
                                  <ListboxOptions
                                    anchor="bottom"
                                    className="z-50 mt-1 w-[var(--button-width)] overflow-auto rounded-lg bg-popover py-2 shadow-lg outline-none"
                                  >
                                    <ListboxOption
                                      value={CommunityMemberRole.MEMBER}
                                      className="text-foreground data-[focus]:bg-foreground/10 data-[selected]:font-semibold cursor-pointer px-4 py-2 text-xs select-none sm:text-sm"
                                    >
                                      {
                                        COMMUNITY_MEMBER_ROLE_LABELS[
                                          CommunityMemberRole.MEMBER
                                        ]
                                      }
                                    </ListboxOption>
                                    <ListboxOption
                                      value={CommunityMemberRole.MODERATOR}
                                      className="text-foreground data-[focus]:bg-foreground/10 data-[selected]:font-semibold cursor-pointer px-4 py-2 text-xs select-none sm:text-sm"
                                    >
                                      {
                                        COMMUNITY_MEMBER_ROLE_LABELS[
                                          CommunityMemberRole.MODERATOR
                                        ]
                                      }
                                    </ListboxOption>
                                  </ListboxOptions>
                                </Listbox>
                              </div>
                            ) : (
                              <span
                                className={twMerge(
                                  "inline-block rounded-full px-2 py-1 text-xs font-medium sm:px-3",
                                  roleColor,
                                )}
                              >
                                {roleLabel}
                              </span>
                            )}
                          </div>
                          <div className="col-span-1 flex justify-end">
                            {currentUser &&
                              (currentUserRole === CommunityMemberRole.OWNER ||
                                currentUserRole ===
                                  CommunityMemberRole.MODERATOR) &&
                              member.user.id !== currentUser.id &&
                              member.role !== CommunityMemberRole.OWNER && (
                                <Menu as="div" className="relative z-20">
                                  <MenuButton
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      setActiveMenuIndex(index);
                                    }}
                                    className="text-muted-foreground/70 hover:text-muted-foreground"
                                  >
                                    <HiOutlineDotsVertical
                                      size={20}
                                      className="cursor-pointer"
                                    />
                                  </MenuButton>
                                  <MenuItems className="absolute right-0 z-40 mt-2 w-40 origin-top-right rounded-xl border border-border bg-card shadow-lg">
                                    <div className="py-1">
                                      {bannedUserIds.has(member.userId) ? (
                                        <MenuItem>
                                          {({ active }) => {
                                            const bannedUser =
                                              bannedUsersMap.get(member.userId);
                                            return (
                                              <button
                                                className={twMerge(
                                                  "flex w-full cursor-pointer items-center gap-2 px-4 py-2 text-sm text-primary",
                                                  active && "bg-muted",
                                                )}
                                                onClick={(event) => {
                                                  event.stopPropagation();
                                                  setActiveMenuIndex(null);
                                                  if (bannedUser) {
                                                    requestUnbanUser(
                                                      bannedUser,
                                                    );
                                                  }
                                                }}
                                              >
                                                <LuCheck className="h-4 w-4" />
                                                Unban user
                                              </button>
                                            );
                                          }}
                                        </MenuItem>
                                      ) : (
                                        <>
                                          {canBanOrRemoveMember(
                                            currentUserRole,
                                            currentUser?.id,
                                            member.user.id,
                                            member.role as CommunityMemberRole,
                                          ) && (
                                            <MenuItem>
                                              {({ active }) => (
                                                <button
                                                  className={twMerge(
                                                    "flex w-full cursor-pointer items-center gap-2 px-4 py-2 text-sm text-destructive",
                                                    active && "bg-destructive/10",
                                                  )}
                                                  onClick={(event) => {
                                                    event.stopPropagation();
                                                    setActiveMenuIndex(null);
                                                    requestBanUser(
                                                      member.user.id,
                                                      {
                                                        id: member.user.id,
                                                        firstName:
                                                          member.user.firstName,
                                                        lastName:
                                                          member.user.lastName,
                                                        email:
                                                          member.user.email,
                                                        profilePicture:
                                                          member.user
                                                            .profilePicture,
                                                      },
                                                    );
                                                  }}
                                                >
                                                  <LuBan className="h-4 w-4" />
                                                  Ban from community
                                                </button>
                                              )}
                                            </MenuItem>
                                          )}

                                          <MenuItem>
                                            {({ active }) => {
                                              if (
                                                member.role ===
                                                CommunityMemberRole.MODERATOR
                                              ) {
                                                return (
                                                  <Tooltip>
                                                    <TooltipTrigger asChild>
                                                      <button
                                                        type="button"
                                                        disabled
                                                        className={twMerge(
                                                          "flex w-full cursor-not-allowed items-center gap-2 px-4 py-2 text-sm text-destructive opacity-60",
                                                          active && "bg-destructive/10",
                                                        )}
                                                        onClick={(event) => {
                                                          event.stopPropagation();
                                                        }}
                                                      >
                                                        <LuTrash2 className="h-4 w-4" />
                                                        Remove from community
                                                      </button>
                                                    </TooltipTrigger>
                                                    <TooltipContent
                                                      side="left"
                                                      align="center"
                                                      className="max-w-[12rem]"
                                                    >
                                                      <span className="text-xs">
                                                        Demote this user to
                                                        member before removing
                                                        them from the community.
                                                      </span>
                                                    </TooltipContent>
                                                  </Tooltip>
                                                );
                                              }

                                              return (
                                                <button
                                                  className={twMerge(
                                                    "flex w-full cursor-pointer items-center gap-2 px-4 py-2 text-sm text-destructive",
                                                    active && "bg-destructive/10",
                                                  )}
                                                  onClick={(event) => {
                                                    event.stopPropagation();
                                                    setActiveMenuIndex(null);
                                                    requestRemoveUser(
                                                      member.user.id,
                                                      fullName,
                                                    );
                                                  }}
                                                >
                                                  <LuTrash2 className="h-4 w-4" />
                                                  Remove from community
                                                </button>
                                              );
                                            }}
                                          </MenuItem>
                                        </>
                                      )}
                                    </div>
                                  </MenuItems>
                                </Menu>
                              )}
                          </div>
                        </div>
                      </div>
                    );
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
      {isSendInviteModalOpen && (
        <Modal
          open={isSendInviteModalOpen}
          setClose={handleCloseSendInviteModal}
        >
          <div className="mx-auto max-w-md rounded-2xl bg-card p-6 shadow-lg">
            <div className="mt-2 mb-4 flex flex-col items-center gap-2">
              <div className="bg-accent/10 flex h-10 w-10 items-center justify-center rounded-full">
                <LuMailPlus className="text-primary-hover h-6 w-6" />
              </div>
              <h2 className="text-foreground text-xl font-semibold">
                Send invites
              </h2>
            </div>
            <p className="text-muted-foreground mb-6 text-sm">
              Invite new members to your community by email. They will receive a
              link to join the community.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleConfirmSendInvite();
              }}
              className="mb-6 flex flex-col gap-2"
            >
              <div>
                <label
                  htmlFor="invite-emails"
                  className="text-foreground mb-2 block text-sm font-medium"
                >
                  Emails to invite
                </label>
                <Textarea
                  id="invite-emails"
                  placeholder="user1@example.com, user2@example.com"
                  value={rawEmails}
                  onChange={(e) => setRawEmails(e.target.value)}
                  fullWidth
                  disabled={isInviting}
                  className="min-h-[6rem]"
                />
                <p className="text-muted-foreground mt-1 text-xs">
                  Separate multiple emails with commas, spaces, or new lines
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleCloseSendInviteModal}
                  className="flex-1 shadow-sm"
                  disabled={isInviting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="flex-1"
                  disabled={isInviting}
                >
                  {isInviting ? "Sending..." : "Send invitations"}
                </Button>
              </div>
            </form>
          </div>
        </Modal>
      )}
      {moderationModals}
    </div>
  );
}
