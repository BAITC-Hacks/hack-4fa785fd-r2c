import type { AiDebug, AiProvider } from "@/lib/types";

const providerLabels: Record<AiProvider, string> = {
  openai: "OpenAI",
  nvidia: "NVIDIA NIM",
  local: "Локальная заглушка",
};

export function AiDebugPanel({ debug, history = [] }: { debug?: AiDebug; history?: AiDebug[] }) {
  const entries = (history.length ? history : debug ? [debug] : []).slice().reverse();
  const latest = entries[0];

  return (
    <details className="rounded-lg border bg-card p-4">
      <summary className="cursor-pointer text-sm font-medium">Как работает ИИ</summary>
      {latest ? (
        <div className="mt-4 space-y-4">
          <p className="text-sm">Последний провайдер: <strong>{providerLabels[latest.provider]}</strong></p>
          <p className="text-xs leading-5 text-muted-foreground">Сохранено попыток: {entries.length}. Журнал включает ошибки и переключения провайдеров. Обновляется при перезагрузке страницы.</p>
          <div className="max-h-[36rem] space-y-3 overflow-auto">
            {entries.map((entry) => (
              <details key={entry.id} className="rounded-md border p-3">
                <summary className="cursor-pointer text-xs leading-5">
                  {providerLabels[entry.provider]} · {entry.at} · {entry.validation.success ? "Проверка пройдена" : "Есть замечания"}
                </summary>
                <dl className="mt-3 space-y-3 text-xs">
                  <div><dt className="font-medium">Попытка</dt><dd className="mt-1 break-all text-muted-foreground">{entry.id}</dd></div>
                  {[
                    ["Промпт", entry.prompt],
                    ["Входные данные", JSON.stringify(entry.input, null, 2)],
                    ["Сырой ответ", entry.rawOutput || "Ответ не получен"],
                    ["Валидация", JSON.stringify({ ...entry.validation, rejectedFields: entry.rejectedFields }, null, 2)],
                  ].map(([label, value]) => (
                    <div key={label}><dt className="font-medium">{label}</dt><dd><pre className="mt-1 max-h-64 overflow-auto rounded-md bg-muted p-3 leading-5 break-words whitespace-pre-wrap">{value}</pre></dd></div>
                  ))}
                </dl>
              </details>
            ))}
          </div>
        </div>
      ) : <p className="mt-3 text-sm leading-6 text-muted-foreground">Вызовов пока нет. После анализа здесь появятся провайдер, промпт, входные данные, сырой ответ и результат проверки.</p>}
    </details>
  );
}
