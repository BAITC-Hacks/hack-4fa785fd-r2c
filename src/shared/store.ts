import type { AppData, Task } from './types';

const STORAGE_KEY = 'ai-sana-demo-v1';

const demoTasks: Task[] = [
  {
    id: 'demo-cafe',
    title: 'Сократить очереди в кафе в обеденное время',
    industry: 'Общепит',
    summary: 'Кафе хочет быстрее обслуживать гостей с 12:00 до 14:00.',
    context: 'В обеденный пик гости долго ждут заказ и часть уходит.',
    need: 'Найти способ сократить время ожидания без расширения зала.',
    users: 'Гости кафе и сотрудники кассы',
    data: 'Есть обезличенные данные по времени заказов за 3 месяца.',
    constraints: 'Нельзя менять кассовую систему; пилот до 6 недель.',
    expectedResult: 'Прототип решения и план небольшого пилота.',
    successCriteria: 'Сократить медианное ожидание минимум на 15%.',
    contact: 'Еженедельная встреча с управляющим',
    score: 86,
    status: 'published',
    createdAt: '2026-09-20',
  },
  {
    id: 'demo-shop',
    title: 'Понять, почему клиенты не завершают заказ',
    industry: 'Розничная торговля',
    summary: 'Интернет-магазин хочет уменьшить число брошенных корзин.',
    context: 'Заметная часть покупателей уходит на этапе оформления.',
    need: 'Определить главные причины отказа и предложить улучшения.',
    users: 'Покупатели интернет-магазина',
    data: 'Доступна обезличенная статистика сайта.',
    constraints: 'Нельзя менять платёжного провайдера.',
    expectedResult: '',
    successCriteria: '',
    contact: '',
    score: 48,
    status: 'published',
    createdAt: '2026-09-21',
  },
  {
    id: 'demo-clinic',
    title: 'Улучшить запись пациентов на приём',
    industry: 'Здравоохранение',
    summary: 'Клиника хочет упростить процесс записи.',
    context: 'Пациенты часто звонят в регистратуру, чтобы подобрать время.',
    need: 'Снизить нагрузку на администраторов при записи.',
    users: 'Пациенты и администраторы клиники',
    data: 'Есть расписание и агрегированные данные по звонкам.',
    constraints: 'Персональные медицинские данные недоступны.',
    expectedResult: 'Интерактивный прототип нового процесса записи.',
    successCriteria: 'Сократить число звонков по записи на 20%.',
    contact: 'Консультация раз в неделю',
    score: 92,
    status: 'published',
    createdAt: '2026-09-18',
  },
  {
    id: 'demo-school',
    title: 'Помочь школьникам регулярно делать домашние задания',
    industry: 'Образование',
    summary: 'Нужно повысить вовлечённость учеников.',
    context: 'Учителя замечают, что часть учеников сдаёт задания нерегулярно.',
    need: 'Проверить идеи, которые помогут поддерживать учебную привычку.',
    users: 'Ученики 7–9 классов',
    data: 'Можно провести интервью с учителями и учениками.',
    constraints: 'Не собирать персональные данные детей.',
    expectedResult: 'Набор проверяемых идей и кликабельный прототип.',
    successCriteria: 'Учителя подтвердят, что решение удобно использовать.',
    contact: '',
    score: 73,
    status: 'published',
    createdAt: '2026-09-17',
  },
  {
    id: 'demo-logistics',
    title: 'Сделать статусы доставки понятнее для клиентов',
    industry: 'Логистика',
    summary: 'Служба доставки хочет снизить число вопросов о посылках.',
    context: 'Клиенты часто обращаются, когда статус долго не меняется.',
    need: 'Объяснять клиенту, что происходит с доставкой и когда ждать обновление.',
    users: 'Клиенты службы доставки и операторы поддержки',
    data: 'Есть список статусов и обезличенные темы обращений.',
    constraints: 'Интеграцию с трекингом на первом этапе не делать.',
    expectedResult: 'Прототип экрана отслеживания с понятными сообщениями.',
    successCriteria: '',
    contact: 'Обратная связь от службы поддержки',
    score: 69,
    status: 'published',
    createdAt: '2026-09-16',
  },
];

export function readData(): AppData {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved) as AppData;
  } catch {
    // Invalid local data is replaced by the demo dataset.
  }
  return { tasks: demoTasks, submissions: [] };
}

export function writeData(data: AppData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function resetData(): AppData {
  localStorage.removeItem(STORAGE_KEY);
  return { tasks: demoTasks, submissions: [] };
}
