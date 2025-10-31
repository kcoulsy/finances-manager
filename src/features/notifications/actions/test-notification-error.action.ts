"use server";

import { actionClient } from "@/features/shared/lib/actions/client";
import { z } from "zod";

const testNotificationErrorSchema = z.object({});

/**
 * Test action that intentionally throws an error to demonstrate
 * error toast handling with the middleware.
 */
export const testNotificationErrorAction = actionClient
  .inputSchema(testNotificationErrorSchema)
  .action(async () => {
    // Intentionally throw an error to test error handling middleware
    throw new Error("This is a test error to demonstrate error toast handling");
  });
