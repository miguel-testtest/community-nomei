import { useEffect, useState } from "react";
import { LuX } from "react-icons/lu";
import { twMerge } from "tailwind-merge";
import { CommunitySector } from "@/features/community/constants/communitySectors";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/UI/Input";

type SectorStepProps = {
  title?: string;
  description?: string;
  sectors: readonly CommunitySector[];
  selectedSectors: CommunitySector[];
  onToggle: (sector: CommunitySector) => void;
  onConfirm: () => void;
  confirmLabel?: string;
  onBack?: () => void;
  isLoading?: boolean;
};

export function SectorStep({
  title = "Optimise the visibility of your community",
  description = "Reach top-notch members by completing your community information",
  sectors,
  selectedSectors,
  onToggle,
  onConfirm,
  confirmLabel = "Continue",
  onBack,
  isLoading = false,
}: SectorStepProps) {
  const [customSectorInput, setCustomSectorInput] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const sanitizedSelectedSectors = selectedSectors.filter(
    (sector) => sector !== "Other",
  );
  const defaultSectors = new Set(sectors);
  const customSectors = sanitizedSelectedSectors.filter(
    (sector) => !defaultSectors.has(sector),
  );
  const hasOtherOption = sectors.includes("Other");
  const trimmedInput = customSectorInput.trim();
  const isLengthValid = trimmedInput.length > 0 && trimmedInput.length <= 40;
  const isDuplicate = sanitizedSelectedSectors.some(
    (sector) => sector.toLowerCase() === trimmedInput.toLowerCase(),
  );
  const canAddCustomSector = showCustomInput && isLengthValid && !isDuplicate;

  useEffect(() => {
    setShowCustomInput(selectedSectors.includes("Other"));
  }, [selectedSectors]);

  const handleCustomInputChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setCustomSectorInput(event.target.value);
  };

  const handleAddCustomSector = () => {
    if (!canAddCustomSector) {
      return;
    }
    onToggle(trimmedInput);
    setCustomSectorInput("");
  };

  const handleCustomInputKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleAddCustomSector();
    }
  };

  const handleOtherTrigger = () => {
    onToggle("Other");
  };

  const standardSectors = sectors.filter((sector) => sector !== "Other");

  return (
    <div className="bg-surface flex w-full max-w-[50rem] flex-col items-center gap-8 rounded-3xl px-8 py-10 shadow-sm">
      <div className="flex flex-col items-center gap-3 text-center">
        <h2 className="text-foreground text-3xl">{title}</h2>
        <p className="text-muted-foreground">{description}</p>
        <p className="text-muted-foreground">
          Select the sector your community belongs to.
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        {standardSectors.map((sector) => {
          const isActive = sanitizedSelectedSectors.includes(sector);
          return (
            <Button
              key={sector}
              variant="secondary"
              type="button"
              onClick={() => onToggle(sector)}
              className={twMerge(
                "text-foreground cursor-pointer rounded-full px-6 py-2 text-sm font-semibold transition hover:bg-none",
                isActive
                  ? "bg-accent/50 shadow-sm"
                  : "text-foreground bg-card",
              )}
            >
              {sector}
            </Button>
          );
        })}
        {hasOtherOption && (
          <Button
            type="button"
            variant="secondary"
            onClick={handleOtherTrigger}
            className={twMerge(
              "text-foreground cursor-pointer rounded-full px-6 py-2 text-sm font-semibold transition hover:bg-none",
              showCustomInput ? "bg-accent/50 shadow-sm" : "bg-card",
            )}
          >
            Other
          </Button>
        )}
      </div>

      {(showCustomInput || customSectors.length > 0) && (
        <div className="flex w-full max-w-[36rem] flex-col gap-3">
          <div className="flex flex-col justify-center gap-3 sm:flex-row sm:items-center">
            <Input
              id="custom-sector"
              placeholder="Enter a custom sector"
              value={customSectorInput}
              onChange={handleCustomInputChange}
              onKeyDown={handleCustomInputKeyDown}
              maxLength={40}
              disabled={!showCustomInput}
            />
            <Button
              type="button"
              variant="primary"
              className="w-full sm:w-auto"
              onClick={handleAddCustomSector}
              disabled={!canAddCustomSector}
            >
              Add
            </Button>
          </div>
          <div className="text-black-300 flex flex-wrap items-center gap-2 text-xs">
            {!showCustomInput && (
              <span className="text-muted-foreground">
                Select Other to add custom sectors.
              </span>
            )}
            {isDuplicate && (
              <span className="text-red-500">This sector already exists.</span>
            )}
          </div>
          {customSectors.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {customSectors.map((sector) => (
                <span
                  key={sector}
                  className="text-foreground flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold shadow-sm"
                >
                  {sector}
                  <button
                    type="button"
                    onClick={() => onToggle(sector)}
                    className="text-black-300 hover:text-foreground transition"
                    aria-label={`Remove ${sector}`}
                  >
                    <LuX className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center sm:gap-4">
        {onBack && (
          <Button
            type="button"
            variant="secondary"
            onClick={onBack}
            className="bg-surface text-foreground rounded-full px-6 py-2 text-sm font-semibold shadow-sm transition"
          >
            Back
          </Button>
        )}
        <Button
          type="button"
          onClick={onConfirm}
          disabled={sanitizedSelectedSectors.length === 0 || isLoading}
          className={twMerge(
            "rounded-full px-8 py-2 text-sm font-semibold transition",
            sanitizedSelectedSectors.length === 0 || isLoading
              ? "bg-accent/50 text-muted-foreground"
              : "bg-accent text-foreground hover:bg-primary-hover",
          )}
        >
          {isLoading ? "Loading..." : confirmLabel}
        </Button>
      </div>
    </div>
  );
}
