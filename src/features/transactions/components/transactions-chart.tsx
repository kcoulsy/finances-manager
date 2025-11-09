"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAccounts } from "@/features/accounts/hooks/use-accounts";
import { Skeleton } from "@/features/shared/components/ui/skeleton";
import { formatCurrency } from "@/features/shared/lib/utils/format-currency";
import { getAllAccountsBalanceHistoryAction } from "../actions/get-all-accounts-balance-history.action";

interface TransactionsChartProps {
  defaultCurrency?: string;
  startDate?: Date | null;
  endDate?: Date | null;
  accountId?: string | string[] | undefined;
  onDateRangeChange?: (startDate: Date | null, endDate: Date | null) => void;
}

// Custom tooltip component to ensure "Overall" appears at the bottom
interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    dataKey?: string;
    value?: number | null;
    name?: string;
    color?: string;
    payload?: Record<string, unknown>;
  }>;
  label?: string | number;
  defaultCurrency: string;
}

const CustomTooltip = ({
  active,
  payload,
  label,
  defaultCurrency,
}: CustomTooltipProps) => {
  if (!active || !payload || !payload.length) {
    return null;
  }

  // Get the actual date from the payload data (it has the full data point)
  const dataPoint = payload[0]?.payload as
    | { date?: string | Date; dateLabel?: string }
    | undefined;
  let formattedDate = label?.toString() || "";

  // If we have the date in the data point, use it to format with year
  if (dataPoint?.date) {
    try {
      const date =
        typeof dataPoint.date === "string"
          ? new Date(dataPoint.date)
          : dataPoint.date;
      if (!Number.isNaN(date.getTime())) {
        formattedDate = date.toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
      }
    } catch {
      // Fall back to label if date parsing fails
    }
  }

  // Separate "Overall" from other items
  const overallItem = payload.find((item) => item.dataKey === "overall");
  const otherItems = payload.filter((item) => item.dataKey !== "overall");

  // Sort other items to maintain order (trend first, then accounts)
  const sortedOtherItems = [...otherItems].sort((a, b) => {
    if (a.dataKey === "trend") return -1;
    if (b.dataKey === "trend") return 1;
    return 0;
  });

  // Combine: other items first, then Overall at the bottom
  const orderedPayload = [...sortedOtherItems];
  if (overallItem) {
    orderedPayload.push(overallItem);
  }

  return (
    <div className="rounded-lg border bg-white/90 p-3 shadow-lg">
      <p
        className="mb-2 font-semibold"
        style={{ color: "hsl(var(--popover-foreground))" }}
      >
        {formattedDate}
      </p>
      <div className="space-y-1">
        {orderedPayload.map((entry, index) => {
          if (!entry.value || entry.value === null) return null;
          return (
            <p
              key={`${entry.dataKey}-${index}`}
              className="text-sm"
              style={{
                color: entry.color || "hsl(var(--popover-foreground))",
              }}
            >
              <span
                className="inline-block w-3 h-3 mr-2 rounded-sm"
                style={{
                  backgroundColor: entry.color,
                }}
              />
              {entry.name}:{" "}
              {formatCurrency(entry.value as number, defaultCurrency)}
            </p>
          );
        })}
      </div>
    </div>
  );
};

export function TransactionsChart({
  defaultCurrency = "USD",
  startDate: propStartDate,
  endDate: propEndDate,
  accountId: propAccountId,
  onDateRangeChange,
}: TransactionsChartProps) {
  const { data: accounts = [] } = useAccounts();

  // Use props if provided, otherwise use internal state
  const [internalStartDate, setInternalStartDate] = useState<Date | null>(
    () => {
      const date = new Date();
      date.setDate(date.getDate() - 30);
      return date;
    },
  );
  const [internalEndDate, setInternalEndDate] = useState<Date | null>(
    () => new Date(),
  );

  const startDate =
    propStartDate !== undefined ? propStartDate : internalStartDate;
  const endDate = propEndDate !== undefined ? propEndDate : internalEndDate;

  const setStartDate = useCallback(
    (date: Date | null) => {
      if (propStartDate === undefined) {
        setInternalStartDate(date);
      }
      const currentEndDate =
        propEndDate !== undefined ? propEndDate : internalEndDate;
      onDateRangeChange?.(date, currentEndDate);
    },
    [propStartDate, propEndDate, internalEndDate, onDateRangeChange],
  );

  const setEndDate = useCallback(
    (date: Date | null) => {
      if (propEndDate === undefined) {
        setInternalEndDate(date);
      }
      const currentStartDate =
        propStartDate !== undefined ? propStartDate : internalStartDate;
      onDateRangeChange?.(currentStartDate, date);
    },
    [propStartDate, propEndDate, internalStartDate, onDateRangeChange],
  );
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<number | null>(null);
  const [dragEnd, setDragEnd] = useState<number | null>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  // Filter accounts based on accountId prop
  const filteredAccounts = useMemo(() => {
    if (!propAccountId) return accounts;

    const accountIds = Array.isArray(propAccountId)
      ? propAccountId
      : [propAccountId];
    return accounts.filter((account: { id: string }) =>
      accountIds.includes(account.id),
    );
  }, [accounts, propAccountId]);

  // Query for balance history - always use dates (default to last 30 days if not provided)
  const effectiveStartDate = useMemo(() => {
    if (startDate) return startDate;
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date;
  }, [startDate]);

  const effectiveEndDate = useMemo(() => {
    return endDate || new Date();
  }, [endDate]);

  const { data: chartData, isLoading } = useQuery({
    queryKey: [
      "all-accounts-balance-history",
      effectiveStartDate,
      effectiveEndDate,
      propAccountId,
    ],
    queryFn: async () => {
      const result = await getAllAccountsBalanceHistoryAction({
        startDate: effectiveStartDate,
        endDate: effectiveEndDate,
        accountId: propAccountId,
      });
      if (result?.serverError) {
        throw new Error(result.serverError);
      }
      if (!result?.data?.success) {
        throw new Error("Failed to fetch balance history");
      }
      return result.data;
    },
    enabled: true, // Always enabled, we have default dates
  });

  // Prepare chart data
  const chartDataPoints = useMemo(() => {
    if (!chartData?.combinedHistory) return [];

    return chartData.combinedHistory.map((point) => {
      const dataPoint: Record<string, unknown> = {
        date: point.date.toISOString(),
        dateLabel: point.date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        overall: point.overall,
      };

      // Add each account's balance (only for filtered accounts)
      filteredAccounts.forEach((account: { id: string }) => {
        dataPoint[account.id] = point.accounts[account.id] ?? null;
      });

      return dataPoint;
    });
  }, [chartData, filteredAccounts]);

  // Calculate trend line (simple linear regression)
  const trendData = useMemo(() => {
    if (chartDataPoints.length < 2) return [];

    const points = chartDataPoints.map((p, i) => ({
      x: i,
      y: p.overall as number,
    }));

    const n = points.length;
    const sumX = points.reduce((sum, p) => sum + p.x, 0);
    const sumY = points.reduce((sum, p) => sum + p.y, 0);
    const sumXY = points.reduce((sum, p) => sum + p.x * p.y, 0);
    const sumXX = points.reduce((sum, p) => sum + p.x * p.x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return chartDataPoints.map((_, i) => ({
      date: chartDataPoints[i].date,
      dateLabel: chartDataPoints[i].dateLabel,
      trend: slope * i + intercept,
    }));
  }, [chartDataPoints]);

  // Calculate Y-axis domain to include all values with padding
  const yAxisDomain = useMemo(() => {
    if (chartDataPoints.length === 0) return ["auto", "auto"];

    const allValues: number[] = [];

    // Collect all balance values (overall, accounts, trend)
    chartDataPoints.forEach((point) => {
      if (typeof point.overall === "number") {
        allValues.push(point.overall);
      }
      filteredAccounts.forEach((account: { id: string }) => {
        const value = point[account.id];
        if (typeof value === "number") {
          allValues.push(value);
        }
      });
    });

    // Add trend values
    if (trendData.length > 0) {
      trendData.forEach((point) => {
        if (typeof point.trend === "number") {
          allValues.push(point.trend);
        }
      });
    }

    if (allValues.length === 0) return ["auto", "auto"];

    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    const range = max - min;
    const padding = range * 0.1; // 10% padding on each side

    return [min - padding, max + padding];
  }, [chartDataPoints, filteredAccounts, trendData]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!chartContainerRef.current) return;
    const rect = chartContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    setIsDragging(true);
    setDragStart(x);
    setDragEnd(x);
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isDragging || !chartContainerRef.current || dragStart === null)
        return;
      const rect = chartContainerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      setDragEnd(x);
    },
    [isDragging, dragStart],
  );

  const handleMouseUp = useCallback(() => {
    if (!isDragging || dragStart === null || dragEnd === null) {
      setIsDragging(false);
      return;
    }

    // Convert pixel positions to dates
    if (chartDataPoints.length > 0 && chartContainerRef.current) {
      const rect = chartContainerRef.current.getBoundingClientRect();
      const width = rect.width;
      const startRatio = Math.min(dragStart, dragEnd) / width;
      const endRatio = Math.max(dragStart, dragEnd) / width;

      const startIndex = Math.floor(startRatio * chartDataPoints.length);
      const endIndex = Math.ceil(endRatio * chartDataPoints.length);

      if (startIndex < chartDataPoints.length && endIndex > 0) {
        const newStartDate = new Date(
          chartDataPoints[startIndex].date as string,
        );
        const newEndDate = new Date(
          chartDataPoints[Math.min(endIndex - 1, chartDataPoints.length - 1)]
            .date as string,
        );

        setStartDate(newStartDate);
        setEndDate(newEndDate);
        onDateRangeChange?.(newStartDate, newEndDate);
      }
    }

    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
  }, [
    isDragging,
    dragStart,
    dragEnd,
    chartDataPoints,
    setStartDate,
    setEndDate,
    onDateRangeChange,
  ]);

  // Generate colors for accounts
  const accountColors = useMemo(() => {
    const colors = [
      "#3b82f6", // blue
      "#10b981", // green
      "#f59e0b", // amber
      "#ef4444", // red
      "#8b5cf6", // purple
      "#ec4899", // pink
      "#06b6d4", // cyan
      "#84cc16", // lime
    ];
    return filteredAccounts.reduce(
      (acc: Record<string, string>, account: { id: string }, index: number) => {
        acc[account.id] = colors[index % colors.length];
        return acc;
      },
      {} as Record<string, string>,
    );
  }, [filteredAccounts]);

  if (isLoading) {
    return <Skeleton className="h-[300px] w-full" />;
  }

  return (
    <div className="space-y-4 rounded-lg border bg-card p-6">
      {/* Chart */}
      <div
        ref={chartContainerRef}
        className="relative"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: isDragging ? "grabbing" : "grab" }}
        role="application"
        aria-label="Interactive chart for selecting date range"
      >
        {isDragging && dragStart !== null && dragEnd !== null && (
          <div
            className="absolute top-0 bottom-0 bg-primary/20 border-2 border-primary pointer-events-none z-10"
            style={{
              left: `${Math.min(dragStart, dragEnd)}px`,
              width: `${Math.abs(dragEnd - dragStart)}px`,
            }}
          />
        )}

        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={chartDataPoints}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="dateLabel"
              className="text-xs"
              tick={{ fill: "currentColor" }}
            />
            <YAxis
              className="text-xs"
              tick={{ fill: "currentColor" }}
              domain={yAxisDomain}
              tickFormatter={(value) => {
                // Use formatCurrency for all values to respect currency setting
                return formatCurrency(value, defaultCurrency);
              }}
            />
            <Tooltip
              content={({ active, payload, label }) => (
                <CustomTooltip
                  active={active}
                  payload={payload}
                  label={label || ""}
                  defaultCurrency={defaultCurrency}
                />
              )}
            />
            <Legend />

            {/* Trend line */}
            <Line
              type="monotone"
              data={trendData}
              dataKey="trend"
              stroke="#888888"
              strokeWidth={2}
              dot={false}
              name="Trend"
              strokeDasharray="3 3"
            />

            {/* Individual account lines */}
            {filteredAccounts.map((account: { id: string; name: string }) => (
              <Line
                key={account.id}
                type="monotone"
                dataKey={account.id}
                stroke={accountColors[account.id]}
                strokeWidth={2}
                dot={false}
                name={account.name}
              />
            ))}

            {/* Overall line - placed last so it appears at bottom of legend/tooltip */}
            <Line
              type="monotone"
              dataKey="overall"
              stroke="#000000"
              strokeWidth={3}
              dot={false}
              name="Overall"
              strokeDasharray="5 5"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
