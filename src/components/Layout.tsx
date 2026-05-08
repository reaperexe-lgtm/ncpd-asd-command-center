import SlideshowBackground from "./SlideshowBackground";
import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import QuickActionFAB from "./QuickActionFAB";
import MiniGamesEasterEgg from "./MiniGamesEasterEgg";

const Layout = ({ children }: { children: ReactNode }) => {
  return (
    <SidebarProvider>
      <div className="min-h-screen relative flex w-full">
        <SlideshowBackground />
        <div className="relative z-10 flex w-full">
          <AppSidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <header className="md:hidden sticky top-0 z-40 flex items-center gap-2 h-12 px-3 border-b border-border bg-background/80 backdrop-blur">
              <SidebarTrigger className="h-9 w-9" />
              <span className="text-primary font-bold text-sm">ASD</span>
            </header>
            <main className="flex-1 px-3 py-4 sm:px-6 sm:py-8 max-w-7xl w-full mx-auto">
              {children}
            </main>
          </div>
        </div>
        <QuickActionFAB />
        <MiniGamesEasterEgg />
      </div>
    </SidebarProvider>
  );
};

export default Layout;
