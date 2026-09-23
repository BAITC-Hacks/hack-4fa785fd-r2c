import Link from "next/link";
import { PagePlaceholder } from "@/components/PagePlaceholder";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function BusinessTasksPage() {
  return (
    <PagePlaceholder eyebrow="Кабинет бизнеса" title="Мои задачи" description="Здесь будут черновики и опубликованные задачи выбранного бизнеса, их рейтинг и отклики команд."
      action={<Button asChild><Link href="/business/new">Создать задачу <span aria-hidden="true">+</span></Link></Button>}>
      <div className="flex items-center gap-3 border-b pb-4"><span className="rounded-md bg-secondary px-3 py-2 text-sm font-medium text-primary">Все задачи</span><span className="text-sm text-muted-foreground">Данные ещё не подключены</span></div>
      <Card className="border-dashed shadow-none"><CardContent className="flex min-h-72 flex-col items-center justify-center gap-4 py-12 text-center"><span aria-hidden="true" className="flex size-12 items-center justify-center rounded-xl bg-secondary text-2xl text-primary">+</span><h2 className="text-xl font-semibold">Место для ваших задач</h2><p className="max-w-lg text-sm leading-6 text-muted-foreground">Каркас списка готов. После подключения сохранения здесь появятся карточки, уровень готовности и переход к работе с откликами.</p><Button asChild variant="outline"><Link href="/business/tasks/demo">Посмотреть макет карточки</Link></Button></CardContent></Card>
      <p className="placeholder-notice">Статус публикации и уровень готовности хранятся отдельно. Задача с низким рейтингом сможет участвовать в открытом каталоге.</p>
    </PagePlaceholder>
  );
}
