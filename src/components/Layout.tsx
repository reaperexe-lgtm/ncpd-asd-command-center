import TopNav from "./TopNav";
import { ReactNode } from "react";

const Layout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="px-6 py-8 max-w-7xl mx-auto">
        {children}
      </main>
    </div>
  );
};

export default Layout;
