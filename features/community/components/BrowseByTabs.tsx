import { ComponentType } from "react";
import { LuLayoutGrid, LuUsers, LuShield } from "react-icons/lu";
import { Chip } from "@/components/common/Chip";

export type BrowseByTab = "all" | "my-communities" | "my-managed-communities";

type BrowseByTabsProps = {
  activeTab: BrowseByTab;
  onTabChange: (tab: BrowseByTab) => void;
};

const TABS: { value: BrowseByTab; label: string; Icon: ComponentType<{ size?: number }> }[] = [
  { value: "all", label: "All", Icon: LuLayoutGrid },
  { value: "my-communities", label: "My communities", Icon: LuUsers },
  { value: "my-managed-communities", label: "Managed", Icon: LuShield },
];

export const BROWSE_BY_TABS: BrowseByTab[] = TABS.map((tab) => tab.value);

export function BrowseByTabs({ activeTab, onTabChange }: BrowseByTabsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {TABS.map(({ value, label, Icon }) => (
        <Chip
          key={value}
          selected={activeTab === value}
          onClick={() => onTabChange(value)}
        >
          <span className="flex items-center gap-1.5">
            <Icon size={12} />
            {label}
          </span>
        </Chip>
      ))}
    </div>
  );
}
