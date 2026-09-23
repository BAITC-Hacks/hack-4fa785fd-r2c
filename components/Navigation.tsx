"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Обзор" },
  { href: "/business/tasks", label: "Мои задачи" },
  { href: "/catalog", label: "Каталог" },
  { href: "/teams", label: "Команды" },
];

export function Navigation() {
  const pathname = usePathname();
  return (
    <nav aria-label="Основная навигация" className="main-navigation">
      {links.map(({ href, label }) => {
        const active = href === "/" ? pathname === "/" : href === "/business/tasks" ? pathname.startsWith("/business") : pathname.startsWith(href);
        return (
          <Link key={href} href={href} aria-current={active ? "page" : undefined}
            className={`nav-link ${active ? "nav-link-active" : ""}`}>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
