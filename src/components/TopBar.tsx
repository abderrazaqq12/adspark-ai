import { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { UserProfileMenu } from "@/components/UserProfileMenu";
import { ThemeToggle } from "@/components/ThemeToggle";

interface TopBarProps {
  title?: string;
  actions?: ReactNode;
}

const routeTitles: Record<string, string> = {
  "/": "Dashboard",
  "/create": "Studio",
  "/creative-replicator": "Creative Replicator",
  "/creative-scale": "Creative AI Editor",
  "/ai-tools": "AI Tools",
  "/projects": "Projects",
  "/gallery": "Asset Gallery",
  "/templates": "Templates",
  "/analytics": "Analytics",
  "/engines": "AI Engines",
  "/settings": "Settings",
  "/scene-builder": "Scene Builder",
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

        {/* Right: Actions + Theme + Profile */}
        <div className="flex items-center gap-2">
          {actions}
          <ThemeToggle />
          <UserProfileMenu />
        </div>
      </div>
    </header>
  );
}
