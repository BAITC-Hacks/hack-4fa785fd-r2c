"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Role, Team } from "@/lib/types";

interface RoleSwitcherProps {
  initialRole: Role;
  teams: Team[];
}

export function RoleSwitcher({ initialRole, teams }: RoleSwitcherProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selection, setSelection] = useState(initialRole.kind === "business" ? "business" : initialRole.teamId);
  const businessName = initialRole.kind === "business" ? initialRole.businessName : "Кофейня «Дала»";

  function changeRole(value: string) {
    const role: Role = value === "business" ? { kind: "business", businessName } : { kind: "team", teamId: value };
    document.cookie = `taskready-role=${encodeURIComponent(JSON.stringify(role))}; Path=/; Max-Age=31536000; SameSite=Lax${window.location.protocol === "https:" ? "; Secure" : ""}`;
    setSelection(value);
    startTransition(() => router.refresh());
  }

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="role-switcher" className="sr-only">Демонстрационная роль</label>
      <select id="role-switcher" value={selection} onChange={(event) => changeRole(event.target.value)} disabled={pending}
        className="role-select">
        <option value="business">Бизнес: {businessName}</option>
        {teams.map((team) => <option key={team.id} value={team.id}>Команда: {team.name}</option>)}
      </select>
      <span role="status" className="sr-only">{pending ? "Переключаем роль" : "Роль сохранена"}</span>
    </div>
  );
}
