import { useNavigate } from "react-router";
import { Button } from "@/components/common/Button";
import { Spinner } from "@/components/common/Spinner";
import { GeneralSettingsForm } from "@/features/community/components/GeneralSettingsForm";
import { MembersSettings } from "@/features/community/components/MembersSettings";
import { ModerationPanel } from "@/features/community/components/ModerationPanel";
import { SafeguardPanel } from "@/features/community/components/SafeguardPanel";
import { CommunityStatistics } from "@/features/community/components/CommunityStatistics";
import { DashboardSection } from "@/features/community/enums/dashboard-section.enum";
import { CommunityPresenceStatus } from "@/features/community/enums/community-presence-status.enum";
import { CommunityRestrictions } from "@/features/community/enums/restricted-community-name.enum";
import {
  CommunityAccessContext,
  CommunityWithDetails,
  Conversation,
} from "@/api/community/community.types";
import { ROUTES } from "@/routes/paths";

interface CommunitySettingsContentProps {
  communityId: string | undefined;
  community: CommunityWithDetails | undefined;
  isCommunityLoading: boolean;
  isAccessLoading: boolean;
  isError: boolean;
  activeSectionId: string;
  access: CommunityAccessContext | undefined;
  canManageCommunitySettings: boolean;
  canViewMembersSection: boolean | null | undefined;
  isOwnerOrModerator: boolean;
  communityRestrictions: CommunityRestrictions;
  conversations: Conversation[];
  onlineUserIds: string[];
  userPresenceById: Record<string, CommunityPresenceStatus>;
  onConversationCreated: (conversation: Conversation) => void;
  onLogoPreviewChange: (url: string | null) => void;
}

export function CommunitySettingsContent({
  communityId,
  community,
  isCommunityLoading,
  isAccessLoading,
  isError,
  activeSectionId,
  access,
  canManageCommunitySettings,
  canViewMembersSection,
  isOwnerOrModerator,
  communityRestrictions,
  conversations,
  onlineUserIds,
  userPresenceById,
  onConversationCreated,
  onLogoPreviewChange,
}: CommunitySettingsContentProps) {
  const navigate = useNavigate();

  if (!communityId) {
    return (
      <div className="bg-surface border-border flex h-full flex-col items-center justify-center gap-3 rounded-3xl border p-8 text-center shadow-sm">
        <h2 className="text-foreground text-2xl font-semibold">
          Select a community
        </h2>
        <p className="text-muted-foreground text-sm">
          Choose a community from the list to view its dashboard.
        </p>
        <Button
          type="button"
          variant="primary"
          className="mt-4"
          onClick={() => navigate(ROUTES.COMMUNITY)}
        >
          Go to communities
        </Button>
      </div>
    );
  }

  if (isCommunityLoading || isAccessLoading) {
    return (
      <div className="bg-surface border-border flex h-full flex-col items-center justify-center gap-3 rounded-3xl border p-8 text-center shadow-sm">
        <Spinner />
        <p className="text-muted-foreground text-sm">Loading community...</p>
      </div>
    );
  }

  if (isError || !community) {
    return (
      <div className="bg-surface border-border flex h-full flex-col items-center justify-center gap-3 rounded-3xl border p-8 text-center shadow-sm">
        <h2 className="text-foreground text-2xl font-semibold">
          Community not found
        </h2>
        <Button
          type="button"
          variant="secondary"
          className="mt-4"
          onClick={() => navigate(ROUTES.COMMUNITY)}
        >
          Back to communities
        </Button>
      </div>
    );
  }

  if (activeSectionId === DashboardSection.Settings) {
    if (!canManageCommunitySettings) {
      return (
        <div className="bg-surface border-border flex h-full flex-col items-center justify-center gap-3 rounded-3xl border p-8 text-center shadow-sm">
          <h2 className="text-foreground text-2xl font-semibold">
            Not Authorized
          </h2>
          <p className="text-muted-foreground text-sm">
            You don't have permission to access settings.
          </p>
        </div>
      );
    }
    return (
      <GeneralSettingsForm
        community={community}
        onLogoPreviewChange={onLogoPreviewChange}
        canDeleteCommunity={
          canManageCommunitySettings &&
          communityRestrictions.allowCommunityDeletion
        }
        isCommunityNameDisabled={!communityRestrictions.canEditCommunityName}
      />
    );
  }

  if (activeSectionId === DashboardSection.Members && communityId) {
    if (!access?.isMember) {
      return (
        <div className="bg-surface border-border flex h-full flex-col items-center justify-center gap-3 rounded-3xl border p-8 text-center shadow-sm">
          <h2 className="text-foreground text-2xl font-semibold">
            Members Only
          </h2>
          <p className="text-muted-foreground text-sm">
            You must be a member of this community to view the member list.
          </p>
          {community?.stats?.members !== undefined && (
            <p className="text-foreground mt-2 text-base font-medium">
              {community.stats.members}{" "}
              {community.stats.members === 1 ? "member" : "members"}
            </p>
          )}
        </div>
      );
    }
    if (!canViewMembersSection) {
      return (
        <div className="bg-surface border-border flex h-full flex-col items-center justify-center gap-3 rounded-3xl border p-8 text-center shadow-sm">
          <h2 className="text-foreground text-2xl font-semibold">
            Not Authorized
          </h2>
          <p className="text-muted-foreground text-sm">
            You don't have permission to view members in this community.
          </p>
        </div>
      );
    }
    return (
      <MembersSettings
        communityId={communityId}
        conversations={conversations}
        onlineUserIds={onlineUserIds}
        userPresenceById={userPresenceById}
        onConversationCreated={onConversationCreated}
        canCreateDirectChat={communityRestrictions.canCreateDirectChat}
      />
    );
  }

  if (
    activeSectionId === DashboardSection.Moderation &&
    communityId &&
    access?.canModerate
  ) {
    return <ModerationPanel communityId={communityId} />;
  }

  if (
    activeSectionId === DashboardSection.Safeguard &&
    communityId &&
    access?.canModerate
  ) {
    return <SafeguardPanel communityId={communityId} />;
  }

  if (
    activeSectionId === DashboardSection.Statistics &&
    communityId &&
    isOwnerOrModerator
  ) {
    return <CommunityStatistics communityId={communityId} />;
  }

  return (
    <div className="bg-surface border-border flex flex-col gap-4 rounded-3xl border p-8 text-center shadow-sm">
      <h3 className="text-foreground text-xl font-semibold">Coming soon</h3>
      <p className="text-muted-foreground text-sm">
        Additional sections such as channels and marketplace will appear once
        the dashboard work resumes.
      </p>
    </div>
  );
}
