import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  UserCog,
  Bike,
  RotateCcw,
  Repeat,
  BarChart3,
  LogOut
} from "lucide-react";

import { signOut } from "firebase/auth";

import { auth } from "../../config/firebase";

import logo from "../../assets/logo.png";

export default function AdminSidebar() {
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

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition ${
      isActive
        ? "bg-blue-50 text-blue-700"
        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
    }`;

  return (
    <aside className="w-72 shrink-0 bg-white border-r border-evegah-border h-screen px-5 py-6 sticky top-0 z-20 flex flex-col overflow-hidden">
      <div className="mb-6 flex items-center gap-3">
        <img src={logo} alt="Evegah" className="h-14 w-auto" />
        <div>
          <div className="text-sm font-semibold text-evegah-text">EV Admin</div>
          <div className="text-xs text-evegah-muted">Management</div>
        </div>
      </div>

      <nav className="space-y-1 flex-1 overflow-y-auto pr-1">
        <NavLink to="/admin/dashboard" className={linkClass}>
          <LayoutDashboard size={18} /> Dashboard
        </NavLink>

        <NavLink to="/admin/users" className={linkClass}>
          <UserCog size={18} /> Users
        </NavLink>

        <NavLink to="/admin/riders" className={linkClass}>
          <Users size={18} /> Riders
        </NavLink>

        <NavLink to="/admin/rentals" className={linkClass}>
          <Bike size={18} /> Rentals
        </NavLink>

        <NavLink to="/admin/returns" className={linkClass}>
          <RotateCcw size={18} /> Returns
        </NavLink>

        <NavLink to="/admin/battery-swaps" className={linkClass}>
          <Repeat size={18} /> Battery Swaps
        </NavLink>

        <NavLink to="/admin/analytics" className={linkClass}>
          <BarChart3 size={18} /> Analytics
        </NavLink>
      </nav>

      <button
        type="button"
        onClick={handleLogout}
        className="mt-4 flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 transition"
      >
        <LogOut size={18} /> Logout
      </button>
    </aside>
  );
}
