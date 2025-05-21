import { Button } from "@/components/ui/button";
import { PanelLeftOpen, PanelRightOpen } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";

const MobileHeader = () => {
  const { toggleSidebar, openMobile, isMobile } = useSidebar();

  // Let MainLayout decide if it should render this, or use CSS to hide/show
  // if (!isMobile) {
  //   return null;
  // }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 md:hidden">
      {/* This md:hidden ensures this specific header bar is primarily for mobile/tablet views */}
      {/* The button itself could also have md:hidden if this header were part of a larger, always-visible header */}
      <Button size="icon" variant="outline" onClick={toggleSidebar}>
        {openMobile ? (
          <PanelRightOpen className="h-5 w-5" />
        ) : (
          <PanelLeftOpen className="h-5 w-5" />
        )}
        <span className="sr-only">Toggle Menu</span>
      </Button>
      {/* Optional: Add Logo or Page Title for Mobile Header here */}
      {/* e.g., <img src="/logo.jpg" alt="Logo" className="h-6" /> */}
    </header>
  );
};

export default MobileHeader;
