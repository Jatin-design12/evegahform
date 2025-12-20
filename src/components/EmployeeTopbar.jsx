import { NavLink, useNavigate } from "react-router-dom";
import {
  BatteryCharging,
  Bike,
  LayoutGrid,
  LogOut,
  RotateCcw,
  UserPlus,
} from "lucide-react";
import { signOut } from "firebase/auth";

import { auth } from "../config/firebase";
import logo from "../assets/logo.png";

const navItem =
  "inline-flex items-center gap-2 px-4 py-3 rounded-2xl text-base transition whitespace-nowrap";
const active = "bg-brand-light text-brand-dark font-medium";
const inactive = "text-gray-600 hover:bg-gray-100";

export default function EmployeeTopbar() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch {
      // ignore
    } finally {
      navigate("/", { replace: true });
    }
  };

  return (
    <header className="bg-white border-b border-evegah-border">
      <div className="px-4 sm:px-8 py-4 grid grid-cols-[auto,1fr,auto] items-center gap-4">
        <div className="flex items-center gap-3 flex-shrink-0">
          <img src={logo} className="h-24" alt="eVEGAH" />
        </div>

        <nav className="overflow-x-auto">
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
          className="inline-flex items-center gap-2 text-red-600 text-base px-4 py-3 rounded-2xl hover:bg-red-50 transition flex-shrink-0"
          onClick={handleLogout}
        >
          <LogOut size={16} />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
