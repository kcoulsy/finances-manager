import { getNotificationsAction } from "@/features/notifications/actions/get-notifications.action";
import { NotificationsList } from "@/features/notifications/components/notifications-list";
import { requireAuth } from "@/features/shared/lib/auth/require-auth";

interface NotificationsPageProps {
  searchParams: Promise<{ id?: string }>;
}

export default async function NotificationsPage({
  searchParams,
}: NotificationsPageProps) {
  const _session = await requireAuth();
  const { id } = await searchParams;

  const result = await getNotificationsAction({
    limit: 20, // Start with 20, then load more with pagination
    offset: 0,
    unreadOnly: false,
  });

  const notifications = result?.data?.notifications || [];
  const unreadCount = result?.data?.unreadCount || 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-sm text-muted-foreground mt-1">
              {unreadCount} unread{" "}
              {unreadCount === 1 ? "notification" : "notifications"}
            </p>
          )}
        </div>
      </div>
      <NotificationsList
        initialNotifications={notifications}
        initialUnreadCount={unreadCount}
        highlightNotificationId={id}
      />
    </div>
  );
}
