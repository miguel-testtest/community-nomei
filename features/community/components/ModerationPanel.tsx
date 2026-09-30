import { useState } from "react";
import { useNavigate } from "react-router";
import { useCommunityReports } from "@/api/community/queries/useCommunityReports";
import { useCommunityBannedUsers } from "@/api/community/queries/useCommunityBannedUsers";
import { useUnbanCommunityUser } from "@/api/community/mutations/useUnbanCommunityUser";
import { useCommunityAccess } from "@/api/community/queries/useCommunityAccess";
import { ReportStatus } from "@/api/community/enums/report-status.enum";
import { ReportableType } from "@/api/community/enums/reportable-type.enum";
import {
  CommunityReport,
  BannedCommunityMember,
} from "@/api/community/community.types";
import { Button } from "@/components/common/Button";
import { Modal } from "@/components/UI/Modal";
import { toast } from "react-hot-toast";
import { formatUserName } from "../utils/userHelpers";
import { useRelativeTime } from "@/hooks/useRelativeTime";
import { twMerge } from "tailwind-merge";
import { ROUTES } from "@/routes/paths";
import { useUpdateReportStatus } from "@/api/community/mutations/useUpdateReportStatus";
import {
  REPORT_STATUS_COLORS,
  REPORT_STATUS_FILTER_ALL,
  REPORT_STATUS_LABELS,
  getReportStatusFilterLabel,
  ReportStatusFilter,
} from "../constants/reportStatus";
import { ALERT_PILL_BASE_CLASS } from "../constants/alertPill";
import { formatBanUntilDate } from "@/lib/utils";

type ModerationPanelProps = {
  communityId: string;
};

export function ModerationPanel({ communityId }: ModerationPanelProps) {
  const [reportStatusFilter, setReportStatusFilter] =
    useState<ReportStatusFilter>(REPORT_STATUS_FILTER_ALL);
  const [userToUnban, setUserToUnban] = useState<BannedCommunityMember | null>(
    null,
  );

  const { data: access } = useCommunityAccess(communityId);
  const canModerate = access?.canModerate ?? false;

  const statusParam: ReportStatus | undefined =
    reportStatusFilter !== REPORT_STATUS_FILTER_ALL
      ? (reportStatusFilter as ReportStatus)
      : undefined;

  const {
    data: reportsResponse,
    isLoading: isLoadingReports,
    isError: isReportsError,
  } = useCommunityReports({
    communityId,
    ...(statusParam && { status: statusParam }),
  });

  const reports = reportsResponse?.items ?? [];

  const {
    data: bannedUsers,
    isLoading: isLoadingBannedUsers,
    isError: isBannedUsersError,
  } = useCommunityBannedUsers({
    communityId,
    enabled: canModerate,
  });

  const { mutate: unbanUser, isPending: isUnbanning } = useUnbanCommunityUser();
  const navigate = useNavigate();

  const handleViewTarget = (report: CommunityReport) => {
    if (report.reportableType === ReportableType.POST) {
      navigate(
        `${ROUTES.COMMUNITY}/${communityId}?tab=general&postId=${report.reportableId}`,
        { replace: false },
      );
    } else if (report.reportableType === ReportableType.COMMENT) {
      navigate(
        `${ROUTES.COMMUNITY}/${communityId}?tab=general&commentId=${report.reportableId}`,
        { replace: false },
      );
    } else if (report.reportableType === ReportableType.MESSAGE) {
      if (report.channelId) {
        navigate(
          `${ROUTES.COMMUNITY}/${communityId}?tab=channel-${report.channelId}&messageId=${report.reportableId}`,
          { replace: false },
        );
      } else {
        navigate(
          `${ROUTES.COMMUNITY}/${communityId}?tab=general`,
          { replace: false },
        );
      }
    }
  };

  const handleUnbanUser = (user: BannedCommunityMember) => {
    setUserToUnban(user);
  };

  const handleConfirmUnban = () => {
    if (!userToUnban) return;

    unbanUser(
      {
        communityId,
        userId: userToUnban.userId,
      },
      {
        onSuccess: () => {
          toast.success("User unbanned successfully");
          setUserToUnban(null);
        },
        onError: () => {
          toast.error("Failed to unban user");
        },
      },
    );
  };

  return (
    <div className="flex h-full min-w-0 flex-col gap-6 overflow-x-hidden overflow-y-auto">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">
          Moderation
        </h2>
        <p className="text-sm text-muted-foreground">
          Manage reports and banned users for this community.
        </p>
      </div>

      {/* Reports */}
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-foreground flex-shrink-0 text-lg font-semibold">
            Reports
          </h3>
          <div className="min-w-0 overflow-x-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
            <div className="flex w-max gap-2 pb-1">
              {(
                [
                  REPORT_STATUS_FILTER_ALL,
                  ...Object.values(ReportStatus),
                ] as const
              ).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setReportStatusFilter(status)}
                  className={twMerge(
                    "cursor-pointer flex-shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors",
                    reportStatusFilter === status
                      ? "bg-accent"
                      : "hover:bg-surface bg-muted text-foreground/70",
                  )}
                >
                  {getReportStatusFilterLabel(status)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="max-h-[500px] overflow-y-auto rounded-lg bg-card">
          {isLoadingReports ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground text-sm">Loading reports...</p>
            </div>
          ) : isReportsError ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-red-500">
                Failed to load reports. Please try again.
              </p>
            </div>
          ) : !reports || !Array.isArray(reports) || reports.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground text-sm">No reports found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((report) => {
                if (!report || !report.id) return null;
                return (
                  <ReportRow
                    key={report.id}
                    report={report}
                    communityId={communityId}
                    canModerate={!!canModerate}
                    onViewTarget={handleViewTarget}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Banned users */}
      <div className="flex flex-col gap-4">
        <h3 className="text-foreground text-lg font-semibold">Banned Users</h3>
        <div className="rounded-lg border border-border bg-card">
          {isLoadingBannedUsers ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground text-sm">Loading banned users...</p>
            </div>
          ) : isBannedUsersError ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-red-500">
                Failed to load banned users. Please try again.
              </p>
            </div>
          ) : !bannedUsers ||
            !Array.isArray(bannedUsers) ||
            bannedUsers.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground text-sm">No banned users</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {bannedUsers.map((bannedUser) => {
                if (!bannedUser || !bannedUser.id) return null;
                return (
                  <BannedUserRow
                    key={bannedUser.id}
                    bannedUser={bannedUser}
                    onUnban={handleUnbanUser}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>

      {userToUnban && (
        <Modal
          open={!!userToUnban}
          setClose={() => {
            if (!isUnbanning) {
              setUserToUnban(null);
            }
          }}
        >
          <div className="mx-auto max-w-md rounded-2xl bg-card p-6 shadow-lg">
            <h2 className="text-foreground mb-4 text-xl font-semibold">
              Unban User
            </h2>
            <p className="text-muted-foreground mb-6 text-sm">
              Are you sure you want to unban{" "}
              <span className="font-semibold">
                {formatUserName(
                  userToUnban.user?.firstName,
                  userToUnban.user?.lastName,
                )}
              </span>
              ?
            </p>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setUserToUnban(null)}
                className="flex-1"
                disabled={isUnbanning}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleConfirmUnban}
                className="flex-1"
                disabled={isUnbanning}
              >
                {isUnbanning ? "Unbanning..." : "Unban"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

interface ReportRowProps {
  report: CommunityReport;
  communityId: string;
  canModerate: boolean;
  onViewTarget: (report: CommunityReport) => void;
}

function ReportRow({
  report,
  communityId,
  canModerate,
  onViewTarget,
}: ReportRowProps) {
  const relativeTime = useRelativeTime(report.createdAt);
  const reporterName = formatUserName(
    report.reporter?.firstName,
    report.reporter?.lastName,
  );

  const isPost = report.reportableType === ReportableType.POST;
  const isComment = report.reportableType === ReportableType.COMMENT;
  const isMessage = report.reportableType === ReportableType.MESSAGE;
  const hasTargetContent = !!report.targetContent;

  const getReportTypeBadgeClass = () => {
    if (isPost) return "bg-blue-50 text-blue-700";
    if (isComment) return "bg-purple-50 text-purple-700";
    if (isMessage) return "bg-orange-50 text-orange-700";
    return "bg-muted/50 text-foreground/70";
  };

  const getReportTypeLabel = () => {
    if (isPost) return "Post report";
    if (isComment) return "Comment report";
    if (isMessage) return "Message report";
    return "Report";
  };

  const { mutate: updateReportStatus, isPending: isUpdatingStatus } =
    useUpdateReportStatus();

  const handleCardClick = () => {
    onViewTarget(report);
  };

  const handleStatusChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    event.stopPropagation();
    const nextStatus = event.target.value as ReportStatus;
    if (nextStatus === report.status) return;

    updateReportStatus({
      communityId,
      reportId: report.id,
      status: nextStatus,
    });
  };

  const statusAccentClass =
    {
      [ReportStatus.PENDING]: "border-l-4 border-l-amber-400",
      [ReportStatus.REVIEWING]: "border-l-4 border-l-blue-400",
      [ReportStatus.RESOLVED]: "border-l-4 border-l-green-400",
      [ReportStatus.DISMISSED]: "border-l-4 border-l-gray-300",
    }[report.status] || "";

  return (
    <div
      className={twMerge(
        "group cursor-pointer rounded-xl border border-border bg-card/80 p-4 shadow-sm transition-all",
        "hover:shadow-md",
        statusAccentClass,
      )}
      onClick={handleCardClick}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={twMerge(
                ALERT_PILL_BASE_CLASS,
                "px-2.5 py-0.5 font-semibold tracking-wide uppercase",
                REPORT_STATUS_COLORS[report.status],
              )}
            >
              {REPORT_STATUS_LABELS[report.status]}
            </span>

            <span
              className={twMerge(
                ALERT_PILL_BASE_CLASS,
                "px-2 py-0.5 font-medium",
                getReportTypeBadgeClass(),
              )}
            >
              {getReportTypeLabel()}
            </span>

            <span className="text-black-300 text-2xs">•</span>

            <span className="text-black-400 text-2xs">
              Reported by{" "}
              <span className="text-foreground font-medium">{reporterName}</span>
            </span>
          </div>

          {hasTargetContent && (
            <div className="rounded-lg bg-muted/50 px-3 py-2">
              <span className="text-black-300 mb-0.5 block text-2xs font-medium tracking-wide uppercase">
                Reported content
              </span>
              <p
                className="text-black-600 line-clamp-3 text-sm leading-snug break-words whitespace-pre-wrap"
                style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}
              >
                {report.targetContent}
              </p>
            </div>
          )}

          <div className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2">
            <span className="mb-0.5 block text-2xs font-semibold tracking-wide text-amber-900/80 uppercase">
              Reason
            </span>
            <p
              className="text-black-700 text-sm leading-snug break-words whitespace-pre-wrap"
              style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}
            >
              {report.reason}
            </p>
          </div>

          {report.resolvedBy && (
            <div className="flex items-center gap-1.5 border-t border-border pt-2">
              <span className="text-black-350 text-2xs">
                Resolved by{" "}
                <span className="text-foreground font-medium">
                  {formatUserName(
                    report.resolvedBy?.firstName,
                    report.resolvedBy?.lastName,
                  )}
                </span>
              </span>
            </div>
          )}
        </div>

        <div
          className="flex flex-col items-end gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="text-black-350 text-2xs">
            {relativeTime || "Unknown time"}
          </span>

          {canModerate && (
            <select
              value={report.status}
              onChange={handleStatusChange}
              disabled={isUpdatingStatus}
              className="text-foreground focus:border-accent focus:ring-accent border-border h-8 rounded-full border bg-card px-3 text-xs font-medium focus:ring-2 focus:outline-none"
            >
              {Object.values(ReportStatus).map((status) => (
                <option key={status} value={status}>
                  {REPORT_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>
    </div>
  );
}

interface BannedUserRowProps {
  bannedUser: BannedCommunityMember;
  onUnban: (user: BannedCommunityMember) => void;
}

function BannedUserRow({ bannedUser, onUnban }: BannedUserRowProps) {
  const userName = formatUserName(
    bannedUser.user?.firstName,
    bannedUser.user?.lastName,
  );

  const rawBannedAt = useRelativeTime(bannedUser.bannedAt);
  const bannedAtTime = rawBannedAt || "Unknown";

  const bannedUntilDisplay = formatBanUntilDate(bannedUser.bannedUntil);

  return (
    <div className="p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-foreground text-sm font-medium">
              {userName}
            </span>
            <span className="text-muted-foreground text-xs">
              Banned {bannedAtTime}
            </span>
          </div>
          {bannedUser.banReason && (
            <p
              className="text-muted-foreground mb-1 line-clamp-1 overflow-hidden text-xs break-words text-ellipsis"
              style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}
            >
              {bannedUser.banReason}
            </p>
          )}
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs">
              {bannedUser.bannedUntil
                ? `Until: ${bannedUntilDisplay}`
                : "Permanent ban"}
            </span>
            {bannedUser.bannedBy && (
              <span className="text-muted-foreground text-xs">
                by{" "}
                {formatUserName(
                  bannedUser.bannedBy?.firstName,
                  bannedUser.bannedBy?.lastName,
                )}
              </span>
            )}
          </div>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={() => onUnban(bannedUser)}
          className="flex-shrink-0"
        >
          Unban
        </Button>
      </div>
    </div>
  );
}
