import { LuSearch } from "react-icons/lu";
import { Input } from "@/components/UI/Input";

type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export function SearchBar({
  value,
  onChange,
  placeholder = "Search",
}: SearchBarProps) {
  return (
    <div className="relative w-full max-w-full min-w-0">
      <LuSearch
        className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 sm:left-4 sm:h-5 sm:w-5"
        size={20}
      />
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        fullWidth
        className="min-w-0 pl-10 text-sm sm:pl-12 sm:text-base"
      />
    </div>
  );
}
