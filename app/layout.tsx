import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { Navigation } from "@/components/Navigation";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import { Badge } from "@/components/ui/badge";
import { readDb } from "@/lib/store";
import { RoleSchema, type Role } from "@/lib/types";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "TaskReady — каркас проекта", template: "%s · TaskReady" },
  description: "Каркас платформы подготовки бизнес-задач и открытого выбора студенческих команд.",
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
      <header className="border-b bg-card">
        <div className="page-shell flex h-20 items-center justify-between gap-5">
          <Link href="/" className="flex items-center gap-2.5" aria-label="TaskReady — главная"><span className="flex size-8 items-center justify-center rounded-lg bg-primary text-base font-bold text-primary-foreground">T</span><span className="text-xl font-semibold tracking-tight">TaskReady<span className="text-primary">.</span></span></Link>
          <Navigation /><RoleSwitcher key={JSON.stringify(role)} initialRole={role} teams={db.teams} />
        </div>
      </header>
      <div className="border-b bg-secondary/50"><div className="page-shell flex h-11 items-center justify-between text-xs text-muted-foreground"><span>HackAlem AI · AI Sana</span><Badge variant="outline" className="border-primary/20 bg-card/50 text-primary">Каркас проекта</Badge><span>Бизнес × студенческие команды</span></div></div>
      <main className="page-shell min-h-[calc(100vh-207px)] py-10">{children}</main>
      <footer className="page-shell flex h-20 items-center justify-between border-t text-xs text-muted-foreground"><span>TaskReady · подготовка задач к совместной работе</span><span>Этап 01 / структура и интерфейсы</span></footer>
    </body></html>
  );
}
