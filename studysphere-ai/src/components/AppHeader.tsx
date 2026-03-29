import { Moon, Sun, User } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function AppHeader() {
  const { isDarkMode, toggleDarkMode, userName, userEmail, logout } = useApp();

  return (
    <header className="h-14 flex items-center justify-between border-b border-border px-4 bg-background/80 backdrop-blur-sm sticky top-0 z-30">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="text-muted-foreground" />
      </div>
      <div className="flex items-center gap-3">
        {/* Dark Mode Toggle */}
        <Button variant="ghost" size="icon" onClick={toggleDarkMode} className="text-muted-foreground hover:text-foreground">
          {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        {/* User Avatar Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-medium">
                  {userName.split(" ").map(n => n[0]).join("")}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="font-medium">{userName}</span>
                <span className="text-xs text-muted-foreground">{userEmail}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-destructive cursor-pointer">
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
