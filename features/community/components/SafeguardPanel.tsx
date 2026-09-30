import { ChangeEvent, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { twMerge } from "tailwind-merge";
import { toast } from "react-hot-toast";
import { isAxiosError } from "axios";
import { LuX } from "react-icons/lu";
import { SafetyStatus } from "@/api/community/enums/safety-status.enum";
import { SafetySeverity } from "@/api/community/enums/safety-severity.enum";
import { SafetyCategory } from "@/api/community/enums/safety-category.enum";
import { SafetyResourceType } from "@/api/community/enums/safety-resource-type.enum";
import { CommunitySafeguardAlert, useSafeguardAlerts } from "@/api/community/queries/useSafeguardAlerts";
import { useUpdateSafeguardAlertStatus } from "@/api/community/mutations/useUpdateSafeguardAlertStatus";
import {
  CommunityDirectMessageSafeguardContext,
  useCommunityDirectMessageSafeguardContext,
} from "@/api/community/queries/useCommunityDirectMessageSafeguardContext";
import {
  SAFEGUARD_STATUS_COLORS,
  SAFEGUARD_STATUS_LABELS,
} from "../constants/safeguardStatus";
import { ALERT_PILL_BASE_CLASS } from "../constants/alertPill";
import { useRelativeTime } from "@/hooks/useRelativeTime";
import { formatUserName } from "../utils/userHelpers";
import { ROUTES } from "@/routes/paths";
import { Modal } from "@/components/UI/Modal";
import { formatDateTime } from "@/lib/utils";
import { MessageContent } from "@/features/community/components/MessageContent";

type SafeguardPanelProps = {
  communityId: string;
};

const CONTENT_UNAVAILABLE_MESSAGE = "Flagged content is no longer available.";
const STRIKE_CONTEXT_BLOCKED_MESSAGE =
  "Context is available from strike 1.";
const DM_STRIKE_LIMIT = 3;

function formatEnumLabel(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getAlertNavigationPath(
  alert: CommunitySafeguardAlert,
  communityId: string,
): { isNavigationSupported: boolean; path: string | null } {
  if (alert.resourceType === SafetyResourceType.COMMUNITY_POST) {
    return {
      isNavigationSupported: true,
      path: `${ROUTES.COMMUNITY}/${communityId}?tab=general&postId=${alert.resourceId}`,
    };
  }

  if (alert.resourceType === SafetyResourceType.COMMUNITY_POST_COMMENT) {
    return {
      isNavigationSupported: true,
      path: alert.postId
        ? `${ROUTES.COMMUNITY}/${communityId}?tab=general&postId=${alert.postId}&commentId=${alert.resourceId}`
        : null,
    };
  }

  if (alert.resourceType === SafetyResourceType.COMMUNITY_CHANNEL_MESSAGE) {
    return {
      isNavigationSupported: true,
      path: alert.channelId
        ? `${ROUTES.COMMUNITY}/${communityId}?tab=channel-${alert.channelId}&messageId=${alert.resourceId}`
        : null,
    };
  }

  return { isNavigationSupported: false, path: null };
}

export function SafeguardPanel({ communityId }: SafeguardPanelProps) {
  const [statusFilter, setStatusFilter] = useState<SafetyStatus | null>(null);
  const [severityFilter, setSeverityFilter] = useState<SafetySeverity | null>(
    null,
  );
  const [categoryFilter, setCategoryFilter] = useState<SafetyCategory | null>(
    null,
  );

  const statusParam = statusFilter ?? undefined;
  const severityParam = severityFilter ?? undefined;
  const categoryParam = categoryFilter ?? undefined;

  const {
    data: alertsResponse,
    isLoading,
    isError,
  } = useSafeguardAlerts({
    communityId,
    ...(statusParam && { status: statusParam }),
    ...(severityParam && { severity: severityParam }),
    ...(categoryParam && { category: categoryParam }),
  });

  const alerts = useMemo(() => alertsResponse?.items ?? [], [alertsResponse]);

  return (
    <div className="flex h-full min-w-0 flex-col gap-6 overflow-x-hidden overflow-y-auto">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">Safeguard</h2>
        <p className="text-sm text-muted-foreground">
          Review safeguard alerts triggered in this community.
        </p>
      </div>

      <div className="flex min-w-0 flex-col gap-3">
        <div className="min-w-0 overflow-x-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
          <div className="flex w-max items-center gap-2 pb-1">
            {(Object.values(SafetyStatus) as SafetyStatus[]).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() =>
                  setStatusFilter((currentStatus) =>
                    currentStatus === status ? null : status,
                  )
                }
                className={twMerge(
                  "cursor-pointer flex-shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors",
                  statusFilter === status
                    ? "bg-accent"
                    : "hover:bg-surface bg-muted text-foreground/70",
                )}
              >
                {SAFEGUARD_STATUS_LABELS[status]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={severityFilter ?? ""}
            onChange={(event) =>
              setSeverityFilter(
                event.target.value ? (event.target.value as SafetySeverity) : null,
              )
            }
            className="text-foreground border-border h-8 rounded-full border bg-card px-3 text-xs font-medium"
          >
            <option value="">All severities</option>
            {Object.values(SafetySeverity).map((severity) => (
              <option key={severity} value={severity}>
                {formatEnumLabel(severity)}
              </option>
            ))}
          </select>
          <select
            value={categoryFilter ?? ""}
            onChange={(event) =>
              setCategoryFilter(
                event.target.value ? (event.target.value as SafetyCategory) : null,
              )
            }
            className="text-foreground border-border h-8 rounded-full border bg-card px-3 text-xs font-medium"
          >
            <option value="">All categories</option>
            {Object.values(SafetyCategory).map((category) => (
              <option key={category} value={category}>
                {formatEnumLabel(category)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="max-h-[600px] overflow-y-auto rounded-lg bg-card">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground text-sm">Loading alerts...</p>
          </div>
        ) : isError ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-red-500">
              Failed to load safeguard alerts. Please try again.
            </p>
          </div>
        ) : alerts.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground text-sm">No safeguard alerts found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <SafeguardAlertRow
                key={alert.id}
                alert={alert}
                communityId={communityId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface SafeguardAlertRowProps {
  alert: CommunitySafeguardAlert;
  communityId: string;
}

function SafeguardAlertRow({ alert, communityId }: SafeguardAlertRowProps) {
  const relativeTime = useRelativeTime(alert.createdAt);
  const navigate = useNavigate();
  const [isContextModalOpen, setIsContextModalOpen] = useState(false);
  const reporterName = formatUserName(
    alert.user?.firstName,
    alert.user?.lastName,
  );
  const isDirectMessageAlert =
    alert.resourceType === SafetyResourceType.COMMUNITY_DIRECT_MESSAGE;
  const directMessageStrikeCount = alert.directMessageStrikeCount ?? 0;
  const canViewDirectMessageContext =
    isDirectMessageAlert && alert.canViewDirectMessageContext;
  const navigation = getAlertNavigationPath(alert, communityId);
  const canAttemptNavigation = navigation.isNavigationSupported;
  const { mutate: updateStatus, isPending: isUpdatingStatus } =
    useUpdateSafeguardAlertStatus();
  const {
    data: directMessageContext,
    isLoading: isDirectMessageContextLoading,
    error: directMessageContextError,
    refetch: refetchDirectMessageContext,
  } = useCommunityDirectMessageSafeguardContext({
    communityId,
    alertId: alert.id,
    before: 5,
    after: 5,
    enabled: isContextModalOpen && canViewDirectMessageContext,
  });

  const handleStatusChange = (event: ChangeEvent<HTMLSelectElement>) => {
    event.stopPropagation();
    const nextStatus = event.target.value as SafetyStatus;

    if (nextStatus === alert.status) {
      return;
    }

    updateStatus(
      {
        communityId,
        alertId: alert.id,
        status: nextStatus,
      },
      {
        onError: () => {
          toast.error("Failed to update safeguard alert status");
        },
      },
    );
  };

  const handleCardClick = () => {
    if (!canAttemptNavigation) {
      return;
    }

    if (!navigation.path) {
      toast.error(CONTENT_UNAVAILABLE_MESSAGE);
      return;
    }

    navigate(navigation.path, { replace: false });
  };

  const handleOpenContextModal = () => {
    if (!canViewDirectMessageContext) {
      return;
    }
    setIsContextModalOpen(true);
  };

  const handleCloseContextModal = () => {
    setIsContextModalOpen(false);
  };

  return (
    <>
      <div
        className={twMerge(
          "rounded-xl border border-border bg-card p-4 shadow-sm transition-all",
          canAttemptNavigation && "cursor-pointer hover:shadow-md",
        )}
        onClick={canAttemptNavigation ? handleCardClick : undefined}
      >
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span
                className={twMerge(
                  ALERT_PILL_BASE_CLASS,
                  "h-6 px-3 font-semibold tracking-wide uppercase",
                  SAFEGUARD_STATUS_COLORS[alert.status],
                )}
              >
                {SAFEGUARD_STATUS_LABELS[alert.status]}
              </span>
              <span
                className={twMerge(
                  ALERT_PILL_BASE_CLASS,
                  "h-6 bg-red-50 px-3 font-medium text-red-700",
                )}
              >
                {formatEnumLabel(alert.severity)}
              </span>
            </div>
            <span className="text-foreground/60 text-2xs">
              {relativeTime || "Unknown time"}
            </span>
          </div>

          <div className="rounded-lg border border-border/80 bg-muted/70 px-3 py-2">
            <span className="text-foreground/60 mb-0.5 block text-2xs font-medium tracking-wide uppercase">
              Content ({formatEnumLabel(alert.resourceType)})
            </span>
            <p
              className="text-black-600 line-clamp-3 text-sm leading-snug break-words whitespace-pre-wrap"
              style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}
            >
              {alert.content}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-foreground/70 flex min-w-0 flex-wrap items-center gap-1.5 text-2xs">
              <span className="text-foreground/75 font-medium">
                Category: {formatEnumLabel(alert.category)}
              </span>
              {isDirectMessageAlert && (
                <>
                  <span className="text-foreground/30">•</span>
                  <span className="font-medium text-amber-700">
                    Strike {directMessageStrikeCount}/{DM_STRIKE_LIMIT}
                  </span>
                </>
              )}
              <span className="text-foreground/30">•</span>
              <span>
                Triggered by{" "}
                <span className="text-foreground font-medium">{reporterName}</span>
              </span>
            </div>

            <div className="ml-auto flex items-center gap-2">
              {canViewDirectMessageContext && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleOpenContextModal();
                  }}
                  className="text-foreground/75 hover:text-foreground h-8 cursor-pointer rounded-full border border-border bg-muted/50 px-3 text-xs font-medium transition-colors hover:bg-muted focus:border-border focus:ring-2 focus:ring-gray-200 focus:outline-none"
                >
                  View context
                </button>
              )}
              <select
                value={alert.status}
                onClick={(event) => event.stopPropagation()}
                onChange={handleStatusChange}
                disabled={isUpdatingStatus}
                className="text-foreground h-8 rounded-full border border-border bg-card px-3 text-xs font-medium focus:border-border focus:ring-2 focus:ring-gray-200 focus:outline-none"
              >
                {Object.values(SafetyStatus).map((status) => (
                  <option key={status} value={status}>
                    {SAFEGUARD_STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
      <DirectMessageContextModal
        open={isContextModalOpen}
        onClose={handleCloseContextModal}
        context={directMessageContext}
        isLoading={isDirectMessageContextLoading}
        error={directMessageContextError}
        onRetry={() => {
          void refetchDirectMessageContext();
        }}
      />
    </>
  );
}

type DirectMessageContextModalProps = {
  open: boolean;
  onClose: () => void;
  context: CommunityDirectMessageSafeguardContext | undefined;
  isLoading: boolean;
  error: unknown;
  onRetry: () => void;
};

function DirectMessageContextModal({
  open,
  onClose,
  context,
  isLoading,
  error,
  onRetry,
}: DirectMessageContextModalProps) {
  const errorMessage = getDirectMessageContextErrorMessage(error);
  const highlightedMessage = context?.items.find(
    (message) => message.id === context.highlightedMessageId,
  );
  const highlightedUserId = highlightedMessage?.userId ?? null;

  return (
    <Modal open={open} setClose={onClose}>
      <div className="w-[56rem] max-w-[96vw] rounded-2xl bg-card p-6 shadow-lg">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-foreground text-lg font-semibold">
              Direct message context
            </h3>
            <p className="text-foreground/60 mt-1 text-xs">
              Limited context around the flagged message.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-foreground/70 hover:text-foreground inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-full"
          >
            <LuX size={16} />
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <p className="text-foreground/60 text-sm">Loading context...</p>
          </div>
        ) : errorMessage ? (
          <div className="space-y-3 rounded-xl border border-red-100 bg-red-50 p-4">
            <p className="text-sm text-red-700">{errorMessage}</p>
            <button
              type="button"
              onClick={onRetry}
              className="cursor-pointer rounded-full border border-red-200 bg-card px-3 py-1 text-xs font-medium text-red-700"
            >
              Retry
            </button>
          </div>
        ) : !context ? (
          <div className="flex items-center justify-center py-10">
            <p className="text-foreground/60 text-sm">No context available.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-foreground/80 rounded-full bg-muted px-3 py-1 text-xs font-semibold">
                Strike {context.strikeCount} / {DM_STRIKE_LIMIT}
              </span>
            </div>
            <div className="max-h-[30rem] space-y-3 overflow-y-auto rounded-2xl border border-border bg-gradient-to-b from-gray-50 to-white p-4">
              {context.items.map((message) => {
                const isHighlighted =
                  message.id === context.highlightedMessageId;
                const isSystemMessage =
                  message.isSystemMessage || message.userId === null;
                const isFlaggedUserMessage =
                  !isSystemMessage &&
                  highlightedUserId !== null &&
                  message.userId === highlightedUserId;
                const userName = message.isSystemMessage
                  ? "System"
                  : formatUserName(
                      message.user?.firstName,
                      message.user?.lastName,
                    );

                if (isSystemMessage) {
                  return (
                    <div key={message.id} className="flex items-center justify-center">
                      <div className="rounded-full border border-border bg-card px-3 py-1 text-xs text-foreground/60">
                        {message.content}
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={message.id}
                    className={twMerge(
                      "flex",
                      isFlaggedUserMessage ? "justify-end" : "justify-start",
                    )}
                  >
                    <div className="max-w-[72%]">
                      <div
                        className={twMerge(
                          "mb-1 flex items-center gap-2",
                          isFlaggedUserMessage ? "justify-end" : "justify-start",
                        )}
                      >
                        <span className="text-foreground text-xs font-semibold">
                          {userName}
                        </span>
                        <span className="text-foreground/60 text-2xs">
                          {formatDateTime(message.createdAt)}
                        </span>
                      </div>
                      <div
                        className={twMerge(
                          "rounded-xl border px-4 py-2 shadow-sm",
                          isFlaggedUserMessage
                            ? "rounded-tr-none border-border bg-muted"
                            : "rounded-tl-none border-border bg-card",
                          isHighlighted && "border-red-300 bg-red-50 ring-2 ring-red-200",
                        )}
                      >
                        <MessageContent
                          content={message.content}
                          className="prose-sm max-w-none"
                          textSize="sm"
                          textColor="text-foreground"
                        />
                        {isHighlighted && (
                          <div className="mt-2 inline-flex rounded-full bg-red-100 px-2 py-0.5 text-2xs font-semibold text-red-700">
                            Trigger message
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

function getDirectMessageContextErrorMessage(error: unknown): string | null {
  if (!error) {
    return null;
  }

  if (isAxiosError(error) && error.response?.status === 403) {
    return STRIKE_CONTEXT_BLOCKED_MESSAGE;
  }

  return "Failed to load direct message context. Please try again.";
}
