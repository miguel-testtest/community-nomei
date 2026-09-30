import { Post, PostMediaType } from "@/api/community/community.types";
import { Textarea } from "@/components/UI/TextArea";
import { ActionButton } from "./ActionButton";
import { LuX, LuPaperclip } from "react-icons/lu";
import { twMerge } from "tailwind-merge";

interface PostEditFormProps {
  post: Post;
  editPostContent: string;
  onEditContentChange: (value: string) => void;
  onEditKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onSave: () => void;
  onCancel: () => void;
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
  removingMediaFromEdit: boolean;
  onRemoveMedia: () => void;
  onUndoRemoveMedia: () => void;
  editPostMedia: {
    inputRef: React.RefObject<HTMLInputElement | null>;
    file: File | null;
    previewUrl: string | null;
    type: PostMediaType | null;
    clear: () => void;
  };
  onMediaSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  isUpdatingPost: boolean;
  isUploadingMedia: boolean;
}

export function PostEditForm({
  post,
  editPostContent,
  onEditContentChange,
  onEditKeyDown,
  onSave,
  onCancel,
  textareaRef,
  removingMediaFromEdit,
  onRemoveMedia,
  onUndoRemoveMedia,
  editPostMedia,
  onMediaSelect,
  isUpdatingPost,
  isUploadingMedia,
}: PostEditFormProps) {
  const hasExistingMedia = (post.media?.length ?? 0) > 0;
  const showExistingMedia =
    hasExistingMedia && !removingMediaFromEdit && !editPostMedia.file;

  return (
    <div className="mb-4">
      <Textarea
        ref={textareaRef}
        value={editPostContent}
        onChange={(event) => onEditContentChange(event.target.value)}
        onKeyDown={onEditKeyDown}
        className="mb-3 w-full text-base"
        fullWidth
        rows={3}
      />

      {showExistingMedia && (
        <div className="relative mb-3">
          <button
            onClick={onRemoveMedia}
            className="absolute top-2 right-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
            aria-label="Remove media"
            type="button"
          >
            <LuX className="h-4 w-4" />
          </button>
          {post.media!.map((media) => {
            if (media.type === PostMediaType.IMAGE) {
              return (
                <img
                  key={media.id}
                  src={media.url}
                  alt="Post image"
                  className="max-h-64 w-full rounded-xl object-cover"
                />
              );
            }

            if (media.type === PostMediaType.VIDEO) {
              return (
                <video
                  key={media.id}
                  src={media.url}
                  controls
                  preload="metadata"
                  className="max-h-64 w-full rounded-xl"
                  poster={media.thumbnailUrl || undefined}
                  onError={() => {
                    console.error("Failed to load video in edit form", media);
                  }}
                />
              );
            }

            return null;
          })}
        </div>
      )}
      {removingMediaFromEdit && !editPostMedia.file && (
        <div className="mb-3 rounded-lg border border-border bg-muted/50 p-3 text-sm text-muted-foreground">
          Media will be removed when you save
          <button
            onClick={onUndoRemoveMedia}
            className="text-accent ml-2 hover:underline"
          >
            Undo
          </button>
        </div>
      )}

      {editPostMedia.previewUrl && editPostMedia.type && (
        <div className="relative mb-3">
          <button
            onClick={editPostMedia.clear}
            className="absolute top-2 right-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
            aria-label="Remove media"
            type="button"
          >
            <LuX className="h-4 w-4" />
          </button>
          {editPostMedia.type === PostMediaType.IMAGE ? (
            <img
              src={editPostMedia.previewUrl}
              alt="Preview"
              className="max-h-64 w-full rounded-xl object-cover"
            />
          ) : null}
          {editPostMedia.type === PostMediaType.VIDEO ? (
            <video
              src={editPostMedia.previewUrl}
              controls
              preload="metadata"
              className="max-h-64 w-full rounded-xl"
              onError={() => {
                console.error(
                  "Failed to load video preview for edited post media",
                );
              }}
            />
          ) : null}
        </div>
      )}

      <div className="mb-3 flex items-center justify-between">
        <input
          ref={editPostMedia.inputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp,video/mp4"
          onChange={onMediaSelect}
          className="hidden"
          id="edit-post-media-input"
          disabled={isUpdatingPost || isUploadingMedia}
        />
        {(!hasExistingMedia || removingMediaFromEdit || editPostMedia.file) && (
          <label
            htmlFor="edit-post-media-input"
            className={twMerge(
              "flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              (isUpdatingPost || isUploadingMedia) &&
                "pointer-events-none cursor-not-allowed opacity-50",
            )}
            aria-label="Add media"
          >
            <LuPaperclip className="h-5 w-5" />
          </label>
        )}
        {showExistingMedia && <div className="h-9 w-9" />}
        <div className="flex justify-end gap-2">
          <ActionButton
            onClick={onCancel}
            disabled={isUpdatingPost || isUploadingMedia}
          >
            Cancel
          </ActionButton>
          <ActionButton
            onClick={onSave}
            disabled={
              !editPostContent.trim() || isUpdatingPost || isUploadingMedia
            }
            variant="primary"
          >
            {isUploadingMedia
              ? "Uploading..."
              : isUpdatingPost
                ? "Saving..."
                : "Save"}
          </ActionButton>
        </div>
      </div>
    </div>
  );
}

