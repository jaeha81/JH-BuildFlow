import { NavLink, useNavigate } from "react-router-dom";
import { clearTokens } from "../lib/auth";

type NavItem = {
  to: string;
  label: string;
  icon: string;
  accent?: string; // neo-brutal accent color
};

const NAV_ITEMS: NavItem[] = [
  { to: "/",              label: "대시보드",  icon: "⊞", accent: "#5B8DEF" },
  { to: "/projects",      label: "프로젝트",  icon: "◫", accent: "#4ADE80" },
  { to: "/vendors",       label: "협력사",    icon: "◻", accent: "#FFE566" },
  { to: "/bid-requests",  label: "발주 관리", icon: "◈", accent: "#FF9F43" },
  { to: "/settlements",   label: "정산 관리", icon: "₩", accent: "#FF6B6B" },
  { to: "/agent-monitor", label: "에이전트",  icon: "◑", accent: "#A78BFA" },
  { to: "/settings/folder", label: "폴더 설정", icon: "◎" },
];

export function Sidebar() {
  const navigate = useNavigate();

  function handleLogout() {
    clearTokens();
    navigate("/login");
  }

  return (
    <aside className="w-56 bg-[#1A1D27] flex flex-col min-h-screen border-r-2 border-white/10">
      {/* 로고 */}
      <div className="px-4 py-5 border-b-2 border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-[#5B8DEF] border-2 border-white flex items-center justify-center shadow-[2px_2px_0px_rgba(255,255,255,0.3)]">
            <span className="text-xs font-black text-white">JH</span>
          </div>
          <div>
            <p className="text-white font-black text-sm tracking-tight">BuildFlow</p>
            <p className="text-gray-500 text-xs font-bold uppercase">ADMIN</p>
          </div>
        </div>
      </div>

      {/* 네비게이션 */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 text-sm font-bold border-2 transition-all ${
                isActive
                  ? "bg-[#5B8DEF] text-white border-white/60 shadow-[3px_3px_0px_rgba(255,255,255,0.2)]"
                  : "text-gray-400 border-transparent hover:text-white hover:border-white/20 hover:bg-white/5"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className="text-base"
                  style={{ color: isActive ? "white" : (item.accent ?? "inherit") }}
                >
                  {item.icon}
                </span>
                {item.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* 로그아웃 */}
      <div className="px-2 py-4 border-t-2 border-white/10">
        <button
          onClick={handleLogout}
          className="
            w-full flex items-center gap-2.5 px-3 py-2 text-sm font-bold border-2
            border-[#FF6B6B]/50 text-[#FF6B6B] bg-transparent
            hover:bg-[#FF6B6B] hover:text-white hover:border-[#FF6B6B]
            hover:shadow-[3px_3px_0px_rgba(255,107,107,0.3)]
            hover:translate-x-0 transition-all
          "
        >
          <span>⎋</span>
          로그아웃
        </button>
      </div>
    </aside>
  );
}
