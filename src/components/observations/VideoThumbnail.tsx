import Image from "next/image";

/**
 * A clip's poster frame. This is a still image rather than a <video>: mounting
 * one video element per row makes the browser open a request per clip, which
 * starves the player the user is actually watching.
 */
export function VideoThumbnail({
  src,
  alt,
  width = 160,
  height = 96,
  className = "",
}: {
  src: string;
  alt?: string;
  width?: number;
  height?: number;
  className?: string;
}) {
  return (
    <Image
      src={src}
      alt={alt ?? ""}
      width={width}
      height={height}
      loading="lazy"
      className={`bg-muted object-cover ${className}`}
    />
  );
}
