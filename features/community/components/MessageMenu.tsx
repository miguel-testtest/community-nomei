import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { HiOutlineDotsVertical } from "react-icons/hi";
import { HiExclamationTriangle } from "react-icons/hi2";
import { LuBan, LuPencil, LuTrash2 } from "react-icons/lu";
import { twMerge } from "tailwind-merge";
import { CommunityMemberRole } from "@/api/community/enums/community-member-role.enum";

interface MessageMenuProps {
  message: { userId: string | null };
  currentUserId: string;
  onReport?: (() => void) | undefined;
  canModerate?: boolean | undefined;
  messageAuthorRole?: CommunityMemberRole | undefined;
  onBan?: (() => void) | undefined;
  onRemove?: (() => void) | undefined;
  bannedUserIds?: Set<string> | undefined;
  canDeleteMessage?: boolean | undefined;
  onDeleteMessage?: (() => void) | undefined;
  isDeleted?: boolean | undefined;
  onEdit?: (() => void) | undefined;
}

export function MessageMenu({
  message,
  currentUserId,
  onReport,
  canModerate = false,
  messageAuthorRole,
  onBan,
  onRemove,
  bannedUserIds,
  canDeleteMessage,
  onDeleteMessage,
  isDeleted,
  onEdit,
}: MessageMenuProps) {
  const isAuthor = message.userId !== null && message.userId === currentUserId;
  const isBanned = message.userId !== null ? (bannedUserIds?.has(message.userId) ?? false) : false;

  const canBanOrRemove =
    canModerate && !isAuthor && messageAuthorRole !== CommunityMemberRole.OWNER;

  const canDelete = !!onDeleteMessage && canDeleteMessage && !isDeleted;
  const canEdit = isAuthor && !!onEdit && !isDeleted;
  const hasVisibleActions =
    canEdit ||
    canDelete ||
    (!isAuthor && ((!!onReport && !isDeleted) || canBanOrRemove));

  if (!hasVisibleActions) return null;

  return (
    <Menu as="div" className="relative">
      <MenuButton className="text-muted-foreground/70 hover:text-muted-foreground flex items-center justify-center p-1.5 rounded-full transition-colors">
        <HiOutlineDotsVertical size={16} className="cursor-pointer" />
      </MenuButton>
      <MenuItems anchor="bottom end" className="z-50 w-40 rounded-xl bg-card shadow-lg [--anchor-gap:6px]">
        <div className="py-1">
          {canEdit && (
            <MenuItem>
              {({ focus }) => (
                <button
                  className={twMerge(
                    "flex w-full cursor-pointer items-center gap-2 px-4 py-2 text-sm text-foreground/70",
                    focus && "bg-muted/50",
                  )}
                  onClick={onEdit}
                >
                  <LuPencil className="h-4 w-4" />
                  Edit message
                </button>
              )}
            </MenuItem>
          )}
          {canDelete && (
            <MenuItem>
              {({ focus }) => (
                <button
                  className={twMerge(
                    "flex w-full cursor-pointer items-center gap-2 px-4 py-2 text-sm text-red-600",
                    focus && "bg-red-50",
                  )}
                  onClick={onDeleteMessage}
                >
                  <LuTrash2 className="h-4 w-4" />
                  Delete message
                </button>
              )}
            </MenuItem>
          )}
          {!isAuthor && (
            <>
              {onReport && !isDeleted && (
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
