import { Outlet, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { isLoggedIn } from "../lib/auth";
import { Sidebar } from "./Sidebar";

export function Layout() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoggedIn()) navigate("/login", { replace: true });
  }, [navigate]);

  if (!isLoggedIn()) return null;

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
