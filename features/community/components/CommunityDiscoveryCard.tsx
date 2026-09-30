import { CSSProperties } from "react";
import { useNavigate } from "react-router";
import { Community, CommunityTag } from "@/api/community/community.types";
import { ROUTES } from "@/routes/paths";
import { useCommunityDiscoveryBackNavigationState } from "@/features/community/hooks/useCommunityDiscoveryBackNavigationState";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/UI/Tooltip";

type CommunityDiscoveryCardProps = {
  community: Community & {
    tags?: CommunityTag[];
    stats?: { members: number; posts: number };
  };
  className?: string;
  style?: CSSProperties;
  /** undefined = navigate to community (default) | null = non-interactive | function = custom handler */
  onCardClick?: (() => void) | null;
};

const formatCount = (count: number): string => {
  if (count >= 1000000) {
    const m = (count / 1000000).toFixed(1);
    return `${m.endsWith(".0") ? m.slice(0, -2) : m}M`;
  }
  if (count >= 1000) {
    const k = (count / 1000).toFixed(1);
    return `${k.endsWith(".0") ? k.slice(0, -2) : k}k`;
  }
  return count.toString();
};

export function CommunityDiscoveryCard({
  community,
  className,
  style,
  onCardClick,
}: CommunityDiscoveryCardProps) {
  const navigate = useNavigate();
  const backNavigationState = useCommunityDiscoveryBackNavigationState();

  const initials = community.name
    .split(" ")
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");

  const memberCount = community.stats?.members ?? 0;
  const postCount = community.stats?.posts ?? 0;

  const isInteractive = onCardClick !== null;

  const handleClick = () => {
    if (onCardClick === undefined) {
      navigate(`${ROUTES.COMMUNITY}/${community.id}`, {
        state: backNavigationState,
      });
    } else if (typeof onCardClick === "function") {
      onCardClick();
    }
  };

  const handleKeyDown = isInteractive
    ? (e: React.KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }
    : undefined;

  return (
    <div
      style={style}
      className={cn(
        "animate-coach-fade-up group relative flex w-full flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all duration-200",
        isInteractive && "cursor-pointer hover:-translate-y-0.5 hover:shadow-md",
        className,
      )}
      onClick={isInteractive ? handleClick : undefined}
      role={isInteractive ? "button" : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onKeyDown={handleKeyDown}
      aria-label={isInteractive ? `View ${community.name} community` : undefined}
    >
      <div className="relative h-28 w-full overflow-hidden bg-gradient-to-br from-yellow/25 via-yellow/10 to-accent/40">
        {community.banner && (
          <img
            src={community.banner}
            alt=""
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        )}

        <div className="absolute bottom-2.5 left-2.5 flex w-fit max-w-[calc(100%-1.25rem)] items-center gap-2 rounded-xl bg-black/30 px-2.5 py-1.5 backdrop-blur-md">
          {community.profilePicture ? (
            <img
              src={community.profilePicture}
              alt={`${community.name} logo`}
              className="h-7 w-7 shrink-0 rounded-lg object-cover"
            />
          ) : (
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/20 text-xs font-bold text-white">
              {initials}
            </div>
          )}
          <span className="truncate text-xs font-semibold text-white">
            {community.name}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-4">
        {(memberCount > 0 || postCount > 0) && (
          <div className="flex items-center gap-2 text-2xs text-muted-foreground">
            {memberCount > 0 && (
              <span>
                {formatCount(memberCount)}{" "}
                {memberCount === 1 ? "member" : "members"}
              </span>
            )}
            {memberCount > 0 && postCount > 0 && (
              <span className="h-[3px] w-[3px] shrink-0 rounded-full bg-border" />
            )}
            {postCount > 0 && (
              <span>
                {formatCount(postCount)} {postCount === 1 ? "post" : "posts"}
              </span>
            )}
          </div>
        )}

        <p className="line-clamp-2 text-compact leading-relaxed text-muted-foreground">
          {community.description || (
            <span className="italic">No description available</span>
          )}
        </p>

        {community.tags && community.tags.length > 0 && (
          <div className="mt-auto flex flex-wrap items-center gap-1.5">
            {community.tags.slice(0, 3).map((tag) => (
              <span
                key={tag.id}
                className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-2xs font-medium capitalize text-muted-foreground"
              >
                {tag.name}
              </span>
            ))}
            {community.tags.length > 3 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="cursor-default text-2xs text-muted-foreground">
                    +{community.tags.length - 3} more
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <div className="flex flex-wrap gap-1">
                    {community.tags.slice(3).map((tag, index, array) => (
                      <span key={tag.id} className="text-xs">
                        {tag.name}
                        {index < array.length - 1 && " · "}
                      </span>
                    ))}
                  </div>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
