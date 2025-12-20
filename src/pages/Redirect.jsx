import { Navigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";

export default function Redirect() {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/" replace />;

  if (user.email.toLowerCase() === "adminev@gmail.com") {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <Navigate to="/employee/dashboard" replace />;
}
