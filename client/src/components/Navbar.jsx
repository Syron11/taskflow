import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

function NavItem({ to, label, active }) {
  return (
    <Link
      to={to}
      className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
        active ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
      }`}
    >
      {label}
    </Link>
  );
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const path = location.pathname;
  const isActive = (to) => (to === "/" ? path === "/" : path.startsWith(to));

  return (
    <div className="sticky top-0 z-20 border-b bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-3 md:px-6">
        <Link
          to="/workspaces"
          className="mr-1 flex items-center gap-2 rounded-xl px-2 py-1 text-sm font-semibold text-slate-900 hover:bg-slate-100"
        >
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-slate-900 text-white">
            TF
          </span>
          <span className="hidden sm:block">TaskFlow</span>
        </Link>

        <div className="flex flex-wrap items-center gap-1">
          <NavItem
            to="/workspaces"
            label="Workspaces"
            active={isActive("/workspaces")}
          />
          <NavItem
            to="/projects"
            label="Projects"
            active={isActive("/projects")}
          />
          <NavItem to="/board" label="Board" active={isActive("/board")} />
          <NavItem
            to="/analytics"
            label="Analytics"
            active={isActive("/analytics")}
          />
        </div>

        <div className="ml-auto flex items-center gap-2">
          {user ? (
            <>
              <div className="hidden md:flex items-center gap-2 rounded-xl border bg-white px-3 py-2">
                <div className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
                  {(user?.email || "U").slice(0, 2).toUpperCase()}
                </div>
                <div className="max-w-[220px]">
                  <p className="truncate text-xs text-slate-500">
                    Logged in as
                  </p>
                  <p className="truncate text-sm font-medium text-slate-900">
                    {user.email}
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  logout();
                  navigate("/login");
                }}
                className="rounded-xl border bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="rounded-xl px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
