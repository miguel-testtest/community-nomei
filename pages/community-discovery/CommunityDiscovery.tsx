import { useState, useEffect, useMemo, ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Button } from "@/components/common/Button";
import { PageLayout } from "@/components/layouts/PageLayout";
import { ROUTES } from "@/routes/paths";
import {
  useCommunities,
  UseCommunitiesParams,
} from "@/api/community/queries/useCommunities";
import { useAuthStore } from "@/stores/useAuthStore";
import { SearchInput } from "@/components/common/SearchInput";
import { useResponsive } from "@/hooks/useResponsive";
import { TagFilter } from "@/features/community/components/TagFilter";
import {
  BrowseByTabs,
  BrowseByTab,
  BROWSE_BY_TABS,
} from "@/features/community/components/BrowseByTabs";
import { CommunityDiscoveryCard } from "@/features/community/components/CommunityDiscoveryCard";
import { CommunityFeedSection } from "@/features/community/components/CommunityFeedSection";
import { useCommunityTags } from "@/api/community/queries/useCommunityTags";
import { COMMUNITY_SECTORS } from "@/features/community/constants/communitySectors";
import { Community, CommunityTag } from "@/api/community/community.types";
import { canCreateCommunity } from "@/api/user/privileges";
import { cn } from "@/lib/utils";

type SortOption = "newest" | "oldest" | "name-asc" | "name-desc";
type ActiveView = "feed" | "discover";

export function CommunityDiscovery() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isMobile } = useResponsive();
  const user = useAuthStore((state) => state.user);
  const { data: communityTags } = useCommunityTags();
  const backendTags = communityTags?.map((tag) => tag.name) ?? [];

  const availableTags = useMemo(() => {
    const combined = [...COMMUNITY_SECTORS, ...backendTags].filter(
      (tag) => tag !== "Other",
    );

    const unique = Array.from(
      new Set(combined.map((tag) => tag.toLowerCase())),
    ).map((lowercaseTag) => {
      const sectorMatch = COMMUNITY_SECTORS.find(
        (sector) => sector.toLowerCase() === lowercaseTag,
      );
      return (
        sectorMatch ||
        backendTags.find((tag) => tag.toLowerCase() === lowercaseTag) ||
        lowercaseTag
      );
    });

    return unique;
  }, [backendTags]);

  const [activeView, setActiveView] = useState<ActiveView>(
    searchParams.get("view") === "discover" ? "discover" : "feed",
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<BrowseByTab>(() => {
    const tabParam = searchParams.get("tab") as BrowseByTab | null;
    return tabParam && BROWSE_BY_TABS.includes(tabParam) ? tabParam : "all";
  });
  const [sortOption, setSortOption] = useState<SortOption>("newest");

  const handleViewChange = (view: ActiveView) => {
    setActiveView(view);
    const newParams = new URLSearchParams(searchParams);
    newParams.set("view", view);
    setSearchParams(newParams, { replace: true });
  };

  const handleTabChange = (tab: BrowseByTab) => {
    setActiveTab(tab);
    const newParams = new URLSearchParams(searchParams);
    newParams.set("tab", tab);
    setSearchParams(newParams, { replace: true });
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (
      activeTab !== "all" &&
      activeTab !== "my-communities" &&
      activeTab !== "my-managed-communities" &&
      activeTab
    ) {
      navigate(`${ROUTES.COMMUNITY}/${activeTab}`);
    }
  }, [activeTab, navigate]);

  const listQueryParams: UseCommunitiesParams | undefined = useMemo(() => {
    const params: UseCommunitiesParams = {};

    if (debouncedSearchQuery.trim()) {
      params.name = debouncedSearchQuery.trim();
    }

    if (selectedTags.length > 0) {
      params.tags = selectedTags;
    }

    if (activeTab === "my-communities" && user?.id) {
      params.memberUserId = user.id;
    }

    if (activeTab === "my-managed-communities" && user?.id) {
      params.ownerId = user.id;
    }

    return params;
  }, [debouncedSearchQuery, selectedTags, activeTab, user?.id]);

  const {
    data: communities,
    isLoading,
    isError,
  } = useCommunities(listQueryParams);

  const communityList = (communities ?? []) as (Community & { tags?: CommunityTag[] })[];

  const getCreatedAtTime = (
    item: Community & { createdAt?: string | Date },
  ) => {
    return item.createdAt ? new Date(item.createdAt).getTime() : 0;
  };

  const sortedCommunities = useMemo(() => {
    return [...communityList].sort((a, b) => {
      switch (sortOption) {
        case "newest":
          return getCreatedAtTime(b) - getCreatedAtTime(a);
        case "oldest":
          return getCreatedAtTime(a) - getCreatedAtTime(b);
        case "name-asc":
          return a.name.localeCompare(b.name);
        case "name-desc":
          return b.name.localeCompare(a.name);
        default:
          return 0;
      }
    });
  }, [communityList, sortOption]);

  const hasResults = sortedCommunities.length > 0;

  const handleTagToggle = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const handleCreateCommunity = () => {
    navigate(ROUTES.COMMUNITY_CREATE);
  };

  const isListTab =
    activeTab === "all" ||
    activeTab === "my-communities" ||
    activeTab === "my-managed-communities";

  const userCanCreateCommunity = canCreateCommunity(user?.userPrivilege, user?.role);

  const renderDiscoverContent = (): ReactNode => {
    if (isLoading && communityList.length === 0) {
      return (
        <div className="flex items-center justify-center py-16">
          <p className="text-compact text-muted-foreground">Loading communities...</p>
        </div>
      );
    }
    if (isError) {
      return (
        <div className="flex flex-col items-center justify-center gap-2 py-16">
          <p className="font-medium text-destructive">Failed to load communities</p>
          <p className="text-compact text-muted-foreground">
            Please try refreshing the page
          </p>
        </div>
      );
    }
    if (!isListTab) {
      return null;
    }
    if (!hasResults) {
      const emptyMessage =
        searchQuery || selectedTags.length > 0
          ? "Try adjusting your search or filters"
          : "Be the first to create a community!";
      return (
        <div className="flex flex-col items-center justify-center gap-4 py-16">
          <p className="text-base font-semibold text-foreground">No communities found</p>
          <p className="text-compact text-center text-muted-foreground">{emptyMessage}</p>
          {!searchQuery &&
            selectedTags.length === 0 &&
            userCanCreateCommunity && (
              <Button variant="secondary" onClick={handleCreateCommunity}>
                Create your first community
              </Button>
            )}
        </div>
      );
    }
    return (
      <div className="grid w-full grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 min-[1920px]:grid-cols-5">
        {sortedCommunities.map((community, index) => (
          <CommunityDiscoveryCard
            key={community.id}
            community={community}
            style={{ animationDelay: `${index * 0.06}s` }}
          />
        ))}
      </div>
    );
  };

  return (
    <PageLayout
      title="Community"
      {...(userCanCreateCommunity && {
        actionText: "New Community",
        onAction: handleCreateCommunity,
      })}
      {...(!userCanCreateCommunity && {
        actionHint: (
          <p className="text-xs text-muted-foreground">
            Upgrade to a Professional subscription to create your own community.
          </p>
        ),
      })}
    >
      <div className="flex shrink-0 items-center gap-6 border-b border-border px-7 md:px-10">
        {(["feed", "discover"] as ActiveView[]).map((view) => (
          <button
            key={view}
            type="button"
            onClick={() => handleViewChange(view)}
            className={cn(
              "relative pb-3 pt-3.5 text-sm font-medium capitalize transition-colors duration-150",
              "after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:rounded-full after:transition-all after:duration-150",
              activeView === view
                ? "text-foreground after:bg-yellow"
                : "text-muted-foreground hover:text-foreground after:bg-transparent",
            )}
          >
            {view === "feed" ? "Feed" : "Discover"}
          </button>
        ))}
      </div>

      {activeView === "feed" && (
        <CommunityFeedSection onGoToDiscover={() => handleViewChange("discover")} />
      )}

      {activeView === "discover" && (
        <div className="scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent flex flex-1 flex-col overflow-y-auto">
          <div className="flex w-full flex-col gap-6 px-7 py-6 md:px-10">
            {!userCanCreateCommunity && (
              <p className="block text-xs text-muted-foreground md:hidden">
                Upgrade to a Professional subscription to create your own community.
              </p>
            )}

            <TagFilter
              tags={availableTags}
              selectedTags={selectedTags}
              onTagToggle={handleTagToggle}
            />

            <div
              className={cn(
                "flex gap-3",
                isMobile ? "flex-col" : "flex-row items-center justify-between",
              )}
            >
              <BrowseByTabs activeTab={activeTab} onTabChange={handleTabChange} />
              <SearchInput
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                isMobile={isMobile}
                placeholder="Search communities..."
                className={cn(
                  "h-[2.5rem]",
                  isMobile ? "order-first w-full" : "w-[220px] shrink-0",
                )}
              />
            </div>

            {selectedTags.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-compact text-muted-foreground">Active filters:</span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleTagToggle(tag)}
                      className="flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground transition-colors hover:bg-border"
                    >
                      {tag}
                      <span className="ml-0.5 text-muted-foreground">×</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {communityList.length > 0 && (
              <div className="flex items-center justify-between gap-3">
                <p className="text-compact text-muted-foreground">
                  {communityList.length}{" "}
                  {communityList.length === 1 ? "community" : "communities"}
                </p>
                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value as SortOption)}
                  className="shrink-0 rounded-[var(--radius-sm)] border border-border bg-card px-3 py-1.5 text-compact text-foreground shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-yellow/40"
                >
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="name-asc">A–Z</option>
                  <option value="name-desc">Z–A</option>
                </select>
              </div>
            )}
            {renderDiscoverContent()}
          </div>
        </div>
      )}
    </PageLayout>
  );
}
