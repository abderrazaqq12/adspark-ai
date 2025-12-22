import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { TopBar } from "@/components/TopBar";
import { ReactNode } from "react";
import { usePipelineNotifications } from "@/hooks/usePipelineNotifications";

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  actions?: ReactNode;
}

export function Layout({ children, title, actions }: LayoutProps) {
  // Enable system-wide pipeline job notifications with progress updates
  usePipelineNotifications({
    enabled: true,
    notifyOn: ['completed', 'failed', 'progress'],
    progressInterval: 25, // Notify at 25%, 50%, 75%
  });

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <TopBar title={title} actions={actions} />
          <main className="flex-1 overflow-auto scrollbar-thin">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
