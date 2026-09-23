import { PagePlaceholder } from "@/components/PagePlaceholder";
import { AiDebugPanel } from "@/components/AiDebugPanel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function NewTaskPage() {
  const { aiLogs } = await readDb();
  return (
    <PagePlaceholder eyebrow="Кабинет бизнеса" title="Новая задача" description="Опишите ситуацию своими словами. Здесь появится мастер подготовки и подтверждения карточки.">
      <ol aria-label="Этапы будущего мастера" className="grid grid-cols-6 gap-2 rounded-xl border bg-card p-4">{["Черновик", "Вопросы", "Карточка", "Подтверждение", "Рейтинг", "Публикация"].map((step, index) => <li key={step} className="flex items-center gap-2 text-xs text-muted-foreground"><span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">{index + 1}</span>{step}</li>)}</ol>
      <div className="grid grid-cols-[1.5fr_1fr] items-start gap-6">
        <Card><CardHeader><CardTitle>Начните с ситуации</CardTitle></CardHeader><CardContent className="space-y-5">
          <div className="space-y-2"><Label htmlFor="business-name">Название бизнеса</Label><Input id="business-name" disabled placeholder="Кофейня «Дала»" /></div>
          <div className="space-y-2"><Label htmlFor="industry">Отрасль</Label><Input id="industry" disabled placeholder="Например, общественное питание" /></div>
          <div className="space-y-2"><Label htmlFor="draft-text">Что хотите изменить?</Label><Textarea id="draft-text" disabled rows={6} placeholder="Клиенты стали реже возвращаться, хотим понять почему и что с этим сделать." /></div>
          <Button disabled aria-describedby="wizard-status">Получить уточняющие вопросы</Button><p id="wizard-status" className="text-xs leading-5 text-muted-foreground">Форма пока не отправляет данные. Мастер и сохранение будут подключены на следующем этапе.</p>
        </CardContent></Card>
        <div className="space-y-5"><Card className="bg-secondary/35 shadow-none"><CardHeader><CardTitle className="text-base">Что появится дальше</CardTitle></CardHeader><CardContent><ul className="space-y-4 text-sm leading-6 text-muted-foreground"><li>От 3 до 6 вопросов о пробелах в задаче.</li><li>Редактируемые поля с цитатами из ваших ответов.</li><li>Подтверждение сведений и прозрачный рейтинг.</li><li>Публикация с любым уровнем готовности.</li></ul></CardContent></Card><AiDebugPanel history={aiLogs} /></div>
      </div>
    </PagePlaceholder>
  );
}
