"use client";

import {
  AlertCircle,
  ChevronLeft,
  Eye,
  EyeOff,
  Mail,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw,
  Search,
  Send,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/features/shared/components/ui/button";
import { Input } from "@/features/shared/components/ui/input";
import { useDebounce } from "@/features/shared/hooks/use-debounce";
import { useActionWithToast } from "@/features/shared/lib/actions/use-action-with-toast";
import { sanitizeHtml } from "@/features/shared/lib/utils/sanitize-html";
import { getEmailLogAction } from "../actions/get-email-log.action";
import { getEmailLogStatsAction } from "../actions/get-email-log-stats.action";
import { listEmailLogsAction } from "../actions/list-email-logs.action";
import { resendEmailAction } from "../actions/resend-email.action";
import { sendTestEmailAction } from "../actions/send-test-email.action";

type EmailLogRead = {
  id: string;
  readAt: string;
  ipAddress: string | null;
  browser: string | null;
  operatingSystem: string | null;
};

type EmailLog = {
  id: string;
  recipientEmail: string;
  recipientUserId: string | null;
  recipientDisplayName: string;
  senderEmail: string;
  senderUserId: string | null;
  senderDisplayName: string;
  subject: string;
  content: string;
  status: "SENT" | "DELIVERED" | "BOUNCED" | "FAILED";
  mailType: string | null;
  mailClass: string | null;
  isResend: boolean;
  originalEmailLogId: string | null;
  errorMessage: string | null;
  sentAt: string;
  deliveredAt: string | null;
  readCount: number;
  isRead: boolean;
  reads?: EmailLogRead[];
  originalEmailLog?: {
    id: string;
    subject: string;
    sentAt: string;
  } | null;
  resendCount: number;
};

type EmailLogStats = {
  totalEmails: number;
  emailsToday: number;
  emailsThisWeek: number;
  emailsThisMonth: number;
  readRate: number;
  statusCounts: Record<string, number>;
  mailTypeCounts: Record<string, number>;
};

export function EmailLogsPageClient() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedEmailLogId, setSelectedEmailLogId] = useState<string | null>(
    null,
  );
  const [selectedEmailLog, setSelectedEmailLog] = useState<EmailLog | null>(
    null,
  );

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [mailTypeFilter, setMailTypeFilter] = useState<string>("");
  const [readStatusFilter, setReadStatusFilter] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  const debouncedSearch = useDebounce(search, 300);

  // Load more pagination
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<EmailLogStats | null>(null);

  // Track if we're resetting
  const resetRef = useRef(false);
  // Track cursor to avoid recreating loadEmailLogs callback when cursor changes
  const cursorRef = useRef<string | undefined>(undefined);

  // Actions
  const { execute: executeListLogs } = useActionWithToast(listEmailLogsAction, {
    onSuccess: ({ data }) => {
      if (
        data &&
        typeof data === "object" &&
        "success" in data &&
        data.success === true &&
        "emailLogs" in data &&
        "pagination" in data &&
        Array.isArray(data.emailLogs)
      ) {
        if (resetRef.current) {
          // Reset mode
          setEmailLogs(data.emailLogs);
          resetRef.current = false;
        } else {
          // Load more mode
          setEmailLogs((prev) => [...prev, ...(data.emailLogs as EmailLog[])]);
        }
        const pagination = data.pagination as {
          nextCursor?: string;
          hasMore?: boolean;
          totalCount?: number;
        };
        const nextCursor = pagination.nextCursor;
        cursorRef.current = nextCursor;
        setHasMore(pagination.hasMore || false);
        setTotalCount(pagination.totalCount || 0);
      }
      setIsLoading(false);
    },
    onError: () => {
      setIsLoading(false);
    },
  });
  const { execute: executeGetLog } = useActionWithToast(getEmailLogAction, {
    onSuccess: ({ data }) => {
      if (
        data &&
        typeof data === "object" &&
        "success" in data &&
        data.success === true &&
        "emailLog" in data
      ) {
        setSelectedEmailLog(data.emailLog as EmailLog);
      }
    },
  });
  const { execute: executeResend, status: resendStatus } =
    useActionWithToast(resendEmailAction);
  const { execute: executeSendTest, status: testStatus } =
    useActionWithToast(sendTestEmailAction);
  const { execute: executeGetStats } = useActionWithToast(
    getEmailLogStatsAction,
    {
      onSuccess: ({ data }) => {
        if (
          data &&
          typeof data === "object" &&
          "success" in data &&
          data.success === true &&
          "stats" in data
        ) {
          setStats(data.stats as EmailLogStats);
        }
      },
    },
  );

  // Load email logs
  const loadEmailLogs = useCallback(
    (reset = false) => {
      setIsLoading(true);
      resetRef.current = reset;
      if (reset) {
        cursorRef.current = undefined;
        setHasMore(true);
      }
      executeListLogs({
        search: debouncedSearch || undefined,
        status: statusFilter || undefined,
        mailType: mailTypeFilter || undefined,
        readStatus: readStatusFilter || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        sortBy: "sentAt",
        sortDirection: "desc",
        cursor: reset ? undefined : cursorRef.current,
        limit: 20,
      });
    },
    [
      debouncedSearch,
      statusFilter,
      mailTypeFilter,
      readStatusFilter,
      dateFrom,
      dateTo,
      executeListLogs,
    ],
  );

  // Load stats
  const loadStats = useCallback(() => {
    executeGetStats({});
  }, [executeGetStats]);

  // Load email log details
  const loadEmailLogDetails = useCallback(
    (emailLogId: string) => {
      executeGetLog({ emailLogId });
    },
    [executeGetLog],
  );

  // Initial load - reload when filters change
  // loadEmailLogs and loadStats are wrapped in useCallback with filter dependencies
  // so they change when filters change, triggering this effect
  useEffect(() => {
    loadEmailLogs(true);
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadEmailLogs, loadStats]);

  // Load more
  const handleLoadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      loadEmailLogs(false);
    }
  }, [isLoading, hasMore, loadEmailLogs]);

  // Select email log
  const handleSelectEmailLog = useCallback(
    (emailLogId: string) => {
      setSelectedEmailLogId(emailLogId);
      loadEmailLogDetails(emailLogId);
    },
    [loadEmailLogDetails],
  );

  // Close email details
  const handleCloseEmailDetails = useCallback(() => {
    setSelectedEmailLogId(null);
    setSelectedEmailLog(null);
  }, []);

  // Sanitize email content to prevent XSS attacks
  const sanitizedContent = useMemo(() => {
    if (!selectedEmailLog?.content) {
      return "";
    }
    return sanitizeHtml(selectedEmailLog.content);
  }, [selectedEmailLog?.content]);

  // Refresh list
  const handleRefresh = useCallback(() => {
    cursorRef.current = undefined;
    setHasMore(true);
    loadEmailLogs(true);
    loadStats();
  }, [loadEmailLogs, loadStats]);

  // Clear filters
  const handleClearFilters = useCallback(() => {
    setSearch("");
    setStatusFilter("");
    setMailTypeFilter("");
    setReadStatusFilter("");
    setDateFrom("");
    setDateTo("");
  }, []);

  // Resend email
  const handleResendEmail = useCallback(
    (emailLogId: string) => {
      executeResend({ emailLogId });
      // Refresh after a short delay to allow resend to complete
      setTimeout(() => {
        handleRefresh();
      }, 1000);
    },
    [executeResend, handleRefresh],
  );

  // Send test email
  const handleSendTestEmail = useCallback(() => {
    executeSendTest({});
    // Refresh after a short delay to allow send to complete
    setTimeout(() => {
      handleRefresh();
    }, 1000);
  }, [executeSendTest, handleRefresh]);

  const hasActiveFilters =
    search ||
    statusFilter ||
    mailTypeFilter ||
    readStatusFilter ||
    dateFrom ||
    dateTo;

  return (
    <div className="flex h-[calc(100vh-14rem)] bg-gray-50">
      {/* Left Sidebar */}
      {!sidebarCollapsed && !selectedEmailLogId && (
        <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-full transition-all duration-300 overflow-hidden">
          {/* Sidebar Header */}
          <div className="p-2 border-b border-gray-200 shrink-0">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">Filters</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSidebarCollapsed(true)}
                title="Hide sidebar"
              >
                <PanelLeftClose className="w-3 h-3" />
                <span className="hidden sm:inline ml-1">Hide</span>
              </Button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="p-2 border-b border-gray-200 shrink-0">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400" />
              <Input
                placeholder="Search emails..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-8 text-sm"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Scrollable Sidebar Content */}
          <div className="flex-1 overflow-y-auto">
            {/* Statistics */}
            {stats && (
              <div className="p-2 border-b border-gray-200">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Statistics
                </h3>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Total Emails:</span>
                    <span className="font-medium">{stats.totalEmails}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Today:</span>
                    <span className="font-medium">{stats.emailsToday}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">This Week:</span>
                    <span className="font-medium">{stats.emailsThisWeek}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">This Month:</span>
                    <span className="font-medium">{stats.emailsThisMonth}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Read Rate:</span>
                    <span className="font-medium">{stats.readRate}%</span>
                  </div>
                </div>
              </div>
            )}

            {/* Status Filter */}
            <div className="p-2 border-b border-gray-200">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Status
              </h3>
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => setStatusFilter("")}
                  className={`w-full text-left px-2 py-1 rounded hover:bg-gray-100 transition-colors text-xs ${
                    statusFilter === ""
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>All Statuses</span>
                    <span className="text-gray-500">
                      {stats?.totalEmails || 0}
                    </span>
                  </div>
                </button>
                {stats?.statusCounts &&
                  Object.entries(stats.statusCounts).map(([status, count]) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setStatusFilter(status)}
                      className={`w-full text-left px-2 py-1 rounded hover:bg-gray-100 transition-colors text-xs ${
                        statusFilter === status
                          ? "bg-blue-50 text-blue-700"
                          : "text-gray-700"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-2 h-2 rounded-full ${
                              status === "SENT"
                                ? "bg-blue-500"
                                : status === "DELIVERED"
                                  ? "bg-green-500"
                                  : status === "BOUNCED"
                                    ? "bg-red-500"
                                    : status === "FAILED"
                                      ? "bg-orange-500"
                                      : "bg-gray-500"
                            }`}
                          />
                          <span className="capitalize">
                            {status.toLowerCase()}
                          </span>
                        </div>
                        <span className="text-gray-500">{count}</span>
                      </div>
                    </button>
                  ))}
              </div>
            </div>

            {/* Mail Type Filter */}
            {stats?.mailTypeCounts &&
              Object.keys(stats.mailTypeCounts).length > 0 && (
                <div className="p-2 border-b border-gray-200">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Mail Types
                  </h3>
                  <div className="space-y-1">
                    <button
                      type="button"
                      onClick={() => setMailTypeFilter("")}
                      className={`w-full text-left px-2 py-1 rounded hover:bg-gray-100 transition-colors text-xs ${
                        mailTypeFilter === ""
                          ? "bg-blue-50 text-blue-700"
                          : "text-gray-700"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>All Types</span>
                        <span className="text-gray-500">
                          {Object.values(stats.mailTypeCounts).reduce(
                            (a, b) => a + b,
                            0,
                          )}
                        </span>
                      </div>
                    </button>
                    {Object.entries(stats.mailTypeCounts).map(
                      ([type, count]) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setMailTypeFilter(type)}
                          className={`w-full text-left px-2 py-1 rounded hover:bg-gray-100 transition-colors text-xs ${
                            mailTypeFilter === type
                              ? "bg-blue-50 text-blue-700"
                              : "text-gray-700"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="capitalize">{type}</span>
                            <span className="text-gray-500">{count}</span>
                          </div>
                        </button>
                      ),
                    )}
                  </div>
                </div>
              )}

            {/* Read Status Filter */}
            <div className="p-2 border-b border-gray-200">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Read Status
              </h3>
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => setReadStatusFilter("")}
                  className={`w-full text-left px-2 py-1 rounded hover:bg-gray-100 transition-colors text-xs ${
                    readStatusFilter === ""
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-700"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Mail className="w-3 h-3 text-gray-600" />
                    <span>All</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setReadStatusFilter("read")}
                  className={`w-full text-left px-2 py-1 rounded hover:bg-gray-100 transition-colors text-xs ${
                    readStatusFilter === "read"
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-700"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Eye className="w-3 h-3 text-green-600" />
                    <span>Read</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setReadStatusFilter("unread")}
                  className={`w-full text-left px-2 py-1 rounded hover:bg-gray-100 transition-colors text-xs ${
                    readStatusFilter === "unread"
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-700"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <EyeOff className="w-3 h-3 text-orange-600" />
                    <span>Unread</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Date Range Filter */}
            <div className="p-2 border-b border-gray-200">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Date Range
              </h3>
              <div className="space-y-2">
                <div>
                  <label
                    htmlFor="date-from"
                    className="block text-xs text-gray-600 mb-1"
                  >
                    From
                  </label>
                  <input
                    id="date-from"
                    type="datetime-local"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label
                    htmlFor="date-to"
                    className="block text-xs text-gray-600 mb-1"
                  >
                    To
                  </label>
                  <input
                    id="date-to"
                    type="datetime-local"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                {(dateFrom || dateTo) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setDateFrom("");
                      setDateTo("");
                    }}
                    className="w-full text-xs"
                  >
                    Clear Date Range
                  </Button>
                )}
              </div>
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <div className="p-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFilters}
                  className="w-full"
                >
                  Clear All Filters
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full">
        {/* Content Header */}
        {!selectedEmailLogId && (
          <div className="bg-white border-b border-gray-200 p-4 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {sidebarCollapsed && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSidebarCollapsed(false)}
                    title="Show sidebar"
                  >
                    <PanelLeftOpen className="w-4 h-4 mr-2" />
                    Show Sidebar
                  </Button>
                )}
                <div>
                  <p className="text-sm text-gray-500 mt-1">
                    {search
                      ? `Search results for "${search}" (${totalCount.toLocaleString()} emails)`
                      : statusFilter
                        ? `${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1).toLowerCase()} emails (${totalCount.toLocaleString()} total)`
                        : mailTypeFilter
                          ? `${mailTypeFilter.charAt(0).toUpperCase() + mailTypeFilter.slice(1)} emails (${totalCount.toLocaleString()} total)`
                          : readStatusFilter
                            ? `${readStatusFilter === "read" ? "Read" : "Unread"} emails (${totalCount.toLocaleString()} total)`
                            : dateFrom || dateTo
                              ? `Filtered emails (${totalCount.toLocaleString()} total)`
                              : `All email logs (${totalCount.toLocaleString()} total)`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isLoading}
                >
                  <RefreshCw
                    className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
                  />
                  Refresh
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSendTestEmail}
                  disabled={testStatus === "executing"}
                  className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {testStatus === "executing"
                    ? "Sending..."
                    : "Send Test Email"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Email Logs List */}
        {!selectedEmailLogId && (
          <div className="flex-1 overflow-y-auto p-4">
            {emailLogs.length > 0 ? (
              <div className="space-y-3">
                {emailLogs.map((emailLog) => (
                  <button
                    key={emailLog.id}
                    type="button"
                    onClick={() => handleSelectEmailLog(emailLog.id)}
                    className={`w-full text-left bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow cursor-pointer hover:border-blue-300 ${
                      selectedEmailLogId === emailLog.id
                        ? "border-blue-500 bg-blue-50"
                        : !emailLog.isRead
                          ? "bg-gray-50 border-gray-300"
                          : ""
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3
                            className={`text-sm font-medium truncate ${
                              !emailLog.isRead ? "font-semibold" : ""
                            } text-gray-900`}
                          >
                            {emailLog.subject}
                          </h3>
                          {emailLog.isResend && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                              <RefreshCw className="w-3 h-3 mr-1" />
                              Resent
                            </span>
                          )}
                          <div className="flex items-center gap-1">
                            <div
                              className={`w-2 h-2 rounded-full ${
                                emailLog.status === "SENT"
                                  ? "bg-blue-500"
                                  : emailLog.status === "DELIVERED"
                                    ? "bg-green-500"
                                    : emailLog.status === "BOUNCED"
                                      ? "bg-red-500"
                                      : emailLog.status === "FAILED"
                                        ? "bg-orange-500"
                                        : "bg-gray-500"
                              }`}
                            />
                            <span className="text-xs text-gray-500 capitalize">
                              {emailLog.status.toLowerCase()}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-gray-600 mb-2">
                          <div className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            <span>To: {emailLog.recipientDisplayName}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span>From: {emailLog.senderDisplayName}</span>
                          </div>
                          {emailLog.mailType && (
                            <div className="flex items-center gap-1">
                              <span className="capitalize">
                                {emailLog.mailType}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>
                            {new Date(emailLog.sentAt).toLocaleString()}
                          </span>
                          {emailLog.isRead ? (
                            <div className="flex items-center gap-1 text-green-600">
                              <Eye className="w-3 h-3" />
                              <span>Read ({emailLog.readCount}x)</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-gray-400">
                              <EyeOff className="w-3 h-3" />
                              <span>Unread</span>
                            </div>
                          )}
                          {emailLog.errorMessage && (
                            <div className="flex items-center gap-1 text-red-600">
                              <AlertCircle className="w-3 h-3" />
                              <span>Error</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {emailLog.errorMessage && (
                      <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-800">
                        <strong>Error:</strong> {emailLog.errorMessage}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Mail className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No email logs found
                </h3>
                <p className="text-sm text-gray-500">
                  Try adjusting your search or filters to find what you're
                  looking for.
                </p>
              </div>
            )}

            {/* Load More Button */}
            {hasMore && emailLogs.length > 0 && (
              <div className="mt-6 text-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLoadMore}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <span className="mr-2">+</span>
                      Load More Emails
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Email Details Panel */}
        {selectedEmailLogId && selectedEmailLog && (
          <div className="flex-1 flex flex-col bg-white">
            <div className="h-full flex flex-col">
              {/* Header */}
              <div className="p-4 border-b border-gray-200 bg-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleCloseEmailDetails}
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </Button>
                    <h2 className="text-lg font-semibold text-gray-900">
                      Email Details
                    </h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleResendEmail(selectedEmailLog.id)}
                      disabled={resendStatus === "executing"}
                      className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                    >
                      <RefreshCw
                        className={`w-4 h-4 mr-2 ${
                          resendStatus === "executing" ? "animate-spin" : ""
                        }`}
                      />
                      {resendStatus === "executing" ? "Sending..." : "Resend"}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto">
                {/* Email Header Info */}
                <div className="p-6 border-b border-gray-200">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left Column - Email Details */}
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                          {selectedEmailLog.subject}
                        </h3>
                        <div className="flex items-center gap-2 mb-2">
                          <div
                            className={`w-3 h-3 rounded-full ${
                              selectedEmailLog.status === "SENT"
                                ? "bg-blue-500"
                                : selectedEmailLog.status === "DELIVERED"
                                  ? "bg-green-500"
                                  : selectedEmailLog.status === "BOUNCED"
                                    ? "bg-red-500"
                                    : selectedEmailLog.status === "FAILED"
                                      ? "bg-orange-500"
                                      : "bg-gray-500"
                            }`}
                          />
                          <span className="text-sm font-medium text-gray-700 capitalize">
                            {selectedEmailLog.status.toLowerCase()}
                          </span>
                          {selectedEmailLog.isResend && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                              <RefreshCw className="w-3 h-3 mr-1" />
                              Resent
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Recipient Info */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-gray-900 mb-3">
                          To
                        </h4>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-blue-700">
                              {selectedEmailLog.recipientDisplayName
                                .substring(0, 2)
                                .toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">
                              {selectedEmailLog.recipientDisplayName}
                            </p>
                            <p className="text-xs text-gray-500">
                              {selectedEmailLog.recipientEmail}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Sender Info */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-gray-900 mb-3">
                          From
                        </h4>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-green-700">
                              {selectedEmailLog.senderDisplayName
                                .substring(0, 2)
                                .toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">
                              {selectedEmailLog.senderDisplayName}
                            </p>
                            <p className="text-xs text-gray-500">
                              {selectedEmailLog.senderEmail}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Column - Log Details */}
                    <div className="space-y-4">
                      {/* Email Metadata */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-gray-900 mb-3">
                          Email Information
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-500">ID:</span>
                            <span className="font-medium">
                              {selectedEmailLog.id}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Sent:</span>
                            <span className="font-medium">
                              {new Date(
                                selectedEmailLog.sentAt,
                              ).toLocaleString()}
                            </span>
                          </div>
                          {selectedEmailLog.deliveredAt && (
                            <div className="flex justify-between">
                              <span className="text-gray-500">Delivered:</span>
                              <span className="font-medium">
                                {new Date(
                                  selectedEmailLog.deliveredAt,
                                ).toLocaleString()}
                              </span>
                            </div>
                          )}
                          {selectedEmailLog.mailType && (
                            <div className="flex justify-between">
                              <span className="text-gray-500">Type:</span>
                              <span className="font-medium capitalize">
                                {selectedEmailLog.mailType}
                              </span>
                            </div>
                          )}
                          {selectedEmailLog.mailClass && (
                            <div className="flex justify-between">
                              <span className="text-gray-500">Class:</span>
                              <span className="font-medium text-xs">
                                {selectedEmailLog.mailClass}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Read Tracking */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-gray-900 mb-3">
                          Read Tracking
                        </h4>
                        {selectedEmailLog.readCount > 0 &&
                        selectedEmailLog.reads &&
                        selectedEmailLog.reads.length > 0 ? (
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-500">Times Read:</span>
                              <span className="font-medium text-green-600">
                                {selectedEmailLog.readCount}
                              </span>
                            </div>
                            <div className="space-y-2 mt-3">
                              {selectedEmailLog.reads.map((read) => (
                                <div
                                  key={read.id}
                                  className="text-xs text-gray-600 bg-white rounded p-2"
                                >
                                  <div className="flex justify-between mb-1">
                                    <span className="font-medium">
                                      {new Date(read.readAt).toLocaleString()}
                                    </span>
                                    {read.ipAddress && (
                                      <span className="text-gray-500">
                                        {read.ipAddress}
                                      </span>
                                    )}
                                  </div>
                                  {(read.browser || read.operatingSystem) && (
                                    <div className="text-gray-500 mt-1">
                                      {read.browser && read.operatingSystem
                                        ? `${read.browser} on ${read.operatingSystem}`
                                        : read.browser || read.operatingSystem}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <EyeOff className="w-4 h-4" />
                            <span>Not read yet</span>
                          </div>
                        )}
                      </div>

                      {/* Error Message */}
                      {selectedEmailLog.errorMessage && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                          <h4 className="text-sm font-medium text-red-900 mb-2">
                            Error Details
                          </h4>
                          <p className="text-sm text-red-800">
                            {selectedEmailLog.errorMessage}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Email Body */}
                <div className="p-6">
                  <div
                    // biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized with DOMPurify
                    dangerouslySetInnerHTML={{
                      __html: sanitizedContent,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
