import { LuSearch } from "react-icons/lu";
import { Input } from "../UI/Input";
import { twMerge } from "tailwind-merge";

interface SearchInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isMobile?: boolean;
  placeholder?: string;
  className?: string | undefined;
  searchClassName?: string;
}

export function SearchInput({
  value,
  onChange,
  isMobile = false,
  placeholder = "Search",
  className,
  searchClassName,
}: SearchInputProps) {
  return (
    <div
      className={twMerge(
        "relative flex items-center rounded-xl border-[1.5px] border-border bg-card",
        className,
      )}
    >
      <LuSearch
        size={isMobile ? 13 : 14}
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground opacity-45"
      />
      <Input
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className={twMerge(
          "h-full w-full border-none bg-transparent py-0 pl-10 pr-4 font-dm-sans text-foreground placeholder:text-muted-foreground focus:ring-0",
          isMobile ? "text-compact" : "text-sm",
          searchClassName,
        )}
      />
    </div>
  );
}
