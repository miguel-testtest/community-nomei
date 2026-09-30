import { useState, useEffect, useRef, useCallback } from "react";
import {
  useCommunityStatisticsHistorical,
  CommunityStatisticsHistoricalDataPoint,
} from "@/api/community/queries/useCommunityStatisticsHistorical";
import { useResponsive } from "@/hooks/useResponsive";
import { CommunityStatisticsPeriod } from "@/api/community/community.types";
import { Spinner } from "@/components/common/Spinner";
import { LuUsers, LuFileText, LuMessageSquare, LuHeart } from "react-icons/lu";
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Filler,
} from "chart.js";

Chart.register(
  LineController,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Filler,
);

interface CommunityStatisticsProps {
  communityId: string;
}

type PeriodOption = {
  value: CommunityStatisticsPeriod;
  label: string;
};

const PERIOD_OPTIONS: PeriodOption[] = [
  { value: "24h", label: "Last 24 hours" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last month" },
];

interface PeriodFilterProps {
  options: PeriodOption[];
  selectedValue: CommunityStatisticsPeriod;
  onSelect: (value: CommunityStatisticsPeriod) => void;
}

interface IndicatorPosition {
  left: number;
  width: number;
}

function PeriodFilter({
  options,
  selectedValue,
  onSelect,
}: PeriodFilterProps) {
  const { isMobile } = useResponsive();
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [indicatorPosition, setIndicatorPosition] =
    useState<IndicatorPosition>({ left: 0, width: 0 });

  const updateIndicatorPosition = useCallback(() => {
    const selectedIndex = options.findIndex(
      (option) => option.value === selectedValue,
    );

    if (
      selectedIndex === -1 ||
      !buttonRefs.current[selectedIndex] ||
      !containerRef.current
    ) {
      return;
    }

    const selectedButton = buttonRefs.current[selectedIndex];
    const container = containerRef.current;

    const containerRect = container.getBoundingClientRect();
    const buttonRect = selectedButton.getBoundingClientRect();

    const left = buttonRect.left - containerRect.left;
    const width = buttonRect.width;

    setIndicatorPosition({ left, width });
  }, [options, selectedValue]);

  useEffect(() => {
    if (!containerRef.current) return;

    const updatePosition = () => {
      requestAnimationFrame(() => {
        updateIndicatorPosition();
      });
    };

    const initialTimeoutId = setTimeout(updatePosition, 0);

    const resizeObserver = new ResizeObserver(updatePosition);
    resizeObserver.observe(containerRef.current);

    return () => {
      clearTimeout(initialTimeoutId);
      resizeObserver.disconnect();
    };
  }, [updateIndicatorPosition]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      updateIndicatorPosition();
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [selectedValue, updateIndicatorPosition]);

  const handleButtonClick = useCallback(
    (value: CommunityStatisticsPeriod) => {
      onSelect(value);
      requestAnimationFrame(() => {
        updateIndicatorPosition();
      });
    },
    [onSelect, updateIndicatorPosition],
  );

  return (
    <div
      ref={containerRef}
      className="relative flex bg-muted rounded-lg p-1 w-full"
    >
      <div
        className="absolute rounded-md bg-card shadow-sm transition-all duration-300 ease-in-out"
        style={{
          left: `${indicatorPosition.left}px`,
          width: `${indicatorPosition.width}px`,
          height: "calc(100% - 8px)",
          top: "4px",
        }}
      />
      {options.map((option, index) => {
        const isSelected = selectedValue === option.value;
        return (
          <button
            key={option.value}
            ref={(el) => {
              buttonRefs.current[index] = el;
            }}
            type="button"
            onClick={() => handleButtonClick(option.value)}
            className={`relative z-10 flex-1 rounded-md transition-colors duration-200 whitespace-nowrap flex items-center justify-center ${
              isMobile ? "px-3 py-2 text-xs" : "px-4 py-2 text-sm"
            } font-medium min-h-[2.5rem]`}
          >
            <span
              className={`relative z-10 leading-none ${
                isSelected
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  period: CommunityStatisticsPeriod;
  historicalData: CommunityStatisticsHistoricalDataPoint[] | undefined;
  metricKey: "newMembers" | "newPosts" | "newComments" | "reactions";
}

function generate24hLabels(historicalData?: CommunityStatisticsHistoricalDataPoint[]): string[] {
  if (historicalData && historicalData.length > 0) {
    return historicalData.map((point) => {
      const date = new Date(point.date);
      return date.getHours().toString().padStart(2, "0") + ":00";
    });
  }

  const labels: string[] = [];
  for (let i = 23; i >= 0; i--) {
    const hour = new Date();
    hour.setHours(hour.getHours() - i);
    labels.push(hour.getHours().toString().padStart(2, "0") + ":00");
  }
  return labels.filter((_, i) => i % 4 === 0);
}

function generate7dLabels(historicalData?: CommunityStatisticsHistoricalDataPoint[]): string[] {
  if (historicalData && historicalData.length > 0) {
    return historicalData.map((point) => {
      const date = new Date(point.date + "T00:00:00");
        return date.toLocaleDateString("en-GB", { weekday: "short" });
    });
  }

  const labels: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
      const dayName = date.toLocaleDateString("en-GB", { weekday: "short" });
    labels.push(dayName);
  }
  return labels;
}

function generate30dLabels(historicalData?: CommunityStatisticsHistoricalDataPoint[]): string[] {
  if (historicalData && historicalData.length > 0) {
    return historicalData.map((point) => {
      const date = new Date(point.date + "T00:00:00");
      return date.getDate().toString();
    });
  }

  const labels: string[] = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const day = date.getDate();
    labels.push(day.toString());
  }
  return labels.filter((_, i) => i % 5 === 0);
}

function getPeriodLabels(
  period: CommunityStatisticsPeriod,
  historicalData?: CommunityStatisticsHistoricalDataPoint[],
): string[] {
  if (period === "24h") {
    return generate24hLabels(historicalData);
  }

  if (period === "7d") {
    return generate7dLabels(historicalData);
  }

  if (period === "30d") {
    return generate30dLabels(historicalData);
  }

  return [];
}

function mapHistoricalDataToLabels(
  historicalData: CommunityStatisticsHistoricalDataPoint[] | undefined,
  labels: string[],
  period: CommunityStatisticsPeriod,
  metricKey: "newMembers" | "newPosts" | "newComments" | "reactions",
  fallbackValue: number,
): number[] {
  if (!historicalData || historicalData.length === 0) {
    const dataPoints = labels.map(() => 0);
    if (fallbackValue > 0) {
      dataPoints[dataPoints.length - 1] = fallbackValue;
    }
    return dataPoints;
  }

  if (period === "7d" || period === "30d" || period === "24h") {
    return historicalData.map((point) => point[metricKey]);
  }

  const dataPoints = labels.map(() => 0);
  return dataPoints;
}

function MetricCard({
  title,
  value,
  icon,
  color,
  period,
  historicalData,
  metricKey,
}: MetricCardProps) {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    const ctx = chartRef.current.getContext("2d");
    if (!ctx) return;

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
      chartInstanceRef.current = null;
    }

    const baseLabels = getPeriodLabels(period, historicalData);
    const allLabels =
      period === "30d" && historicalData && historicalData.length > 0
        ? historicalData.map((point) => {
            const date = new Date(point.date + "T00:00:00");
            const day = date.getDate().toString().padStart(2, "0");
            const month = (date.getMonth() + 1).toString().padStart(2, "0");
            return `${day}/${month}`;
          })
        : baseLabels;

    const allDataPoints = mapHistoricalDataToLabels(
      historicalData,
      allLabels,
      period,
      metricKey,
      value,
    );

    chartInstanceRef.current = new Chart(ctx, {
      type: "line",
      data: {
        labels: allLabels,
        datasets: [
          {
            data: allDataPoints,
            borderColor: color,
            backgroundColor: `${color}20`,
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 4,
            pointHoverBackgroundColor: color,
            pointHoverBorderColor: color,
            pointHoverBorderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            enabled: true,
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            padding: 8,
            titleFont: {
              size: 12,
            },
            bodyFont: {
              size: 12,
            },
            displayColors: false,
            callbacks: {
              title: (context) => {
                return context[0].label || "";
              },
              label: (context) => {
                const value = context.parsed.y;
                if (value !== null && value !== undefined) {
                  return `${Math.round(value)}`;
                }
                return "0";
              },
            },
          },
        },
        scales: {
          x: {
            display: true,
            grid: {
              display: false,
            },
            ticks: {
              font: {
                size: 9,
              },
              color: "#9CA3AF",
              maxRotation: 0,
              autoSkip: period === "30d" || period === "24h",
              maxTicksLimit: period === "30d" ? 7 : period === "24h" ? 6 : undefined,
            },
          },
          y: {
            display: false,
            beginAtZero: true,
            min: 0,
            grace: "10%",
          },
        },
        layout: {
          padding: {
            top: 8,
            bottom: 0,
          },
        },
        interaction: {
          intersect: false,
          mode: "index",
        },
      },
    });

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [value, color, period, historicalData, metricKey]);

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="p-2 rounded-lg"
            style={{ backgroundColor: `${color}15` }}
          >
            {icon}
          </div>
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
            <p className="text-2xl font-semibold text-foreground mt-1">
              {value.toLocaleString()}
            </p>
          </div>
        </div>
      </div>
      <div className="h-20 w-full">
        <canvas ref={chartRef} />
      </div>
    </div>
  );
}

export function CommunityStatistics({ communityId }: CommunityStatisticsProps) {
  const [selectedPeriod, setSelectedPeriod] =
    useState<CommunityStatisticsPeriod>("7d");
  const { isLarge } = useResponsive();

  const {
    data: historicalData,
    isLoading,
    isError,
  } = useCommunityStatisticsHistorical({
    communityId,
    period: selectedPeriod,
    enabled: !!communityId,
  });

  const statistics = historicalData?.data
    ? {
        newMembers: historicalData.data.reduce(
          (sum, point) => sum + point.newMembers,
          0,
        ),
        newPosts: historicalData.data.reduce(
          (sum, point) => sum + point.newPosts,
          0,
        ),
        newComments: historicalData.data.reduce(
          (sum, point) => sum + point.newComments,
          0,
        ),
        reactions: historicalData.data.reduce(
          (sum, point) => sum + point.reactions,
          0,
        ),
      }
    : null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner />
      </div>
    );
  }

  if (isError || !statistics || !historicalData) {
    return (
      <div className="bg-card border border-border rounded-xl p-8 text-center">
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Error loading statistics
        </h3>
        <p className="text-sm text-muted-foreground">
          Unable to load community statistics. Please try again later.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pr-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">Statistics</h2>
        <p className="text-sm text-muted-foreground">
          View engagement metrics for your community.
        </p>
      </div>

      <div className="flex flex-col gap-6 rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <PeriodFilter
          options={PERIOD_OPTIONS}
          selectedValue={selectedPeriod}
          onSelect={setSelectedPeriod}
        />

        <div className={`grid gap-4 ${isLarge ? "grid-cols-2" : "grid-cols-1"}`}>
          <MetricCard
            title="New Members"
            value={statistics.newMembers}
            icon={<LuUsers className="h-5 w-5" style={{ color: "#3B82F6" }} />}
            color="#3B82F6"
            period={selectedPeriod}
            historicalData={historicalData?.data}
            metricKey="newMembers"
          />
          <MetricCard
            title="New Posts"
            value={statistics.newPosts}
            icon={
              <LuFileText className="h-5 w-5" style={{ color: "#10B981" }} />
            }
            color="#10B981"
            period={selectedPeriod}
            historicalData={historicalData?.data}
            metricKey="newPosts"
          />
          <MetricCard
            title="New Comments"
            value={statistics.newComments}
            icon={
              <LuMessageSquare
                className="h-5 w-5"
                style={{ color: "#F59E0B" }}
              />
            }
            color="#F59E0B"
            period={selectedPeriod}
            historicalData={historicalData?.data}
            metricKey="newComments"
          />
          <MetricCard
            title="Reactions"
            value={statistics.reactions}
            icon={<LuHeart className="h-5 w-5" style={{ color: "#EF4444" }} />}
            color="#EF4444"
            period={selectedPeriod}
            historicalData={historicalData?.data}
            metricKey="reactions"
          />
        </div>
      </div>
    </div>
  );
}
