import Link from "next/link";
import { PagePlaceholder } from "@/components/PagePlaceholder";
import { ScoreMeter } from "@/components/ScoreMeter";
import { ScoreBreakdown } from "@/components/ScoreBreakdown";
import { AiDebugPanel } from "@/components/AiDebugPanel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function BusinessTaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <PagePlaceholder eyebrow="Кабинет бизнеса / задача" title="Карточка задачи" description="Макет редактирования, подтверждения полей и работы с предложениями команд."
      action={<Button asChild variant="outline"><Link href="/business/tasks">К моим задачам</Link></Button>}>
      <p className="placeholder-notice">Идентификатор маршрута: <code>{id}</code>. Загрузка задачи и действия с ней пока не подключены.</p>
      <div className="grid grid-cols-[1.5fr_1fr] items-start gap-6"><div className="space-y-6">
        <Card><CardHeader><CardTitle>Сведения о задаче</CardTitle></CardHeader><CardContent><dl className="divide-y">{["Название", "Контекст", "Потребность", "Пользователи", "Данные и материалы", "Ограничения", "Ожидаемый результат", "Критерии успеха", "Контакт", "Формат взаимодействия"].map((field) => <div key={field} className="grid grid-cols-[180px_1fr] gap-4 py-3 text-sm"><dt className="font-medium">{field}</dt><dd className="text-muted-foreground">Поле карточки ещё не подключено</dd></div>)}</dl><div className="mt-5 flex gap-2"><Button disabled>Сохранить изменения</Button><Button variant="outline" disabled>Опубликовать</Button></div><p className="mt-3 text-xs text-muted-foreground">Редактирование, подтверждение и публикация будут подключены к API.</p></CardContent></Card>
        <Card><CardHeader><CardTitle>Отклики команд</CardTitle></CardHeader><CardContent className="space-y-4"><p className="text-sm leading-6 text-muted-foreground">Здесь бизнес сможет сравнить предложения и вручную выбрать одну, несколько или ни одной команды.</p><div className="flex flex-wrap gap-2"><Button size="sm" disabled>Принять отклик</Button><Button variant="outline" size="sm" disabled>Отклонить</Button><Button variant="outline" size="sm" disabled>Подтвердить этап · +50</Button></div><p className="text-xs text-muted-foreground">Список откликов и начисление баллов пока не подключены.</p></CardContent></Card>
        <AiDebugPanel />
      </div><Card className="sticky top-6"><CardContent className="space-y-6"><ScoreMeter /><div><h2 className="mb-2 text-sm font-semibold">Из чего складывается рейтинг</h2><ScoreBreakdown /></div></CardContent></Card></div>
    </PagePlaceholder>
  );
}
