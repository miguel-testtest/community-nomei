import { useRef, useState } from "react";
import { LuUpload, LuPencil, LuX } from "react-icons/lu";
import { twMerge } from "tailwind-merge";

type ImageUploadFieldProps = {
  label: string;
  description: string;
  previewUrl: string | null;
  onFileChange: (file: File | null) => void;
  accept: string;
  disabled?: boolean;
  className?: string;
  variant?: "square" | "banner";
};

export function ImageUploadField({
  label,
  description,
  previewUrl,
  onFileChange,
  accept,
  disabled = false,
  className,
  variant = "banner",
}: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const openFilePicker = () => {
    if (!disabled) inputRef.current?.click();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled) return;
    const file = e.dataTransfer.files?.[0];
    if (file) onFileChange(file);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!previewUrl && !disabled && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      openFilePicker();
    }
  };

  const handleChangeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    openFilePicker();
  };

  const handleRemoveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFileChange(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileChange(file);
    e.target.value = "";
  };

  const zoneClass =
    variant === "square" ? "h-28 w-28 rounded-xl" : "h-36 w-full rounded-xl";

  return (
    <div
      className={twMerge(
        "grid gap-3 2xl:grid-cols-[220px_minmax(0,1fr)] 2xl:items-start",
        className,
      )}
    >
      <div className="flex flex-col gap-1">
        <h4 className="text-sm font-semibold text-foreground">{label}</h4>
        <p className="text-xs text-muted-foreground">{description}</p>
        <p className="mt-0.5 text-xs text-muted-foreground/60">
          JPEG, PNG, WebP · Max 5MB
        </p>
      </div>

      <div
        className={twMerge(
          "group relative overflow-hidden border border-dashed border-border bg-card transition-colors",
          zoneClass,
          !previewUrl &&
            !disabled &&
            "cursor-pointer hover:border-accent/50 hover:bg-accent/5",
          isDragOver && "border-accent bg-accent/10",
          disabled && "cursor-not-allowed opacity-60",
        )}
        onClick={previewUrl ? undefined : openFilePicker}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        role={previewUrl ? undefined : "button"}
        tabIndex={previewUrl || disabled ? -1 : 0}
        aria-label={previewUrl ? undefined : `Upload ${label}`}
        onKeyDown={handleKeyDown}
      >
        {previewUrl ? (
          <>
            <img
              src={previewUrl}
              alt={label}
              className="h-full w-full object-cover"
            />
            {!disabled && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  type="button"
                  onClick={handleChangeClick}
                  className="flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/30"
                >
                  <LuPencil className="h-3 w-3" />
                  Change
                </button>
                <button
                  type="button"
                  onClick={handleRemoveClick}
                  className="flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm transition-colors hover:bg-red-500/60"
                >
                  <LuX className="h-3 w-3" />
                  Remove
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/15">
              <LuUpload className="h-4 w-4 text-accent" />
            </div>
            {variant === "banner" && (
              <p className="text-center text-xs text-muted-foreground">
                <span className="font-medium text-foreground">
                  Click to upload
                </span>{" "}
                or drag and drop
              </p>
            )}
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={accept}
          disabled={disabled}
          className="hidden"
          onChange={handleInputChange}
        />
      </div>
    </div>
  );
}
