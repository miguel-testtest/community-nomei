import { useRef, useState } from "react";
import { LuCamera, LuX } from "react-icons/lu";
import { twMerge } from "tailwind-merge";

type CommunityHeaderPreviewProps = {
  communityName: string;
  logoPreview: string | null;
  bannerPreview: string | null;
  onLogoChange: (file: File | null) => void;
  onBannerChange: (file: File | null) => void;
  disabled?: boolean;
};

export function CommunityHeaderPreview({
  communityName,
  logoPreview,
  bannerPreview,
  onLogoChange,
  onBannerChange,
  disabled = false,
}: CommunityHeaderPreviewProps) {
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const [isBannerDragOver, setIsBannerDragOver] = useState(false);

  const openLogoPicker = () => {
    if (!disabled) logoInputRef.current?.click();
  };
  const openBannerPicker = () => {
    if (!disabled) bannerInputRef.current?.click();
  };

  const handleBannerDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsBannerDragOver(false);
    if (disabled) return;
    const file = e.dataTransfer.files?.[0];
    if (file) onBannerChange(file);
  };

  const displayName = communityName.trim() || "Community name";
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h4 className="text-sm font-semibold text-foreground">Preview</h4>
        <p className="text-xs text-muted-foreground">
          Update your community logo and banner.
        </p>
      </div>

      <div
        className={twMerge(
          "relative mx-auto h-40 w-full max-w-lg overflow-hidden rounded-2xl",
          isBannerDragOver &&
            "ring-2 ring-accent ring-offset-2 ring-offset-background",
        )}
      >
        {bannerPreview ? (
          <img
            src={bannerPreview}
            alt="Community banner"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-yellow/25 via-yellow/10 to-accent/40" />
        )}

        {/* Banner interactive zone — full area, pill stops propagation */}
        {!disabled && (
          <div
            className="group/banner absolute inset-0 cursor-pointer"
            onClick={openBannerPicker}
            onDragOver={(e) => {
              e.preventDefault();
              setIsBannerDragOver(true);
            }}
            onDragLeave={() => setIsBannerDragOver(false)}
            onDrop={handleBannerDrop}
          >
            <div className="absolute inset-0 bg-black/40 opacity-0 transition-opacity group-hover/banner:opacity-100" />

            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 opacity-0 transition-opacity group-hover/banner:opacity-100">
              <LuCamera className="h-5 w-5 text-white" />
              <span className="text-xs font-medium text-white">
                {bannerPreview ? "Change banner" : "Add banner"}
              </span>
            </div>

            {bannerPreview && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onBannerChange(null);
                }}
                className="absolute top-2.5 right-2.5 flex items-center gap-1 rounded-lg bg-black/40 px-2 py-1 text-xs font-medium text-white opacity-0 backdrop-blur-sm transition-colors transition-opacity group-hover/banner:opacity-100 hover:bg-red-500/60"
              >
                <LuX className="h-3 w-3" />
                Remove
              </button>
            )}
          </div>
        )}

        {/* Frosted glass pill — sits above banner zone via z-10 */}
        <div
          className={twMerge(
            "group/logo absolute bottom-3 left-3 z-10 flex w-fit max-w-[calc(100%-1.5rem)] items-center gap-2.5 rounded-xl bg-black/30 px-3 py-2 backdrop-blur-md transition-colors",
            !disabled && "cursor-pointer hover:bg-black/55",
            disabled && "cursor-not-allowed",
          )}
          onClick={(e) => {
            e.stopPropagation();
            openLogoPicker();
          }}
        >
          <div className="relative h-8 w-8 shrink-0">
            {logoPreview ? (
              <img
                src={logoPreview}
                alt="Community logo"
                className="h-8 w-8 rounded-lg object-cover"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 text-xs font-bold text-white">
                {initials}
              </div>
            )}
            {!disabled && (
              <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/60 opacity-0 transition-opacity group-hover/logo:opacity-100">
                <LuCamera className="h-3.5 w-3.5 text-white" />
              </div>
            )}
          </div>

          <span className="truncate text-sm font-semibold text-white">
            {displayName}
          </span>

          {logoPreview && !disabled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onLogoChange(null);
              }}
              className="ml-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/20 text-white opacity-0 transition-colors transition-opacity group-hover/logo:opacity-100 hover:bg-red-500/70"
              aria-label="Remove logo"
            >
              <LuX className="h-3 w-3" />
            </button>
          )}
        </div>

        <input
          ref={logoInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
          disabled={disabled}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onLogoChange(file);
            e.target.value = "";
          }}
        />
        <input
          ref={bannerInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
          disabled={disabled}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onBannerChange(file);
            e.target.value = "";
          }}
        />
      </div>

      <p className="text-center text-xs text-muted-foreground/60">
        JPEG, PNG, WebP, GIF · Max 5MB
      </p>
    </div>
  );
}
