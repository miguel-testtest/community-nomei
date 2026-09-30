import { PostMediaType, PostMedia } from "@/api/community/community.types";

interface PostMediaRendererProps {
  media: PostMedia[];
  onImageClick?: (imageUrl: string) => void;
  className?: string;
  maxHeight?: string;
}

export function PostMediaRenderer({
  media,
  onImageClick,
  className = "",
  maxHeight = "max-h-[500px]",
}: PostMediaRendererProps) {
  if (!media || media.length === 0) return null;

  return (
    <div className={`mb-4 space-y-2 ${className}`}>
      {media.map((mediaItem) => {
        if (mediaItem.type === PostMediaType.IMAGE) {
          return (
            <img
              key={mediaItem.id}
              src={mediaItem.url}
              alt="Post image"
              className={`${maxHeight} w-full cursor-pointer rounded-xl object-cover transition-opacity hover:opacity-90`}
              loading="lazy"
              onClick={() => onImageClick?.(mediaItem.url)}
            />
          );
        }
        if (mediaItem.type === PostMediaType.VIDEO) {
          return (
            <video
              key={mediaItem.id}
              src={mediaItem.url}
              controls
              preload="metadata"
              className={`${maxHeight} w-full rounded-xl`}
              poster={mediaItem.thumbnailUrl || undefined}
              onError={() => {
                console.error("Failed to load post video", mediaItem);
              }}
            />
          );
        }
        return null;
      })}
    </div>
  );
}

