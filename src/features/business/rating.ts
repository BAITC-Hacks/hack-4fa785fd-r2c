import type { Task } from '../../shared/types';

export const ratingParts = [
  { label: 'Контекст и потребность', points: 20, fields: ['context', 'need'] as const },
  { label: 'Данные и материалы', points: 20, fields: ['data'] as const },
  { label: 'Ожидаемый результат', points: 15, fields: ['expectedResult'] as const },
  { label: 'Критерии успеха', points: 15, fields: ['successCriteria'] as const },
  { label: 'Ограничения', points: 10, fields: ['constraints'] as const },
  { label: 'Пользователи', points: 10, fields: ['users'] as const },
  { label: 'Связь с бизнесом', points: 10, fields: ['contact'] as const },
];

export function getTaskScore(task: Task): number {
  return ratingParts.reduce((score, part) => {
    const completed = part.fields.every((field) => task[field].trim().length >= 8);
    return score + (completed ? part.points : 0);
  }, 0);
}

export function getReadinessLabel(score: number): string {
  if (score >= 90) return 'Приоритетная';
  if (score >= 70) return 'Готовая';
  if (score >= 40) return 'Рабочая';
  return 'Черновик';
}
