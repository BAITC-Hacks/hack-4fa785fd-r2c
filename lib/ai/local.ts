import {
  BuildCardResultSchema,
  fieldKeys,
  type AnalyzeDraftStructuredResult,
  type Answer,
  type BuildCardResult,
  type ClarificationQuestion,
  type FieldKey,
} from "../types";
import { normalizeEvidence } from "./evidence";

export type InputLanguage = "ru" | "kk" | "en";

export function detectLanguage(text: string): InputLanguage {
  return /[әғқңөұүһі]/iu.test(text) ? "kk" : /[а-яё]/iu.test(text) ? "ru" : "en";
}

/** Field shares of the deterministic rating; context + need is one 20-point block. */
export const fieldWeights: Record<FieldKey, number> = {
  title: 0, context: 10, need: 10, users: 10, data: 20,
  constraints: 10, expectedResult: 15, successCriteria: 15,
  contact: 5, interactionFormat: 5,
};

const priority = [...fieldKeys].sort((a, b) => fieldWeights[b] - fieldWeights[a]);

const questions: Record<InputLanguage, Record<FieldKey, [string, string]>> = {
  ru: {
    title: ["Как коротко назвать задачу?", "Название нужно для публикации и поиска задачи."],
    context: ["Как сейчас устроен процесс и в чём проявляется проблема?", "Текущее состояние помогает команде понять контекст."],
    need: ["Что именно вы хотите изменить в текущем процессе?", "Потребность определяет задачу команды."],
    data: ["Какие данные или материалы доступны: источник, формат, объём и период?", "Данные помогают оценить возможность начать работу; блок даёт до 20 баллов после подтверждения."],
    expectedResult: ["Какой конкретный результат и в каком формате должна передать команда?", "Ясный результат определяет объём работы; блок даёт до 15 баллов после подтверждения."],
    successCriteria: ["По какой метрике и целевому значению вы проверите успех решения?", "Измеримый критерий позволяет проверить результат; блок даёт до 15 баллов после подтверждения."],
    constraints: ["Какие есть сроки, ограничения по технологиям и доступу?", "Ограничения помогают выбрать выполнимое решение."],
    users: ["Кто будет пользоваться решением, для каких действий и сколько таких пользователей?", "Роль и сценарий пользователя помогают спроектировать решение."],
    contact: ["Как связаться с представителем бизнеса: email, телефон или Telegram?", "Контакт позволяет уточнять задачу у бизнеса."],
    interactionFormat: ["Как и как часто бизнес готов давать обратную связь команде?", "Порядок консультаций помогает согласовать работу."],
  },
  kk: {
    title: ["Тапсырманы қысқаша қалай атаймыз?", "Жариялау және іздеу үшін атау қажет."],
    context: ["Қазіргі процесс қалай жүреді және мәселе қалай байқалады?", "Қазіргі жағдай командаға мәселені түсінуге көмектеседі."],
    need: ["Қазіргі процесте нені өзгерткіңіз келеді?", "Қажеттілік команда міндетін анықтайды."],
    data: ["Қандай деректер немесе материалдар бар: дереккөз, формат, көлем және кезең?", "Деректер жұмысты бастау мүмкіндігін анықтайды; расталған блок 20 ұпайға дейін береді."],
    expectedResult: ["Команда қандай нақты нәтижені және қандай форматта ұсынуы керек?", "Нақты нәтиже жұмыс көлемін анықтайды; расталған блок 15 ұпайға дейін береді."],
    successCriteria: ["Нәтижені қандай көрсеткіш пен мақсатты мән арқылы тексересіз?", "Өлшенетін көрсеткіш нәтижені тексеруге мүмкіндік береді; расталған блок 15 ұпайға дейін береді."],
    constraints: ["Мерзім, технология және қол жеткізу бойынша қандай шектеулер бар?", "Шектеулер орындалатын шешімді таңдауға көмектеседі."],
    users: ["Шешімді кім, қандай әрекет үшін қолданады және пайдаланушылар саны қанша?", "Пайдаланушы рөлі шешімді жобалауға көмектеседі."],
    contact: ["Бизнес өкілімен email, телефон немесе Telegram арқылы қалай байланысуға болады?", "Байланыс тапсырманы нақтылауға мүмкіндік береді."],
    interactionFormat: ["Бизнес командаға қалай және қаншалықты жиі кері байланыс береді?", "Кеңес беру тәртібі жұмысты келісуге көмектеседі."],
  },
  en: {
    title: ["What short title describes the task?", "A title is needed to publish and find the task."],
    context: ["How does the process work today, and where does the problem appear?", "The current situation helps the team understand the context."],
    need: ["What exactly should change in the current process?", "The need defines the team's task."],
    data: ["What data or materials are available: source, format, volume, and period?", "Data determines whether work can begin; this block provides up to 20 points after confirmation."],
    expectedResult: ["What concrete deliverable should the team provide, and in what format?", "A clear deliverable defines scope; this block provides up to 15 points after confirmation."],
    successCriteria: ["Which metric and target will you use to verify success?", "A measurable criterion makes results testable; this block provides up to 15 points after confirmation."],
    constraints: ["What deadlines, technology constraints, and access restrictions apply?", "Constraints help the team choose a feasible solution."],
    users: ["Who will use the solution, for which actions, and how many users are there?", "The user role and workflow guide the design."],
    contact: ["How can the team contact the business representative by email, phone, or Telegram?", "A contact lets the team clarify the task."],
    interactionFormat: ["How and how often can the business provide feedback to the team?", "A consultation process helps coordinate the work."],
  },
};

const labels: Record<InputLanguage, Record<FieldKey, string>> = {
  ru: { title: "название", context: "контекст", need: "потребность", users: "пользователи", data: "данные", constraints: "ограничения", expectedResult: "ожидаемый результат", successCriteria: "критерии успеха", contact: "контакт", interactionFormat: "формат взаимодействия" },
  kk: { title: "атау", context: "жағдай", need: "қажеттілік", users: "пайдаланушылар", data: "деректер", constraints: "шектеулер", expectedResult: "күтілетін нәтиже", successCriteria: "табыс критерийлері", contact: "байланыс", interactionFormat: "өзара әрекет форматы" },
  en: { title: "title", context: "context", need: "need", users: "users", data: "data", constraints: "constraints", expectedResult: "expected result", successCriteria: "success criteria", contact: "contact", interactionFormat: "interaction format" },
};

export function prioritizedMissing(missing: readonly FieldKey[]): FieldKey[] {
  const set = new Set(missing);
  return priority.filter((field) => set.has(field));
}

export function questionsFor(
  missing: readonly FieldKey[],
  language: InputLanguage,
  count = Math.max(3, Math.min(6, missing.length)),
): ClarificationQuestion[] {
  const missingSet = new Set(missing);
  const fields = [...prioritizedMissing(missing), ...priority.filter((field) => !missingSet.has(field))];
  return fields.slice(0, Math.max(3, Math.min(6, count))).map((field) => {
    const [question, why] = questions[language][field];
    const verification = {
      ru: `Актуальны ли указанные сведения в поле «${labels.ru[field]}»? Что нужно исправить или уточнить?`,
      kk: `«${labels.kk[field]}» өрісіндегі мәліметтер әлі өзекті ме? Нені түзету немесе нақтылау керек?`,
      en: `Is the information in “${labels.en[field]}” still accurate? What needs correcting or clarifying?`,
    };
    return { id: `question-${field}`, field, question: missingSet.has(field) ? question : verification[language], why };
  });
}

const aliases: Record<FieldKey, readonly string[]> = {
  title: ["название", "заголовок", "атау", "тақырып", "title"],
  context: ["контекст", "текущее состояние", "жағдай", "қазіргі жағдай", "context", "current situation"],
  need: ["потребность", "что изменить", "қажеттілік", "need"],
  users: ["пользователи", "пайдаланушылар", "users"],
  data: ["данные", "данные и материалы", "деректер", "data", "materials"],
  constraints: ["ограничения", "шектеулер", "constraints"],
  expectedResult: ["ожидаемый результат", "результат", "күтілетін нәтиже", "expected result", "expectedresult", "deliverable"],
  successCriteria: ["критерии успеха", "табыс критерийлері", "сәттілік өлшемдері", "success criteria", "successcriteria"],
  contact: ["контакт", "контакты", "байланыс", "contact"],
  interactionFormat: ["формат взаимодействия", "обратная связь", "өзара әрекет форматы", "кері байланыс", "interaction format", "interactionformat", "feedback"],
};

export function isUnknownAnswer(value: string): boolean {
  const normalized = normalizeEvidence(value).replace(/[.!?]+$/u, "");
  return /^(?:не знаю|неизвестно|не указано|пока не знаю|не определено|білмеймін|белгісіз|көрсетілмеген|unknown|not specified|not sure|i (?:do not|don't) know|tbd|n\/a)$/u.test(normalized);
}

/** Extract explicit labeled lines only. Unstructured text is never guessed into fields. */
export function extractLabeledFields(draftText: string): BuildCardResult {
  const card = BuildCardResultSchema.parse(Object.fromEntries(fieldKeys.map((key) => [key, null])));
  for (const line of draftText.split(/\r?\n/u)) {
    const match = /^\s*(?:[-*]\s+)?([^:：]{1,64})[:：]\s*(.*?)\s*$/u.exec(line);
    if (!match) continue;
    const label = normalizeEvidence(match[1]);
    const field = fieldKeys.find((key) => aliases[key].includes(label));
    if (field) card[field] = match[2] && !isUnknownAnswer(match[2])
      ? { value: match[2], evidence: match[2] }
      : null;
  }
  return card;
}

export function localAnalyze(draftText: string): AnalyzeDraftStructuredResult {
  const extracted = extractLabeledFields(draftText);
  const missing = fieldKeys.filter((key) => extracted[key] === null);
  return { extracted, missing, questions: questionsFor(missing, detectLanguage(draftText)) };
}

export function localBuildCard(draftText: string, answers: readonly Answer[]): BuildCardResult {
  const card = extractLabeledFields(draftText);
  for (const { field, answer } of answers) {
    card[field] = isUnknownAnswer(answer) ? null : { value: answer, evidence: answer };
  }
  return card;
}
