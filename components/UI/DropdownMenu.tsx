import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { GoChevronDown, GoChevronUp } from "react-icons/go";
import { twMerge } from "tailwind-merge";
import { useResponsive } from "@/hooks/useResponsive";

interface DropdownOption {
  name: string;
  onClick: () => Promise<void>;
}

interface DropdownMenuProps {
  options: DropdownOption[];
  leftOffset?: number;
  className?: string;
}

export function DropdownMenu({
  options,
  leftOffset = 0,
  className,
}: DropdownMenuProps) {
  const { isMobile } = useResponsive();
  return (
    <Menu as="div" className="relative">
      {({ open }) => (
        <>
          <MenuButton className="text-muted-foreground hover:text-foreground flex items-center select-none hover:cursor-pointer focus:outline-none">
            {open ? (
              <GoChevronUp className="ml-1 h-4 w-4" />
            ) : (
              <GoChevronDown className="ml-1 h-4 w-4" />
            )}
          </MenuButton>
          <MenuItems
            className={twMerge(
              "z-50",
              isMobile
                ? "absolute right-0 mt-2 w-auto origin-top-right rounded-lg bg-popover shadow-lg outline-none"
                : "absolute left-0 mt-2 w-auto origin-top-left rounded-lg bg-popover shadow-lg outline-none",
              className,
            )}
            style={isMobile ? undefined : { left: `${leftOffset}px` }}
          >
            <div className="py-2">
              {options.map((option) => (
                <MenuItem key={option.name}>
                  {({ active }) => (
                    <button
                      className={twMerge(
                        "text-foreground flex w-full items-center px-4 py-2 text-sm whitespace-nowrap select-none hover:cursor-pointer",
                        active && "bg-foreground/10",
                      )}
                      onClick={option.onClick}
                    >
                      {option.name}
                    </button>
                  )}
                </MenuItem>
              ))}
            </div>
          </MenuItems>
        </>
      )}
    </Menu>
  );
}
