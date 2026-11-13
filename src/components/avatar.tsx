import type { CSSProperties } from "react";

export function initialsFor(name: string | null | undefined): string {
  return (name || "Member")
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function Avatar({
  src,
  name,
  size = 38,
  className = "",
}: {
  src?: string | null;
  name?: string | null;
  size?: number;
  className?: string;
}) {
  const style: CSSProperties = { width: size, height: size, flexBasis: size, fontSize: Math.max(10, size * 0.32) };

  return (
    <span className={`c-avatar ${className}`.trim()} style={style} aria-hidden="true">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" />
      ) : (
        <span>{initialsFor(name)}</span>
      )}
    </span>
  );
}
