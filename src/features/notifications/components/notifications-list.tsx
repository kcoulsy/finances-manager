"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import ReactMarkdown from "react-markdown";

import { Button } from "@/features/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/features/shared/components/ui/dialog";
import { useActionWithToast } from "@/features/shared/lib/actions/use-action-with-toast";
import { cn } from "@/features/shared/lib/utils/index";
import { deleteAllNotificationsAction } from "../actions/delete-all-notifications.action";
import { getNotificationsAction } from "../actions/get-notifications.action";
import { markAllNotificationsReadAction } from "../actions/mark-all-notifications-read.action";
import { markNotificationReadAction } from "../actions/mark-notification-read.action";

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

const PAGE_SIZE = 20;

export function NotificationsList({
  initialNotifications,
  initialUnreadCount,
  highlightNotificationId,
}: NotificationsListProps) {
  const router = useRouter();
  const [notifications, setNotifications] =
    React.useState(initialNotifications);
  const [unreadCount, setUnreadCount] = React.useState(initialUnreadCount);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);
  const [hasMore, setHasMore] = React.useState(
    initialNotifications.length >= PAGE_SIZE,
  );
  const notificationRefs = React.useRef<
    Record<string, HTMLDivElement | HTMLAnchorElement | null>
  >({});

  const [showClearDialog, setShowClearDialog] = React.useState(false);

  const { execute: executeMarkAllRead, status: markAllReadStatus } =
    useActionWithToast(markAllNotificationsReadAction, {
      successToast: {
        message: "All notifications marked as read",
        type: "success",
        description: "All notifications have been marked as read.",
      },
      onSuccess: () => {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        setUnreadCount(0);
        router.refresh();
      },
    });

  const { execute: executeDeleteAll, status: deleteAllStatus } =
    useActionWithToast(deleteAllNotificationsAction, {
      successToast: {
        message: "All notifications deleted",
        type: "success",
        description: "All notifications have been permanently deleted.",
      },
      onSuccess: () => {
        setNotifications([]);
        setUnreadCount(0);
        setShowClearDialog(false);
        router.refresh();
      },
    });

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
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n)),
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
    await executeMarkAllRead({});
    // State updates are handled in onSuccess callback
  };

  const handleClearAll = async () => {
    await executeDeleteAll({});
  };

  const handleLoadMore = async () => {
    if (isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    try {
      const result = await getNotificationsAction({
        limit: PAGE_SIZE,
        offset: notifications.length,
        unreadOnly: false,
      });

      if (result?.data?.success) {
        const newNotifications = result.data.notifications;
        if (newNotifications.length > 0) {
          setNotifications((prev) => [...prev, ...newNotifications]);
          setHasMore(newNotifications.length >= PAGE_SIZE);
        } else {
          setHasMore(false);
        }
      }
    } catch (error) {
      console.error("Failed to load more notifications:", error);
    } finally {
      setIsLoadingMore(false);
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
    <>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-end gap-2">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllAsRead}
              disabled={markAllReadStatus === "executing"}
            >
              {markAllReadStatus === "executing"
                ? "Marking..."
                : "Mark All as Read"}
            </Button>
          )}
          {notifications.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowClearDialog(true)}
              disabled={deleteAllStatus === "executing"}
            >
              Clear Notifications
            </Button>
          )}
        </div>
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
                      <h3
                        className={cn(
                          "text-base font-semibold",
                          !notification.read && "text-foreground",
                        )}
                      >
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
                    <p className="text-sm text-primary font-medium">
                      Click to view →
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {new Date(notification.createdAt).toLocaleDateString(
                      "en-US",
                      {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      },
                    )}
                  </p>
                </div>
                {!notification.read && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
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
              isHighlighted && "bg-primary/10",
            );

            return (
              <React.Fragment key={notification.id}>
                {notification.link ? (
                  <Link
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
                      "block focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                    )}
                  >
                    {NotificationContent}
                  </Link>
                ) : (
                  <div
                    ref={(el) => {
                      notificationRefs.current[notification.id] = el;
                    }}
                    className={containerClassName}
                  >
                    {NotificationContent}
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
        {hasMore && (
          <div className="flex justify-center pt-4">
            <Button
              variant="outline"
              onClick={handleLoadMore}
              disabled={isLoadingMore}
            >
              {isLoadingMore ? "Loading..." : "Load More"}
            </Button>
          </div>
        )}
      </div>

      <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear All Notifications</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete all notifications? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowClearDialog(false)}
              disabled={deleteAllStatus === "executing"}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleClearAll}
              disabled={deleteAllStatus === "executing"}
            >
              {deleteAllStatus === "executing" ? "Deleting..." : "Delete All"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
