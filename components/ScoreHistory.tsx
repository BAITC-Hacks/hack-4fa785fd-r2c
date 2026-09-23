import type { Task } from "@/lib/types";

const dateFormat = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit", month: "2-digit", year: "numeric",
  hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Asia/Qyzylorda",
});

export function ScoreHistory({ history }: { history: Task["scoreHistory"] }) {
  // Saves without a score change do not create another visual milestone.
  const changes = history.filter((entry, index) => index === 0 || entry.total !== history[index - 1].total);
  return <section aria-label="История рейтинга" className="rounded-xl border bg-card p-5">
    <h2 className="font-semibold">Рост рейтинга</h2>
    {changes.length ? <>
      <p className="mt-2 break-words text-lg font-semibold text-emerald-800">Рост рейтинга: {changes.map((entry) => entry.total).join(" → ")}</p>
      <ol className="mt-3 flex max-h-48 flex-wrap gap-3 overflow-y-auto text-sm">
        {changes.map((entry, index) => <li key={`${entry.at}-${index}`} className="rounded-lg bg-secondary/50 px-3 py-2">
          <span className="font-semibold">{entry.total} / 100</span>
          <time dateTime={entry.at} className="mt-1 block text-xs text-muted-foreground">{dateFormat.format(new Date(entry.at))}</time>
        </li>)}
      </ol>
      <p className="mt-3 text-xs text-muted-foreground">Время Казахстана (UTC+5). Показаны изменения балла, включая снижение.</p>
    </> : <p className="mt-2 text-sm text-muted-foreground">История появится после сохранения карточки.</p>}
  </section>;
}
