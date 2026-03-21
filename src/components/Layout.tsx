import { Outlet } from "react-router-dom";
import TopNav from "./TopNav";
import asdLogo from "@/assets/asd-logo.png";

const Layout = () => {
  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <div className="absolute top-20 left-6 w-14 h-14 opacity-60">
        <img src={asdLogo} alt="ASD Logo" className="w-full h-full object-contain" />
      </div>
      <main className="px-6 py-8 max-w-7xl mx-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
