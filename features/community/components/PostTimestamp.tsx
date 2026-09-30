import { useRelativeTime } from "@/hooks/useRelativeTime";
import { formatDateTime } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/UI/Tooltip";
import { LuPencil } from "react-icons/lu";

interface PostTimestampProps {
  createdAt: string;
  isEdited: boolean;
}

export function PostTimestamp({ createdAt, isEdited }: PostTimestampProps) {
  const relativeTime = useRelativeTime(createdAt);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-1.5">
          <span className="cursor-default text-sm text-muted-foreground">
            {relativeTime}
          </span>
          {isEdited && (
            <LuPencil size={12} className="text-muted-foreground/70" aria-label="Edited" />
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <div className="flex flex-col gap-1">
          <span>{formatDateTime(createdAt)}</span>
          {isEdited && <span className="text-xs text-muted-foreground/70">Edited</span>}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

