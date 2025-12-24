import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";

import EmployeeTopbar from "../EmployeeTopbar";
import EmployeeSidebar from "../EmployeeSidebar";
import { auth } from "../../config/firebase";
import { clearAuthSession } from "../../utils/authSession";

export default function EmployeeLayout({ children, showSidebar = false }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = useCallback(async () => {
    try {
      clearAuthSession();
      await signOut(auth);
    } catch {
      // ignore
    }
    setSidebarOpen(false);
    navigate("/", { replace: true });
  }, [navigate]);

  const openSidebar = () => {
    if (!showSidebar) return;
    setSidebarOpen(true);
  };

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="min-h-screen flex bg-evegah-bg">
      {showSidebar ? (
        <div className="hidden lg:flex flex-shrink-0 h-full border-r border-evegah-border">
          <EmployeeSidebar onLogout={handleLogout} />
        </div>
      ) : null}

      <div className="flex-1 flex flex-col overflow-hidden">
        <EmployeeTopbar
          onSidebarToggle={openSidebar}
          showSidebarButton={showSidebar}
          onLogout={handleLogout}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-8">
          <div className="space-y-6">{children}</div>
        </main>
      </div>

      {showSidebar && sidebarOpen ? (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close navigation"
            onClick={closeSidebar}
          />
          <div className="relative w-72 h-full">
            <EmployeeSidebar
              isMobile
              onClose={closeSidebar}
              onLogout={async () => {
                closeSidebar();
                await handleLogout();
              }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}