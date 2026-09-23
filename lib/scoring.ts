import { getLevel } from "./levels";
import type { Card, FieldKey, ScoreBlock, ScoreCheck, ScoreResult } from "./types";

const MIN_FIELD_LENGTH = 15;

// Stems cover word endings; all dictionaries include Russian, Kazakh and English.
const DATA_WORDS = /^(?:csv|excel|xlsx|json|sql|api|база|бд$|таблиц|выгрузк|лог|пример|документ|датасет|crm|дерек|кесте|журнал|мысал|құжат|database|table|export|log|sample|example|document|dataset)/u;
const ARTIFACT_WORDS = /^(?:прототип|бот|дашборд|отч[её]т|приложени|сайт|сервис|модель|api$|скрипт|интеграц|mvp$|есеп|қосымша|қызмет|үлгі|prototype|bot$|dashboard|report|app$|application|website|service|model|script|integration)/u;
const TIME_WORDS = /^(?:дат(?:а|ы|у|е|ой)$|день|дня|дней|дн[яе]|недел|месяц|дедлайн|срок|күн|апта|ай$|мерзім|date|day|week|month|deadline|term)/u;
const TECH_OR_ACCESS_WORDS = /^(?:технолог|доступ|python|javascript|typescript|react|next|node|sql|postgres|excel|csv|json|api$|java$|docker|figma|no-code|read-only|access|permission|technology|технология|қолжетімді|рұқсат)/u;
const USER_ROLE_WORDS = /^(?:пользовател|клиент|сотрудник|менеджер|оператор|администратор|продавец|продавц|кассир|владелец|владельц|руководител|учител|студент|врач|пациент|диспетчер|аналитик|маркетолог|қолданушы|пайдаланушы|клиент|қызметкер|сатушы|басшы|мұғалім|дәрігер|user|customer|client|employee|manager|operator|admin|seller|cashier|owner|teacher|student|doctor|patient|analyst)/u;
const FEEDBACK_WORDS = /^(?:еженедел|созвон|встреч|онлайн|офлайн|чат|апта|күнделікті|кездесу|қоңырау|weekly|daily|meeting|call|online|offline|chat)/u;

function hasWord(value: string, pattern: RegExp): boolean {
  return (value.toLowerCase().match(/[\p{L}\p{N}-]+/gu) ?? []).some((word) => pattern.test(word));
}

function hasPhrase(value: string, phrases: readonly string[]): boolean {
  const words = ` ${(value.toLowerCase().match(/[\p{L}\p{N}-]+/gu) ?? []).join(" ")} `;
  return phrases.some((phrase) => words.includes(` ${phrase} `));
}

function hasContact(value: string): boolean {
  const email = /\b[^\s@]+@[^\s@]+\.[^\s@]+\b/u.test(value);
  const telegram = /(?:^|\s)@[a-z\d_]{5,32}\b/iu.test(value);
  const phone = /(?:\+?\d[\d\s().-]{5,}\d)/u.exec(value)?.[0];
  return email || telegram || Boolean(phone && phone.replace(/\D/g, "").length >= 7);
}

function scoreBlocks(card: Card, includeUnconfirmed: boolean): ScoreBlock[] {
  const text = (key: FieldKey) => card[key].value.trim();
  const filled = (key: FieldKey) => text(key).length >= MIN_FIELD_LENGTH && (includeUnconfirmed || card[key].confirmed);
  const check = (id: string, label: string, points: number, passed: boolean, hint: string): ScoreCheck => ({ id, label, points, passed, hint });
  const block = (key: ScoreBlock["key"], label: string, max: number, checks: ScoreCheck[]): ScoreBlock => ({
    key, label, max, checks, earned: checks.reduce((sum, item) => sum + (item.passed ? item.points : 0), 0),
  });

  return [
    block("contextNeed", "Контекст и потребность", 20, [
      check("context.filled", "Описан контекст", 6, filled("context"), "Опишите текущую ситуацию минимум в 15 символах и подтвердите поле (+6)."),
      check("need.filled", "Описана потребность", 6, filled("need"), "Укажите, что бизнес хочет изменить, и подтвердите поле (+6)."),
      check("context.detail", "Контекст описан подробно", 4, filled("context") && text("context").length >= 80, "Раскройте текущее состояние минимум в 80 символах и подтвердите поле (+4)."),
      check("need.detail", "Потребность описана подробно", 4, filled("need") && text("need").length >= 60, "Объясните желаемое изменение минимум в 60 символах и подтвердите поле (+4)."),
    ]),
    block("data", "Данные и материалы", 20, [
      check("data.filled", "Описаны данные", 10, filled("data"), "Опишите доступные материалы минимум в 15 символах и подтвердите поле (+10)."),
      check("data.source", "Указан тип или источник данных", 5, filled("data") && hasWord(text("data"), DATA_WORDS), "Назовите тип или источник данных, например CSV, Excel или CRM, и подтвердите поле (+5)."),
      check("data.volume", "Указан объём или период", 5, filled("data") && /\d/u.test(text("data")), "Добавьте объём или период данных числом, например 8 недель, и подтвердите поле (+5)."),
    ]),
    block("expectedResult", "Ожидаемый результат", 15, [
      check("result.filled", "Описан результат", 9, filled("expectedResult"), "Опишите ожидаемый результат минимум в 15 символах и подтвердите поле (+9)."),
      check("result.artifact", "Назван конкретный артефакт", 6, filled("expectedResult") && hasWord(text("expectedResult"), ARTIFACT_WORDS), "Назовите артефакт, например прототип, дашборд или отчёт, и подтвердите поле (+6)."),
    ]),
    block("successCriteria", "Критерии успеха", 15, [
      check("success.filled", "Описаны критерии успеха", 8, filled("successCriteria"), "Опишите критерии приёмки минимум в 15 символах и подтвердите поле (+8)."),
      check("success.measurable", "Указан измеримый критерий", 7, filled("successCriteria") && (/\d|%/u.test(text("successCriteria")) || hasPhrase(text("successCriteria"), ["не менее", "at least", "no less than", "up to"]) || hasWord(text("successCriteria"), /^(?:сократит|увеличит|кемінде$|азайт|арттыр|ұлғайт|reduce|increase|до$|дейін$)/u)), "Добавьте измеримый критерий, например «сократить время обработки заявки на 30%», и подтвердите поле (+7)."),
    ]),
    block("constraints", "Ограничения", 10, [
      check("constraints.filled", "Описаны ограничения", 5, filled("constraints"), "Опишите ограничения минимум в 15 символах и подтвердите поле (+5)."),
      check("constraints.specific", "Указан срок, технология или доступ", 5, filled("constraints") && (hasWord(text("constraints"), TIME_WORDS) || hasWord(text("constraints"), TECH_OR_ACCESS_WORDS) || /\d{1,4}[-./]\d{1,2}[-./]\d{1,4}/u.test(text("constraints"))), "Добавьте срок, технологию или условия доступа и подтвердите поле (+5)."),
    ]),
    block("users", "Пользователи", 10, [
      check("users.filled", "Описаны пользователи", 6, filled("users"), "Опишите пользователей минимум в 15 символах и подтвердите поле (+6)."),
      check("users.specific", "Уточнены роли или число пользователей", 4, filled("users") && (text("users").length >= 40 || /\d/u.test(text("users")) || hasWord(text("users"), USER_ROLE_WORDS)), "Уточните роль или число пользователей либо дополните описание до 40 символов и подтвердите поле (+4)."),
    ]),
    block("businessLink", "Связь с бизнесом", 10, [
      check("contact.channel", "Указан контакт", 5, filled("contact") && hasContact(text("contact")), "Добавьте email, телефон или @telegram в контакт минимум из 15 символов и подтвердите поле (+5)."),
      check("interaction.filled", "Описано взаимодействие", 3, filled("interactionFormat"), "Опишите порядок взаимодействия минимум в 15 символах и подтвердите поле (+3)."),
      check("interaction.feedback", "Указан формат обратной связи", 2, filled("interactionFormat") && (hasWord(text("interactionFormat"), FEEDBACK_WORDS) || hasPhrase(text("interactionFormat"), ["раз в"]) || hasWord(text("interactionFormat"), /^(?:every$|рет$)/u)), "Укажите частоту или формат обратной связи, например еженедельный созвон, и подтвердите поле (+2)."),
    ]),
  ];
}

/** Deterministic completeness checks; this score does not verify factual accuracy. */
export function calculateScore(card: Card): ScoreResult {
  const blocks = scoreBlocks(card, false);
  const total = blocks.reduce((sum, block) => sum + block.earned, 0);
  const potential = scoreBlocks(card, true).reduce((sum, block) => sum + block.earned, 0);
  const missing = blocks.flatMap((block) => block.checks)
    .filter((check) => !check.passed)
    .map(({ label, points, hint }) => ({ label, points, hint }))
    .sort((a, b) => b.points - a.points);

  return { total, potential, level: getLevel(total), blocks, missing };
}
