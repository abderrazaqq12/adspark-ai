import { useState, useEffect } from "react";
import { User, Settings, LogOut, CreditCard, Moon, Sun, Monitor } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { getUser, getAuthHeaders, logout } from "@/utils/auth";
import { useTheme } from "@/components/ThemeProvider";
import { toast } from "sonner";

interface UserProfile {
  email: string | null;
  plan: string | null;
  credits: number | null;
}

export function UserProfileMenu() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [profile, setProfile] = useState<UserProfile>({
    email: null,
    plan: "Pro",
    credits: 100,
  });
  const [initials, setInitials] = useState("U");

  useEffect(() => {
    const fetchProfile = async () => {
      // VPS-ONLY: Use auth utility
      const user = getUser();
      if (!user) return;

      setInitials(user.email?.charAt(0).toUpperCase() || "A");

      try {
        const headers = getAuthHeaders();
        const res = await fetch('/api/user/profile', { headers });

        if (res.ok) {
          const data = await res.json();
          setProfile({
            email: data.email || user.email,
            plan: data.plan || "Pro",
            credits: data.credits || 100
          });
        } else {
          setProfile({
            email: user.email,
            plan: "Pro",
            credits: 100
          });
        }
      } catch (e) {
        console.error("Failed to fetch profile:", e);
        setProfile({
          email: user.email,
          plan: "Pro",
          credits: 100
        });
      }
    };

    fetchProfile();
  }, []);

  const handleLogout = () => {
    // VPS-ONLY: Use centralized logout
    logout();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-9 w-9 rounded-full">
          <Avatar className="h-9 w-9">
            <AvatarImage src="" alt="User" />
            <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64 bg-popover border-border" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{profile.email}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {profile.plan} Plan {profile.credits && `• ${profile.credits} credits`}
            </p>
            {(profile as any).mode === 'DEV_MODE' && (
              <div className="mt-1.5">
                <span className="inline-flex items-center rounded-md bg-destructive px-2 py-1 text-xs font-semibold text-destructive-foreground">
                  ⚠️ DEV MODE
                </span>
              </div>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => navigate("/settings")}>
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              {theme === "dark" ? (
                <Moon className="mr-2 h-4 w-4" />
              ) : theme === "light" ? (
                <Sun className="mr-2 h-4 w-4" />
              ) : (
                <Monitor className="mr-2 h-4 w-4" />
              )}
              Theme
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="bg-popover border-border">
              <DropdownMenuItem onClick={() => setTheme("light")}>
                <Sun className="mr-2 h-4 w-4" />
                Light
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("dark")}>
                <Moon className="mr-2 h-4 w-4" />
                Dark
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("system")}>
                <Monitor className="mr-2 h-4 w-4" />
                System
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu >
  );
}
