import { BusinessTaskWizard } from "@/components/BusinessTaskWizard";
import { cookies } from "next/headers";
import { RoleSchema } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function NewTaskPage() {
  let businessName = "Кофейня «Дала»";
  const saved = (await cookies()).get("taskready-role")?.value;
  try {
    const role = RoleSchema.safeParse(JSON.parse(decodeURIComponent(saved ?? "")));
    if (role.success && role.data.kind === "business") businessName = role.data.businessName;
  } catch { /* Use the default demo business. */ }
  return <div className="space-y-7">
    <header className="max-w-3xl space-y-3">
      <p className="eyebrow">Кабинет бизнеса · создание задачи</p>
      <h1 className="text-4xl font-semibold tracking-tight">Превратите идею в понятную задачу</h1>
      <p className="text-base leading-7 text-muted-foreground">Опишите вызов, ответьте на уточнения и подтвердите поля карточки. Рейтинг пересчитывается по мере заполнения.</p>
    </header>
    <BusinessTaskWizard initialBusinessName={businessName} />
  </div>;
}
