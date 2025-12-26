import { Home, Settings, Sparkles, FolderOpen, Cpu, BarChart3, LayoutTemplate, ChevronLeft, ChevronRight, Clapperboard, Images, Wand2, SlidersHorizontal, Scale, Video } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useNavigate } from "react-router-dom";
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

// Main workflows - Studio + UGC Generator + Creative Replicator + Creative Scale + AI Tools
const workflowItems = [
  { title: "Studio", url: "/app/create", icon: Clapperboard },
  { title: "UGC Generator", url: "/app/ugc-generator", icon: Video },
  { title: "Creative Replicator", url: "/app/creative-replicator", icon: SlidersHorizontal },
  { title: "Creative AI Editor", url: "/app/creative-scale", icon: Scale },
  { title: "AI Tools", url: "/app/ai-tools", icon: Wand2 },
];

// Quick access items - Dashboard only
const quickAccessItems = [
  { title: "Dashboard", url: "/app", icon: Home },
];

// Library items - Projects and Gallery
const libraryItems = [
  { title: "Projects", url: "/app/projects", icon: FolderOpen },
  { title: "Assets", url: "/app/gallery", icon: Images },
  { title: "Templates", url: "/app/templates", icon: LayoutTemplate },
];

// Tools items
const toolsItems = [
  { title: "Analytics", url: "/app/analytics", icon: BarChart3 },
  { title: "AI Engines", url: "/app/engines", icon: Cpu },
  { title: "Settings", url: "/app/settings", icon: Settings },
];

export function AppSidebar() {
  const { open, toggleSidebar } = useSidebar();
  const navigate = useNavigate();

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar">
      <SidebarContent className="py-2">
        {/* Logo/Brand */}
        <div
          className={`flex items-center gap-3 px-3 py-4 cursor-pointer hover:bg-sidebar-accent/50 rounded-lg mx-2 transition-colors ${open ? '' : 'justify-center'}`}
          onClick={() => navigate('/app')}
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow shrink-0">
            <Sparkles className="w-4 h-4 text-primary-foreground" />
          </div>
          {open && (
            <span className="font-semibold text-sidebar-foreground">FlowScale</span>
          )}
        </div>

        {/* Dashboard Quick Access */}
        <SidebarGroup className="px-2 mt-2">
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {quickAccessItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="h-8">
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className={`flex items-center gap-3 rounded-md px-3 py-1.5 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors ${!open ? 'justify-center px-0' : ''}`}
                      activeClassName="bg-primary text-primary-foreground font-medium shadow-sm"
                    >
                      <item.icon className="w-4 h-4 shrink-0" />
                      {open && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Separator */}
        <div className={`my-2 ${open ? 'mx-4' : 'mx-2'}`}>
          <div className="h-px bg-sidebar-border" />
        </div>

        {/* Workflows - Primary Actions */}
        <SidebarGroup className="px-2">
          <SidebarGroupLabel className={`text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium mb-1 ${open ? 'px-2' : 'sr-only'}`}>
            Create
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {workflowItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="h-8">
                    <NavLink
                      to={item.url}
                      className={`flex items-center gap-3 rounded-md px-3 py-1.5 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors ${!open ? 'justify-center px-0' : ''}`}
                      activeClassName="bg-primary text-primary-foreground font-medium shadow-sm"
                    >
                      <item.icon className="w-4 h-4 shrink-0" />
                      {open && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Separator */}
        <div className={`my-2 ${open ? 'mx-4' : 'mx-2'}`}>
          <div className="h-px bg-sidebar-border" />
        </div>

        {/* Library */}
        <SidebarGroup className="px-2">
          <SidebarGroupLabel className={`text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium mb-1 ${open ? 'px-2' : 'sr-only'}`}>
            Library
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {libraryItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="h-8">
                    <NavLink
                      to={item.url}
                      className={`flex items-center gap-3 rounded-md px-3 py-1.5 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors ${!open ? 'justify-center px-0' : ''}`}
                      activeClassName="bg-primary text-primary-foreground font-medium shadow-sm"
                    >
                      <item.icon className="w-4 h-4 shrink-0" />
                      {open && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Separator */}
        <div className={`my-2 ${open ? 'mx-4' : 'mx-2'}`}>
          <div className="h-px bg-sidebar-border" />
        </div>

        {/* Tools */}
        <SidebarGroup className="px-2">
          <SidebarGroupLabel className={`text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium mb-1 ${open ? 'px-2' : 'sr-only'}`}>
            System
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {toolsItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="h-8">
                    <NavLink
                      to={item.url}
                      className={`flex items-center gap-3 rounded-md px-3 py-1.5 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors ${!open ? 'justify-center px-0' : ''}`}
                      activeClassName="bg-primary text-primary-foreground font-medium shadow-sm"
                    >
                      <item.icon className="w-4 h-4 shrink-0" />
                      {open && <span>{item.title}</span>}
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

        {/* Collapse Toggle Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleSidebar}
          className={`w-full h-8 rounded-md border border-sidebar-border bg-sidebar-accent/30 hover:bg-sidebar-accent text-muted-foreground hover:text-foreground transition-colors ${open ? 'justify-between px-3' : 'justify-center px-0'}`}
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