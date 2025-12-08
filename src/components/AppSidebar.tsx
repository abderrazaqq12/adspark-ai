import { Home, Video, Settings, Sparkles, FolderOpen, LogOut, Cpu, PlaySquare, BarChart3, LayoutTemplate, ChevronLeft, ChevronRight, Building2, Database, Clapperboard, Images } from "lucide-react";
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
  useSidebar,
} from "@/components/ui/sidebar";

// Main workflows - simplified to Agency Mode only
const workflowItems = [
  { title: "Agency Mode", url: "/agency", icon: Building2, description: "Batch generation" },
];

// Quick access items - Dashboard and Studio
const quickAccessItems = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Studio", url: "/create", icon: Clapperboard },
];

// Library items - Projects and Gallery
const libraryItems = [
  { title: "My Projects", url: "/projects", icon: FolderOpen },
  { title: "Asset Gallery", url: "/gallery", icon: Images },
  { title: "Templates", url: "/templates", icon: LayoutTemplate },
];

// Tools items - removed A/B Testing, added Data section
const toolsItems = [
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "AI Engines", url: "/engines", icon: Cpu },
  { title: "Data", url: "/settings?tab=data", icon: Database },
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
        {/* Logo/Brand with Dashboard */}
        <div 
          className={`flex items-center gap-3 px-3 py-4 cursor-pointer hover:bg-sidebar-accent/50 rounded-lg mx-2 transition-colors ${open ? '' : 'justify-center'}`}
          onClick={() => navigate('/')}
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow shrink-0">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          {open && (
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-base text-sidebar-foreground truncate">FlowScale</span>
              <span className="text-[11px] text-muted-foreground truncate">Video AI Studio</span>
            </div>
          )}
        </div>

        {/* Dashboard Quick Access */}
        <SidebarGroup className="px-2">
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {quickAccessItems.map((item) => (
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

        {/* Workflows - Primary Actions */}
        <SidebarGroup className="px-2">
          <SidebarGroupLabel className={`text-[11px] uppercase tracking-wider text-muted-foreground/70 font-semibold mb-1 ${open ? 'px-2' : 'sr-only'}`}>
            Workflows
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {workflowItems.map((item) => (
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

        {/* Separator */}
        <div className={`my-3 ${open ? 'mx-4' : 'mx-2'}`}>
          <div className="h-px bg-sidebar-border" />
        </div>

        {/* Library */}
        <SidebarGroup className="px-2">
          <SidebarGroupLabel className={`text-[11px] uppercase tracking-wider text-muted-foreground/70 font-semibold mb-1 ${open ? 'px-2' : 'sr-only'}`}>
            Library
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {libraryItems.map((item) => (
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