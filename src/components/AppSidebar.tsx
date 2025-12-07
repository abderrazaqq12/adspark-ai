import { Home, Video, FileText, Settings, Sparkles, FolderOpen, LogOut, Cpu, PlaySquare, BarChart3, FlaskConical, LayoutTemplate, ChevronLeft, ChevronRight, Zap, Layers } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CreditsDisplay } from "@/components/CreditsDisplay";
import { Button } from "@/components/ui/button";
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
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

const navigationItems = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Quick Generate", url: "/quick-generate", icon: Zap },
  { title: "Studio", url: "/studio", icon: Layers },
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
  const { open, toggleSidebar } = useSidebar();
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
    <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar">
      <SidebarContent className="py-2">
        {/* Logo/Brand */}
        <div className={`flex items-center gap-3 px-3 py-4 ${open ? '' : 'justify-center'}`}>
          <div className="w-9 h-9 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow shrink-0">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          {open && (
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-base text-sidebar-foreground truncate">VideoAI</span>
              <span className="text-[11px] text-muted-foreground truncate">Ad Generator</span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <SidebarGroup className="px-2">
          <SidebarGroupLabel className={`text-[11px] uppercase tracking-wider text-muted-foreground/70 font-semibold mb-1 ${open ? 'px-2' : 'sr-only'}`}>
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="h-10">
                    <NavLink 
                      to={item.url} 
                      end={item.url === "/"}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-all duration-200 ${!open ? 'justify-center px-0' : ''}`}
                      activeClassName="bg-primary/10 text-primary font-medium shadow-sm"
                    >
                      <item.icon className="w-[18px] h-[18px] shrink-0" />
                      {open && <span className="truncate">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Separator */}
        <div className={`my-3 ${open ? 'mx-4' : 'mx-2'}`}>
          <div className="h-px bg-sidebar-border" />
        </div>

        {/* Tools */}
        <SidebarGroup className="px-2">
          <SidebarGroupLabel className={`text-[11px] uppercase tracking-wider text-muted-foreground/70 font-semibold mb-1 ${open ? 'px-2' : 'sr-only'}`}>
            Tools
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {toolsItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="h-10">
                    <NavLink 
                      to={item.url}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-all duration-200 ${!open ? 'justify-center px-0' : ''}`}
                      activeClassName="bg-primary/10 text-primary font-medium shadow-sm"
                    >
                      <item.icon className="w-[18px] h-[18px] shrink-0" />
                      {open && <span className="truncate">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      <SidebarFooter className="border-t border-sidebar-border p-3 space-y-2">
        {open && <CreditsDisplay />}
        
        {/* Logout Button */}
        <SidebarMenuButton 
          onClick={handleLogout}
          className={`w-full rounded-lg h-10 text-destructive hover:bg-destructive/10 transition-colors ${open ? 'justify-start px-3 gap-3' : 'justify-center px-0'}`}
        >
          <LogOut className="w-[18px] h-[18px] shrink-0" />
          {open && <span className="text-sm">Logout</span>}
        </SidebarMenuButton>

        {/* Collapse Toggle Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleSidebar}
          className={`w-full h-9 rounded-lg border border-sidebar-border bg-sidebar-accent/50 hover:bg-sidebar-accent text-muted-foreground hover:text-foreground transition-all ${open ? 'justify-between px-3' : 'justify-center px-0'}`}
        >
          {open && <span className="text-xs">Collapse</span>}
          {open ? (
            <ChevronLeft className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
