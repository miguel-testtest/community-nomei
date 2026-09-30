import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { HiOutlineDotsVertical } from "react-icons/hi";
import { HiExclamationTriangle } from "react-icons/hi2";
import { LuBan, LuTrash2 } from "react-icons/lu";
import { twMerge } from "tailwind-merge";
import { CommunityMemberRole } from "@/api/community/enums/community-member-role.enum";
import { Post } from "@/api/community/community.types";

interface PostMenuProps {
  post: Post;
  currentUserId: string;
  onEdit: () => void;
  onDelete: () => void;
  onReport?: (() => void) | undefined;
  canModerate?: boolean | undefined;
  postAuthorRole?: CommunityMemberRole | undefined;
  onBan?: (() => void) | undefined;
  onRemove?: (() => void) | undefined;
  bannedUserIds?: Set<string> | undefined;
}

export function PostMenu({
  post,
  currentUserId,
  onEdit,
  onDelete,
  onReport,
  canModerate = false,
  postAuthorRole,
  onBan,
  onRemove,
  bannedUserIds,
}: PostMenuProps) {
  const isAuthor = post.userId === currentUserId;
  const isBanned = bannedUserIds?.has(post.userId) ?? false;

  const canBanOrRemove =
    canModerate && !isAuthor && postAuthorRole !== CommunityMemberRole.OWNER;

  if (!isAuthor && !onReport && !canBanOrRemove) return null;

  return (
    <Menu as="div" className="relative">
      <MenuButton className="text-muted-foreground/70 hover:text-muted-foreground">
        <HiOutlineDotsVertical size={20} className="cursor-pointer" />
      </MenuButton>
      <MenuItems className="absolute right-0 z-10 mt-2 w-40 origin-top-right rounded-xl bg-card shadow-lg">
        <div className="py-1">
          {isAuthor ? (
            <>
              <MenuItem>
                {({ focus }) => (
                  <button
                    className={twMerge(
                      "text-foreground flex w-full cursor-pointer items-center px-4 py-2 text-sm",
                      focus && "bg-foreground/4",
                    )}
                    onClick={onEdit}
                  >
                    Edit
                  </button>
                )}
              </MenuItem>
              <MenuItem>
                {({ focus }) => (
                  <button
                    className={twMerge(
                      "flex w-full cursor-pointer items-center px-4 py-2 text-sm text-red-600",
                      focus && "bg-red-50",
                    )}
                    onClick={onDelete}
                  >
                    Delete
                  </button>
                )}
              </MenuItem>
            </>
          ) : (
            <>
              {onReport && (
                <MenuItem>
                  {({ focus }) => (
                    <button
                      className={twMerge(
                        "flex w-full cursor-pointer items-center gap-2 px-4 py-2 text-sm text-orange-600",
                        focus && "bg-orange-50",
                      )}
                      onClick={onReport}
                    >
                      <HiExclamationTriangle className="h-4 w-4" />
                      Report
                    </button>
                  )}
                </MenuItem>
              )}
              {canBanOrRemove && onBan && !isBanned && (
                <MenuItem>
                  {({ focus }) => (
                    <button
                      className={twMerge(
                        "flex w-full cursor-pointer items-center gap-2 px-4 py-2 text-sm text-red-600",
                        focus && "bg-red-50",
                      )}
                      onClick={onBan}
                    >
                      <LuBan className="h-4 w-4" />
                      Ban user
                    </button>
                  )}
                </MenuItem>
              )}
              {canBanOrRemove && onRemove && (
                <MenuItem>
                  {({ focus }) => (
                    <button
                      className={twMerge(
                        "flex w-full cursor-pointer items-center gap-2 px-4 py-2 text-sm text-red-600",
                        focus && "bg-red-50",
                      )}
                      onClick={onRemove}
                    >
                      <LuTrash2 className="h-4 w-4" />
                      Remove user
                    </button>
                  )}
                </MenuItem>
              )}
            </>
          )}
        </div>
      </MenuItems>
    </Menu>
  );
}

