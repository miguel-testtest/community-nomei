import { useState, useRef, useEffect, ChangeEvent, KeyboardEvent } from "react";
import { LuX, LuChevronDown } from "react-icons/lu";
import { twMerge } from "tailwind-merge";
import { ErrorText } from "@/components/common/ErrorText";

type SectorManagerProps = {
  selectedSectors: string[];
  availableSectors: string[];
  onAddSector: (sector: string) => void;
  onRemoveSector: (sector: string) => void;
  sectorError?: string | undefined;
};

const MAX_SECTOR_LENGTH = 40;

export function SectorManager({
  selectedSectors,
  availableSectors,
  onAddSector,
  onRemoveSector,
  sectorError,
}: SectorManagerProps) {
  const [inputValue, setInputValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const trimmed = inputValue.trim();

  const filteredOptions = availableSectors.filter((sector) =>
    sector.toLowerCase().includes(trimmed.toLowerCase()),
  );

  const handleAdd = () => {
    if (!trimmed || trimmed.length > MAX_SECTOR_LENGTH) return;
    const existingMatch = availableSectors.find(
      (sector) => sector.toLowerCase() === trimmed.toLowerCase(),
    );
    onAddSector(existingMatch ?? trimmed);
    setInputValue("");
    setIsOpen(false);
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  };

  const handleSelectOption = (sector: string) => {
    onAddSector(sector);
    setInputValue("");
    setIsOpen(false);
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && e.key === "ArrowDown") {
      e.preventDefault();
      setIsOpen(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        Math.min(prev + 1, filteredOptions.length - 1),
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.max(prev - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
        handleSelectOption(filteredOptions[highlightedIndex]);
      } else {
        handleAdd();
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative flex gap-2" ref={containerRef}>
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            placeholder="Search or add a sector..."
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              setInputValue(e.target.value);
              setIsOpen(true);
              setHighlightedIndex(-1);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            maxLength={MAX_SECTOR_LENGTH}
            className="w-full rounded-xl border border-border bg-card px-3 py-2 pr-8 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          />
          <LuChevronDown
            className={twMerge(
              "pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-transform duration-150",
              isOpen && "rotate-180",
            )}
          />
          {isOpen && filteredOptions.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-48 overflow-y-auto rounded-xl border border-border bg-card shadow-lg">
              {filteredOptions.map((sector, index) => (
                <button
                  key={sector}
                  type="button"
                  className={twMerge(
                    "w-full px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted",
                    index === highlightedIndex && "bg-muted",
                    index === 0 && "rounded-t-xl",
                    index === filteredOptions.length - 1 && "rounded-b-xl",
                  )}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelectOption(sector);
                  }}
                >
                  {sector}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={handleAdd}
          disabled={!trimmed || trimmed.length > MAX_SECTOR_LENGTH}
          className="shrink-0 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
        >
          Add
        </button>
      </div>

      {selectedSectors.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {selectedSectors.map((sector) => (
            <span
              key={sector}
              className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground"
            >
              {sector}
              <button
                type="button"
                onClick={() => onRemoveSector(sector)}
                className="text-muted-foreground transition-colors hover:text-foreground"
                aria-label={`Remove ${sector}`}
              >
                <LuX className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">No sectors selected.</p>
      )}

      {sectorError && <ErrorText className="text-xs">{sectorError}</ErrorText>}
    </div>
  );
}
