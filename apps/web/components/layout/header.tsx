"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowRightStartOnRectangleIcon, SunIcon, MoonIcon,
  Bars3Icon, XMarkIcon,
} from "@heroicons/react/24/outline";
import { logout, getUser, type AuthUser } from "@/lib/auth";
import { useTheme } from "@/components/theme-provider";

const navItems = [
  { href: "/",       label: "Dashboard" },
  { href: "/find",   label: "Find" },
  { href: "/recon",  label: "Recon" },
  { href: "/exploit",label: "Exploit" },
  { href: "/logs",   label: "Logs" },
  { href: "/tools",  label: "Tools" },
];

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggle } = useTheme();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => { setUser(getUser()); }, []);

  // Close drawer on route change
  useEffect(() => { setMenuOpen(false); }, [pathname]);

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  const initial = (user?.username || "u").charAt(0).toUpperCase();

  return (
    <header className="fixed top-0 z-50 h-14 w-full border-b border-zinc-800 bg-zinc-900">
      <nav className="flex h-full w-full items-center justify-between px-3 sm:px-4 lg:px-6">

        {/* Mobile burger */}
        <button
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Toggle menu"
          className="flex items-center justify-center rounded border border-zinc-800 bg-zinc-800 p-1.5 text-zinc-400 hover:text-zinc-100 md:hidden"
        >
          {menuOpen
            ? <XMarkIcon className="h-4 w-4" />
            : <Bars3Icon className="h-4 w-4" />
          }
        </button>

        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/logo.png" alt="Unixcorn" width={30} height={30} className="rounded" />
          <div className="hidden xs:block sm:block">
            <p className="text-sm font-bold tracking-tight text-fuchsia-400 leading-tight">Unixcorn</p>
            <p className="text-[10px] text-zinc-600 leading-tight">Security Workspace</p>
          </div>
        </Link>

        {/* Desktop nav */}
        <ul className="hidden items-center gap-0.5 text-xs font-medium md:flex">
          {navItems.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`rounded px-3 py-1.5 transition-colors ${
                    active
                      ? "bg-zinc-800 text-zinc-100"
                      : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="flex items-center gap-2 rounded border border-zinc-800 bg-zinc-800 px-1.5 py-1 sm:px-2.5 sm:py-1.5">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-fuchsia-800 text-[10px] font-bold text-fuchsia-200">
              {initial}
            </div>
            <div className="hidden md:block">
              <p className="text-xs font-semibold text-zinc-300 leading-tight">{user?.username || "guest"}@unixcorn</p>
              <p className="text-[10px] text-zinc-600 leading-tight">user #{user?.user_id ?? "—"}</p>
            </div>
          </div>
          <button
            onClick={toggle}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="flex items-center justify-center rounded border border-zinc-800 bg-zinc-800 p-1.5 text-zinc-500 hover:border-zinc-600 hover:text-zinc-200 transition-colors"
          >
            {theme === "dark"
              ? <SunIcon className="h-4 w-4" />
              : <MoonIcon className="h-4 w-4" />
            }
          </button>
          <button
            onClick={handleLogout}
            title="Logout"
            className="flex items-center justify-center rounded border border-zinc-800 bg-zinc-800 p-1.5 text-zinc-500 hover:border-red-800 hover:bg-red-950 hover:text-red-400 transition-colors"
          >
            <ArrowRightStartOnRectangleIcon className="h-4 w-4" />
          </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      {menuOpen && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setMenuOpen(false)}
            className="fixed inset-0 top-14 z-40 bg-black/60 md:hidden"
          />
          {/* Drawer */}
          <div className="fixed left-0 right-0 top-14 z-50 border-b border-zinc-800 bg-zinc-900 md:hidden">
            <ul className="divide-y divide-zinc-800">
              {navItems.map((item) => {
                const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                      className={`flex items-center border-l-2 px-4 py-3 text-sm transition-colors ${
                        active
                          ? "border-l-fuchsia-500 bg-zinc-800 text-zinc-100"
                          : "border-l-transparent text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                      }`}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
            {user && (
              <div className="border-t border-zinc-800 px-4 py-2 text-[11px] text-zinc-500">
                Signed in as <span className="font-mono text-zinc-300">{user.username}</span>
              </div>
            )}
          </div>
        </>
      )}
    </header>
  );
}
