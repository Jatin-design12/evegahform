import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  BatteryCharging,
  Bike,
  LayoutGrid,
  LogOut,
  Menu,
  RotateCcw,
  UserPlus,
  X,
} from "lucide-react";
import { signOut } from "firebase/auth";

import { auth } from "../config/firebase";
import logo from "../assets/logo.png";
import { clearAuthSession } from "../utils/authSession";

const navItem =
  "inline-flex items-center gap-2 px-4 py-3 rounded-2xl text-base transition whitespace-nowrap";
const active = "bg-brand-light text-brand-dark font-medium";
const inactive = "text-gray-600 hover:bg-gray-100";

const mobileNavItem =
  "flex items-center gap-3 px-4 py-3 rounded-2xl text-base transition";

export default function EmployeeTopbar() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      clearAuthSession();
      await signOut(auth);
    } catch {
      // ignore
    } finally {
      setMenuOpen(false);
      navigate("/", { replace: true });
    }
  };

  return (
    <header className="bg-white border-b border-evegah-border">
      {/* Mobile drawer */}
      {menuOpen ? (
        <>
          <button
            type="button"
            className="sm:hidden fixed inset-0 z-30 bg-black/40"
            aria-label="Close menu backdrop"
            onClick={() => setMenuOpen(false)}
          />

          <div className="sm:hidden fixed top-0 left-0 z-40 h-screen w-72 bg-white border-r border-evegah-border px-5 py-6 flex flex-col">
            <div className="flex items-center justify-between gap-3 mb-6">
              <img src={logo} className="h-16" alt="eVEGAH" />
              <button
                type="button"
                className="w-10 h-10 rounded-xl grid place-items-center text-gray-700 hover:bg-gray-100"
                aria-label="Close menu"
                onClick={() => setMenuOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <nav className="space-y-1 flex-1 overflow-y-auto pr-1">
              <NavLink
                to="/employee/dashboard"
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `${mobileNavItem} ${isActive ? active : inactive}`
                }
              >
                <LayoutGrid size={18} /> Dashboard
              </NavLink>

              <NavLink
                to="/employee/new-rider"
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `${mobileNavItem} ${isActive ? active : inactive}`
                }
              >
                <UserPlus size={18} /> New Rider
              </NavLink>

              <NavLink
                to="/employee/retain-rider"
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `${mobileNavItem} ${isActive ? active : inactive}`
                }
              >
                <RotateCcw size={18} /> Retain Rider
              </NavLink>

              <NavLink
                to="/employee/return-vehicle"
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `${mobileNavItem} ${isActive ? active : inactive}`
                }
              >
                <Bike size={18} /> Return Vehicle
              </NavLink>

              <NavLink
                to="/employee/battery-swap"
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `${mobileNavItem} ${isActive ? active : inactive}`
                }
              >
                <BatteryCharging size={18} /> Battery Swap
              </NavLink>
            </nav>

            <button
              type="button"
              className="mt-4 flex items-center gap-3 px-4 py-3 rounded-2xl text-red-600 hover:bg-red-50 transition"
              onClick={handleLogout}
            >
              <LogOut size={18} /> Logout
            </button>
          </div>
        </>
      ) : null}

      <div className="px-4 sm:px-8 py-3 sm:py-4 grid grid-cols-[auto,1fr,auto] items-center gap-3 sm:gap-4">
        <div className="flex items-center gap-3 flex-shrink-0">
          <button
            type="button"
            className="sm:hidden w-11 h-11 rounded-2xl border border-evegah-border bg-white grid place-items-center text-gray-700"
            aria-label="Open menu"
            onClick={() => setMenuOpen(true)}
          >
            <Menu size={18} />
          </button>

          <img src={logo} className="h-14 sm:h-24" alt="eVEGAH" />
        </div>

        {/* Desktop nav only */}
        <nav className="hidden sm:block overflow-x-auto">
          <div className="flex items-center justify-start sm:justify-center gap-2 min-w-max">
            <NavLink
              to="/employee/dashboard"
              className={({ isActive }) =>
                `${navItem} ${isActive ? active : inactive}`
              }
            >
              <LayoutGrid size={18} />
              Dashboard
            </NavLink>

            <NavLink
              to="/employee/new-rider"
              className={({ isActive }) =>
                `${navItem} ${isActive ? active : inactive}`
              }
            >
              <UserPlus size={18} />
              New Rider
            </NavLink>

            <NavLink
              to="/employee/retain-rider"
              className={({ isActive }) =>
                `${navItem} ${isActive ? active : inactive}`
              }
            >
              <RotateCcw size={18} />
              Retain Rider
            </NavLink>

            <NavLink
              to="/employee/return-vehicle"
              className={({ isActive }) =>
                `${navItem} ${isActive ? active : inactive}`
              }
            >
              <Bike size={18} />
              Return Vehicle
            </NavLink>

            <NavLink
              to="/employee/battery-swap"
              className={({ isActive }) =>
                `${navItem} ${isActive ? active : inactive}`
              }
            >
              <BatteryCharging size={18} />
              Battery Swap
            </NavLink>
          </div>
        </nav>

        <button
          type="button"
          className="inline-flex items-center gap-2 text-red-600 text-base px-3 py-2 sm:px-4 sm:py-3 rounded-2xl hover:bg-red-50 transition flex-shrink-0"
          onClick={handleLogout}
        >
          <LogOut size={16} />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
