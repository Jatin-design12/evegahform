import { NavLink } from "react-router-dom";
import {
  LayoutGrid,
  UserPlus,
  RotateCcw,
  Bike,
  BatteryCharging,
  LogOut,
} from "lucide-react";
import logo from "../assets/logo.png";

const navItem =
  "flex items-center gap-3 px-4 py-2 rounded-xl text-sm transition";
const active =
  "bg-brand-light text-brand-dark font-medium";
const inactive =
  "text-gray-600 hover:bg-gray-100";

export default function EmployeeSidebar() {
  return (
    <aside className="w-64 bg-white border-r border-gray-200 h-screen flex flex-col">
      {/* LOGO */}
      <div className="p-5">
        <img src={logo} className="h-24" alt="eVEGAH" />
      </div>

      {/* NAV */}
      <nav className="px-3 space-y-1 flex-1">
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
      </nav>

      {/* LOGOUT */}
      <div className="p-4">
        <button className="flex items-center gap-2 text-red-600 text-sm">
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </aside>
  );
}
