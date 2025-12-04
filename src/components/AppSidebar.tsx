import { Home, Video, FileText, Settings, Sparkles, FolderOpen, LogOut, Cpu, PlaySquare, BarChart3, FlaskConical, LayoutTemplate } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CreditsDisplay } from "@/components/CreditsDisplay";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

const navigationItems = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Create Video", url: "/create", icon: Video },
  { title: "My Projects", url: "/projects", icon: FolderOpen },
  { title: "Video Library", url: "/videos", icon: PlaySquare },
  { title: "Templates", url: "/templates", icon: LayoutTemplate },
];

const toolsItems = [
  { title: "Scene Builder", url: "/scene-builder", icon: FileText },
  { title: "A/B Testing", url: "/ab-testing", icon: FlaskConical },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "AI Engines", url: "/engines", icon: Cpu },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { open } = useSidebar();
  const navigate = useNavigate();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Failed to logout");
    } else {
      navigate("/auth");
    }
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarContent>
        {/* Logo/Brand */}
        <div className="px-4 py-6 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            {open && (
              <div className="flex flex-col">
                <span className="font-bold text-lg text-sidebar-foreground">VideoAI</span>
                <span className="text-xs text-muted-foreground">Ad Generator</span>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      end={item.url === "/"}
                      className="hover:bg-sidebar-accent transition-colors"
                      activeClassName="bg-sidebar-accent text-primary font-medium border-l-2 border-primary"
                    >
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Tools */}
        <SidebarGroup>
          <SidebarGroupLabel>Tools</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {toolsItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url}
                      className="hover:bg-sidebar-accent transition-colors"
                      activeClassName="bg-sidebar-accent text-primary font-medium border-l-2 border-primary"
                    >
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      <SidebarFooter className="border-t border-sidebar-border p-4 space-y-3">
        {open && <CreditsDisplay />}
        <SidebarMenuButton 
          onClick={handleLogout}
          className="w-full justify-start text-destructive hover:bg-destructive/10"
        >
          <LogOut className="w-4 h-4" />
          {open && <span>Logout</span>}
        </SidebarMenuButton>
      </SidebarFooter>
    </Sidebar>
  );
}
