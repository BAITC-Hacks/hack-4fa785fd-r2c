"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { rememberRole, roleForMode } from "@/lib/role-client";
import type { Role, Team } from "@/lib/types";

export function RoleSwitcher({ initialRole, teams, businesses = [] }: { initialRole: Role; teams: Team[]; businesses?: string[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [role, setRole] = useState(initialRole);
  function choose(next: Role) {
    rememberRole(next); setRole(next);
    startTransition(() => router.refresh());
  }
  const names = [...new Set([...(role.kind === "business" ? [role.businessName] : []), ...businesses])];
  return <div className="role-control">
    <div className="role-mode" role="group" aria-label="Выберите режим работы">
      {(["business", "team"] as const).map((kind) => <button key={kind} type="button" aria-pressed={role.kind === kind} disabled={pending || (kind === "team" && !teams.length)} onClick={() => {
        const next = roleForMode(kind, teams); if (next) choose(next);
      }}>{kind === "business" ? "Бизнес" : "Команда"}</button>)}
    </div>
    <label htmlFor="role-profile" className="sr-only">{role.kind === "business" ? "Выбранный бизнес" : "Выбранная команда"}</label>
    <select id="role-profile" className="role-profile" disabled={pending} value={role.kind === "business" ? role.businessName : role.teamId} onChange={(event) => choose(role.kind === "business" ? { kind: "business", businessName: event.target.value } : { kind: "team", teamId: event.target.value })}>
      {role.kind === "business" ? names.map((name) => <option key={name}>{name}</option>) : teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
    </select>
    <span role="status" className="sr-only">{pending ? "Переключаем режим" : "Режим сохранён"}</span>
  </div>;
}
