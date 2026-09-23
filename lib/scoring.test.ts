import { describe, expect, it } from "vitest";
import { getLevel, levelLabels } from "./levels";
import { calculateScore } from "./scoring";
import { fieldKeys, type BlockKey, type Card, type FieldKey } from "./types";

const completeValues: Record<FieldKey, string> = {
  title: "Анализ возврата клиентов кофейни",
  context: "Сейчас сотрудники кофейни вручную собирают сведения о покупках и повторных визитах. На анализ уходит несколько часов каждую неделю.",
  need: "Нужно помочь владельцу находить причины снижения повторных визитов и выбирать проверяемые улучшения обслуживания.",
  users: "Владелец кофейни и 3 менеджера будут смотреть результаты анализа.",
  data: "Есть CSV с продажами за 8 недель и обезличенная таблица визитов.",
  constraints: "Прототип нужен за 2 недели; разрешён доступ только к обезличенным данным.",
  expectedResult: "Нужен дашборд с динамикой повторных визитов и выгрузкой результатов.",
  successCriteria: "Сократить время подготовки отчёта на 30% по сравнению с ручным расчётом.",
  contact: "Демо-контакт: owner@example.invalid",
  interactionFormat: "Еженедельный созвон с владельцем и обратная связь по результатам этапа.",
};

function makeCard(values: Partial<Record<FieldKey, string>> = completeValues, confirmed = true): Card {
  return Object.fromEntries(fieldKeys.map((key) => [key, {
    value: values[key] ?? "", confirmed, source: "user_edited" as const,
  }])) as Card;
}

function earned(values: Partial<Record<FieldKey, string>>, block: BlockKey): number {
  return calculateScore(makeCard(values)).blocks.find((item) => item.key === block)!.earned;
}

describe("calculateScore", () => {
  it("gives an empty card zero points", () => {
    const result = calculateScore(makeCard({}));
    expect(result.total).toBe(0);
    expect(result.potential).toBe(0);
    expect(result.level).toBe("draft");
  });

  it("gives a complete confirmed card 100 points with the required block weights", () => {
    const result = calculateScore(makeCard());
    expect(result.total).toBe(100);
    expect(result.potential).toBe(100);
    expect(result.blocks.map((block) => block.earned)).toEqual([20, 20, 15, 15, 10, 10, 10]);
    expect(result.blocks.map((block) => block.max)).toEqual([20, 20, 15, 15, 10, 10, 10]);
    expect(result.blocks.every((block) => block.checks.reduce((sum, item) => sum + item.points, 0) === block.max)).toBe(true);
    expect(result.missing).toEqual([]);
  });

  it("excludes unconfirmed values from total but includes them in potential", () => {
    const result = calculateScore(makeCard(completeValues, false));
    expect(result.total).toBe(0);
    expect(result.potential).toBe(100);
    expect(result.blocks.every((block) => block.checks.every((check) => !check.passed))).toBe(true);
  });

  it("counts confirmed fields independently within a block", () => {
    const card = makeCard(completeValues, false);
    card.context.confirmed = true;
    card.data.confirmed = true;
    card.interactionFormat.confirmed = true;
    const result = calculateScore(card);
    expect(result.total).toBe(35);
    expect(result.potential).toBe(100);
    expect(result.blocks.map((block) => block.earned)).toEqual([10, 20, 0, 0, 0, 0, 5]);
  });

  it.each(fieldKeys)("gates every check belonging to the unconfirmed %s field", (key) => {
    const card = makeCard();
    card[key].confirmed = false;
    const points: Record<FieldKey, number> = {
      title: 0, context: 10, need: 10, users: 10, data: 20,
      constraints: 10, expectedResult: 15, successCriteria: 15, contact: 5, interactionFormat: 5,
    };
    const result = calculateScore(card);
    expect(result.total).toBe(100 - points[key]);
    expect(result.potential).toBe(100);
  });

  it("recalculates when a field is edited and requires its new confirmation", () => {
    const card = makeCard();
    expect(calculateScore(card).total).toBe(100);
    card.successCriteria = { value: "Сократить время обработки заявок на 50% за неделю.", confirmed: false, source: "user_edited" };
    expect(calculateScore(card).total).toBe(85);
    expect(calculateScore(card).potential).toBe(100);
    card.successCriteria.confirmed = true;
    expect(calculateScore(card).total).toBe(100);
    card.successCriteria.value = "";
    expect(calculateScore(card).total).toBe(85);
  });

  it("uses trimmed lengths and excludes short keyword-only fields", () => {
    const card = makeCard({ data: "   CSV 100   ", users: "  2 менеджера  ", contact: "   @demo_user   " });
    expect(calculateScore(card).total).toBe(0);
    card.data.value = "Материалов пока нет";
    expect(calculateScore(card).total).toBe(10);
  });

  it.each([
    ["context", "contextNeed", 6], ["need", "contextNeed", 6], ["data", "data", 10],
    ["expectedResult", "expectedResult", 9], ["successCriteria", "successCriteria", 8],
    ["constraints", "constraints", 5], ["users", "users", 6], ["interactionFormat", "businessLink", 3],
  ] as const)("requires at least 15 trimmed characters for %s", (field, block, points) => {
    expect(earned({ [field]: `  ${"я".repeat(14)}  ` }, block)).toBe(0);
    expect(earned({ [field]: `  ${"я".repeat(15)}  ` }, block)).toBe(points);
  });

  it("does not award points for the title and returns the largest improvements first", () => {
    const result = calculateScore(makeCard({ title: "Подробное название задачи" }));
    expect(result.total).toBe(0);
    expect(result.missing.every((item) => item.hint.length > 0)).toBe(true);
    expect(result.missing.map((item) => item.points)).toEqual([...result.missing.map((item) => item.points)].sort((a, b) => b - a));
    expect(result.missing).toHaveLength(18);
    expect(result.missing.reduce((sum, item) => sum + item.points, 0)).toBe(100);
    expect(result.missing.every((item) => item.hint.includes(`(+${item.points})`))).toBe(true);
  });

  it("returns every failed check exactly once in missing", () => {
    const result = calculateScore(makeCard({ data: "Материалы собираются вручную" }));
    const expected = result.blocks.flatMap((block) => block.checks)
      .filter((check) => !check.passed)
      .map(({ label, points, hint }) => ({ label, points, hint }))
      .sort((a, b) => b.points - a.points);
    expect(result.total).toBe(10);
    expect(result.missing).toEqual(expected);
  });

  it("recognizes English and Kazakh data, artifact and feedback words", () => {
    const card = makeCard();
    card.data.value = "Sales DATASET for the last 8 weeks is available.";
    card.expectedResult.value = "Provide a DASHBOARD with weekly sales metrics.";
    card.constraints.value = "Алғашқы нұсқаны 2 апта ішінде дайындау керек.";
    card.interactionFormat.value = "Апта сайын онлайн кездесу және нәтиже бойынша кері байланыс.";
    expect(calculateScore(card).total).toBe(100);
  });

  it("does not mutate the input card", () => {
    const card = makeCard();
    const snapshot = structuredClone(card);
    calculateScore(card);
    expect(card).toEqual(snapshot);
  });

  it("is deterministic and ignores field source and evidence when scoring", () => {
    const card = makeCard();
    const expected = calculateScore(card);
    for (const key of fieldKeys) {
      card[key].source = "ai_extracted";
      card[key].evidence = "Цитата из исходного текста";
    }
    expect(calculateScore(card)).toEqual(expected);
    expect(calculateScore(card)).toEqual(calculateScore(card));
  });
});

describe("score formula by block", () => {
  it.each([
    ["context", 79, 6], ["context", 80, 10],
    ["need", 59, 6], ["need", 60, 10],
  ] as const)("uses the trimmed %s detail threshold at %i characters", (field, length, points) => {
    expect(earned({ [field]: ` \n${"я".repeat(length)}\t ` }, "contextNeed")).toBe(points);
  });

  it("adds data source and numeric volume independently", () => {
    expect(earned({ data: "Материалы собираются вручную" }, "data")).toBe(10);
    expect(earned({ data: "Материалы за 8 периодов работы" }, "data")).toBe(15);
    expect(earned({ data: "Материалы в формате CSV готовы" }, "data")).toBe(15);
    expect(earned({ data: "Материалы CSV за 8 периодов" }, "data")).toBe(20);
  });

  it.each([
    "csv", "excel", "xlsx", "json", "sql", "api", "база", "бд", "таблиц", "выгрузк",
    "лог", "пример", "документ", "датасет", "crm", "деректер", "кесте", "құжат", "database", "dataset",
  ])("recognizes the data source keyword %s without case sensitivity", (keyword) => {
    expect(earned({ data: `Материалы доступны: ${keyword.toUpperCase()}.` }, "data")).toBe(15);
  });

  it.each([
    "прототип", "бот", "дашборд", "отчёт", "отчет", "приложение", "сайт", "сервис", "модель",
    "api", "скрипт", "интеграция", "mvp", "есеп", "қосымша", "prototype", "dashboard", "report", "application",
  ])("awards artifact points for %s", (keyword) => {
    expect(earned({ expectedResult: `Ожидаемый итог: ${keyword.toUpperCase()}.` }, "expectedResult")).toBe(15);
  });

  it.each([
    "30", "%", "не менее", "до", "сократить", "увеличить", "кемінде", "дейін", "азайту", "арттыру",
    "ұлғайту", "at least", "up to", "reduce", "increase", "не\nменее", "at\tleast",
  ])("awards measurable success points for %s", (keyword) => {
    expect(earned({ successCriteria: `Критерий результата: ${keyword.toUpperCase()}.` }, "successCriteria")).toBe(15);
  });

  it("does not treat an isolated English up as a measurable criterion", () => {
    expect(earned({ successCriteria: "The team follows up carefully" }, "successCriteria")).toBe(8);
  });

  it.each([
    "дата", "день", "неделя", "месяц", "дедлайн", "срок", "технология", "Python", "доступ",
    "күн", "апта", "мерзім", "рұқсат", "date", "deadline", "technology", "access", "2026-10-01",
  ])("awards specific constraint points for %s", (keyword) => {
    expect(earned({ constraints: `Условие работы: ${keyword.toUpperCase()}.` }, "constraints")).toBe(10);
  });

  it("adds users detail points for length, number or role independently", () => {
    expect(earned({ users: "я".repeat(39) }, "users")).toBe(6);
    expect(earned({ users: `  ${"я".repeat(40)}  ` }, "users")).toBe(10);
    expect(earned({ users: "Всего участвуют 3 человека" }, "users")).toBe(10);
  });

  it.each(["менеджер", "кассир", "пайдаланушы", "қызметкер", "manager", "customer"])("recognizes the user role %s in a short description", (keyword) => {
    const value = `Участник: ${keyword.toUpperCase()}.`;
    expect(value.length).toBeLessThan(40);
    expect(earned({ users: value }, "users")).toBe(10);
  });

  it.each([
    "Email: owner@example.invalid", "Телефон: +7 (700) 000-00-00", "Telegram: @demo_user",
  ])("awards contact points for %s", (contact) => {
    expect(earned({ contact }, "businessLink")).toBe(5);
  });

  it("requires a contact channel and applies the minimum length to it", () => {
    expect(earned({ contact: "Свяжитесь с ответственным" }, "businessLink")).toBe(0);
    expect(earned({ contact: `  ${"@" + "a".repeat(13)}  ` }, "businessLink")).toBe(0);
    expect(earned({ contact: `  ${"@" + "a".repeat(14)}  ` }, "businessLink")).toBe(5);
  });

  it.each([
    "раз в", "еженедельный", "созвон", "встреча", "онлайн", "офлайн", "чат",
    "кездесу", "апта сайын", "рет", "weekly", "meeting", "every week", "раз\nв",
  ])("awards feedback points for %s", (keyword) => {
    expect(earned({ interactionFormat: `Порядок общения: ${keyword.toUpperCase()}.` }, "businessLink")).toBe(5);
  });

  it("does not mistake a word containing рет for feedback frequency", () => {
    expect(earned({ interactionFormat: "Обсудим конкретные пожелания" }, "businessLink")).toBe(3);
  });
});

describe("getLevel", () => {
  it.each([
    [0, "draft"], [39, "draft"], [40, "workable"], [69, "workable"],
    [70, "ready"], [89, "ready"], [90, "priority"], [100, "priority"],
  ] as const)("maps %i points to %s", (total, level) => {
    expect(getLevel(total)).toBe(level);
  });

  it("provides the exact labels from AGENTS.md", () => {
    expect(levelLabels).toEqual({
      draft: "Черновик · требует уточнения", workable: "Рабочая", ready: "Готовая", priority: "Приоритетная",
    });
  });
});
