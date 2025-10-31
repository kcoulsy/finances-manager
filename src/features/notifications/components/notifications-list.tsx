"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";

import { Button } from "@/features/shared/components/ui/button";
import { Separator } from "@/features/shared/components/ui/separator";
import { markNotificationReadAction } from "../actions/mark-notification-read.action";
import { markAllNotificationsReadAction } from "../actions/mark-all-notifications-read.action";
import { cn } from "@/features/shared/lib/utils/index";

interface Notification {
  id: string;
  title: string;
  subtitle?: string | null;
  detail?: string | null;
  link?: string | null;
  read: boolean;
  createdAt: Date;
}

interface NotificationsListProps {
  initialNotifications: Notification[];
  initialUnreadCount: number;
  highlightNotificationId?: string;
}

export function NotificationsList({
  initialNotifications,
  initialUnreadCount,
  highlightNotificationId,
}: NotificationsListProps) {
  const router = useRouter();
  const [notifications, setNotifications] = React.useState(initialNotifications);
  const [unreadCount, setUnreadCount] = React.useState(initialUnreadCount);
  const notificationRefs = React.useRef<Record<string, HTMLDivElement | null>>({});

  // Scroll to highlighted notification on mount
  React.useEffect(() => {
    if (highlightNotificationId) {
      // Wait a bit for the DOM to render
      setTimeout(() => {
        const element = notificationRefs.current[highlightNotificationId];
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
          // Add a temporary highlight effect
          element.classList.add("ring-2", "ring-primary", "ring-offset-2");
          setTimeout(() => {
            element.classList.remove("ring-2", "ring-primary", "ring-offset-2");
          }, 2000);
        }
      }, 100);
    }
  }, [highlightNotificationId]);

  const handleMarkAsRead = async (notificationId: string) => {
    const result = await markNotificationReadAction({ notificationId });

    if (result?.data?.success) {
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, read: true } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      router.refresh();
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read if not already read
    if (!notification.read) {
      await handleMarkAsRead(notification.id);
    }

    // Navigate to link if it exists
    if (notification.link) {
      router.push(notification.link);
    }
  };

  const handleMarkAllAsRead = async () => {
    const result = await markAllNotificationsReadAction({});

    if (result?.data?.success) {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
      router.refresh();
    }
  };

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border p-12 text-center">
        <p className="text-lg font-medium text-muted-foreground">
          No notifications yet
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          When you receive notifications, they'll appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {unreadCount > 0 && (
        <div className="flex items-center justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllAsRead}
          >
            Mark all as read
          </Button>
        </div>
      )}
      <div className="rounded-lg border divide-y">
        {notifications.map((notification) => {
          const isHighlighted = highlightNotificationId === notification.id;
          const NotificationContent = (
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-2">
                <div className="flex items-start gap-2">
                  {!notification.read && (
                    <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                  )}
                  <div className="flex-1">
                    <h3 className={cn(
                      "text-base font-semibold",
                      !notification.read && "text-foreground"
                    )}>
                      {notification.title}
                    </h3>
                  </div>
                </div>
                {notification.subtitle && (
                  <p className="text-sm text-muted-foreground">
                    {notification.subtitle}
                  </p>
                )}
                {notification.detail && (
                  <div className="prose prose-sm max-w-none text-sm text-muted-foreground">
                    <ReactMarkdown>{notification.detail}</ReactMarkdown>
                  </div>
                )}
                {notification.link && (
                  <p className="text-sm text-primary font-medium">Click to view →</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {new Date(notification.createdAt).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              {!notification.read && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMarkAsRead(notification.id);
                  }}
                >
                  Mark as read
                </Button>
              )}
            </div>
          );

          const containerClassName = cn(
            "p-6 transition-colors hover:bg-accent",
            !notification.read && "bg-accent/50",
            isHighlighted && "bg-primary/10"
          );

          return notification.link ? (
            <Link
              key={notification.id}
              href={notification.link}
              ref={(el) => {
                notificationRefs.current[notification.id] = el;
              }}
              onClick={async (e) => {
                if (!notification.read) {
                  e.preventDefault();
                  await handleNotificationClick(notification);
                }
              }}
              className={cn(
                containerClassName,
                "block focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              )}
            >
              {NotificationContent}
            </Link>
          ) : (
            <div
              key={notification.id}
              ref={(el) => {
                notificationRefs.current[notification.id] = el;
              }}
              className={containerClassName}
            >
              {NotificationContent}
            </div>
          );
        })}
      </div>
    </div>
  );
}

