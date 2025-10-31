import { z } from "zod";

export const getNotificationsSchema = z.object({
  limit: z.number().min(1).max(100).optional().default(10),
  offset: z.number().min(0).optional().default(0),
  unreadOnly: z.boolean().optional().default(false),
});

export const markNotificationReadSchema = z.object({
  notificationId: z.string().min(1, "Notification ID is required"),
});

export const markAllNotificationsReadSchema = z.object({});

export const deleteAllNotificationsSchema = z.object({});

export const createNotificationSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  title: z.string().min(1, "Title is required").max(200, "Title must be less than 200 characters"),
  subtitle: z.string().max(300, "Subtitle must be less than 300 characters").optional(),
  detail: z.string().optional(),
  link: z.string().min(1, "Link must not be empty").optional().or(z.literal("")),
});

export type GetNotificationsInput = z.infer<typeof getNotificationsSchema>;
export type MarkNotificationReadInput = z.infer<typeof markNotificationReadSchema>;
export type MarkAllNotificationsReadInput = z.infer<typeof markAllNotificationsReadSchema>;
export type DeleteAllNotificationsInput = z.infer<typeof deleteAllNotificationsSchema>;
export type CreateNotificationInput = z.infer<typeof createNotificationSchema>;