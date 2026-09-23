"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, CircleCheck, Sparkles } from "lucide-react";
import { ScoreBreakdown } from "@/components/ScoreBreakdown";
import { ScoreMeter } from "@/components/ScoreMeter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { calculateScore } from "@/lib/scoring";
import { AnswerSchema, BuildCardResultSchema, CardSchema, fieldKeys, type AnalyzeDraftResult, type Answer, type BuildCardInput, type BuildCardResult, type Card as TaskCard, type CardField, type ClarificationQuestion, type FieldKey } from "@/lib/types";

type Stage = "draft" | "questions" | "card" | "rating";

const questionSet: ClarificationQuestion[] = [
  { id: "q-users", field: "users", question: "Кто сталкивается с этой проблемой и будет пользоваться решением?", why: "Команде важно понимать пользователей и их сценарий." },
  { id: "q-data", field: "data", question: "Какие данные или материалы доступны и за какой период?", why: "Это поможет оценить, с чего команда сможет начать." },
  { id: "q-success", field: "successCriteria", question: "Как вы поймёте, что решение помогло? Есть ли измеримая цель?", why: "Критерий успеха позволит проверить результат." },
];

const fieldLabels: Record<FieldKey, string> = {
  title: "Название задачи", context: "Контекст", need: "Потребность: что нужно изменить?", users: "Пользователи",
  data: "Данные и материалы", constraints: "Ограничения", expectedResult: "Ожидаемый результат",
  successCriteria: "Критерии успеха", contact: "Контакт", interactionFormat: "Формат взаимодействия",
};

const fieldHints: Record<FieldKey, string> = {
  title: "Короткое название, понятное командам.", context: "Что происходит сейчас?", need: "Какое изменение нужно бизнесу?",
  users: "Кто будет пользоваться результатом?", data: "Опишите источник, формат или период данных.",
  constraints: "Сроки, технологии и условия доступа.", expectedResult: "Например: прототип, отчёт или дашборд.",
  successCriteria: "Добавьте измеримый показатель.", contact: "Email, телефон или Telegram.",
  interactionFormat: "Как и как часто вы будете давать обратную связь?",
};

function mockAnalyzeDraft(draftText: string, industry: string): AnalyzeDraftResult {
  void industry;
  return {
    extracted: {},
    missing: [...fieldKeys],
    questions: questionSet.map((question) => ({ ...question })),
  };
}

function mockBuildCard(input: BuildCardInput): BuildCardResult {
  const values: Record<FieldKey, { value: string; evidence: string } | null> = Object.fromEntries(
    fieldKeys.map((field) => [field, null]),
  ) as Record<FieldKey, { value: string; evidence: string } | null>;
  const draft = input.draftText.trim();
  if (draft) values.need = { value: draft, evidence: draft };
  for (const answer of input.answers) {
    if (answer.answer.trim()) values[answer.field] = { value: answer.answer.trim(), evidence: answer.answer.trim() };
  }
  return BuildCardResultSchema.parse(values);
}

function toCard(result: BuildCardResult): TaskCard {
  return CardSchema.parse(Object.fromEntries(fieldKeys.map((field) => {
    const extracted = result[field];
    const value: CardField = extracted
      ? { value: extracted.value, evidence: extracted.evidence, confirmed: false, source: field === "need" ? "ai_extracted" : "user_answer" }
      : { value: "", confirmed: false, source: "ai_extracted" };
    return [field, value];
  })));
}

const steps: { id: Stage; label: string }[] = [
  { id: "draft", label: "Черновик" }, { id: "questions", label: "Вопросы" },
  { id: "card", label: "Карточка" }, { id: "rating", label: "Рейтинг" },
];

export function BusinessTaskWizard() {
  const [stage, setStage] = useState<Stage>("draft");
  const [businessName, setBusinessName] = useState("Кофейня «Дала»");
  const [industry, setIndustry] = useState("Общепит");
  const [draftText, setDraftText] = useState("");
  const [analysis, setAnalysis] = useState<AnalyzeDraftResult | null>(null);
  const [answerValues, setAnswerValues] = useState<Record<string, string>>({});
  const [card, setCard] = useState<TaskCard | null>(null);
  const score = useMemo(() => card ? calculateScore(card) : undefined, [card]);

  function startQuestions() {
    if (!draftText.trim()) return;
    setAnalysis(mockAnalyzeDraft(draftText, industry));
    setStage("questions");
  }

  function buildCard() {
    if (!analysis) return;
    const answers: Answer[] = AnswerSchema.array().parse(analysis.questions
      .map((question) => ({ questionId: question.id, field: question.field, answer: answerValues[question.id] ?? "" }))
      .filter((answer) => answer.answer.trim().length > 0));
    setCard(toCard(mockBuildCard({ draftText, answers })));
    setStage("card");
  }

  function updateField(field: FieldKey, value: string) {
    setCard((current) => current ? CardSchema.parse({ ...current, [field]: { ...current[field], value, confirmed: false, source: "user_edited", evidence: undefined } }) : current);
  }

  function toggleConfirmed(field: FieldKey) {
    setCard((current) => current ? CardSchema.parse({ ...current, [field]: { ...current[field], confirmed: !current[field].confirmed } }) : current);
  }

  function reset() {
    setStage("draft"); setDraftText(""); setAnalysis(null); setAnswerValues({}); setCard(null);
  }

  const stageIndex = steps.findIndex((step) => step.id === stage);

  return <div className="space-y-7">
    <ol aria-label="Этапы создания задачи" className="grid grid-cols-4 gap-2 rounded-xl border bg-card p-3 sm:p-4">
      {steps.map((step, index) => <li key={step.id} aria-current={step.id === stage ? "step" : undefined} className={`flex min-w-0 items-center gap-2 text-xs ${index <= stageIndex ? "text-primary" : "text-muted-foreground"}`}>
        <span className={`flex size-7 shrink-0 items-center justify-center rounded-full ${index < stageIndex ? "bg-primary text-primary-foreground" : index === stageIndex ? "bg-secondary font-semibold" : "bg-muted"}`}>{index < stageIndex ? <Check className="size-4" /> : index + 1}</span><span className="truncate">{step.label}</span>
      </li>)}
    </ol>

    {stage === "draft" && <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(260px,0.8fr)]">
      <Card><CardHeader><CardTitle>Опишите задачу своими словами</CardTitle><CardDescription>Начните с того, что хотите изменить. Уточняющие сведения можно добавить дальше.</CardDescription></CardHeader><CardContent className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="business-name">Название бизнеса</Label><Input id="business-name" value={businessName} onChange={(event) => setBusinessName(event.target.value)} /></div><div className="space-y-2"><Label htmlFor="industry">Отрасль</Label><Input id="industry" value={industry} onChange={(event) => setIndustry(event.target.value)} /></div></div>
        <div className="space-y-2"><Label htmlFor="draft-text">Черновик задачи</Label><Textarea id="draft-text" rows={5} value={draftText} onChange={(event) => setDraftText(event.target.value)} placeholder="Например: Клиенты стали реже возвращаться, хотим понять почему и что с этим сделать." /></div>
        <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-muted-foreground">Мок-анализ предложит вопросы без добавления сведений о бизнесе.</p><Button disabled={!draftText.trim() || !businessName.trim() || !industry.trim()} onClick={startQuestions}>Уточнить задачу <ArrowRight /></Button></div>
      </CardContent></Card>
      <Card className="bg-secondary/35 shadow-none"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Sparkles className="size-4 text-primary" />Как работает мастер</CardTitle></CardHeader><CardContent><ul className="space-y-3 text-sm leading-6 text-muted-foreground"><li>Ответьте хотя бы на те вопросы, на которые уже знаете ответ.</li><li>Проверьте и отредактируйте каждое поле карточки.</li><li>Подтверждённые поля сразу влияют на детерминированный рейтинг.</li></ul></CardContent></Card>
    </div>}

    {stage === "questions" && analysis && <Card><CardHeader><CardTitle>Несколько уточнений</CardTitle><CardDescription>Это типизированные мок-вопросы. Можно оставить ответы пустыми и дополнить карточку позже.</CardDescription></CardHeader><CardContent className="space-y-5">
      <div className="rounded-lg border bg-secondary/35 p-4 text-sm leading-6"><span className="font-medium">Ваш черновик: </span>{draftText}</div>
      {analysis.questions.map((question) => <div key={question.id} className="space-y-2"><Label htmlFor={question.id}>{question.question}</Label><Textarea id={question.id} rows={3} value={answerValues[question.id] ?? ""} onChange={(event) => setAnswerValues((current) => ({ ...current, [question.id]: event.target.value }))} placeholder={question.why} /></div>)}
      <div className="flex flex-wrap justify-between gap-3 border-t pt-5"><Button variant="outline" onClick={() => setStage("draft")}><ArrowLeft /> К черновику</Button><Button onClick={buildCard}>Собрать карточку <ArrowRight /></Button></div>
    </CardContent></Card>}

    {stage === "card" && card && <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.8fr)]">
      <Card><CardHeader><CardTitle>Проверьте карточку задачи</CardTitle><CardDescription>Подтвердите каждое поле отдельно. После редактирования его подтверждение сбрасывается.</CardDescription></CardHeader><CardContent className="space-y-5">
        {fieldKeys.map((field) => <div key={field} className="space-y-2 rounded-lg border p-4">
          <div className="flex flex-wrap items-center justify-between gap-2"><Label htmlFor={`field-${field}`}>{fieldLabels[field]}</Label><Button size="sm" variant={card[field].confirmed ? "secondary" : "outline"} onClick={() => toggleConfirmed(field)} aria-pressed={card[field].confirmed}>{card[field].confirmed ? <><CircleCheck /> Подтверждено</> : "Подтвердить поле"}</Button></div>
          <Textarea id={`field-${field}`} rows={field === "title" ? 2 : 3} value={card[field].value} onChange={(event) => updateField(field, event.target.value)} placeholder={fieldHints[field]} />
          {card[field].evidence && <p className="text-xs text-muted-foreground">Из черновика / ответа: «{card[field].evidence}»</p>}
          {!card[field].confirmed && <p className="text-xs text-muted-foreground">Без подтверждения поле не даёт баллов.</p>}
        </div>)}
        <div className="flex flex-wrap justify-between gap-3 border-t pt-5"><Button variant="outline" onClick={() => setStage("questions")}><ArrowLeft /> К вопросам</Button><Button onClick={() => setStage("rating")}>Посмотреть рейтинг <ArrowRight /></Button></div>
      </CardContent></Card>
      <Card className="lg:sticky lg:top-5"><CardHeader><CardTitle>Готовность сейчас</CardTitle></CardHeader><CardContent className="space-y-5"><ScoreMeter score={score} /><ScoreBreakdown score={score} /></CardContent></Card>
    </div>}

    {stage === "rating" && card && score && <Card><CardHeader><CardTitle>Рейтинг готовности задачи</CardTitle><CardDescription>Баллы считает код по заполненным и подтверждённым полям.</CardDescription></CardHeader><CardContent className="grid items-start gap-7 lg:grid-cols-[minmax(240px,0.8fr)_minmax(0,1.2fr)]"><div className="space-y-5"><ScoreMeter score={score} /><p className="rounded-lg border bg-secondary/35 p-4 text-sm leading-6">{businessName} · {industry}<br />{card.title.value || "Название задачи не заполнено"}</p><Button variant="outline" onClick={() => setStage("card")}><ArrowLeft /> Вернуться к карточке</Button><Button variant="ghost" onClick={reset}>Создать другую задачу</Button><p className="text-xs text-muted-foreground">Данные пока не отправляются и не сохраняются: подключение API будет добавлено позже.</p></div><ScoreBreakdown score={score} /></CardContent></Card>}
  </div>;
}
