import { Navigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";

export default function ProtectedRouteEmployee({ children }) {
  const { user, role, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/" replace />;

  if (role === "admin") {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return children;
}
