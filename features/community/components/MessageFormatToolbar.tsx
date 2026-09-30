import { LuBold, LuItalic, LuList } from "react-icons/lu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/UI/Tooltip";

interface MessageFormatToolbarProps {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  onValueChange: (value: string) => void;
}

export function MessageFormatToolbar({
  textareaRef,
  onValueChange,
}: MessageFormatToolbarProps) {
  const insertText = (before: string, after: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;
    const selectedText = value.substring(start, end);

    const beforeText = value.substring(0, start);
    const afterText = value.substring(end);
    const newValue = beforeText + before + selectedText + after + afterText;

    textarea.value = newValue;
    onValueChange(newValue);

    textarea.focus();
    const newCursorPos = start + before.length + selectedText.length;
    textarea.setSelectionRange(newCursorPos, newCursorPos);
  };

  const handleBold = () => {
    insertText("**", "**");
  };

  const handleItalic = () => {
    insertText("*", "*");
  };

  const handleList = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;
    const selectedText = value.substring(start, end);

    if (selectedText) {
      const lines = selectedText.split("\n");
      const listItems = lines
        .filter((line) => line.trim())
        .map((line) => `- ${line.trim()}`)
        .join("\n");

      const before = value.substring(0, start);
      const after = value.substring(end);
      const newValue = before + listItems + after;

      textarea.value = newValue;
      onValueChange(newValue);
      textarea.focus();
      textarea.setSelectionRange(
        start + listItems.length,
        start + listItems.length,
      );
    } else {
      const before = value.substring(0, start);
      const after = value.substring(end);
      const newValue = before + "- " + after;

      textarea.value = newValue;
      onValueChange(newValue);
      textarea.focus();
      textarea.setSelectionRange(start + 2, start + 2);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={handleBold}
            className="p-1.5 hover:bg-muted rounded transition-colors"
          >
            <LuBold className="h-4 w-4 text-muted-foreground" />
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">Select text and click to make bold</p>
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={handleItalic}
            className="p-1.5 hover:bg-muted rounded transition-colors"
          >
            <LuItalic className="h-4 w-4 text-muted-foreground" />
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">Select text and click to make italic</p>
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={handleList}
            className="p-1.5 hover:bg-muted rounded transition-colors"
          >
            <LuList className="h-4 w-4 text-muted-foreground" />
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">Select text and click to create list</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

