import { z } from "zod";

export const projectSchema = z.object({
  name: z.string().trim().min(2).max(100),
  slug: z.string().trim().min(2).max(120).regex(/^[a-z0-9-]+$/),
  description: z.string().trim().min(10).max(3000),
  categoryId: z.string().uuid().nullable().optional(),
  status: z.enum(["idea", "recruiting", "in_progress", "launched", "archived"]).optional(),
  visibility: z.enum(["public", "members", "private"]).optional(),
});

export const teamSchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z.string().trim().min(2).max(100).regex(/^[a-z0-9-]+$/),
  description: z.string().trim().max(1000).nullable().optional(),
  visibility: z.enum(["public", "members", "private"]).optional(),
});

export const eventSchema = z.object({
  title: z.string().trim().min(2).max(120),
  slug: z.string().trim().min(2).max(140).regex(/^[a-z0-9-]+$/),
  description: z.string().trim().min(10).max(5000),
  eventType: z.string().trim().min(2).max(40),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  capacity: z.number().int().positive().nullable().optional(),
  location: z.string().trim().max(300).nullable().optional(),
}).refine((value) => new Date(value.endsAt).getTime() > new Date(value.startsAt).getTime(), {
  message: "Event end time must be after its start time.",
  path: ["endsAt"],
});