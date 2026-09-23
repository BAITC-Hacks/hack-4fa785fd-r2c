"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { rememberRole, roleForMode } from "@/lib/role-client";

export function RoleEntryLink({ mode, teams, href, className, children }: {
  mode: "business" | "team"; teams: { id: string }[]; href: string; className?: string; children: ReactNode;
}) {
  const router = useRouter();
  return <Link href={href} className={className} onClick={(event) => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const role = roleForMode(mode, teams);
    if (role) rememberRole(role);
    router.push(href); router.refresh();
  }}>{children}</Link>;
}
