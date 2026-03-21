import TopNav from "./TopNav";
import SlideshowBackground from "./SlideshowBackground";
import { ReactNode } from "react";

const Layout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="min-h-screen relative">
      <SlideshowBackground />
      <div className="relative z-10">
        <TopNav />
        <main className="px-6 py-8 max-w-7xl mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
