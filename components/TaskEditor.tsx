"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { saveTaskCard, publishTask } from "@/lib/task-client";
import { fieldKeys, type Card as TaskCard, type FieldKey, type Task } from "@/lib/types";
import { ScoreMeter } from "./ScoreMeter";
import { ScoreBreakdown } from "./ScoreBreakdown";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";

const labels: Record<FieldKey, string> = {
  title: "Название", context: "Контекст", need: "Потребность", users: "Пользователи",
  data: "Данные и материалы", constraints: "Ограничения", expectedResult: "Ожидаемый результат",
  successCriteria: "Критерии успеха", contact: "Контакт", interactionFormat: "Формат взаимодействия",
};

export function TaskEditor({ initialTask, redirectAfterPublish = false }: { initialTask: Task; redirectAfterPublish?: boolean }) {
  const router = useRouter();
  const [card, setCard] = useState(initialTask.card);
  const latest = useRef(card);
  const queue = useRef(Promise.resolve());
  const version = useRef(0);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  const [publishing, setPublishing] = useState(false);
  const publishLock = useRef(false);
  const [published, setPublished] = useState(initialTask.status === "published");
  const [position, setPosition] = useState<{ position: number; total: number } | null>(null);
  const [ratingStage, setRatingStage] = useState(false);
  const [score, setScore] = useState(initialTask.score);
  useEffect(() => {
    if (!dirty && !saving) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, saving]);

  function save(next: TaskCard) {
    const revision = ++version.current;
    latest.current = next;
    setCard(next); setDirty(true); setSaving(true); setError(""); setPosition(null);
    // Full card snapshots must reach the server in edit order.
    queue.current = queue.current.then(async () => {
      try {
        const saved = await saveTaskCard(initialTask.id, next);
        if (revision === version.current) { setScore(saved.score); setDirty(false); setError(""); }
      } catch (cause) {
        if (revision === version.current) setError(cause instanceof Error ? cause.message : "Не удалось сохранить карточку.");
      } finally { if (revision === version.current) setSaving(false); }
    });
  }
  const unconfirmed = fieldKeys.some((key) => card[key].value.trim() && !card[key].confirmed);
  const canPublish = Boolean(card.title.value.trim()) && !unconfirmed && !dirty && !saving;
  async function publish() {
    if (!canPublish || publishLock.current) return;
    publishLock.current = true; setPublishing(true); setError("");
    try {
      await queue.current;
      const { task: result, href } = await publishTask(initialTask.id);
      setScore(result.score);
      setPublished(true); setPosition({ position: result.position, total: result.total });
      if (redirectAfterPublish) router.push(href);
      else router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Не удалось опубликовать задачу."); }
    finally { publishLock.current = false; setPublishing(false); }
  }
  return <div className="space-y-5">
    <p role="status" className="text-sm text-muted-foreground">{saving ? "Сохраняем изменения…" : dirty ? "Есть несохранённые изменения" : "Все изменения сохранены"} · {published ? "Опубликована" : "Черновик"}</p>
    {error && <div role="alert" className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">{error}{dirty && <Button className="ml-3" variant="outline" disabled={saving} onClick={() => save(latest.current)}>Повторить сохранение</Button>}</div>}
    <div className="grid items-start gap-6 lg:grid-cols-[1.5fr_1fr]">
      <Card><CardHeader><CardTitle>{ratingStage ? "Рейтинг и публикация" : "Проверьте и подтвердите карточку"}</CardTitle></CardHeader><CardContent className="space-y-5">
        {!ratingStage && <fieldset disabled={publishing} className="space-y-5">{fieldKeys.map((key) => <div key={key} className="space-y-2 rounded-lg border p-4">
          <div className="flex items-center justify-between gap-3"><Label htmlFor={`task-${key}`}>{labels[key]}</Label><Button size="sm" variant={card[key].confirmed ? "secondary" : "outline"} disabled={!card[key].value.trim()} aria-pressed={card[key].confirmed} onClick={() => save({ ...latest.current, [key]: { ...latest.current[key], confirmed: !latest.current[key].confirmed } })}>{card[key].confirmed ? "Подтверждено" : "Подтвердить поле"}</Button></div>
          <Textarea id={`task-${key}`} rows={key === "title" ? 2 : 3} value={card[key].value} onChange={(event) => save({ ...latest.current, [key]: { value: event.target.value, confirmed: false, source: "user_edited" } })} />
          {card[key].evidence && <blockquote className="text-xs text-muted-foreground">Источник: «{card[key].evidence}»</blockquote>}
          {!card[key].confirmed && <p className="text-xs text-muted-foreground">Поле не даёт баллов до подтверждения.</p>}
        </div>)}</fieldset>}
        <Button variant="outline" disabled={publishing} onClick={() => setRatingStage(!ratingStage)}>{ratingStage ? "Вернуться к карточке" : "Посмотреть рейтинг"}</Button>
        <p className="text-sm text-muted-foreground">Для публикации укажите название и подтвердите все заполненные поля. Пустые поля и низкий рейтинг не препятствуют публикации.</p>
        {ratingStage && <Button disabled={!canPublish || publishing} onClick={() => void publish()}>{publishing ? "Публикуем…" : published ? "Обновить позицию в каталоге" : "Опубликовать"}</Button>}
        {position && <p role="status" className="font-medium text-primary">Ваша задача на {position.position} месте из {position.total}</p>}
        {!saving && !dirty && <div className="flex gap-4 text-sm"><Link className="text-primary underline" href={`/business/tasks/${initialTask.id}`}>Карточка и отклики</Link>{published && <Link className="text-primary underline" href={`/catalog/${initialTask.id}`}>Открыть в каталоге</Link>}</div>}
      </CardContent></Card>
      <Card className="lg:sticky lg:top-6"><CardContent className="space-y-6">{(saving || dirty) && <p role="status" className="text-sm text-muted-foreground">Показан последний сохранённый рейтинг. Новый результат появится после ответа сервера.</p>}<ScoreMeter score={score} /><ScoreBreakdown score={score} /></CardContent></Card>
    </div>
  </div>;
}
