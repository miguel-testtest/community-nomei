import { ReactNode, useState, useEffect } from "react";
import { LuChevronDown, LuChevronRight } from "react-icons/lu";
import { twMerge } from "tailwind-merge";
import { DashboardSidebarGroupId } from "../enums/dashboard-sidebar-group-id.enum";

export interface DashboardSidebarItem {
  id: string;
  label: string;
  icon?: ReactNode;
  isOnline?: boolean;
  secondaryActionIcon?: ReactNode;
  onSecondaryAction?: () => void;
  isSelectable?: boolean;
  unreadCount?: number;
  isOwned?: boolean;
  secondaryActionType?: "positive" | "negative";
}

export interface DashboardSidebarGroup {
  id: string;
  label: string;
  items: DashboardSidebarItem[];
  isCollapsible?: boolean;
  footerAction?: {
    id: string;
    label: string;
    icon?: ReactNode;
    onClick: () => void;
  };
}

interface DashboardSidebarProps {
  groups: DashboardSidebarGroup[];
  activeItemId: string;
  onSelect: (itemId: string) => void;
  className?: string;
  disabled?: boolean;
}

export function DashboardSidebar({
  groups,
  activeItemId,
  onSelect,
  className,
  disabled = false,
}: DashboardSidebarProps) {
  const getInitialExpandedState = (group: DashboardSidebarGroup): boolean => {
    if (!group.isCollapsible) {
      return true;
    }

    const shouldBeExpandedByDefault =
      group.id === DashboardSidebarGroupId.TEXT_CHANNELS ||
      group.id === DashboardSidebarGroupId.CHAT;
    return shouldBeExpandedByDefault;
  };

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    () =>
      groups.reduce<Record<string, boolean>>((accumulator, group) => {
        accumulator[group.id] = getInitialExpandedState(group);
        return accumulator;
      }, {}),
  );

  useEffect(() => {
    setExpandedGroups((previous) => {
      const updated = { ...previous };
      groups.forEach((group) => {
        if (group.isCollapsible && !(group.id in updated)) {
          updated[group.id] = getInitialExpandedState(group);
        }
      });
      return updated;
    });
  }, [groups]);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((previous) => ({
      ...previous,
      [groupId]: !previous[groupId],
    }));
  };

  return (
    <aside
      className={twMerge(
        "flex w-full flex-col gap-6",
        disabled && "pointer-events-none opacity-50",
        className,
      )}
    >
      {groups.map((group) => {
        const isCollapsible = group.isCollapsible === true;
        const isExpanded = isCollapsible ? expandedGroups[group.id] : true;
        return (
          <div key={group.id} className="flex flex-col gap-3">
            {isCollapsible ? (
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                className="font-dm-sans flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.8px] text-subtle-foreground"
              >
                <span>{group.label}</span>
                {isExpanded ? (
                  <LuChevronDown className="h-3.5 w-3.5" />
                ) : (
                  <LuChevronRight className="h-3.5 w-3.5" />
                )}
              </button>
            ) : (
              <div className="font-dm-sans text-[10px] font-bold uppercase tracking-[0.8px] text-subtle-foreground">
                {group.label}
              </div>
            )}
            {isExpanded && (
              <div className="flex flex-col gap-1">
                {group.footerAction && (
                  <button
                    type="button"
                    onClick={group.footerAction.onClick}
                    className="font-dm-sans group flex w-full items-center rounded-[8px] pl-0 pr-3 py-[0.5625rem] text-[13.5px] font-medium text-primary transition-colors hover:bg-[color-mix(in_srgb,var(--color-accent)_50%,transparent)]"
                  >
                    <span className="flex items-center gap-2 transition-transform duration-150 ease-out group-hover:translate-x-3">
                      {group.footerAction.icon}
                      {group.footerAction.label}
                    </span>
                  </button>
                )}
                {group.items.map((item) => {
                  const isActive = item.id === activeItemId;
                  const isSelectable = item.isSelectable !== false;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={twMerge(
                        "font-dm-sans group flex items-center justify-between rounded-[8px] pl-0 pr-3 py-[0.5625rem] text-[13.5px] font-medium transition-colors",
                        !isSelectable
                          ? "cursor-default text-muted-foreground"
                          : "text-muted-foreground hover:bg-[color-mix(in_srgb,var(--color-accent)_50%,transparent)] hover:text-accent-foreground",
                        isActive &&
                          "bg-[color-mix(in_srgb,var(--color-accent)_50%,transparent)] font-semibold text-accent-foreground hover:bg-[color-mix(in_srgb,var(--color-accent)_50%,transparent)]",
                      )}
                      onClick={() => {
                        if (!isSelectable) return;
                        onSelect(item.id);
                      }}
                    >
                      <span
                        className={twMerge(
                          "flex min-w-0 flex-1 items-center gap-2 transition-transform duration-150 ease-out",
                          isSelectable && "group-hover:translate-x-3",
                          isActive && "translate-x-3",
                        )}
                      >
                        {item.icon}
                        {item.isOnline ? (
                          <span
                            className="h-2 w-2 flex-shrink-0 rounded-full bg-emerald-500"
                            aria-label="Online"
                          />
                        ) : null}
                        <span
                          className={twMerge(
                            "truncate",
                            item.unreadCount && item.unreadCount > 0 && "font-bold",
                            item.isOwned === false && "text-muted-foreground/70",
                          )}
                        >
                          {item.label}
                        </span>
                      </span>
                      <span
                        className={twMerge(
                          "flex items-center gap-2 transition-transform duration-150 ease-out",
                          isSelectable && "group-hover:translate-x-3",
                          isActive && "translate-x-3",
                        )}
                      >
                        {item.unreadCount && item.unreadCount > 0 ? (
                          <span className="inline-flex items-center justify-center rounded-full bg-yellow/15 px-2 py-0.5 text-xs font-semibold text-yellow">
                            {item.unreadCount}
                          </span>
                        ) : null}
                        <span className="flex h-4 w-4 items-center justify-center">
                          {item.secondaryActionIcon && item.onSecondaryAction ? (
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={(event) => {
                                event.stopPropagation();
                                item.onSecondaryAction?.();
                              }}
                              onKeyDown={(event) => {
                                if (event.key === "Enter" || event.key === " ") {
                                  event.preventDefault();
                                  item.onSecondaryAction?.();
                                }
                              }}
                              className={twMerge(
                                "flex items-center opacity-0 transition-opacity group-hover:opacity-100",
                                item.secondaryActionType === "positive"
                                  ? "text-muted-foreground hover:text-primary"
                                  : "text-muted-foreground hover:text-destructive",
                              )}
                            >
                              {item.secondaryActionIcon}
                            </span>
                          ) : null}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </aside>
  );
}
