import { RoleSchema, type Role, type Team } from "./types";

export function readRoleCookie(name = "taskready-role"): Role | undefined {
  try {
    const raw = document.cookie.split("; ").find((entry) => entry.startsWith(`${name}=`))?.slice(name.length + 1);
    const parsed = RoleSchema.safeParse(JSON.parse(decodeURIComponent(raw ?? "")));
    return parsed.success ? parsed.data : undefined;
  } catch { return undefined; }
}

export function rememberRole(role: Role) {
  const write = (name: string, value: Role) => {
    document.cookie = `${name}=${encodeURIComponent(JSON.stringify(value))}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
  };
  const previous = readRoleCookie();
  if (previous) write(`taskready-last-${previous.kind}`, previous);
  write(`taskready-last-${role.kind}`, role);
  write("taskready-role", role);
}

export function roleForMode(kind: Role["kind"], teams: Pick<Team, "id">[]): Role | undefined {
  const current = readRoleCookie();
  const saved = current?.kind === kind ? current : readRoleCookie(`taskready-last-${kind}`);
  if (kind === "business") return saved?.kind === "business" ? saved : { kind: "business", businessName: "Кофейня «Дала»" };
  if (saved?.kind === "team" && teams.some((team) => team.id === saved.teamId)) return saved;
  return teams[0] ? { kind: "team", teamId: teams[0].id } : undefined;
}
