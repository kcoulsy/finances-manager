"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/features/shared/components/ui/button";
import { useActionWithToast } from "@/features/shared/lib/actions/use-action-with-toast";
import { testNotificationAction } from "../actions/test-notification.action";
import { testNotificationErrorAction } from "../actions/test-notification-error.action";

export function TestNotificationButton() {
  const router = useRouter();

  // Success action with automatic toast handling
  const {
    execute: executeSuccess,
    status: successStatus,
  } = useActionWithToast(testNotificationAction, {
    successToast: {
      message: "Test notification sent!",
      type: "success",
      description: "Check your notifications to see it.",
    },
    // Handle refresh in onSuccess callback
    onSuccess: ({ data }: { data: any }) => {
      if (data?.success) {
        // Refresh the page to revalidate server components
        router.refresh();
        // Trigger notification count refresh
        setTimeout(() => {
          if (typeof window !== "undefined" && window.__refreshNotificationCount) {
            window.__refreshNotificationCount();
          }
        }, 150);
      }
    },
  });

  // Error action with automatic toast handling
  const {
    execute: executeError,
    status: errorStatus,
  } = useActionWithToast(testNotificationErrorAction, {
    errorToast: {
      message: "Test error triggered",
      type: "error",
      description: "This is a demonstration of error toast handling.",
    },
  });

  const handleTestNotification = () => {
    executeSuccess({});
  };

  const handleTestError = () => {
    executeError({});
  };

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        onClick={handleTestNotification}
        disabled={successStatus === "executing"}
      >
        {successStatus === "executing" ? "Sending..." : "Send Test Notification"}
      </Button>
      <Button
        variant="destructive"
        onClick={handleTestError}
        disabled={errorStatus === "executing"}
      >
        {errorStatus === "executing" ? "Triggering..." : "Test Error Toast"}
      </Button>
    </div>
  );
}

