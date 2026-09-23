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
    <nav aria-label="Основная навигация" className="flex items-center gap-1">
      {links.map(({ href, label }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link key={href} href={href} aria-current={active ? "page" : undefined}
            className={`rounded-md px-3 py-2 text-sm transition-colors hover:bg-secondary ${active ? "bg-secondary font-medium text-primary" : "text-muted-foreground"}`}>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
