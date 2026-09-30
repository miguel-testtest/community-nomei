import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useParams, useNavigate, useLocation } from "react-router";
import {
  LuArrowLeft,
  LuPanelRight,
} from "react-icons/lu";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { HiOutlineDotsVertical } from "react-icons/hi";
import { twMerge } from "tailwind-merge";
import { isAxiosError } from "axios";
import { toast } from "react-hot-toast";
import { PageLayout } from "@/components/layouts/PageLayout";
import { Spinner } from "@/components/common/Spinner";
import { ROUTES } from "@/routes/paths";
import { useCurrentUser } from "@/api/user/queries/useCurrentUser";
import { useCommunity } from "@/api/community/queries/useCommunity";
import { useCommunityAccess } from "@/api/community/queries/useCommunityAccess";
import { useCommunityChannels } from "@/api/community/queries/useCommunityChannels";
import { useCommunityConversationsWithUnread } from "@/api/community/queries/useCommunityConversationsWithUnread";
import { useCommunityChannelUnreadCounts } from "@/api/community/queries/useCommunityChannelUnreadCounts";
import { useMarkChannelAsRead } from "@/api/community/mutations/useMarkChannelAsRead";
import { useMarkConversationAsRead } from "@/api/community/mutations/useMarkConversationAsRead";
import { useJoinCommunity } from "@/api/community/mutations/useJoinCommunity";
import { useCommunityBannedUsers } from "@/api/community/queries/useCommunityBannedUsers";
import { useCommunityMemberRequests } from "@/api/community/queries/useCommunityMemberRequests";
import { useCommunitySocket } from "@/features/community/hooks/useCommunitySocket";
import { useCommunityModerationController } from "@/features/community/hooks/useCommunityModerationController";
import { useCommunityInvitation } from "@/features/community/hooks/useCommunityInvitation";
import { useResponsive } from "@/hooks/useResponsive";
import { useCommunityDashboardNavigation } from "@/features/community/hooks/useCommunityDashboardNavigation";
import { useCommunityChannelActions } from "@/features/community/hooks/useCommunityChannelActions";
import { useCommunityConversationActions } from "@/features/community/hooks/useCommunityConversationActions";
import { useCommunityDashboardSidebar } from "@/features/community/hooks/useCommunityDashboardSidebar";
import { CommunityMainContent } from "@/features/community/components/CommunityMainContent";
import { DashboardSidebar } from "@/features/community/components/DashboardSidebar";
import { LeaveCommunityModal } from "@/features/community/components/LeaveCommunityModal";
import { LeaveChannelModal } from "@/features/community/components/LeaveChannelModal";
import { LeaveConversationModal } from "@/features/community/components/LeaveConversationModal";
import { RequestRejectedModal } from "@/features/community/components/RequestRejectedModal";
import { CommunityMemberRole } from "@/api/community/enums/community-member-role.enum";
import { MemberRequestStatus } from "@/api/community/enums/member-request-status.enum";
import {
  DashboardSection,
  isValidDashboardSection,
} from "@/features/community/enums/dashboard-section.enum";
import { getCommunityRestrictions } from "@/features/community/enums/restricted-community-name.enum";
import { CommunityConversationType } from "@/api/community/enums/community-conversation-type.enum";
import { CommunityBanNoticePayload } from "@/features/community/types/community-ban-notice-navigation-state.type";
import { CommunityDiscoveryBackNavigationState } from "@/features/community/types/community-discovery-back-navigation-state.type";

interface ErrorResponse {
  message?: string;
}

export function CommunityDashboard() {
  const { communityId } = useParams<{ communityId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { isMobile } = useResponsive();

  const [logoPreviewOverride, setLogoPreviewOverride] = useState<string | null>(
    null,
  );
  const [showLeaveCommunityModal, setShowLeaveCommunityModal] = useState(false);

  const previousCommunityIdRef = useRef<string | null>(null);
  const communityNameRef = useRef<string | null>(null);
  const hasShownToastRef = useRef(false);
  const hasRedirectedForBanRef = useRef(false);
  const backToCommunitiesPathRef = useRef(
    (location.state as CommunityDiscoveryBackNavigationState | null)?.from,
  );

  const { data: currentUser } = useCurrentUser();
  const { isProcessingInvitation } = useCommunityInvitation(communityId);

  const { data: access, isLoading: isAccessLoading } =
    useCommunityAccess(communityId);

  const { data: bannedUsers } = useCommunityBannedUsers({
    communityId: communityId || "",
    enabled: !!communityId && !!access?.canModerate,
  });

  const isOwnerOrModerator =
    access?.role === CommunityMemberRole.OWNER ||
    access?.role === CommunityMemberRole.MODERATOR;

  const { data: memberRequests } = useCommunityMemberRequests({
    communityId: communityId || "",
    enabled: !!communityId && isOwnerOrModerator,
  });

  const pendingRequestsCount =
    memberRequests?.filter(
      (request) => request.status === MemberRequestStatus.PENDING,
    ).length ?? 0;

  const bannedUserIds = useMemo(
    () => new Set(bannedUsers?.map((bannedUser) => bannedUser.userId) ?? []),
    [bannedUsers],
  );

  const isActiveMember = !!access?.isMember && !access?.isBanned;

  const {
    data: community,
    isLoading: isCommunityLoading,
    isError,
  } = useCommunity(communityId);

  const communityRestrictions = useMemo(
    () => getCommunityRestrictions(community?.name),
    [community?.name],
  );

  const canViewMembersSection =
    access?.isMember &&
    (communityRestrictions.membersVisibleToRoles === null ||
      (access.role &&
        communityRestrictions.membersVisibleToRoles.includes(access.role)));

  const canManageCommunitySettings =
    !!access?.canManageSettings ||
    (!!communityRestrictions.moderatorsSameRightsAsOwners &&
      access?.role === CommunityMemberRole.MODERATOR);

  const { data: channels } = useCommunityChannels({
    communityId: communityId || "",
    enabled: !!communityId && isActiveMember,
  });

  const { data: conversations } = useCommunityConversationsWithUnread({
    communityId: communityId || "",
    enabled: !!communityId && isActiveMember,
  });

  const { data: channelUnreadCounts } = useCommunityChannelUnreadCounts({
    communityId: communityId || "",
    enabled: !!communityId && isActiveMember,
  });

  const { mutate: markChannelAsRead } = useMarkChannelAsRead({
    communityId: communityId || "",
  });

  const { mutate: markConversationAsRead } = useMarkConversationAsRead({
    communityId: communityId || "",
  });

  const channelUnreadMap = new Map(
    (channelUnreadCounts ?? []).map((item) => [item.channelId, item.unreadCount]),
  );

  const redirectToHomeWithBanNotice = useCallback(
    (payload?: CommunityBanNoticePayload) => {
      if (!communityId || hasRedirectedForBanRef.current) {
        return;
      }

      hasRedirectedForBanRef.current = true;
      navigate(ROUTES.HOME, {
        replace: true,
        state: {
          communityBanNotice: {
            communityId,
            communityName: payload?.communityName ?? communityNameRef.current,
          },
        },
      });
    },
    [communityId, navigate],
  );

  const handleSafeguardUserBanned = useCallback(() => {
    redirectToHomeWithBanNotice();
  }, [redirectToHomeWithBanNotice]);

  const { onlineUserIds, userPresenceById } = useCommunitySocket({
    communityId: communityId || "",
    enabled: !!communityId && isActiveMember,
    onSafeguardUserBanned: handleSafeguardUserBanned,
  });
  const onlineUserIdsSet = useMemo(
    () => new Set(onlineUserIds),
    [onlineUserIds],
  );

  const { requestBanUser, requestRemoveUser, moderationModals } =
    useCommunityModerationController({ communityId: communityId || "" });

  const { mutate: joinCommunityMutate, isPending: isJoiningPending } =
    useJoinCommunity();

  const navigation = useCommunityDashboardNavigation({
    communityId,
    canViewMembersSection,
    channels,
    conversations,
    currentUserId: currentUser?.id,
  });

  const channelActions = useCommunityChannelActions({
    communityId,
    channels,
    activeSectionId: navigation.activeSectionId,
    communityRestrictions,
    setActiveSectionId: navigation.setActiveSectionId,
    setSelectedChannel: navigation.setSelectedChannel,
    searchParams: navigation.searchParams,
    setSearchParams: navigation.setSearchParams,
    clearPostSelection: navigation.clearPostSelection,
    updateUrlForSection: navigation.updateUrlForSection,
  });

  const conversationActions = useCommunityConversationActions({
    communityId,
    currentUserId: currentUser?.id,
    conversations,
    setActiveSectionId: navigation.setActiveSectionId,
    setSelectedConversation: navigation.setSelectedConversation,
    searchParams: navigation.searchParams,
    setSearchParams: navigation.setSearchParams,
    clearPostSelection: navigation.clearPostSelection,
  });

  const onCreateChannel = useCallback(() => {
    navigation.previousSectionIdRef.current = navigation.activeSectionId;
    channelActions.setShowCreateChannel(true);
    navigation.setActiveSectionId("create-channel");
    navigation.setIsCommunityDrawerOpen(false);
  }, [navigation, channelActions]);

  const onCreateDirectMessage = useCallback(() => {
    navigation.previousSectionIdRef.current = navigation.activeSectionId;
    conversationActions.setShowCreateDirectMessage(true);
    navigation.setActiveSectionId("create-dm");
    navigation.setIsCommunityDrawerOpen(false);
  }, [navigation, conversationActions]);

  const { sidebarGroups, sidebarCommunityName } = useCommunityDashboardSidebar({
    channels,
    conversations,
    channelUnreadMap,
    access,
    activeSectionId: navigation.activeSectionId,
    isActiveMember,
    isOwnerOrModerator,
    pendingRequestsCount,
    canViewMembersSection,
    canManageCommunitySettings,
    communityRestrictions,
    onlineUserIdsSet,
    userPresenceById,
    community,
    onCreateChannel,
    onCreateDirectMessage,
    handleDeleteChannel: channelActions.handleDeleteChannel,
    handleLeaveChannel: channelActions.handleLeaveChannel,
    handleJoinChannel: channelActions.handleJoinChannel,
    handleLeaveConversation: conversationActions.handleLeaveConversation,
    getOtherParticipant: conversationActions.getOtherParticipant,
    formatGroupChatLabel: conversationActions.formatGroupChatLabel,
  });

  useEffect(() => {
    const pendingSwitch = sessionStorage.getItem("pendingCommunitySwitch");
    if (pendingSwitch && communityId && !hasShownToastRef.current) {
      try {
        const { communityId: targetCommunityId } = JSON.parse(pendingSwitch);
        if (targetCommunityId === communityId && community?.name) {
          sessionStorage.removeItem("pendingCommunitySwitch");
          hasShownToastRef.current = true;
          toast.success(`Switched to ${community.name}`);
        }
      } catch {
        sessionStorage.removeItem("pendingCommunitySwitch");
      }
    }

    if (previousCommunityIdRef.current !== communityId) {
      previousCommunityIdRef.current = communityId || null;
      hasShownToastRef.current = false;
      hasRedirectedForBanRef.current = false;
    }

    communityNameRef.current = community?.name ?? null;
  }, [communityId, community?.name]);

  useEffect(() => {
    if (!isAccessLoading && access?.isBanned) {
      redirectToHomeWithBanNotice();
    }
  }, [isAccessLoading, access?.isBanned, redirectToHomeWithBanNotice]);

  const handleJoinCommunity = () => {
    if (!communityId) return;

    joinCommunityMutate(
      { communityId },
      {
        onSuccess: () => {
          const communityName = community?.name || "the community";
          const truncatedName =
            communityName.length > 30
              ? `${communityName.slice(0, 30)}...`
              : communityName;
          toast.success(`Request to join ${truncatedName} sent successfully`);
          navigation.setActiveSectionId(DashboardSection.General);
          navigation.updateUrlForSection(DashboardSection.General);
        },
        onError: (error: Error) => {
          const axiosError = isAxiosError<ErrorResponse>(error) ? error : null;
          const status = axiosError?.response?.status;
          const message = axiosError?.response?.data?.message;

          if (status === 500) {
            toast.error(
              "Your join request was rejected. You cannot request to join this community.",
            );
          } else {
            toast.error(
              typeof message === "string"
                ? message
                : "Failed to send join request. Please try again.",
            );
          }
        },
      },
    );
  };

  const handleCloseCreateView = () => {
    channelActions.setShowCreateChannel(false);
    conversationActions.setShowCreateDirectMessage(false);
    const prevId = navigation.previousSectionIdRef.current;
    navigation.setActiveSectionId(prevId);
    const newParams = new URLSearchParams(navigation.searchParams);
    newParams.set("tab", prevId);
    navigation.setSearchParams(newParams, { replace: true });
  };

  const handleBackToCommunities = () => {
    navigate(backToCommunitiesPathRef.current ?? ROUTES.COMMUNITY);
  };

  const handleSidebarSelect = (itemId: string) => {
    if (
      channelActions.showCreateChannel ||
      conversationActions.showCreateDirectMessage
    ) {
      channelActions.setShowCreateChannel(false);
      conversationActions.setShowCreateDirectMessage(false);
    }

    if (itemId.startsWith("channel-")) {
      const channelId = itemId.replace("channel-", "");
      navigation.setSelectedChannel(channels?.find((channel) => channel.id === channelId) ?? null);
      navigation.setSelectedConversation(null);
      markChannelAsRead({ channelId });
    } else if (itemId.startsWith("chat-")) {
      const conversationId = itemId.replace("chat-", "");
      navigation.setSelectedConversation(conversations?.find((conversation) => conversation.id === conversationId) ?? null);
      navigation.setSelectedChannel(null);
      markConversationAsRead({ conversationId });
    } else {
      navigation.setSelectedChannel(null);
      navigation.setSelectedConversation(null);
    }

    navigation.setActiveSectionId(itemId);

    if (isValidDashboardSection(itemId)) {
      const section = itemId as DashboardSection;
      navigation.updateUrlForSection(section);
    } else if (itemId.startsWith("channel-") || itemId.startsWith("chat-")) {
      const newParams = new URLSearchParams(navigation.searchParams);
      newParams.set("tab", itemId);
      navigation.clearPostSelection(newParams);
      navigation.setSearchParams(newParams, { replace: true });
    }

    if (isMobile) {
      navigation.setIsCommunityDrawerOpen(false);
    }
  };

  if (isProcessingInvitation && !access?.isMember) {
    return (
      <PageLayout
        title={
          <>
            <LuArrowLeft size={16} />
            <span>Back to communities</span>
          </>
        }
        titleAction={handleBackToCommunities}
        className="bg-background"
      >
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Spinner size={32} />
            <p className="text-foreground text-lg font-medium">
              Joining community...
            </p>
          </div>
        </div>
      </PageLayout>
    );
  }

  const communitySidebarContent = (
    <>
      {community && communityId && (
        <div className="relative h-36 w-full flex-shrink-0 overflow-hidden rounded-2xl">
          {community.banner ? (
            <img
              src={community.banner}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-yellow/25 via-yellow/10 to-accent/40" />
          )}

          {access?.role !== CommunityMemberRole.OWNER &&
            access?.isMember &&
            communityRestrictions.canLeave && (
            <div className="absolute top-2.5 right-2.5">
              <Menu as="div" className="relative">
                <MenuButton
                  className="flex cursor-pointer items-center justify-center rounded-lg bg-black/30 p-1.5 text-white backdrop-blur-md transition-colors hover:bg-black/50"
                  onClick={(e) => e.stopPropagation()}
                >
                  <HiOutlineDotsVertical size={15} />
                </MenuButton>
                <MenuItems className="absolute right-0 z-50 mt-2 w-40 origin-top-right rounded-xl border border-border bg-card shadow-lg">
                  <div className="py-1">
                    <MenuItem
                      as="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowLeaveCommunityModal(true);
                      }}
                      className="text-foreground flex w-full items-center px-4 py-2 text-sm whitespace-nowrap select-none hover:cursor-pointer"
                    >
                      Leave community
                    </MenuItem>
                  </div>
                </MenuItems>
              </Menu>
            </div>
          )}

          <div className="absolute right-3 bottom-3 left-3 flex items-center gap-2.5 rounded-xl bg-black/30 px-3 py-2 backdrop-blur-md">
            {(() => {
              const resolvedLogoUrl = logoPreviewOverride ?? community.profilePicture;
              if (resolvedLogoUrl) {
                return (
                  <img
                    src={resolvedLogoUrl}
                    alt={`${community.name} logo`}
                    className="h-8 w-8 shrink-0 rounded-lg object-cover"
                  />
                );
              }
              return (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/20 text-xs font-bold text-white">
                  {community.name.slice(0, 2).toUpperCase()}
                </div>
              );
            })()}
            <span className="truncate text-sm font-semibold text-white">
              {sidebarCommunityName}
            </span>
          </div>
        </div>
      )}
      <div className="scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent min-h-0 flex-1 overflow-y-auto">
        <DashboardSidebar
          groups={sidebarGroups}
          activeItemId={navigation.activeSectionId}
          onSelect={handleSidebarSelect}
          className="md:flex-shrink-0"
          disabled={!isAccessLoading && access?.isBanned === true}
        />
      </div>
    </>
  );

  return (
    <PageLayout
      title={
        <>
          <LuArrowLeft size={16} />
          <span>Back to communities</span>
        </>
      }
      titleAction={handleBackToCommunities}
      className="bg-background"
      mobileRightContent={
        isMobile && communityId && community ? (
          <button
            type="button"
            onClick={() => navigation.setIsCommunityDrawerOpen(true)}
            className="text-foreground flex items-center justify-center"
            aria-label="Community menu"
          >
            <LuPanelRight size={24} />
          </button>
        ) : undefined
      }
    >
      <div className="text-foreground flex min-h-0 flex-1 flex-col overflow-y-auto px-7 pt-6 md:px-10 lg:overflow-hidden">
        <div className="flex min-h-0 flex-1 flex-col sm:gap-2 md:flex-row md:items-stretch md:gap-6">
          <div className="hidden md:flex min-h-0 flex-col gap-5 md:w-[20rem] md:flex-shrink-0 md:pr-8">
            {communitySidebarContent}
          </div>

          {isMobile && navigation.isCommunityDrawerOpen && (
            <div className="fixed inset-0 z-40 md:hidden">
              <div
                className="absolute inset-0 bg-black/30 transition-opacity"
                onClick={() => navigation.setIsCommunityDrawerOpen(false)}
                aria-hidden
              />
              <div
                className="bg-surface scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent absolute right-0 top-0 flex h-full w-72 max-w-[85vw] flex-col gap-5 overflow-y-auto p-4 shadow-xl transition-transform duration-300 ease-out"
                style={{ transform: "translateX(0)" }}
                onClick={(e) => e.stopPropagation()}
              >
                {communitySidebarContent}
              </div>
            </div>
          )}

          <div
            className={twMerge(
              "flex min-h-0 flex-1 flex-col overflow-hidden md:border-l md:border-border transition-[padding] duration-[120ms] ease-in-out",
              !(
                navigation.activeSectionId.startsWith("channel-") ||
                navigation.activeSectionId.startsWith("chat-") ||
                channelActions.showCreateChannel ||
                conversationActions.showCreateDirectMessage
              ) && "md:pr-10 md:pl-10",
            )}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={navigation.activeSectionId}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12, ease: "easeInOut" }}
                className="flex min-h-0 flex-1 flex-col overflow-hidden"
              >
                <CommunityMainContent
                  communityId={communityId}
                  community={community}
                  isCommunityLoading={isCommunityLoading}
                  isAccessLoading={isAccessLoading}
                  isError={isError}
                  access={access}
                  activeSectionId={navigation.activeSectionId}
                  selectedChannel={navigation.selectedChannel}
                  selectedConversation={navigation.selectedConversation}
                  currentUser={currentUser}
                  canManageCommunitySettings={canManageCommunitySettings}
                  canViewMembersSection={canViewMembersSection}
                  isOwnerOrModerator={isOwnerOrModerator}
                  communityRestrictions={communityRestrictions}
                  conversations={conversations || []}
                  onlineUserIds={onlineUserIds}
                  userPresenceById={userPresenceById}
                  bannedUserIds={bannedUserIds}
                  postId={navigation.postId}
                  commentId={navigation.commentId}
                  messageId={navigation.messageId}
                  searchParams={navigation.searchParams}
                  showCreateChannel={channelActions.showCreateChannel}
                  showCreateDirectMessage={conversationActions.showCreateDirectMessage}
                  isJoiningPending={isJoiningPending}
                  isProcessingInvitation={isProcessingInvitation}
                  onJoinCommunity={handleJoinCommunity}
                  onChannelCreated={channelActions.handleChannelCreated}
                  onConversationCreated={conversationActions.handleConversationCreated}
                  onCloseCreateView={handleCloseCreateView}
                  onLogoPreviewChange={setLogoPreviewOverride}
                  {...(access?.canModerate
                    ? {
                        onBanUser: requestBanUser,
                        onRemoveUser: requestRemoveUser,
                      }
                    : {})}
                />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {moderationModals}

      <LeaveCommunityModal
        isOpen={showLeaveCommunityModal}
        onClose={() => setShowLeaveCommunityModal(false)}
        communityId={communityId!}
        onSuccess={() => {
          navigation.setActiveSectionId(DashboardSection.General);
          navigation.updateUrlForSection(DashboardSection.General);
        }}
      />
      {channelActions.channelToLeave && (
        <LeaveChannelModal
          isOpen={channelActions.showLeaveChannelModal}
          onClose={() => {
            channelActions.setShowLeaveChannelModal(false);
            channelActions.setChannelToLeave(null);
          }}
          communityId={communityId!}
          channelId={channelActions.channelToLeave.id}
          channelName={channelActions.channelToLeave.name}
          onSuccess={() => {
            if (
              navigation.activeSectionId ===
              `channel-${channelActions.channelToLeave!.id}`
            ) {
              navigation.setActiveSectionId(DashboardSection.General);
              navigation.setSelectedChannel(null);
              navigation.updateUrlForSection(DashboardSection.General);
            }
            channelActions.setChannelToLeave(null);
          }}
        />
      )}
      {conversationActions.conversationToLeave && (
        <LeaveConversationModal
          isOpen={conversationActions.showLeaveConversationModal}
          onClose={() => {
            conversationActions.setShowLeaveConversationModal(false);
            conversationActions.setConversationToLeave(null);
          }}
          communityId={communityId!}
          conversationId={conversationActions.conversationToLeave.id}
          {...(conversationActions.conversationToLeave.type ===
          CommunityConversationType.GROUP
            ? {
                conversationName: conversationActions.formatGroupChatLabel(
                  conversationActions.conversationToLeave,
                  30,
                ),
              }
            : {})}
          onSuccess={() => {
            if (
              navigation.activeSectionId ===
              `chat-${conversationActions.conversationToLeave!.id}`
            ) {
              navigation.setActiveSectionId(DashboardSection.General);
              navigation.setSelectedConversation(null);
              navigation.updateUrlForSection(DashboardSection.General);
            }
            conversationActions.setConversationToLeave(null);
          }}
        />
      )}
      {navigation.showRequestRejectedModal &&
        communityId &&
        (navigation.rejectedUserId || currentUser?.id) && (
          <RequestRejectedModal
            open={navigation.showRequestRejectedModal}
            onClose={navigation.handleCloseRejectedModal}
            communityId={communityId}
            userId={navigation.rejectedUserId || currentUser?.id || ""}
          />
        )}
    </PageLayout>
  );
}
