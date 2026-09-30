import { Post } from "@/api/community/community.types";
import { CommunityMemberRole } from "@/api/community/enums/community-member-role.enum";
import { Avatar } from "@/components/common/Avatar";
import {
  ClickableAvatar,
  ClickableUserName,
} from "./ClickableUserComponents";
import { PostTimestamp } from "./PostTimestamp";
import { PostMenu } from "./PostMenu";
import { getPostUserName, getPostProfilePicture } from "../utils/postHelpers";
import { useResponsive } from "@/hooks/useResponsive";

interface PostHeaderProps {
  post: Post;
  currentUserId: string | undefined;
  canStartConversation: boolean;
  onStartConversation: () => void;
  isCreatingChat: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onReport?: (() => void) | undefined;
  canModerate?: boolean;
  postAuthorRole?: CommunityMemberRole | undefined;
  onBan?: (() => void) | undefined;
  onRemove?: (() => void) | undefined;
  bannedUserIds?: Set<string> | undefined;
}

export function PostHeader({
  post,
  currentUserId,
  canStartConversation,
  onStartConversation,
  isCreatingChat,
  onEdit,
  onDelete,
  onReport,
  canModerate = false,
  postAuthorRole,
  onBan,
  onRemove,
  bannedUserIds,
}: PostHeaderProps) {
  const { isMobile } = useResponsive();
  const postUserName = getPostUserName(post);

  const userNameElement = canStartConversation ? (
    <ClickableUserName
      userName={postUserName}
      onClick={onStartConversation}
      disabled={isCreatingChat}
    />
  ) : (
    <h3 className="text-foreground text-lg font-semibold">{postUserName}</h3>
  );

  const postMenu = currentUserId ? (
    <PostMenu
      post={post}
      currentUserId={currentUserId}
      onEdit={onEdit}
      onDelete={onDelete}
      onReport={onReport}
      canModerate={canModerate}
      postAuthorRole={postAuthorRole}
      onBan={onBan}
      onRemove={onRemove}
      bannedUserIds={bannedUserIds}
    />
  ) : null;

  if (isMobile) {
    return (
      <div className="mb-2 flex min-w-0 items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="min-w-0">{userNameElement}</div>
          <div>
            <PostTimestamp
              createdAt={post.createdAt}
              isEdited={post.isEdited}
            />
          </div>
        </div>
        {postMenu && <div className="flex flex-shrink-0 items-center">{postMenu}</div>}
      </div>
    );
  }

  return (
    <div className="mb-2 flex items-center justify-between">
      {userNameElement}
      <div className="flex flex-shrink-0 items-center gap-2">
        <PostTimestamp createdAt={post.createdAt} isEdited={post.isEdited} />
        {postMenu}
      </div>
    </div>
  );
}

export function PostHeaderAvatar({
  post,
  canStartConversation,
  onStartConversation,
  isCreatingChat,
}: {
  post: Post;
  canStartConversation: boolean;
  onStartConversation: () => void;
  isCreatingChat: boolean;
}) {
  const postUserName = getPostUserName(post);
  const postProfilePicture = getPostProfilePicture(post);

  if (canStartConversation) {
    return (
      <ClickableAvatar
        firstName={post.user?.firstName}
        lastName={post.user?.lastName}
        profilePicture={postProfilePicture}
        userId={post.user?.id || ""}
        userName={postUserName}
        onClick={onStartConversation}
        disabled={isCreatingChat}
      />
    );
  }

  return (
    <Avatar
      firstName={post.user?.firstName}
      lastName={post.user?.lastName}
      profilePicture={postProfilePicture}
      userId={post.user?.id}
      size="lg"
      alt={postUserName}
    />
  );
}

