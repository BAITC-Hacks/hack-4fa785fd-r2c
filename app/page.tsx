import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const modules = [
  { title: "Постановка задачи", description: "Черновик, уточняющие вопросы и карточка для подтверждения.", href: "/business/new", label: "Открыть мастер" },
  { title: "Кабинет бизнеса", description: "Мои задачи, рейтинг готовности и ручной выбор команд.", href: "/business/tasks", label: "Открыть мои задачи" },
  { title: "Открытый каталог", description: "Опубликованные задачи всех уровней и отклики команд.", href: "/catalog", label: "Открыть каталог" },
  { title: "Прогресс команд", description: "Баллы за этапы работы, подтверждённые бизнесом.", href: "/teams", label: "Посмотреть команды" },
];

export default function HomePage() {
  return (
    <div className="space-y-10">
      <section className="grid grid-cols-[1.5fr_1fr] gap-12 rounded-2xl border bg-card p-9">
        <div className="space-y-5"><p className="eyebrow">От идеи к понятной задаче</p><h1 className="max-w-2xl text-5xl leading-[1.1] font-semibold tracking-tight">Хорошее решение<br />начинается с ясности.</h1><p className="max-w-lg text-base leading-7 text-muted-foreground">TaskReady поможет бизнесу подготовить задачу, увидеть её готовность и выбрать студенческую команду.</p>
          <div className="flex gap-3 pt-1"><Button asChild><Link href="/business/new">Создание задачи <span aria-hidden="true">→</span></Link></Button><Button asChild variant="outline"><Link href="/catalog">Каталог задач</Link></Button></div>
        </div>
        <div className="flex flex-col justify-between rounded-xl bg-secondary/60 p-6"><div><Badge variant="outline" className="bg-card">Текущий этап</Badge><h2 className="mt-4 text-xl font-semibold">Основа проекта</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">Это каркас. Страницы и контракты подготовлены; полный пользовательский сценарий предстоит подключить.</p></div>
          <div className="mt-6 grid grid-cols-3 gap-3 border-t border-primary/15 pt-5">{[["07", "страниц"], ["07", "блоков рейтинга"], ["02", "роли"]].map(([value, label]) => <div key={label}><p className="text-3xl font-semibold tabular-nums">{value}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{label}</p></div>)}</div>
        </div>
      </section>

      <section aria-labelledby="modules-heading" className="space-y-5"><div className="flex items-center justify-between"><h2 id="modules-heading" className="text-xl font-semibold">Разделы платформы</h2><span className="text-sm text-muted-foreground">Выберите роль в шапке и откройте нужный раздел</span></div>
        <div className="grid grid-cols-4 gap-4">{modules.map((module, index) => <Card key={module.href} className="gap-4 shadow-none"><CardHeader><span className="mb-3 text-xs font-medium text-primary">0{index + 1}</span><CardTitle className="text-base">{module.title}</CardTitle></CardHeader><CardContent className="flex flex-1 flex-col justify-between gap-5"><p className="text-sm leading-6 text-muted-foreground">{module.description}</p><Link className="text-sm font-medium text-primary hover:underline" href={module.href}>{module.label} <span aria-hidden="true">→</span></Link></CardContent></Card>)}</div>
      </section>

      <section className="grid grid-cols-2 gap-8 border-t pt-7"><div><p className="eyebrow">Дальнейшая реализация</p><h2 className="mt-2 text-xl font-semibold">Один сквозной сценарий</h2><p className="mt-3 max-w-lg text-sm leading-6 text-muted-foreground">Черновик → вопросы → подтверждение → рейтинг → публикация → отклик → выбор → прогресс команды.</p></div>
        <ul className="space-y-3 text-sm text-muted-foreground">{["Подключить мастер к анализу и сборке карточки", "Связать карточку с рейтингом и публикацией", "Реализовать отклики, выбор и подтверждение этапа"].map((item) => <li key={item} className="flex gap-3"><span aria-hidden="true" className="mt-0.5 size-4 shrink-0 rounded border bg-card" />{item}</li>)}</ul>
      </section>
    </div>
  );
}
