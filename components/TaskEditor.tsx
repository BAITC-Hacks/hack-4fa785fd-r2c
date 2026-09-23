"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { saveTaskCard, publishTask } from "@/lib/task-client";
import { fieldKeys, type Card as TaskCard, type FieldKey, type Task } from "@/lib/types";
import { Check } from "lucide-react";
import { calculateScore } from "@/lib/scoring";
import { getLevel } from "@/lib/levels";
import { confirmNonemptyFields, editCardField, levelUpgradeMessage } from "@/lib/card-confirmation";
import { LevelBadge } from "./LevelBadge";
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
  const [notice, setNotice] = useState("");
  const confirmLock = useRef(false);
  const [score, setScore] = useState(initialTask.score);
  const savedScore = useRef(initialTask.score);
  // A disposable preview only: these flags are never saved without a human action.
  const preview = useMemo(() => calculateScore(confirmNonemptyFields(card)), [card]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 4000);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    if (!dirty && !saving) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, saving]);

  function save(next: TaskCard) {
    const revision = ++version.current;
    latest.current = next;
    setCard(next); setDirty(true); setSaving(true); setError(""); setNotice(""); setPosition(null);
    // Full card snapshots must reach the server in edit order.
    queue.current = queue.current.then(async () => {
      try {
        const saved = await saveTaskCard(initialTask.id, next);
        if (revision === version.current) {
          setNotice(levelUpgradeMessage(savedScore.current.level, saved.score.level));
          savedScore.current = saved.score;
          latest.current = saved.card; setCard(saved.card);
          setScore(saved.score); setDirty(false); setError("");
        }
      } catch (cause) {
        if (revision === version.current) setError(cause instanceof Error ? cause.message : "Не удалось сохранить карточку.");
      } finally { if (revision === version.current) setSaving(false); }
    });
    return queue.current;
  }
  function confirmCard() {
    if (confirmLock.current || saving || publishing) return;
    confirmLock.current = true;
    void save(confirmNonemptyFields(latest.current)).finally(() => { confirmLock.current = false; });
  }
  const hasContent = fieldKeys.some((key) => card[key].value.trim());
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
    <section className="grid items-center gap-5 rounded-xl border bg-card p-6 lg:grid-cols-[1.5fr_1fr]" aria-label="Рейтинг карточки">
      <div className="space-y-3"><h2 className="text-3xl font-semibold tracking-tight">Предварительный рейтинг: {preview.potential} / 100</h2><LevelBadge level={getLevel(preview.potential)} /><p className="text-sm text-muted-foreground">Оценка полноты карточки. Баллы начисляются только за подтверждённые вами поля.</p></div>
      <div className="rounded-lg bg-secondary/40 p-4"><p className="text-sm text-muted-foreground">Текущий подтверждённый балл</p><p className="mt-2 text-3xl font-semibold tabular-nums">{score.total} / 100</p><div className="mt-2"><LevelBadge level={score.level} /></div>{(saving || dirty) && <p className="mt-2 text-xs text-muted-foreground">Показан последний сохранённый балл.</p>}</div>
    </section>
    {notice && <p role="status" className="rounded-lg bg-emerald-50 p-3 font-medium text-emerald-800">{notice}</p>}
    <p role="status" className="text-sm text-muted-foreground">{saving ? "Сохраняем изменения…" : dirty ? "Есть несохранённые изменения" : "Все изменения сохранены"} · {published ? "Опубликована" : "Черновик"}</p>
    {error && <div role="alert" className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">{error}{dirty && <Button className="ml-3" variant="outline" disabled={saving} onClick={() => save(latest.current)}>Повторить сохранение</Button>}</div>}
    <div className="grid items-start gap-6 lg:grid-cols-[1.5fr_1fr]">
      <Card><CardHeader><CardTitle>Проверьте карточку</CardTitle></CardHeader><CardContent className="space-y-5">
        <fieldset disabled={publishing} className="space-y-5">{fieldKeys.map((key) => <div key={key} className="space-y-2 rounded-lg border p-4">
          <div className="flex items-center justify-between gap-3"><Label htmlFor={`task-${key}`}>{labels[key]}</Label>{card[key].confirmed && card[key].value.trim() && <span className="flex items-center gap-1 text-xs text-emerald-700"><Check className="size-3.5" aria-hidden="true" />подтверждено</span>}</div>
          <Textarea id={`task-${key}`} rows={key === "title" ? 2 : 3} value={card[key].value} onChange={(event) => { void save(editCardField(latest.current, key, event.target.value)); }} />
          {card[key].evidence && <blockquote className="text-xs text-muted-foreground">Источник: «{card[key].evidence}»</blockquote>}
          {!card[key].confirmed && <p className="text-xs text-muted-foreground">Поле не даёт баллов до подтверждения.</p>}
        </div>)}</fieldset>
        <Button disabled={saving || publishing || !hasContent || (!unconfirmed && !dirty)} onClick={confirmCard}>Всё верно — подтвердить карточку</Button>
        {hasContent && !unconfirmed && !dirty && !saving && <p className="flex items-center gap-1 text-sm text-emerald-700"><Check className="size-4" aria-hidden="true" />Карточка подтверждена</p>}
        <p className="text-sm text-muted-foreground">Для публикации укажите название и подтвердите карточку. Поля, которые вы редактируете вручную, подтверждаются автоматически; пустые поля не подтверждаются.</p>
        <Button disabled={!canPublish || publishing} onClick={() => void publish()}>{publishing ? "Публикуем…" : published ? "Обновить позицию в каталоге" : "Опубликовать"}</Button>
        {position && <p role="status" className="font-medium text-primary">Ваша задача на {position.position} месте из {position.total}</p>}
        {!saving && !dirty && <div className="flex gap-4 text-sm"><Link className="text-primary underline" href={`/business/tasks/${initialTask.id}`}>Карточка и отклики</Link>{published && <Link className="text-primary underline" href={`/catalog/${initialTask.id}`}>Открыть в каталоге</Link>}</div>}
      </CardContent></Card>
      <Card className="lg:sticky lg:top-6"><CardHeader><CardTitle>Что добавить</CardTitle></CardHeader><CardContent className="space-y-6">
        {preview.missing.length ? <ul className="space-y-3 text-sm">{preview.missing.map((item) => <li key={item.label}><p className="font-medium">{item.label} · +{item.points}</p><p className="mt-1 text-muted-foreground">{item.hint.replace(" и подтвердите поле", "")}</p></li>)}</ul> : <p className="text-sm text-emerald-700">Все критерии полноты выполнены.</p>}
        <details><summary className="cursor-pointer text-sm font-medium">Расшифровка подтверждённого рейтинга</summary><div className="mt-3"><ScoreBreakdown score={score} /></div></details>
      </CardContent></Card>
    </div>
  </div>;
}
