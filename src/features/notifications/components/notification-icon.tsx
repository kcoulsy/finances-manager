"use client";

import * as React from "react";
import { Bell } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/features/shared/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/features/shared/components/ui/popover";
import { Separator } from "@/features/shared/components/ui/separator";
import { getNotificationsAction } from "../actions/get-notifications.action";
import { markNotificationReadAction } from "../actions/mark-notification-read.action";
import { markAllNotificationsReadAction } from "../actions/mark-all-notifications-read.action";
import { cn } from "@/features/shared/lib/utils/index";

declare global {
  interface Window {
    __refreshNotificationCount?: () => void;
  }
}

interface Notification {
  id: string;
  title: string;
  subtitle?: string | null;
  detail?: string | null;
  link?: string | null;
  read: boolean;
  createdAt: Date;
}

export function NotificationIcon() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(true);

  const fetchNotifications = React.useCallback(async () => {
    setIsLoading(true);
    const result = await getNotificationsAction({
      limit: 10,
      offset: 0,
      unreadOnly: false,
    });

    if (result?.data?.success) {
      setNotifications(result.data.notifications);
      setUnreadCount(result.data.unreadCount);
    }
    setIsLoading(false);
  }, []);

  // Function to fetch unread count
  const fetchUnreadCount = React.useCallback(async () => {
    const result = await getNotificationsAction({
      limit: 1,
      offset: 0,
      unreadOnly: true,
    });

    if (result?.data?.success) {
      setUnreadCount(result.data.unreadCount);
    }
  }, []);

  // Fetch unread count on mount
  React.useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  // Expose refresh function via window (for direct access after router.refresh())
  React.useEffect(() => {
    const handleRefresh = () => {
      // Small delay to ensure router.refresh() has completed
      setTimeout(() => {
        fetchUnreadCount();
      }, 100);
    };

    // Store refresh function on window for external access
    window.__refreshNotificationCount = handleRefresh;

    return () => {
      delete window.__refreshNotificationCount;
    };
  }, [fetchUnreadCount]);

  // Fetch full notifications when popover opens
  React.useEffect(() => {
    if (open) {
      fetchNotifications();
    }
  }, [open, fetchNotifications]);

  const handleMarkAsRead = async (notificationId: string) => {
    const result = await markNotificationReadAction({ notificationId });

    if (result?.data?.success) {
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, read: true } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read if not already read
    if (!notification.read) {
      await handleMarkAsRead(notification.id);
    }

    // Navigate to link if it exists
    if (notification.link) {
      setOpen(false);
      router.push(notification.link);
    }
  };

  const handleMarkAllAsRead = async () => {
    const result = await markAllNotificationsReadAction({});

    if (result?.data?.success) {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="h-auto px-2 py-1 text-xs"
            >
              Mark all as read
            </Button>
          )}
        </div>
        <Separator />
        <div className="max-h-[400px] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
              Loading...
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
              No notifications
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => {
                const notificationContent = (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 space-y-2">
                        <h4 className="text-sm font-medium leading-tight">{notification.title}</h4>
                        {notification.subtitle && (
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {notification.subtitle}
                          </p>
                        )}
                        {notification.link && (
                          <p className="text-xs text-primary">Click to view →</p>
                        )}
                        <div className="flex flex-col gap-2 pt-1">
                          <p className="text-xs text-muted-foreground">
                            {new Date(notification.createdAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                          <Link
                            href={`/notifications?id=${notification.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpen(false);
                            }}
                            className="text-xs text-primary hover:underline w-fit"
                          >
                            More details →
                          </Link>
                        </div>
                      </div>
                      {!notification.read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkAsRead(notification.id);
                          }}
                          className="h-auto px-2 py-1 text-xs"
                        >
                          Mark as read
                        </Button>
                      )}
                    </div>
                  </>
                );

                return notification.link ? (
                  <Link
                    key={notification.id}
                    href={notification.link}
                    onClick={async (e) => {
                      if (!notification.read) {
                        e.preventDefault();
                        await handleNotificationClick(notification);
                      }
                    }}
                    className={cn(
                      "block px-4 py-3 transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                      !notification.read && "bg-accent/50"
                    )}
                  >
                    {notificationContent}
                  </Link>
                ) : (
                  <div
                    key={notification.id}
                    className={cn(
                      "px-4 py-3 transition-colors hover:bg-accent",
                      !notification.read && "bg-accent/50"
                    )}
                  >
                    {notificationContent}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <Separator />
        <div className="p-2">
          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="text-sm text-primary hover:underline text-center block w-full py-2"
          >
            See all notifications
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}

