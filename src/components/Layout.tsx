import SlideshowBackground from "./SlideshowBackground";
import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";

const Layout = ({ children }: { children: ReactNode }) => {
  return (
    <SidebarProvider>
      <div className="min-h-screen relative flex w-full">
        <SlideshowBackground />
        <div className="relative z-10 flex w-full">
          <AppSidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <header className="sticky top-0 z-40 h-12 flex items-center gap-2 px-3 bg-background/80 backdrop-blur-md border-b border-border">
              <SidebarTrigger />
            </header>
            <main className="flex-1 px-3 py-4 sm:px-6 sm:py-8 max-w-7xl w-full mx-auto">
              {children}
            </main>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Layout;
