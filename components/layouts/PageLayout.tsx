import { ReactNode } from "react";
import { useResponsive } from "@/hooks/useResponsive";
import { PageHeader } from "../common/PageHeader";
import { Button } from "../common/Button";
import { twMerge } from "tailwind-merge";

type PageLayoutProps = {
  title: string | ReactNode;
  titleAction?: () => void;
  actionText?: string;
  onAction?: () => void;
  actionHint?: ReactNode;
  children: ReactNode;
  className?: string;
  mobileLeftContent?: ReactNode;
  mobileRightContent?: ReactNode;
};

export function PageLayout({
  title,
  titleAction,
  actionText,
  onAction,
  actionHint,
  children,
  className,
  mobileLeftContent,
  mobileRightContent,
}: PageLayoutProps) {
  const { isMobile } = useResponsive();

  const hasAction = Boolean(actionText && onAction);

  const renderTitle = () => {
    if (titleAction) {
      return (
        <button
          type="button"
          onClick={titleAction}
          className="text-muted-foreground flex cursor-pointer items-center gap-2 rounded-full border border-border px-2.5 py-1.5 text-sm font-medium transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
        >
          {title}
        </button>
      );
    }
    return <h1 className="text-foreground text-h1">{title}</h1>;
  };

  const resolveMobileRightContent = (): ReactNode => {
    if (mobileRightContent != null) {
      return mobileRightContent;
    }
    if (hasAction) {
      return (
        <Button variant="primary" onClick={onAction}>
          {actionText}
        </Button>
      );
    }
    if (actionHint != null && !isMobile) {
      return actionHint;
    }
    return undefined;
  };
  const mobileRight = resolveMobileRightContent();

  const desktopRightContent = hasAction ? (
    <Button variant="primary" onClick={onAction}>
      {actionText}
    </Button>
  ) : (
    actionHint
  );

  return (
    <div className={twMerge("flex h-[100dvh] flex-col", className)}>
      {isMobile ? (
        <PageHeader
          title={typeof title === "string" ? title : "Community"}
          leftContent={mobileLeftContent}
          rightContent={mobileRight}
        />
      ) : (
        <div className="flex items-center justify-between px-10 pt-4">
          {renderTitle()}
          {desktopRightContent}
        </div>
      )}
      {children}
    </div>
  );
}
