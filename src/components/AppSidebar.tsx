import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Users,
  Package2,
  FileText,
  ClipboardList,
  LogOut,
  User as UserIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { User } from "@supabase/supabase-js";
import SignOutButton from "./auth/SignOutButton";
// import { useUser, UserButton, useClerk } from "@clerk/clerk-react";

interface AppSidebarProps {
  user: User | null | undefined;
}

const AppSidebar: React.FC<AppSidebarProps> = ({ user }) => {
  const location = useLocation();
  // const { user, isLoaded } = useUser();
  // const { signOut } = useClerk();
  const navigate = useNavigate();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <Sidebar className="border-r border-slate-200">
      <SidebarHeader className="flex items-center justify-center p-4 border-b border-slate-200">
        <img src="/logo.jpg" alt="Logo" className="h-10" />
      </SidebarHeader>
      <SidebarContent className="flex-grow">
        <nav className="flex flex-col gap-2 px-4 py-6">
          <Button
            variant={isActive("/") ? "secondary" : "ghost"}
            className="justify-start text-base font-semibold"
            onClick={() => navigate("/")}
          >
            <LayoutDashboard className="mr-3 h-5 w-5" />
            Tableau de bord
          </Button>
          <Button
            variant={isActive("/clients") ? "secondary" : "ghost"}
            className="justify-start text-base font-semibold"
            onClick={() => navigate("/clients")}
          >
            <Users className="mr-3 h-5 w-5" />
            Clients
          </Button>
          
          <Button
            variant={isActive("/orders") ? "secondary" : "ghost"}
            className="justify-start text-base font-semibold"
            onClick={() => navigate("/orders")}
          >
            <FileText className="mr-3 h-5 w-5" />
            Commandes
          </Button>

          <Button
            variant={isActive("/products") ? "secondary" : "ghost"}
            className="justify-start text-base font-semibold"
            onClick={() => navigate("/products")}
          >
            <Package2 className="mr-3 h-5 w-5" />
            Produits
          </Button>
          
          {/* <Button
            variant={isActive("/orders/create") ? "secondary" : "ghost"}
            className="justify-start text-base font-semibold"
            onClick={() => navigate("/orders/create")}
          >
            <ClipboardList className="mr-3 h-5 w-5" />
            Créer Commande
          </Button> */}
        </nav>
      </SidebarContent>
      <SidebarFooter className="p-4 border-t border-slate-200">
        {user ? (
          <div className="flex flex-col items-start space-y-2">
            <p
              className="text-sm text-gray-600 dark:text-gray-400 truncate"
              title={user.email}
            >
              {user.email}
            </p>
            <SignOutButton />
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Not signed in
          </p>
        )}
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;
