import React from "react";
import { useVirtualizer, VirtualItem } from "@tanstack/react-virtual";
import { twMerge } from "tailwind-merge";

export type InfiniteScrollProps<T> = {
  items: T[];
  renderItem: (args: {
    item: T;
    index: number;
    virtualRow: VirtualItem;
  }) => React.ReactNode;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  onLoadMore: () => void;
  height?: number | string;
  estimateSize?: (index: number) => number;
  overscan?: number;
  className?: string;
  loadingText?: React.ReactNode;
  endText?: React.ReactNode;
  enableVariableHeights?: boolean;
  endOffset?: number;
  getRowStyle?: (index: number) => React.CSSProperties | undefined;
};

export function InfiniteScroll<T>({
  items,
  renderItem,
  hasNextPage = false,
  isFetchingNextPage = false,
  onLoadMore,
  height = 500,
  estimateSize = () => 35,
  overscan = 10,
  className,
  loadingText = "Loading more…",
  endText = "Nothing more to load",
  enableVariableHeights = false,
  endOffset = 0,
  getRowStyle,
}: InfiniteScrollProps<T>) {
  const parentRef = React.useRef<HTMLDivElement>(null);
  const loadingRef = React.useRef(false);
  const count = hasNextPage ? items.length + 1 : items.length;

  const rowVirtualizer = useVirtualizer({
    count,
    getScrollElement: () => parentRef.current,
    estimateSize,
    overscan,
    ...(enableVariableHeights
      ? {
          measureElement: (el: Element) =>
            (el as HTMLElement).getBoundingClientRect().height,
        }
      : {}),
  });

  const virtualItems = rowVirtualizer.getVirtualItems();

  React.useEffect(() => {
    const last = virtualItems[virtualItems.length - 1];
    if (!last) return;

    if (
      hasNextPage &&
      !isFetchingNextPage &&
      !loadingRef.current &&
      last.index >= items.length - endOffset
    ) {
      loadingRef.current = true;
      const res = onLoadMore();
      (async () => {
        try {
          await res;
        } finally {
          loadingRef.current = false;
        }
      })();
    }
  }, [
    virtualItems,
    items.length,
    hasNextPage,
    isFetchingNextPage,
    onLoadMore,
    endOffset,
  ]);

  return (
    <div
      ref={parentRef}
      className={twMerge("overflow-auto", className)}
      style={{ height }}
      aria-busy={isFetchingNextPage}
      role="feed"
    >
      <div
        style={{
          height: rowVirtualizer.getTotalSize(),
          width: "100%",
          position: "relative",
        }}
      >
        {virtualItems.map((virtualRow) => {
          const isLoaderRow = virtualRow.index >= items.length;
          const baseStyle: React.CSSProperties = {
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            ...(enableVariableHeights ? {} : { height: virtualRow.size }),
            transform: `translateY(${virtualRow.start}px)`,
          };
          const customStyle = getRowStyle
            ? getRowStyle(virtualRow.index)
            : undefined;
          return (
            <div
              key={virtualRow.key}
              style={{
                ...baseStyle,
                ...customStyle,
              }}
              {...(!isLoaderRow && {
                role: "article",
                "aria-posinset": virtualRow.index + 1,
                "aria-setsize": items.length,
              })}
              {...(enableVariableHeights
                ? { ref: rowVirtualizer.measureElement }
                : {})}
            >
              {isLoaderRow ? (
                <div
                  className="text-foreground/60 flex h-full items-center justify-center py-4 text-sm"
                  aria-live="polite"
                >
                  {hasNextPage ? loadingText : endText}
                </div>
              ) : (
                renderItem({
                  item: items[virtualRow.index],
                  index: virtualRow.index,
                  virtualRow,
                })
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default InfiniteScroll;
