import type { ContactStatus, ContactEngagement } from "@prisma/client";

export const CONTACT_ROLES = [
  "Client",
  "Contractor",
  "Supplier",
  "Team Member",
  "Other",
] as const;

export type ContactRole = (typeof CONTACT_ROLES)[number];

export const CONTACT_STATUS_CONFIG: Record<
  ContactStatus,
  { label: string; color: string; icon: string; emoji: string }
> = {
  PERSONAL: {
    label: "Personal Contact",
    color: "gray",
    icon: "user",
    emoji: "👤",
  },
  ENQUIRY: {
    label: "Enquiry",
    color: "blue",
    icon: "message-circle",
    emoji: "🔵",
  },
  CLIENT: {
    label: "Client",
    color: "green",
    icon: "building",
    emoji: "✅",
  },
  SUPPLIER: {
    label: "Supplier",
    color: "purple",
    icon: "truck",
    emoji: "🚚",
  },
};

export const CONTACT_ENGAGEMENT_CONFIG: Record<
  ContactEngagement,
  { label: string; color: string; icon: string }
> = {
  ACTIVE: {
    label: "Active",
    color: "green",
    icon: "check-circle",
  },
  INACTIVE: {
    label: "Inactive",
    color: "gray",
    icon: "circle",
  },
  SUSPENDED: {
    label: "Suspended",
    color: "yellow",
    icon: "pause-circle",
  },
};

