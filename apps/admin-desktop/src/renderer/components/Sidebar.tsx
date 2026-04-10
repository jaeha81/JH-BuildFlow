import { NavLink, useNavigate } from "react-router-dom";
import { clearTokens } from "../lib/auth";

type NavItem = {
  to: string;
  label: string;
  icon: string;
};

const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "대시보드", icon: "⊞" },
  { to: "/projects", label: "프로젝트", icon: "◫" },
  { to: "/vendors", label: "협력사", icon: "◻" },
  { to: "/bid-requests", label: "발주 관리", icon: "◈" },
  { to: "/settlements", label: "정산 관리", icon: "₩" },
  { to: "/agent-monitor", label: "에이전트", icon: "◑" },
  { to: "/settings/folder", label: "폴더 설정", icon: "◎" },
];

export function Sidebar() {
  const navigate = useNavigate();

  function handleLogout() {
    clearTokens();
    navigate("/login");
  }

  return (
    <aside className="w-56 bg-gray-900 flex flex-col min-h-screen">
      <div className="px-4 py-5 border-b border-gray-800">
        <p className="text-white font-bold text-sm">JH BuildFlow</p>
        <p className="text-gray-500 text-xs mt-0.5">관리자</p>
      </div>

      <nav className="flex-1 px-2 py-4 space-y-0.5">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              }`
            }
          >
            <span className="text-base">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="px-2 py-4 border-t border-gray-800">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
        >
          <span>⎋</span>
          로그아웃
        </button>
      </div>
    </aside>
  );
}
