import { useEffect, useState } from "react";
import { auth } from "../config/firebase";
import { onAuthStateChanged, getIdTokenResult } from "firebase/auth";

export default function useAuth() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  const adminEmail = "adminev@gmail.com";

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setRole(null);
        setLoading(false);
        return;
      }

      try {
        const token = await getIdTokenResult(firebaseUser);
        const email = String(firebaseUser.email || "").toLowerCase();
        const derivedRole = email === adminEmail ? "admin" : (token.claims.role || "employee");

        setUser(firebaseUser);
        setRole(derivedRole);
      } catch {
        const email = String(firebaseUser.email || "").toLowerCase();
        setUser(firebaseUser);
        setRole(email === adminEmail ? "admin" : "employee");
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  return { user, role, loading };
}
