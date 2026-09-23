"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { requestJson } from "@/lib/client-api";
import { AnalyzeDraftResponseSchema, BuildCardResponseSchema, CardSchema, TaskSchema, fieldKeys, type AiDebug, type AnalyzeDraftResponse, type BuildCardResult, type Task } from "@/lib/types";
import { AiDebugPanel } from "./AiDebugPanel";
import { TaskEditor } from "./TaskEditor";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";

export function BusinessTaskWizard({ initialBusinessName = "Кофейня «Дала»" }: { initialBusinessName?: string }) {
  const router = useRouter();
  const [businessName, setBusinessName] = useState(initialBusinessName);
  const [industry, setIndustry] = useState("Общепит");
  const [draftText, setDraftText] = useState("");
  const [analysis, setAnalysis] = useState<AnalyzeDraftResponse | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [built, setBuilt] = useState<BuildCardResult | null>(null);
  const [task, setTask] = useState<Task | null>(null);
  const [history, setHistory] = useState<AiDebug[]>([]);
  const [pending, setPending] = useState("");
  const lock = useRef(false);
  const [error, setError] = useState("");
  async function run(message: string, action: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true; setPending(message); setError("");
    try { await action(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Не удалось выполнить действие. Попробуйте ещё раз."); }
    finally { lock.current = false; setPending(""); }
  }
  function analyze() {
    void run("Анализируем черновик…", async () => {
      const result = await requestJson("/api/ai/analyze", AnalyzeDraftResponseSchema, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ draftText, industry }) });
      setAnalysis(result); setAnswers({}); setBuilt(null); setHistory((current) => [...current, result.debug]);
    });
  }
  function buildAndSave() {
    if (!analysis) return;
    void run("Собираем и сохраняем карточку…", async () => {
      const inputAnswers = analysis.questions.map((question) => ({ questionId: question.id, field: question.field, answer: answers[question.id]?.trim() ?? "" })).filter((answer) => answer.answer);
      let result = built;
      if (!result) {
        const response = await requestJson("/api/ai/build-card", BuildCardResponseSchema, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ draftText, answers: inputAnswers }) });
        result = response.card; setBuilt(result); setHistory((current) => [...current, response.debug]);
      }
      const fields = result;
      const card = CardSchema.parse(Object.fromEntries(fieldKeys.map((key) => [key, {
        value: fields[key]?.value ?? "", evidence: fields[key]?.evidence, confirmed: false,
        source: inputAnswers.some((answer) => answer.field === key && answer.answer === fields[key]?.value) ? "user_answer" : "ai_extracted",
      }])));
      const saved = await requestJson("/api/tasks", TaskSchema, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ businessName, industry, draftText, card }) });
      setTask(saved);
      document.cookie = `taskready-role=${encodeURIComponent(JSON.stringify({ kind: "business", businessName: saved.businessName }))}; Path=/; Max-Age=31536000; SameSite=Lax${window.location.protocol === "https:" ? "; Secure" : ""}`;
      router.refresh();
    });
  }
  return <div className="space-y-6">
    <p className="text-sm text-muted-foreground">Черновик → вопросы → предварительный рейтинг → подтверждение карточки → публикация</p>
    {error && <p role="alert" className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">{error}</p>}
    {pending && <p role="status">{pending} Ответ ИИ может занять около минуты.</p>}
    {task ? <TaskEditor key={task.id} initialTask={task} redirectAfterPublish /> : <Card><CardHeader><CardTitle>{analysis ? "Уточните задачу" : "Опишите задачу своими словами"}</CardTitle></CardHeader><CardContent>
      <fieldset disabled={Boolean(pending)} className="space-y-5">
        {!analysis ? <>
          <div className="space-y-2"><Label htmlFor="business-name">Название бизнеса</Label><Input id="business-name" value={businessName} onChange={(event) => setBusinessName(event.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="industry">Отрасль</Label><Input id="industry" value={industry} onChange={(event) => setIndustry(event.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="draft-text">Черновик задачи</Label><Textarea id="draft-text" rows={5} value={draftText} onChange={(event) => setDraftText(event.target.value)} /></div>
          <Button disabled={!draftText.trim() || !industry.trim() || !businessName.trim()} onClick={analyze}>Уточнить задачу</Button>
        </> : <>
          <p className="rounded-lg bg-secondary/35 p-4 text-sm">{draftText}</p>
          {analysis.questions.map((question) => <div key={question.id} className="space-y-2"><Label htmlFor={question.id}>{question.question}</Label><p className="text-xs text-muted-foreground">{question.why}</p><Textarea id={question.id} value={answers[question.id] ?? ""} onChange={(event) => { setBuilt(null); setAnswers((current) => ({ ...current, [question.id]: event.target.value })); }} /></div>)}
          <p className="text-sm text-muted-foreground">Можно пропустить неизвестные сведения и заполнить их в карточке.</p>
          <div className="flex gap-3"><Button variant="outline" onClick={() => { setAnalysis(null); setBuilt(null); setError(""); }}>К черновику</Button><Button onClick={buildAndSave}>{built ? "Повторить сохранение карточки" : "Собрать карточку"}</Button></div>
        </>}
      </fieldset>
    </CardContent></Card>}
    <AiDebugPanel history={history} />
  </div>;
}
