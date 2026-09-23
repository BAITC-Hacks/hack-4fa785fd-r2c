import { fieldKeys, type Card, type FieldKey, type Level } from "./types";

/** Call on explicit human confirmation; never mutate the original AI card. */
export function confirmNonemptyFields(card: Card): Card {
  const next = { ...card };
  for (const key of fieldKeys) next[key] = { ...card[key], confirmed: Boolean(card[key].value.trim()) };
  return next;
}

/** Typing is human confirmation of that field; stale AI evidence no longer applies. */
export function editCardField(card: Card, key: FieldKey, value: string): Card {
  return { ...card, [key]: { value, source: "user_edited", confirmed: Boolean(value.trim()) } };
}

export function levelUpgradeMessage(before: Level, after: Level): string {
  const order: Level[] = ["draft", "workable", "ready", "priority"];
  const labels: Record<Level, string> = { draft: "Черновиком", workable: "Рабочей", ready: "Готовой", priority: "Приоритетной" };
  return order.indexOf(after) > order.indexOf(before) ? `Задача стала ${labels[after]}!` : "";
}
