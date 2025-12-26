import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { TopBar } from "@/components/TopBar";
import { ReactNode } from "react";
import { usePipelineNotifications } from "@/hooks/usePipelineNotifications";
import { ProjectGate } from "@/components/project";
import { useLocation } from "react-router-dom";

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  actions?: ReactNode;
}

// Routes that don't require a project context
const BYPASS_PROJECT_ROUTES = [
  '/app',           // Dashboard
  '/app/',          // Dashboard with trailing slash
  '/app/dashboard', // Explicit dashboard route
  '/app/projects',  // Projects page (manages projects)
  '/app/settings',  // Settings page
  '/app/engines',   // AI Engines page
  '/app/analytics', // Analytics page
];

export function Layout({ children, title, actions }: LayoutProps) {
  const location = useLocation();

  // Enable system-wide pipeline job notifications with progress updates
  usePipelineNotifications({
    enabled: true,
    notifyOn: ['completed', 'failed', 'progress'],
    progressInterval: 25, // Notify at 25%, 50%, 75%
  });

  // Check if current route should bypass project requirement
  const bypassProject = BYPASS_PROJECT_ROUTES.includes(location.pathname);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <TopBar title={title} actions={actions} />
          <main className="flex-1 overflow-auto scrollbar-thin flex flex-col">
            <ProjectGate bypass={bypassProject}>
              {children}
            </ProjectGate>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
