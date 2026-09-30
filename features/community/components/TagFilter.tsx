import { LuChevronLeft, LuChevronRight } from "react-icons/lu";
import { Button } from "@/components/common/Button";
import { twMerge } from "tailwind-merge";
import { useRef, useState, useEffect } from "react";

type TagFilterProps = {
  tags: string[];
  selectedTags: string[];
  onTagToggle: (tag: string) => void;
  showScrollButtons?: boolean;
};

export function TagFilter({
  tags,
  selectedTags,
  onTagToggle,
  showScrollButtons = true,
}: TagFilterProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(false);

  const updateScrollState = () => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const overflow = container.scrollWidth > container.clientWidth + 1;
    setHasOverflow(overflow);
    setCanScrollLeft(container.scrollLeft > 0);
    setCanScrollRight(container.scrollLeft < container.scrollWidth - container.clientWidth - 1);
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    updateScrollState();

    const observer = new ResizeObserver(updateScrollState);
    observer.observe(container);
    return () => observer.disconnect();
  }, [tags]);

  const handleScroll = () => {
    updateScrollState();
  };

  const scroll = (direction: "left" | "right") => {
    if (!scrollContainerRef.current) return;
    scrollContainerRef.current.scrollBy({
      left: direction === "left" ? -200 : 200,
      behavior: "smooth",
    });
  };

  const showButtons = showScrollButtons && hasOverflow;

  return (
    <div className="relative flex w-full min-w-0 items-center gap-1.5 sm:gap-2">
      {showButtons && (
        <button
          type="button"
          onClick={() => scroll("left")}
          disabled={!canScrollLeft}
          className={twMerge(
            "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-border bg-card transition sm:h-8 sm:w-8",
            canScrollLeft
              ? "text-foreground hover:bg-muted/50"
              : "cursor-not-allowed text-border",
          )}
          aria-label="Scroll left"
        >
          <LuChevronLeft size={14} className="sm:h-4 sm:w-4" />
        </button>
      )}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="scrollbar-none flex flex-1 gap-2 overflow-x-auto pb-1"
      >
        {tags.map((tag) => {
          const isSelected = selectedTags.includes(tag);
          return (
            <Button
              key={tag}
              type="button"
              variant="secondary"
              onClick={() => onTagToggle(tag)}
              className={twMerge(
                "flex-shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition sm:px-4 sm:py-2 sm:text-sm",
                isSelected
                  ? "bg-accent/50 text-foreground shadow-sm"
                  : "text-foreground bg-surface",
              )}
            >
              {tag}
            </Button>
          );
        })}
      </div>
      {showButtons && (
        <button
          type="button"
          onClick={() => scroll("right")}
          disabled={!canScrollRight}
          className={twMerge(
            "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-border bg-card transition sm:h-8 sm:w-8",
            canScrollRight
              ? "text-foreground hover:bg-muted/50"
              : "cursor-not-allowed text-border",
          )}
          aria-label="Scroll right"
        >
          <LuChevronRight size={14} className="sm:h-4 sm:w-4" />
        </button>
      )}
    </div>
  );
}
