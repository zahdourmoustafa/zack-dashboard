import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Users,
  Package2,
  FileText,
  Menu,
  ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarTrigger,
} from "@/components/ui/sidebar";

const AppSidebar = () => {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <Sidebar>
      <SidebarHeader className="flex items-center justify-between p-4">
        <div className="font-semibold text-lg">Design Dashboard</div>
        <SidebarTrigger>
          <Menu className="h-5 w-5" />
        </SidebarTrigger>
      </SidebarHeader>
      <SidebarContent>
        <div className="space-y-1 px-2 py-3">
          <Link to="/">
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start gap-2",
                isActive("/") && "bg-accent"
              )}
            >
              <LayoutDashboard className="h-5 w-5" />
              Tableau de Bord
            </Button>
          </Link>
          <Link to="/clients">
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start gap-2",
                isActive("/clients") && "bg-accent"
              )}
            >
              <Users className="h-5 w-5" />
              Clients
            </Button>
          </Link>
          <Link to="/orders">
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start gap-2",
                isActive("/orders") && "bg-accent"
              )}
            >
              <ClipboardList className="h-5 w-5" />
              Commandes
            </Button>
          </Link>
          {/* <Link to="/orders/new">
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start gap-2",
                isActive("/orders/new") && "bg-accent"
              )}
            >
              <FileText className="h-5 w-5" />
              Nouvelle Commande
            </Button>
          </Link> */}
          <Link to="/products">
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start gap-2",
                isActive("/products") && "bg-accent"
              )}
            >
              <Package2 className="h-5 w-5" />
              Produits
            </Button>
          </Link>
        </div>
      </SidebarContent>
      <SidebarFooter>
        <div className="px-4 py-3 text-xs text-muted-foreground">
          Design Dashboard v1.0.0
        </div>
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;
