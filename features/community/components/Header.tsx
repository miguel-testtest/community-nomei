import { LuArrowLeft } from "react-icons/lu";
import { useNavigate } from "react-router";
import { twMerge } from "tailwind-merge";

import { DropdownMenu } from "@/components/UI/DropdownMenu";
import { ROUTES } from "@/routes/paths";
import { useResponsive } from "@/hooks/useResponsive";

type CommunityMenuOption = {
  name: string;
  onClick: () => Promise<void>;
};

type HeaderProps = {
  onBack?: () => void;
  backLabel?: string;
  menuOptions?: CommunityMenuOption[];
  className?: string;
};

export function Header({
  onBack,
  backLabel = "Back to communities",
  menuOptions,
  className,
}: HeaderProps) {
  const navigate = useNavigate();
  const { isMobile } = useResponsive();

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    navigate(ROUTES.COMMUNITY);
  };

  return (
    <div
      className={twMerge(
        "border-mercury-gray bg-background flex h-18 w-full items-center border-b px-4 lg:px-10 lg:py-2",
        className,
      )}
    >
      <button
        type="button"
        onClick={handleBack}
        className="text-foreground flex items-center gap-2 rounded-full px-4 py-2 text-xl leading-none font-semibold transition"
      >
        <LuArrowLeft size={isMobile ? 20 : 20} />
        <span className="leading-none">{backLabel}</span>
      </button>

      {menuOptions && menuOptions.length > 0 && (
        <div className="ml-auto">
          <DropdownMenu options={menuOptions} leftOffset={-65} />
        </div>
      )}
    </div>
  );
}
