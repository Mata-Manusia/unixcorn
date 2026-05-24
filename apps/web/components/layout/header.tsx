"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { ArrowRightStartOnRectangleIcon, SunIcon, MoonIcon } from "@heroicons/react/24/outline";
import { logout } from "@/lib/auth";
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

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  return (
    <header className="fixed top-0 z-50 h-14 w-full border-b border-zinc-800 bg-zinc-900">
      <nav className="flex h-full w-full items-center justify-between px-4 lg:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/logo.png" alt="Unixcorn" width={30} height={30} className="rounded" />
          <div>
            <p className="text-sm font-bold tracking-tight text-fuchsia-400">Unixcorn</p>
            <p className="text-[10px] text-zinc-600">Security Workspace</p>
          </div>
        </Link>

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

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded border border-zinc-800 bg-zinc-800 px-2.5 py-1.5">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-fuchsia-800 text-[10px] font-bold text-fuchsia-200">
              U
            </div>
            <div className="hidden sm:block">
              <p className="text-xs font-semibold text-zinc-300">root@unixcorn</p>
              <p className="text-[10px] text-zinc-600">Administrator</p>
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
    </header>
  );
}
