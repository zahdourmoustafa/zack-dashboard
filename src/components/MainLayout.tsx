import React from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import AppSidebar from "@/components/AppSidebar";
import MobileHeader from "@/components/MobileHeader";
import { Session } from "@supabase/supabase-js";

interface MainLayoutProps {
  children: React.ReactNode;
  session: Session | null;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children, session }) => {
  const user = session?.user;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar user={user} />
        <div className="flex flex-col flex-1 w-full">
          <MobileHeader />
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default MainLayout;
