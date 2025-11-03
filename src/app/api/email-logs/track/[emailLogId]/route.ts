import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { db } from "@/features/shared/lib/db/client";

// 1x1 transparent GIF pixel
const PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64",
);

/**
 * API route to track email opens via pixel tracking
 * Serves a 1x1 transparent GIF and logs the read event
 *
 * GET /api/email-logs/track/[emailLogId]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ emailLogId: string }> },
) {
  try {
    const { emailLogId } = await params;

    if (!emailLogId) {
      return new NextResponse(PIXEL, {
        status: 200,
        headers: {
          "Content-Type": "image/gif",
          "Cache-Control":
            "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      });
    }

    // Verify email log exists
    const emailLog = await db.emailLog.findUnique({
      where: { id: emailLogId },
      select: { id: true },
    });

    if (!emailLog) {
      return new NextResponse(PIXEL, {
        status: 200,
        headers: {
          "Content-Type": "image/gif",
          "Cache-Control":
            "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      });
    }

    // Extract request metadata
    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0] ||
      request.headers.get("x-real-ip") ||
      request.ip ||
      "unknown";

    const userAgent = request.headers.get("user-agent") || "unknown";

    // Parse user agent for browser and OS (basic parsing)
    let browser: string | null = null;
    let operatingSystem: string | null = null;

    if (userAgent !== "unknown") {
      // Browser detection
      if (userAgent.includes("Chrome") && !userAgent.includes("Edg")) {
        browser = "Chrome";
      } else if (userAgent.includes("Firefox")) {
        browser = "Firefox";
      } else if (
        userAgent.includes("Safari") &&
        !userAgent.includes("Chrome")
      ) {
        browser = "Safari";
      } else if (userAgent.includes("Edg")) {
        browser = "Edge";
      } else if (userAgent.includes("Opera") || userAgent.includes("OPR")) {
        browser = "Opera";
      }

      // OS detection
      if (userAgent.includes("Windows")) {
        operatingSystem = "Windows";
      } else if (
        userAgent.includes("Mac OS X") ||
        userAgent.includes("Macintosh")
      ) {
        operatingSystem = "macOS";
      } else if (userAgent.includes("Linux")) {
        operatingSystem = "Linux";
      } else if (userAgent.includes("Android")) {
        operatingSystem = "Android";
      } else if (
        userAgent.includes("iOS") ||
        userAgent.includes("iPhone") ||
        userAgent.includes("iPad")
      ) {
        operatingSystem = "iOS";
      }
    }

    // Create read log entry
    // Use upsert to avoid duplicates if the same email is opened multiple times
    // We'll create a new entry each time since read tracking should show multiple reads
    await db.emailLogRead.create({
      data: {
        emailLogId,
        ipAddress,
        browser,
        operatingSystem,
        readAt: new Date(),
      },
    });

    // Return the 1x1 transparent pixel
    return new NextResponse(PIXEL, {
      status: 200,
      headers: {
        "Content-Type": "image/gif",
        "Cache-Control":
          "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
        "Content-Length": String(PIXEL.length),
      },
    });
  } catch (error) {
    // Always return the pixel even if logging fails
    console.error("Error tracking email read:", error);
    return new NextResponse(PIXEL, {
      status: 200,
      headers: {
        "Content-Type": "image/gif",
        "Cache-Control":
          "no-store, no-cache, must-revalidate, proxy-revalidate",
      },
    });
  }
}
