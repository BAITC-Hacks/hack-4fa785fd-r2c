import { BusinessTaskWizard } from "@/components/BusinessTaskWizard";

export const dynamic = "force-dynamic";

export default function NewTaskPage() {
  return <div className="space-y-7">
    <header className="max-w-3xl space-y-3">
      <p className="eyebrow">Кабинет бизнеса · создание задачи</p>
      <h1 className="text-4xl font-semibold tracking-tight">Превратите идею в понятную задачу</h1>
      <p className="text-base leading-7 text-muted-foreground">Опишите вызов, ответьте на уточнения и подтвердите поля карточки. Рейтинг пересчитывается по мере заполнения.</p>
    </header>
    <BusinessTaskWizard />
  </div>;
}
