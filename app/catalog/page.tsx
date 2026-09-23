import Link from "next/link";
import { PagePlaceholder } from "@/components/PagePlaceholder";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { LevelBadge } from "@/components/LevelBadge";

export default function CatalogPage() {
  return (
    <PagePlaceholder eyebrow="Для студенческих команд" title="Каталог задач" description="Общий каталог будет открыт для всех команд. В нём появятся опубликованные задачи любого уровня готовности.">
      <Card className="bg-secondary/40 shadow-none"><CardHeader><CardTitle className="text-base">Рекомендовано вам</CardTitle></CardHeader><CardContent><p className="text-sm leading-6 text-muted-foreground">Для выбранной команды здесь появятся задачи с совпадающими навыками и интересами, начиная с уровня «Рабочая». Рекомендации ещё не подключены.</p></CardContent></Card>
      <section aria-labelledby="all-tasks-heading" className="space-y-5"><div className="flex items-end justify-between gap-6"><div><h2 id="all-tasks-heading" className="text-xl font-semibold">Все опубликованные задачи</h2><p className="mt-2 text-sm text-muted-foreground">Сортировка по рейтингу, при равенстве — новые выше</p></div><div className="flex gap-3"><div className="space-y-2"><Label htmlFor="industry-filter">Отрасль</Label><select id="industry-filter" disabled className="h-9 w-44 rounded-md border bg-card px-3 text-sm opacity-60"><option>Все отрасли</option></select></div><div className="space-y-2"><Label htmlFor="level-filter">Готовность</Label><select id="level-filter" disabled className="h-9 w-44 rounded-md border bg-card px-3 text-sm opacity-60"><option>Все уровни</option></select></div></div></div>
        <Card className="border-dashed shadow-none"><CardContent className="flex min-h-60 flex-col items-center justify-center gap-4 py-10 text-center"><h3 className="text-lg font-semibold">Каталог ожидает подключения</h3><p className="max-w-lg text-sm leading-6 text-muted-foreground">Список и фильтры будут связаны с API задач. Можно открыть макет страницы, которую увидит команда.</p><Button asChild variant="outline"><Link href="/catalog/demo">Посмотреть макет задачи</Link></Button></CardContent></Card>
      </section>
      <div className="flex flex-wrap items-center gap-3"><span className="mr-1 text-sm text-muted-foreground">Уровни готовности:</span><LevelBadge level="draft" /><LevelBadge level="workable" /><LevelBadge level="ready" /><LevelBadge level="priority" /></div>
    </PagePlaceholder>
  );
}
