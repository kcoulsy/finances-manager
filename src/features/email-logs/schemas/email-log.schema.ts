import { z } from "zod";

export const listEmailLogsSchema = z.object({
  search: z.string().optional(),
  status: z.enum(["SENT", "DELIVERED", "BOUNCED", "FAILED"]).optional(),
  mailType: z.string().optional(),
  readStatus: z.enum(["read", "unread"]).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  sortBy: z.enum(["sentAt", "subject", "recipientEmail", "status"]).optional(),
  sortDirection: z.enum(["asc", "desc"]).optional(),
  cursor: z.string().optional(),
  limit: z.number().min(1).max(100).optional().default(20),
});

export type ListEmailLogsInput = z.infer<typeof listEmailLogsSchema>;

export const getEmailLogSchema = z.object({
  emailLogId: z.string().min(1),
});

export type GetEmailLogInput = z.infer<typeof getEmailLogSchema>;

export const resendEmailSchema = z.object({
  emailLogId: z.string().min(1),
});

export type ResendEmailInput = z.infer<typeof resendEmailSchema>;

export const sendTestEmailSchema = z.object({});

export type SendTestEmailInput = z.infer<typeof sendTestEmailSchema>;
