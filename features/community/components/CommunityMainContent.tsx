import { Button } from "@/components/common/Button";
import { Spinner } from "@/components/common/Spinner";
import { BannedFromCommunityMessage } from "@/features/community/components/BannedFromCommunityMessage";
import { CommunityFeed } from "@/features/community/components/CommunityFeed";
import { PostDetail } from "@/features/community/components/PostDetail";
import { ChannelView } from "@/features/community/components/ChannelView";
import { DirectMessageView } from "@/features/community/components/DirectMessageView";
import { CreateChannelView } from "@/features/community/components/CreateChannelView";
import { CreateDirectMessageView } from "@/features/community/components/CreateDirectMessageView";
import { CommunitySettingsContent } from "@/features/community/components/CommunitySettingsContent";
import { DashboardSection } from "@/features/community/enums/dashboard-section.enum";
import { CommunityPresenceStatus } from "@/features/community/enums/community-presence-status.enum";
import { CommunityRestrictions } from "@/features/community/enums/restricted-community-name.enum";
import { MemberRequestStatus } from "@/api/community/enums/member-request-status.enum";
import { CommunityMemberRole } from "@/api/community/enums/community-member-role.enum";
import {
  Channel,
  CommunityAccessContext,
  CommunityWithDetails,
  Conversation,
  UserBasicInfo,
} from "@/api/community/community.types";
import { User } from "@/api/user/user.types";

interface CommunityMainContentProps {
  communityId: string | undefined;
  community: CommunityWithDetails | undefined;
  isCommunityLoading: boolean;
  isAccessLoading: boolean;
  isError: boolean;
  access: CommunityAccessContext | undefined;
  activeSectionId: string;
  selectedChannel: Channel | null;
  selectedConversation: Conversation | null;
  currentUser: User | undefined;
  canManageCommunitySettings: boolean;
  canViewMembersSection: boolean | null | undefined;
  isOwnerOrModerator: boolean;
  communityRestrictions: CommunityRestrictions;
  conversations: Conversation[];
  onlineUserIds: string[];
  userPresenceById: Record<string, CommunityPresenceStatus>;
  bannedUserIds: Set<string>;
  postId: string | null;
  commentId: string | null;
  messageId: string | null;
  searchParams: URLSearchParams;
  showCreateChannel: boolean;
  showCreateDirectMessage: boolean;
  isJoiningPending: boolean;
  isProcessingInvitation: boolean;
  // Handlers
  onJoinCommunity: () => void;
  onChannelCreated: (channel: Channel) => void;
  onConversationCreated: (conversation: Conversation) => void;
  onCloseCreateView: () => void;
  onLogoPreviewChange: (url: string | null) => void;
  onBanUser?: (userId: string, user: UserBasicInfo) => void;
  onRemoveUser?: (userId: string, fullName: string) => void;
}

export function CommunityMainContent({
  communityId,
  community,
  isCommunityLoading,
  isAccessLoading,
  isError,
  access,
  activeSectionId,
  selectedChannel,
  selectedConversation,
  currentUser,
  canManageCommunitySettings,
  canViewMembersSection,
  isOwnerOrModerator,
  communityRestrictions,
  conversations,
  onlineUserIds,
  userPresenceById,
  bannedUserIds,
  postId,
  commentId,
  messageId,
  searchParams,
  showCreateChannel,
  showCreateDirectMessage,
  isJoiningPending,
  isProcessingInvitation,
  onJoinCommunity,
  onChannelCreated,
  onConversationCreated,
  onCloseCreateView,
  onLogoPreviewChange,
  onBanUser,
  onRemoveUser,
}: CommunityMainContentProps) {
  if (!isAccessLoading && access?.isBanned) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <BannedFromCommunityMessage />
      </div>
    );
  }

  if (isAccessLoading) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (
    showCreateChannel &&
    communityId &&
    access?.isMember &&
    access?.canCreateChannel
  ) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <CreateChannelView
          communityId={communityId}
          onChannelCreated={onChannelCreated}
          onClose={onCloseCreateView}
        />
      </div>
    );
  }

  if (
    showCreateDirectMessage &&
    communityId &&
    access?.isMember &&
    access?.canStartDm
  ) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <CreateDirectMessageView
          communityId={communityId}
          onConversationCreated={onConversationCreated}
          onlineUserIds={onlineUserIds}
          onClose={onCloseCreateView}
        />
      </div>
    );
  }

  if (activeSectionId === DashboardSection.General && communityId) {
    if (postId) {
      return (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <PostDetail
            key={`post-detail-${communityId}-${postId}-${commentId || ""}`}
            communityId={communityId}
            postId={postId}
            isMember={access?.isMember ?? false}
            canModerate={access?.canModerate ?? false}
            {...(community ? { community } : {})}
            {...(access?.canModerate && onBanUser && onRemoveUser
              ? { onBanUser, onRemoveUser }
              : {})}
            bannedUserIds={bannedUserIds}
            conversations={conversations}
            onConversationCreated={onConversationCreated}
            canCreateDirectChat={communityRestrictions.canCreateDirectChat}
          />
        </div>
      );
    }

    if (!access?.isMember) {
      return (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden">
          <div className="bg-surface border-border flex h-full w-full flex-col items-center justify-center gap-4 rounded-3xl border p-8 text-center shadow-sm">
            <h2 className="text-foreground text-2xl font-semibold">
              You're not a member
            </h2>
            <p className="text-muted-foreground text-sm">
              Join this community to see all the content
            </p>
            {community?.stats?.members !== undefined && (
              <p className="text-foreground mt-2 text-base font-medium">
                {community.stats.members}{" "}
                {community.stats.members === 1 ? "member" : "members"}
              </p>
            )}
            {!access?.isBanned && (
              <Button
                type="button"
                variant="primary"
                onClick={onJoinCommunity}
                disabled={
                  isJoiningPending ||
                  isProcessingInvitation ||
                  access?.requestStatus === MemberRequestStatus.PENDING
                }
                className="mt-4"
              >
                {isProcessingInvitation
                  ? "Joining community..."
                  : isJoiningPending
                    ? "Joining..."
                    : access?.requestStatus === MemberRequestStatus.PENDING
                      ? "Request Pending"
                      : "Join Community"}
              </Button>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <CommunityFeed
          key={`feed-${communityId}-default`}
          communityId={communityId}
          isMember={access?.isMember ?? false}
          {...(access?.isBanned ? {} : { onJoin: onJoinCommunity })}
          isJoining={isJoiningPending || isProcessingInvitation}
          requestStatus={access?.requestStatus}
          canModerate={access?.canModerate ?? false}
          community={community}
          {...(access?.canModerate && onBanUser && onRemoveUser
            ? { onBanUser, onRemoveUser }
            : {})}
          bannedUserIds={bannedUserIds}
          conversations={conversations}
          onConversationCreated={onConversationCreated}
          canCreatePost={
            !communityRestrictions.onlyOwnersAndModeratorsCanCreatePosts ||
            access?.role === CommunityMemberRole.OWNER ||
            access?.role === CommunityMemberRole.MODERATOR
          }
          commentsDisabled={communityRestrictions.commentsDisabled}
          canCreateDirectChat={communityRestrictions.canCreateDirectChat}
        />
      </div>
    );
  }

  if (
    activeSectionId.startsWith("channel-") &&
    selectedChannel &&
    communityId
  ) {
    const openThread = searchParams.get("openThread") === "true";

    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <ChannelView
          communityId={communityId}
          channel={selectedChannel}
          {...(messageId && { initialMessageId: messageId })}
          {...(messageId && openThread && { shouldOpenThread: true })}
          canModerate={access?.canModerate ?? false}
          {...(access?.canModerate && onBanUser && onRemoveUser
            ? { onBanUser, onRemoveUser }
            : {})}
          bannedUserIds={bannedUserIds}
          {...(community ? { community } : {})}
        />
      </div>
    );
  }

  if (
    activeSectionId.startsWith("chat-") &&
    selectedConversation &&
    communityId &&
    currentUser
  ) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <DirectMessageView
          communityId={communityId}
          conversation={selectedConversation}
          currentUserId={currentUser.id}
          onlineUserIds={onlineUserIds}
          userPresenceById={userPresenceById}
          canViewFlaggedContent={access?.canModerate ?? false}
        />
      </div>
    );
  }

  if (activeSectionId.startsWith("channel-") || activeSectionId.startsWith("chat-")) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="scrollbar-thin scrollbar-thumb-transparent scrollbar-track-transparent flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto">
      <div className="h-full">
        <CommunitySettingsContent
          communityId={communityId}
          community={community}
          isCommunityLoading={isCommunityLoading}
          isAccessLoading={isAccessLoading}
          isError={isError}
          activeSectionId={activeSectionId}
          access={access}
          canManageCommunitySettings={canManageCommunitySettings}
          canViewMembersSection={canViewMembersSection}
          isOwnerOrModerator={isOwnerOrModerator}
          communityRestrictions={communityRestrictions}
          conversations={conversations}
          onlineUserIds={onlineUserIds}
          userPresenceById={userPresenceById}
          onConversationCreated={onConversationCreated}
          onLogoPreviewChange={onLogoPreviewChange}
        />
      </div>
    </div>
  );
}
