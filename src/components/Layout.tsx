import { Outlet } from "react-router-dom";
import { useState } from "react";
import AppSidebar from "./AppSidebar";
import Header from "./Header";
import { useIsMobile } from "@/hooks/use-mobile";
import { useDocumentNotifications } from "@/hooks/useDocumentNotifications";

export default function Layout() {
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  useDocumentNotifications();

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      {!isMobile && <AppSidebar />}

      {/* Mobile overlay sidebar */}
      {isMobile && sidebarOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 w-64">
            <AppSidebar onClose={() => setSidebarOpen(false)} />
          </div>
        </>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <Header onToggleSidebar={() => setSidebarOpen((v) => !v)} />
        <main className="flex-1 p-4 md:p-8 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
