import { Outlet, useLocation } from "react-router";
import { Navbar } from "@/components/navigation/Navbar";
import { QuickActionsBar } from "@/components/navigation/QuickActionsBar";
import { useState, useEffect } from "react";
import { useResponsive } from "@/hooks/useResponsive";
import { twMerge } from "tailwind-merge";
import { LuChevronLeft } from "react-icons/lu";
import { motion } from "motion/react";
import {
  MAIN_SIDEBAR_WIDTH_COLLAPSED_PX,
  MAIN_SIDEBAR_WIDTH_EXPANDED_PX,
  MAIN_SIDEBAR_TRANSITION,
} from "./mainSidebarConstants";

export function AppLayout() {
  const location = useLocation();
  const { isMobile, isMedium, isLarge } = useResponsive();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isMainSidebarCollapsed, setIsMainSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (isMedium) {
      setIsMainSidebarCollapsed(true);
    }
    if (isLarge) {
      setIsMainSidebarCollapsed(false);
    }
  }, [isMedium, isLarge]);

  useEffect(() => {
    if (isMobile) {
      setIsMobileNavOpen(false);
    }
  }, [location.pathname, isMobile]);

  const handleCloseMobileNav = () => {
    setIsMobileNavOpen(false);
  };

  const handleToggleMainSidebar = () => {
    setIsMainSidebarCollapsed((prev) => !prev);
  };

  const showMainSidebarToggle = !isMobile;
  const mainSidebarCollapsed = showMainSidebarToggle
    ? isMainSidebarCollapsed
    : false;

  return (
    <div className={twMerge("", isMobileNavOpen && "h-screen overflow-hidden")}>
      <div className="scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent flex min-h-screen overflow-y-auto">
        {!isMobile && (
          <motion.div
            className={twMerge(
              "relative z-10 flex-shrink-0 h-[100dvh]",
              showMainSidebarToggle ? "overflow-x-visible" : "overflow-hidden",
            )}
            animate={{
              width: mainSidebarCollapsed
                ? MAIN_SIDEBAR_WIDTH_COLLAPSED_PX
                : MAIN_SIDEBAR_WIDTH_EXPANDED_PX,
            }}
            initial={false}
            transition={MAIN_SIDEBAR_TRANSITION}
          >
            <Navbar isCollapsed={mainSidebarCollapsed} animateCollapse />
            {showMainSidebarToggle && (
              <button
                type="button"
                onClick={handleToggleMainSidebar}
                className={twMerge(
                  "absolute top-5 right-0 z-10 translate-x-1/2",
                  "flex h-7 w-7 items-center justify-center border cursor-pointer",
                  "rounded-[min(var(--radius-md),12px)]",
                  "bg-muted border-border text-muted-foreground shadow-sm",
                  "hover:bg-card hover:text-foreground",
                  "transition-colors duration-150",
                  "[&_svg]:transition-transform [&_svg]:duration-200 [&_svg]:ease-out",
                  mainSidebarCollapsed && "[&_svg]:rotate-180",
                )}
                aria-expanded={!mainSidebarCollapsed}
                aria-label={mainSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                <LuChevronLeft className="h-4 w-4" />
              </button>
            )}
          </motion.div>
        )}

        {isMobile && (
          <div
            className={twMerge(
              "fixed inset-0 z-50 h-[100dvh] transition-opacity duration-300",
              isMobileNavOpen ? "opacity-100" : "pointer-events-none opacity-0",
            )}
          >
            <div
              className="absolute inset-0 bg-black/30 transition-opacity duration-300"
              onClick={handleCloseMobileNav}
            />
            <div
              className={twMerge(
                "bg-background absolute top-0 left-0 h-full w-64 overflow-y-auto transition-transform duration-300 ease-in-out",
                isMobileNavOpen ? "translate-x-0" : "-translate-x-full",
              )}
            >
              <Navbar onMobileMenuClick={handleCloseMobileNav} />
            </div>
          </div>
        )}

        <main className="bg-background flex min-w-0 flex-1 flex-col overflow-x-hidden">
          <Outlet context={{ setIsMobileNavOpen }} />
        </main>
      </div>
      <QuickActionsBar
        sidebarWidth={
          isMobile
            ? 0
            : mainSidebarCollapsed
              ? MAIN_SIDEBAR_WIDTH_COLLAPSED_PX
              : MAIN_SIDEBAR_WIDTH_EXPANDED_PX
        }
      />
    </div>
  );
}
