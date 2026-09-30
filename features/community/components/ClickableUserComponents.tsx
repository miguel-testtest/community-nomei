import { Avatar } from "@/components/common/Avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/UI/Tooltip";
import { twMerge } from "tailwind-merge";

interface ClickableAvatarProps {
  firstName?: string;
  lastName?: string;
  profilePicture: string | null;
  userId: string;
  userName: string;
  onClick: () => void;
  disabled: boolean;
  size?: "sm" | "md" | "lg";
}

export function ClickableAvatar({
  firstName,
  lastName,
  profilePicture,
  userId,
  userName,
  onClick,
  disabled,
  size = "lg",
}: ClickableAvatarProps) {
  return (
    <Tooltip delayDuration={500}>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          disabled={disabled}
          className={twMerge(
            "cursor-pointer transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50",
          )}
          aria-label={`Send message to ${userName}`}
        >
          <Avatar
            firstName={firstName}
            lastName={lastName}
            profilePicture={profilePicture}
            userId={userId}
            size={size}
            alt={userName}
          />
        </button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Click to send a message</p>
      </TooltipContent>
    </Tooltip>
  );
}

interface ClickableUserNameProps {
  userName: string;
  onClick: () => void;
  disabled: boolean;
  className?: string;
}

export function ClickableUserName({
  userName,
  onClick,
  disabled,
  className,
}: ClickableUserNameProps) {
  return (
    <Tooltip delayDuration={500}>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          disabled={disabled}
          className={twMerge(
            "text-foreground cursor-pointer text-left text-lg font-semibold disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
          aria-label={`Send message to ${userName}`}
        >
          {userName}
        </button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Click to send a message</p>
      </TooltipContent>
    </Tooltip>
  );
}

