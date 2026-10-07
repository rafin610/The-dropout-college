/**
 * Central notification → destination mapping.
 *
 * Every social notification is created with enough structured data
 * (type, actor_id, project_id, comment_id, resource_type, resource_id)
 * to derive its destination without hardcoded URLs.
 */
export type NotificationLike = {
  type?: string | null;
  actor_id?: string | null;
  project_id?: string | null;
  comment_id?: string | null;
  resource_type?: string | null;
  resource_id?: string | null;
};

export function notificationHref(n: NotificationLike): string {
  const type = (n.type ?? "").toUpperCase();
  const projectId = n.project_id ?? (n.resource_type === "project" ? n.resource_id : null);

  // Follow notification → the actor's profile.
  if (type === "FOLLOW" || n.resource_type === "profile") {
    const id = n.actor_id ?? n.resource_id ?? null;
    return id ? `/profile?member=${encodeURIComponent(id)}` : "/explore";
  }

  // Comment notification → the project discussion.
  if (type === "COMMENT") {
    return projectId ? `/projects/${encodeURIComponent(projectId)}#comments` : "/projects";
  }

  // Upvote / any project-targeted notification → the project page.
  if (projectId) {
    return `/projects/${encodeURIComponent(projectId)}`;
  }

  if (n.resource_type === "event" && n.resource_id) {
    return `/events/${encodeURIComponent(n.resource_id)}`;
  }

  if (n.resource_type === "event") return "/events";

  // Sensible fallback instead of breaking navigation.
  return "/dashboard";
}
