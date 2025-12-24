import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";

import EmployeeTopbar from "../EmployeeTopbar";
import EmployeeSidebar from "../EmployeeSidebar";
import { auth } from "../../config/firebase";
import { clearAuthSession } from "../../utils/authSession";

export default function EmployeeLayout({ children }) {
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

  return (
    <div className="min-h-screen flex bg-evegah-bg">
      <div className="hidden lg:flex flex-shrink-0 h-full border-r border-evegah-border">
        <EmployeeSidebar onLogout={handleLogout} />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <EmployeeTopbar
          onSidebarToggle={() => setSidebarOpen(true)}
          onLogout={handleLogout}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-8">
          <div className="space-y-6">{children}</div>
        </main>
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close navigation"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative w-72 h-full">
            <EmployeeSidebar
              isMobile
              onClose={() => setSidebarOpen(false)}
              onLogout={async () => {
                setSidebarOpen(false);
                await handleLogout();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}