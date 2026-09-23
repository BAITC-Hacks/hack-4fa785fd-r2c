import Link from "next/link";
import { PagePlaceholder } from "@/components/PagePlaceholder";
import { ScoreMeter } from "@/components/ScoreMeter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default async function CatalogTaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <PagePlaceholder eyebrow="Открытый каталог / задача" title="Задача для команды" description="Здесь команда сможет изучить постановку задачи и предложить свой подход."
      action={<Button asChild variant="outline"><Link href="/catalog">Вернуться в каталог</Link></Button>}>
      <p className="placeholder-notice">Идентификатор маршрута: <code>{id}</code>. Это макет; сведения о задаче ещё не загружаются.</p>
      <div className="grid grid-cols-[1.4fr_1fr] items-start gap-6"><div className="space-y-6"><Card><CardHeader><CardTitle>Постановка задачи</CardTitle></CardHeader><CardContent className="space-y-5">{["Потребность и контекст", "Пользователи и доступные данные", "Ожидаемый результат и критерии успеха", "Ограничения и взаимодействие"].map((section) => <div key={section} className="border-b pb-4 last:border-0 last:pb-0"><h2 className="text-sm font-medium">{section}</h2><p className="mt-2 text-sm text-muted-foreground">Здесь появятся сведения, подтверждённые бизнесом.</p></div>)}</CardContent></Card><Card><CardContent><ScoreMeter /></CardContent></Card></div>
        <Card><CardHeader><CardTitle>Предложение команды</CardTitle></CardHeader><CardContent className="space-y-4"><div className="space-y-2"><Label htmlFor="proposal-idea">Идея решения</Label><Textarea id="proposal-idea" disabled placeholder="Как вы предлагаете решить задачу?" rows={3} /></div><div className="space-y-2"><Label htmlFor="proposal-plan">План работы</Label><Textarea id="proposal-plan" disabled placeholder="Основные этапы и ожидаемый результат" rows={3} /></div><div className="space-y-2"><Label htmlFor="proposal-timeline">Срок</Label><Input id="proposal-timeline" disabled placeholder="Например, две недели" /></div><div className="space-y-2"><Label htmlFor="proposal-prototype">Ссылка на прототип</Label><Input id="proposal-prototype" type="url" disabled placeholder="https://example.com" /></div><Button disabled className="w-full">Отправить отклик</Button><p className="text-xs leading-5 text-muted-foreground">Отправка ещё не подключена. Любая команда сможет откликнуться независимо от рейтинга задачи; исполнителей выбирает бизнес.</p></CardContent></Card>
      </div>
    </PagePlaceholder>
  );
}
