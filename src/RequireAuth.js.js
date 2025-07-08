import { useEffect, useState } from "react";
import { auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { Navigate } from "react-router-dom";

export default function RequireAuth({ children }) {
  const [user, setUser] = useState(undefined); // undefined = loading
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => setUser(u || null));
    return () => unsub();
  }, []);

  if (user === undefined) return <p>Đang kiểm tra đăng nhập...</p>;
  if (!user) return <Navigate to="/login" />;

  return children;
}
