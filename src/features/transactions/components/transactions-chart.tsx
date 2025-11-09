"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Calendar, CalendarIcon } from "lucide-react";
import { Button } from "@/features/shared/components/ui/button";
import { Input } from "@/features/shared/components/ui/input";
import { formatCurrency } from "@/features/shared/lib/utils/format-currency";
import { useQuery } from "@tanstack/react-query";
import { getAllAccountsBalanceHistoryAction } from "../actions/get-all-accounts-balance-history.action";
import { useAccounts } from "@/features/accounts/hooks/use-accounts";
import { Skeleton } from "@/features/shared/components/ui/skeleton";
import { cn } from "@/features/shared/lib/utils/index";

interface TransactionsChartProps {
  defaultCurrency?: string;
  onDateRangeChange?: (startDate: Date | null, endDate: Date | null) => void;
}

type TimeFrame = "7d" | "30d" | "6m" | "1y" | "lifetime";

export function TransactionsChart({
  defaultCurrency = "USD",
  onDateRangeChange,
}: TransactionsChartProps) {
  const { data: accounts = [] } = useAccounts();
  const [startDate, setStartDate] = useState<Date | null>(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date;
  });
  const [endDate, setEndDate] = useState<Date | null>(() => new Date());
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<number | null>(null);
  const [dragEnd, setDragEnd] = useState<number | null>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  // Query for balance history
  const { data: chartData, isLoading } = useQuery({
    queryKey: ["all-accounts-balance-history", startDate, endDate],
    queryFn: async () => {
      const result = await getAllAccountsBalanceHistoryAction({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      if (result?.serverError) {
        throw new Error(result.serverError);
      }
      if (!result?.data?.success) {
        throw new Error("Failed to fetch balance history");
      }
      return result.data;
    },
    enabled: !!startDate && !!endDate,
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

      // Add each account's balance
      accounts.forEach((account) => {
        dataPoint[account.id] = point.accounts[account.id] ?? null;
      });

      return dataPoint;
    });
  }, [chartData, accounts]);

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
      accounts.forEach((account) => {
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
  }, [chartDataPoints, accounts, trendData]);

  const handleTimeFrameSelect = (timeFrame: TimeFrame) => {
    const end = new Date();
    const start = new Date();

    switch (timeFrame) {
      case "7d":
        start.setDate(end.getDate() - 7);
        break;
      case "30d":
        start.setDate(end.getDate() - 30);
        break;
      case "6m":
        start.setMonth(end.getMonth() - 6);
        break;
      case "1y":
        start.setFullYear(end.getFullYear() - 1);
        break;
      case "lifetime":
        setStartDate(null);
        setEndDate(null);
        return;
    }

    setStartDate(start);
    setEndDate(end);
  };

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!chartContainerRef.current) return;
      const rect = chartContainerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      setIsDragging(true);
      setDragStart(x);
      setDragEnd(x);
    },
    [],
  );

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
        const newStartDate = new Date(chartDataPoints[startIndex].date as string);
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
  }, [isDragging, dragStart, dragEnd, chartDataPoints, onDateRangeChange]);

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
    return accounts.reduce(
      (acc, account, index) => {
        acc[account.id] = colors[index % colors.length];
        return acc;
      },
      {} as Record<string, string>,
    );
  }, [accounts]);

  const formatStartDate = startDate
    ? startDate.toISOString().split("T")[0]
    : "";
  const formatEndDate = endDate ? endDate.toISOString().split("T")[0] : "";

  if (isLoading) {
    return <Skeleton className="h-[300px] w-full" />;
  }

  return (
    <div className="space-y-4 rounded-lg border bg-card p-6">
      {/* Date Range Controls */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          <Input
            type="date"
            value={formatStartDate}
            onChange={(e) => {
              const date = e.target.value ? new Date(e.target.value) : null;
              setStartDate(date);
              if (date && onDateRangeChange) {
                onDateRangeChange(date, endDate);
              }
            }}
            className="w-40"
          />
          <span className="text-muted-foreground">to</span>
          <Input
            type="date"
            value={formatEndDate}
            onChange={(e) => {
              const date = e.target.value ? new Date(e.target.value) : null;
              setEndDate(date);
              if (startDate && date && onDateRangeChange) {
                onDateRangeChange(startDate, date);
              }
            }}
            className="w-40"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleTimeFrameSelect("7d")}
            className={cn(
              startDate &&
                endDate &&
                Math.abs(
                  (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24) -
                    7,
                ) < 1
                ? "bg-primary text-primary-foreground"
                : "",
            )}
          >
            7 days
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleTimeFrameSelect("30d")}
            className={cn(
              startDate &&
                endDate &&
                Math.abs(
                  (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24) -
                    30,
                ) < 1
                ? "bg-primary text-primary-foreground"
                : "",
            )}
          >
            30 days
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleTimeFrameSelect("6m")}
          >
            6 months
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleTimeFrameSelect("1y")}
          >
            1 year
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleTimeFrameSelect("lifetime")}
            className={cn(
              !startDate && !endDate
                ? "bg-primary text-primary-foreground"
                : "",
            )}
          >
            Lifetime
          </Button>
        </div>
      </div>

      {/* Chart */}
      <div
        ref={chartContainerRef}
        className="relative"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: isDragging ? "grabbing" : "grab" }}
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
                if (value >= 1000000) {
                  return `$${(value / 1000000).toFixed(1)}M`;
                }
                if (value >= 1000) {
                  return `$${(value / 1000).toFixed(1)}K`;
                }
                return formatCurrency(value, defaultCurrency);
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "0.5rem",
              }}
              formatter={(value: number) => formatCurrency(value, defaultCurrency)}
              labelFormatter={(label) => {
                const date = new Date(label);
                return date.toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                });
              }}
            />
            <Legend />

            {/* Overall line */}
            <Line
              type="monotone"
              dataKey="overall"
              stroke="#000000"
              strokeWidth={3}
              dot={false}
              name="Overall"
              strokeDasharray="5 5"
            />

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
            {accounts.map((account) => (
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
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

