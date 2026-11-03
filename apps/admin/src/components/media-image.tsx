"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import { ImageIcon } from "lucide-react";
import { useWorkspace } from "./provider";
export function MediaImage({
  id,
  className = "",
}: {
  id: string;
  className?: string;
}) {
  const { workspace, repository } = useWorkspace();
  const m = workspace.media.find((x) => x.id === id);
  const [resolved, setResolved] = useState<{ id: string; url: string }>();
  useEffect(() => {
    if (!m || m.source === "bundled") return;
    let url = "",
      cancelled = false;
    void repository
      .readBlob(m.id)
      .then((blob) => {
        if (blob && !cancelled) {
          url = URL.createObjectURL(blob);
          setResolved({ id: m.id, url });
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [m, repository]);
  const src =
    m?.source === "bundled"
      ? m.url
      : resolved?.id === m?.id
        ? resolved?.url
        : "";
  return src && m ? (
    <Image
      src={src}
      alt={m.alt || m.fileName}
      width={m.width}
      height={m.height}
      className={className}
      unoptimized
    />
  ) : (
    <div className={`image-placeholder ${className}`}>
      <ImageIcon size={24} />
      <span>No image</span>
    </div>
  );
}
