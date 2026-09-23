import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { Navigation } from "@/components/Navigation";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import { ArrowUpRight } from "lucide-react";
import { readDb } from "@/lib/store";
import { RoleSchema, type Role } from "@/lib/types";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "TaskReady — задачи и команды", template: "%s · TaskReady" },
  description: "Платформа подготовки бизнес-задач и открытого выбора студенческих команд.",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const db = await readDb();
  const cookieStore = await cookies();
  let role: Role = { kind: "business", businessName: "Кофейня «Дала»" };
  const savedRole = cookieStore.get("taskready-role")?.value;
  if (savedRole) {
    try {
      const parsed = RoleSchema.safeParse(JSON.parse(decodeURIComponent(savedRole)));
      if (parsed.success) {
        const saved = parsed.data;
        if (saved.kind === "business" || db.teams.some((team) => team.id === saved.teamId)) role = saved;
      }
    } catch { /* An invalid demo cookie falls back to the business role. */ }
  }

  return (
    <html lang="ru"><body>
      <header className="site-header page-shell">
        <div className="header-meta"><span>Бизнес × студенческие команды</span><span>HackAlem AI · AI Sana</span></div>
        <div className="header-bar">
          <Link href="/" className="brand" aria-label="TaskReady — главная"><span className="brand-symbol"><ArrowUpRight className="size-7" /></span><span>TaskReady<span className="text-primary">.</span></span></Link>
          <Navigation mode={role.kind} /><RoleSwitcher key={JSON.stringify(role)} initialRole={role} teams={db.teams} businesses={[...new Set(db.tasks.map((task) => task.businessName))]} />
        </div>
      </header>
      <main className="page-shell min-h-[calc(100vh-220px)] py-10">{children}</main>
      <footer className="page-shell"><div className="site-footer"><Link href="/" className="text-lg font-semibold tracking-tight">TaskReady<span className="text-primary">.</span></Link><span>Понятные задачи. Совместные результаты.</span><Link href="/catalog">К новым возможностям ↗</Link></div></footer>
    </body></html>
  );
}
