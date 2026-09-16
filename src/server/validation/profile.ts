import { z } from "zod";

const optionalUrl = z
  .union([
    z.string().trim().max(500).refine((value) => value === "" || /^https?:\/\//i.test(value), {
      message: "Use a valid HTTP or HTTPS URL.",
    }),
    z.null(),
  ])
  .optional()
  .transform((value) => (value === "" ? null : value ?? null));

export const updateProfileSchema = z.object({
  username: z.string().trim().min(3).max(32).regex(/^[a-zA-Z0-9_]+$/).optional(),
  displayName: z.string().trim().min(1).max(80).optional(),
  avatarUrl: optionalUrl,
  bio: z.string().trim().max(500).nullable().optional(),
  categoryIds: z.array(z.string().uuid()).max(12).optional(),
  skillIds: z.array(z.string().uuid()).max(30).optional(),
  facebookUrl: optionalUrl,
  youtubeUrl: optionalUrl,
  socialLinks: z
    .array(
      z.object({
        platform: z.enum(["facebook", "youtube", "linkedin", "github", "instagram", "x", "website"]),
        url: z.string().trim().min(1).max(500).url(),
      }),
    )
    .optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;