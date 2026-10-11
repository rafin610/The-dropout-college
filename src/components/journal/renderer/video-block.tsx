"use client";

import { useMemo } from "react";
import { AlertCircle } from "lucide-react";

interface VideoBlockProps {
  src: string;
  title?: string;
  caption?: string;
}

export function VideoBlock({ src, title = "Embedded Video", caption }: VideoBlockProps) {
  const embedUrl = useMemo(() => {
    if (!src) return null;
    const url = src.trim();

    // YouTube: https://www.youtube.com/watch?v=xyz or https://youtu.be/xyz
    const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (ytMatch) {
      return `https://www.youtube-nocookie.com/embed/${ytMatch[1]}`;
    }

    // Vimeo: https://vimeo.com/123456789
    const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?([0-9]+)/);
    if (vimeoMatch) {
      return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    }

    // Loom: https://www.loom.com/share/xyz
    const loomMatch = url.match(/loom\.com\/(?:share|embed)\/([a-zA-Z0-9]+)/);
    if (loomMatch) {
      return `https://www.loom.com/embed/${loomMatch[1]}`;
    }

    return null;
  }, [src]);

  if (!embedUrl) {
    return (
      <div className="journal-video-error">
        <AlertCircle size={15} />
        <span>Unsupported or invalid video URL. Approved providers: YouTube, Vimeo, Loom.</span>
      </div>
    );
  }

  return (
    <figure className="journal-video-wrapper">
      <div className="journal-video-container">
        <iframe
          src={embedUrl}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="journal-video-iframe"
          loading="lazy"
        />
      </div>
      {caption && <figcaption className="journal-media-caption">{caption}</figcaption>}
    </figure>
  );
}
