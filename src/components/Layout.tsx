import TopNav from "./TopNav";
import { ReactNode } from "react";

const Layout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="min-h-screen bg-background relative z-10">
      <TopNav />
      <main className="px-6 py-8 max-w-7xl mx-auto relative z-10">
        {children}
      </main>
    </div>
  );
};

export default Layout;
