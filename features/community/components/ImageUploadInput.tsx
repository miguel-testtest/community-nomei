import { ReactNode, useRef } from "react";
import { LuUpload, LuX } from "react-icons/lu";
import { twMerge } from "tailwind-merge";
import { Button } from "@/components/common/Button";

type ImageUploadInputProps = {
  file?: File | null;
  accept?: string;
  disabled?: boolean;
  helperText?: string;
  instructions?: ReactNode;
  className?: string;
  hasError?: boolean;
  onFilesSelected?: (
    files: FileList | null,
    event?:
      | React.ChangeEvent<HTMLInputElement>
      | React.DragEvent<HTMLDivElement>,
  ) => void;
  onRemove?: () => void;
  inputProps?: Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "type" | "accept" | "disabled" | "onBlur" | "onChange"
  >;
  onInputBlur?: React.FocusEventHandler<HTMLInputElement>;
  onInputChange?: React.ChangeEventHandler<HTMLInputElement>;
  inputRef?: (instance: HTMLInputElement | null) => void;
};

export const ImageUploadInput = ({
  file = null,
  accept = "image/jpeg,image/jpg,image/png,image/webp",
  disabled = false,
  helperText = "Format: only jpeg, jpg, png, webp. Maximum size: 5MB",
  instructions,
  className,
  hasError = false,
  onFilesSelected,
  onRemove,
  inputProps,
  onInputBlur,
  onInputChange,
  inputRef,
}: ImageUploadInputProps) => {
  const internalInputRef = useRef<HTMLInputElement | null>(null);

  const handleSelect = () => {
    if (disabled) {
      return;
    }
    internalInputRef.current?.click();
  };

  const handleFiles = (
    files: FileList | null,
    event?:
      | React.ChangeEvent<HTMLInputElement>
      | React.DragEvent<HTMLDivElement>,
  ) => {
    if (disabled) {
      return;
    }
    onFilesSelected?.(files, event);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (disabled) {
      return;
    }
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      handleFiles(event.dataTransfer.files, event);
      event.dataTransfer.clearData();
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div
        className={twMerge(
          "text-foreground focus-visible:ring-accent border-mercury-gray flex w-full cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed bg-card px-6 py-6 text-center shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:min-w-[16rem]",
          disabled && "cursor-not-allowed opacity-70",
          hasError && "border-red-500",
          className,
        )}
        onDragOver={(event) => {
          event.preventDefault();
        }}
        onDragLeave={(event) => {
          event.preventDefault();
        }}
        onDrop={handleDrop}
        tabIndex={disabled ? -1 : 0}
        role="button"
        aria-label="Upload image"
        onClick={handleSelect}
        onKeyDown={(event) => {
          if (disabled) {
            return;
          }
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            handleSelect();
          }
        }}
      >
        {file ? (
          <div className="flex w-full flex-col items-center gap-3">
            <p className="text-foreground text-sm font-semibold">{file.name}</p>
            <p className="text-muted-foreground text-xs">
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </p>
            <Button
              type="button"
              variant="secondary"
              className="bg-surface text-foreground flex items-center gap-2 px-4 py-2"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onRemove?.();
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  event.stopPropagation();
                  onRemove?.();
                }
              }}
              disabled={disabled}
            >
              <LuX className="h-4 w-4" />
              Remove
            </Button>
          </div>
        ) : (
          <>
            <div className="bg-accent/20 flex h-14 w-14 items-center justify-center rounded-full">
              <LuUpload className="text-accent h-6 w-6" />
            </div>
            <div className="text-foreground text-sm">
              {instructions ?? (
                <p>
                  <span className="font-semibold">Click to upload</span> or drag
                  and drop
                </p>
              )}
            </div>
          </>
        )}
        <input
          {...inputProps}
          ref={(instance) => {
            internalInputRef.current = instance;
            inputRef?.(instance);
          }}
          type="file"
          className="hidden"
          accept={accept}
          disabled={disabled}
          onBlur={(event) => {
            onInputBlur?.(event);
          }}
          onChange={(event) => {
            onInputChange?.(event);
            handleFiles(event.target.files ?? null, event);
          }}
        />
      </div>
      {helperText && <p className="text-foreground text-xs">{helperText}</p>}
    </div>
  );
};
