import { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { UserProfileMenu } from "@/components/UserProfileMenu";
import { ThemeToggle } from "@/components/ThemeToggle";
import { GlobalProjectIndicator } from "@/components/project";

interface TopBarProps {
  title?: string;
  actions?: ReactNode;
}

const routeTitles: Record<string, string> = {
  "/app": "Dashboard",
  "/app/": "Dashboard",
  "/app/dashboard": "Dashboard",
  "/app/create": "Studio",
  "/app/creative-replicator": "Creative Replicator",
  "/app/creative-scale": "Creative AI Editor",
  "/app/ai-tools": "AI Tools",
  "/app/ugc-generator": "UGC Generator",
  "/app/projects": "Projects",
  "/app/gallery": "Asset Gallery",
  "/app/templates": "Templates",
  "/app/analytics": "Analytics",
  "/app/engines": "AI Engines",
  "/app/settings": "Settings",
  "/app/scene-builder": "Scene Builder",
};

export function TopBar({ title, actions }: TopBarProps) {
  const location = useLocation();
  const pageTitle = title || routeTitles[location.pathname] || "FlowScale";

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center justify-between px-6">
        {/* Left: Page Title */}
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-foreground">{pageTitle}</h1>
        </div>

        {/* Right: Project Selector + Actions + Theme + Profile */}
        <div className="flex items-center gap-3">
          <GlobalProjectIndicator />
          <div className="h-5 w-px bg-border" />
          {actions}
          <ThemeToggle />
          <UserProfileMenu />
        </div>
      </div>
    </header>
  );
}
