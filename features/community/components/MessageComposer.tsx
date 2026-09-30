import { useCallback, useRef, useState } from "react";
import { twMerge } from "tailwind-merge";
import { LuSend, LuPaperclip, LuSmile, LuX, LuPlus, LuEye } from "react-icons/lu";
import { Textarea } from "@/components/UI/TextArea";
import { MessageFormatToolbar } from "./MessageFormatToolbar";
import { COMMON_EMOJIS } from "../utils/constants";
import { Popover, PopoverButton, PopoverPanel } from "@headlessui/react";
import { handleTextareaKeyDown } from "../utils/keyboardHelpers";
import { PostMediaType } from "@/api/community/community.types";
import { useMessageMediaField } from "../hooks/useMessageMediaField";
import { useResponsive } from "@/hooks/useResponsive";
import { CommunityMessageType } from "../enums/community-message-type.enum";
import { MessageContent } from "./MessageContent";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/UI/Tooltip";

interface MessageComposerProps {
  mode: CommunityMessageType;
  text: string;
  onTextChange: (value: string) => void;
  onSend: () => void;
  isConnected: boolean;
  isUploading: boolean;
  placeholder: string;
  media: ReturnType<typeof useMessageMediaField>;
  disableAttachments?: boolean;
  replyingLabel?: string | undefined;
  className?: string;
  sendLabel?: string | undefined;
  onTextBlur?: () => void;
}

export function MessageComposer({
  mode,
  text,
  onTextChange,
  onSend,
  isConnected,
  isUploading,
  placeholder,
  media,
  disableAttachments = false,
  replyingLabel,
  className,
  sendLabel,
  onTextBlur,
}: MessageComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const canSend =
    !isPreviewMode &&
    (text.trim().length > 0 || media.files.length > 0) &&
    isConnected &&
    !isUploading;
  const { isMobile, isMedium } = useResponsive();
  const isChannel = mode === CommunityMessageType.CHANNEL;
  const isCompactLayout = isMobile || isMedium;

  const handleChannelKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      handleTextareaKeyDown(e, () => {
        if (!isPreviewMode && canSend) {
          onSend();
        }
      });
    },
    [canSend, isPreviewMode, onSend],
  );

  const handleDmKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (
        e.key === "Enter" &&
        !isPreviewMode &&
        (text.trim().length > 0 || media.files.length > 0) &&
        isConnected &&
        !isUploading
      ) {
        e.preventDefault();
        onSend();
      }
    },
    [isPreviewMode, text, media.files.length, isConnected, isUploading, onSend],
  );

  const effectivePlaceholder =
    mode === CommunityMessageType.DM && replyingLabel ? replyingLabel : placeholder;
  const effectiveSendLabel = isUploading
    ? "Uploading..."
    : sendLabel ?? "Send";

  return (
    <div className={twMerge("flex-shrink-0 w-full", className)}>
      {media.files.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {media.files.map((mediaFile, index) => (
            <div key={index} className="relative">
              <button
                onClick={() => media.removeFile(index)}
                className="absolute top-1 right-1 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
                aria-label="Remove media"
                type="button"
              >
                <LuX className="h-3 w-3" />
              </button>
              {mediaFile.type === PostMediaType.IMAGE ? (
                <img
                  src={mediaFile.previewUrl}
                  alt={`Preview ${index + 1}`}
                  className="h-20 w-20 rounded-lg object-cover"
                />
              ) : (
                <video
                  src={mediaFile.previewUrl}
                  className="h-20 w-20 rounded-lg object-cover"
                  preload="metadata"
                />
              )}
            </div>
          ))}
        </div>
      )}

      <div
        className={twMerge(
          "flex bg-card px-4 py-2 border border-border rounded-xl w-full",
          isCompactLayout ? "flex-col gap-2" : "items-center gap-2",
        )}
      >
        {isPreviewMode ? (
          <div
            className={twMerge(
              "bg-transparent border-0 p-0 min-w-0 text-foreground",
              isCompactLayout ? "w-full" : "flex-1",
            )}
            style={{
              minHeight: "2.5rem",
              height: "auto",
              lineHeight: "1.5rem",
              paddingTop: "0.625rem",
              paddingBottom: "0.625rem",
              verticalAlign: "middle",
            }}
          >
            <MessageContent
              content={text}
              textSize="sm"
              textColor="text-foreground"
              unstyled
            />
          </div>
        ) : isChannel ? (
          <Textarea
            ref={textareaRef}
            placeholder={placeholder}
            className={twMerge(
              "bg-transparent border-0 focus:ring-0 p-0 resize-none min-w-0 text-sm placeholder:text-muted-foreground/50",
              isCompactLayout ? "w-full min-h-[2.5rem]" : "flex-1",
            )}
            value={text}
            onChange={(e) => {
              if (e.target.value.length <= 2000) {
                onTextChange(e.target.value);
              }
            }}
            maxLength={2000}
            onKeyDown={handleChannelKeyDown}
            onBlur={onTextBlur}
            rows={1}
            style={{
              minHeight: "2.5rem",
              height: "auto",
              lineHeight: "1.5rem",
              paddingTop: "0.625rem",
              paddingBottom: "0.625rem",
              verticalAlign: "middle",
            }}
          />
        ) : (
          <Textarea
            ref={textareaRef}
            placeholder={effectivePlaceholder}
            className={twMerge(
              "bg-transparent border-0 focus:ring-0 p-0 resize-none min-w-0 text-foreground text-sm placeholder:text-muted-foreground/50",
              isCompactLayout ? "w-full min-h-[2.5rem]" : "flex-1",
            )}
            value={text}
            onChange={(e) => {
              if (e.target.value.length <= 2000) {
                onTextChange(e.target.value);
              }
            }}
            maxLength={2000}
            onKeyDown={handleDmKeyDown}
            onBlur={onTextBlur}
            rows={1}
            style={{
              minHeight: "2.5rem",
              height: "auto",
              lineHeight: "1.5rem",
              paddingTop: "0.625rem",
              paddingBottom: "0.625rem",
              verticalAlign: "middle",
            }}
          />
        )}

        {!isCompactLayout && (
          <>
            <div className="flex items-center gap-1">
              {text.trim().length > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => setIsPreviewMode((prev) => !prev)}
                      className={twMerge(
                        "flex items-center justify-center rounded-md p-1 text-xs transition-colors",
                        isPreviewMode
                          ? "border border-primary-hover bg-accent/10 text-primary-hover"
                          : "border-0 text-muted-foreground hover:bg-muted/50",
                      )}
                      aria-pressed={isPreviewMode}
                    >
                      <LuEye
                        className={twMerge(
                          "h-4 w-4",
                          isPreviewMode ? "text-primary-hover" : "text-muted-foreground",
                        )}
                      />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">
                      {isPreviewMode ? "Hide preview" : "Show preview"}
                    </p>
                  </TooltipContent>
                </Tooltip>
              )}
              <MessageFormatToolbar
                textareaRef={textareaRef}
                onValueChange={(value) => {
                  if (value.length <= 2000) {
                    onTextChange(value);
                  }
                }}
              />
            </div>
            <Popover className="relative">
              {({ close }) => (
                <>
                  <PopoverButton className="p-2 hover:bg-muted rounded-lg transition-colors">
                    <LuSmile className="h-5 w-5 text-muted-foreground" />
                  </PopoverButton>
                  <PopoverPanel
                    anchor="top end"
                    className="z-50 mb-2 rounded-lg border border-border bg-card p-3 shadow-lg"
                  >
                    <div className="grid grid-cols-5 gap-2">
                      {COMMON_EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          className="w-8 h-8 flex items-center justify-center rounded hover:bg-muted transition-colors text-lg"
                          onClick={() => {
                            onTextChange((text + emoji).slice(0, 2000));
                            close();
                          }}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </PopoverPanel>
                </>
              )}
            </Popover>
          </>
        )}

        {!disableAttachments && (
          <input
            ref={media.inputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp,video/mp4"
            onChange={media.handleSelect}
            className="hidden"
            id={isChannel ? "channel-media-input" : "dm-media-input"}
            disabled={isUploading}
          />
        )}

        <div
          className={twMerge(
            "flex items-center flex-shrink-0",
            isCompactLayout
              ? "justify-between gap-2 w-full min-w-0"
              : "gap-2",
          )}
        >
          {isCompactLayout ? (
            <>
              <div className="flex items-center min-w-0 flex-shrink">
                {text.trim().length > 0 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => setIsPreviewMode((prev) => !prev)}
                        className={twMerge(
                          "flex items-center justify-center rounded-md p-1 text-xs transition-colors",
                          isPreviewMode
                            ? "border border-primary-hover bg-accent/10 text-primary-hover"
                            : "border-0 text-muted-foreground hover:bg-muted/50",
                        )}
                        aria-pressed={isPreviewMode}
                      >
                        <LuEye
                          className={twMerge(
                            "h-4 w-4",
                            isPreviewMode
                              ? "text-primary-hover"
                              : "text-muted-foreground",
                          )}
                        />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">
                        {isPreviewMode ? "Hide preview" : "Show preview"}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                )}
                <MessageFormatToolbar
                  textareaRef={textareaRef}
                  onValueChange={(value) => {
                    if (value.length <= 2000) {
                      onTextChange(value);
                    }
                  }}
                />
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Popover className="relative">
                  {({ close }) => (
                    <>
                      <PopoverButton
                        className="p-2 hover:bg-muted rounded-lg transition-colors"
                        onMouseDown={(e) => e.preventDefault()}
                      >
                        <LuPlus className="h-5 w-5 text-muted-foreground" />
                      </PopoverButton>
                      <PopoverPanel
                        anchor="top start"
                        className="z-50 mb-2 rounded-lg border border-border bg-card p-3 shadow-lg min-w-[220px] space-y-3"
                      >
                        <div className="border-b border-border pb-2">
                          <div className="text-xs font-semibold text-muted-foreground mb-2">
                            Emoji
                          </div>
                          <div className="grid grid-cols-7 gap-1">
                            {COMMON_EMOJIS.map((emoji) => (
                              <button
                                key={emoji}
                                className="w-8 h-8 flex items-center justify-center rounded hover:bg-muted transition-colors text-lg"
                                type="button"
                                onClick={() => {
                                  onTextChange((text + emoji).slice(0, 2000));
                                  close();
                                }}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </div>

                        {!disableAttachments && (
                          <button
                            type="button"
                            className={twMerge(
                              "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted transition-colors",
                              isUploading && "pointer-events-none opacity-50",
                            )}
                            onClick={() => {
                              const inputId = isChannel
                                ? "channel-media-input"
                                : "dm-media-input";
                              const input = document.getElementById(
                                inputId,
                              ) as HTMLInputElement | null;
                              input?.click();
                              close();
                            }}
                          >
                            <LuPaperclip className="h-4 w-4 text-muted-foreground" />
                            <span className="text-foreground/70">Add media</span>
                          </button>
                        )}
                      </PopoverPanel>
                    </>
                  )}
                </Popover>
                <button
                  onClick={onSend}
                  type="button"
                  className="px-4 py-2 bg-accent text-foreground rounded-lg hover:bg-primary-hover transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                  disabled={!canSend}
                >
                  <LuSend className="h-4 w-4 text-foreground" />
                  <span className="text-foreground">
                    {effectiveSendLabel}
                  </span>
                </button>
              </div>
            </>
          ) : null}
          {!isCompactLayout && (
            <>
            <div className="flex items-center gap-1">
              {!disableAttachments && (
                <label
                  htmlFor={isChannel ? "channel-media-input" : "dm-media-input"}
                  className={twMerge(
                    "p-2 hover:bg-muted rounded-lg transition-colors cursor-pointer",
                    isUploading &&
                      "pointer-events-none cursor-not-allowed opacity-50",
                  )}
                  aria-label="Add media"
                >
                  <LuPaperclip className="h-5 w-5 text-muted-foreground" />
                </label>
              )}
            </div>
          <button
            onClick={onSend}
            type="button"
            className="px-4 py-2 bg-accent text-foreground rounded-lg hover:bg-primary-hover transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
            disabled={!canSend}
          >
            <LuSend className="h-4 w-4 text-foreground" />
            <span className="text-foreground">
              {effectiveSendLabel}
            </span>
          </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
