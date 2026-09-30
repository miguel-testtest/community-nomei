import { Textarea } from "@/components/UI/TextArea";
import { handleTextareaKeyDown } from "../utils/keyboardHelpers";

import type React from "react";

interface PostFormProps {
  content: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  placeholder?: string;
}

export function PostForm({
  content,
  onChange,
  onSubmit,
  textareaRef,
  placeholder = "Write your thoughts here...",
}: PostFormProps) {
  return (
    <Textarea
      ref={textareaRef}
      value={content}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={(event) => handleTextareaKeyDown(event, onSubmit)}
      placeholder={placeholder}
      className="mb-3 min-h-[4rem] w-full text-base"
      fullWidth
      rows={3}
    />
  );
}
