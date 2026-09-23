# AGENTS.md — TaskReady (рабочее название)

HackAlem AI · кейс AI Sana «Рейтинг качества бизнес-задач и открытый выбор команд». 5 часов, 2 разработчика.

## Что строим

Веб-MVP со сквозным сценарием:

1. Бизнес вводит короткий черновик задачи.
2. ИИ находит недостающие сведения и задаёт минимум 3 уточняющих вопроса.
3. Из черновика и ответов собирается редактируемая карточка. Бизнес правит и подтверждает поля.
4. Код считает прозрачный рейтинг готовности 0–100 с расшифровкой и подсказками «что добавить, чтобы поднять балл».
5. Бизнес публикует задачу. Она встаёт в общий каталог на позицию по рейтингу.
6. Любая студенческая команда смотрит каталог или рекомендации и отправляет отклик.
7. Бизнес вручную принимает или отклоняет отклики (одну, несколько или ни одной команды).
8. Бизнес подтверждает этап работы, выбранная команда получает баллы за прогресс.

## Жёсткие правила (из условий кейса, нарушать нельзя)

- ИИ не добавляет фактов, которых не сообщил пользователь.
- Всё, что сформировал ИИ, человек редактирует и подтверждает до публикации.
- Рейтинг считает КОД (детерминированно), а не LLM. Баллы только за заполненные И подтверждённые поля.
- Рейтинг пересчитывается после каждого изменения карточки.
- Низкий рейтинг не скрывает задачу и не запрещает отклик.
- Никакого автоматического назначения команд. Выбор делает только бизнес, вручную.
- Рекомендации студентам не ограничивают каталог. Персональные и чувствительные признаки не используются.
- НЕ делаем: регистрацию и пароли, чат, уведомления, файловое хранилище, векторную БД, мобильную адаптацию.

## Стек

- Next.js (App Router) + TypeScript + Tailwind + shadcn/ui
- zod для валидации всех входов API и всех ответов LLM
- Хранилище: JSON-файл `data/db.json` через `lib/store.ts`; при первом запуске копируется из `data/seed.json`. Команда `npm run reset` восстанавливает сид.
- OpenAI SDK, structured outputs (JSON Schema)
- NVIDIA NIM как запасной провайдер (OpenAI-совместимый API, `base_url=https://integrate.api.nvidia.com/v1`)
- vitest для тестов `lib/scoring.ts`
- Авторизации нет. Переключатель роли в шапке: «Бизнес: <компания>» или «Команда: <название>» (хранится в cookie).
- Интерфейс на русском.

## Структура

```
app/
  page.tsx                        лендинг + выбор роли
  business/new/page.tsx           мастер: черновик → вопросы → карточка → подтверждение → рейтинг → публикация
  business/tasks/page.tsx         мои задачи
  business/tasks/[id]/page.tsx    карточка, редактирование, рейтинг, отклики (принять / отклонить / подтвердить этап)
  catalog/page.tsx                каталог: сортировка по рейтингу, фильтры (отрасль, уровень), блок рекомендаций для команды
  catalog/[id]/page.tsx           карточка для студентов + форма отклика
  teams/page.tsx                  рейтинг команд по баллам за прогресс
  api/...                         route handlers (см. «API»)
components/                       UI-компоненты (ScoreMeter, ScoreBreakdown, LevelBadge, TaskCard, ProposalCard, AiDebugPanel, RoleSwitcher)
lib/
  types.ts                        КОНТРАКТ: все типы и zod-схемы. Менять только по договорённости обоих.
  scoring.ts                      расчёт рейтинга, чистые функции
  scoring.test.ts
  levels.ts                       уровни готовности
  store.ts                        чтение и запись db.json
  recommend.ts                    рекомендации задач командам
  ai/prompts.ts                   тексты промптов
  ai/provider.ts                  цепочка OpenAI → NVIDIA → локальная заглушка
  ai/analyze.ts                   анализ черновика + вопросы
  ai/buildCard.ts                 ответы → карточка
  ai/evidence.ts                  проверка цитат (защита от выдуманных фактов)
data/seed.json
```

## Модель данных (lib/types.ts)

```ts
export type FieldKey =
  | 'title' | 'context' | 'need' | 'users' | 'data'
  | 'constraints' | 'expectedResult' | 'successCriteria'
  | 'contact' | 'interactionFormat';

export interface CardField {
  value: string;
  confirmed: boolean;                        // баллы только при true
  source: 'ai_extracted' | 'user_edited' | 'user_answer';
  evidence?: string;                         // точная цитата из текста пользователя
}

export type Card = Record<FieldKey, CardField>;

export type BlockKey =
  | 'contextNeed' | 'data' | 'expectedResult' | 'successCriteria'
  | 'constraints' | 'users' | 'businessLink';

export type Level = 'draft' | 'workable' | 'ready' | 'priority';

export interface ScoreCheck {
  id: string;
  label: string;        // «Указан измеримый критерий»
  points: number;
  passed: boolean;
  hint: string;         // что добавить, если не выполнено
}

export interface ScoreBlock {
  key: BlockKey;
  label: string;
  max: number;
  earned: number;
  checks: ScoreCheck[];
}

export interface ScoreResult {
  total: number;        // только подтверждённые поля
  potential: number;    // если подтвердить все заполненные поля
  level: Level;
  blocks: ScoreBlock[];
  missing: { label: string; points: number; hint: string }[];  // по убыванию points
}

export interface Task {
  id: string;
  businessName: string;
  industry: string;
  draftText: string;
  card: Card;
  status: 'draft' | 'published';
  score: ScoreResult;
  tags: string[];
  scoreHistory: { at: string; total: number }[];   // для графика роста рейтинга
  createdAt: string;
  publishedAt?: string;
}

export interface Team {
  id: string;
  name: string;
  interests: string[];
  skills: string[];
  technologies: string[];
  points: number;
}

export interface Proposal {
  id: string;
  taskId: string;
  teamId: string;
  idea: string;
  plan: string;
  timeline: string;
  prototypeUrl: string;
  status: 'pending' | 'accepted' | 'rejected';
  milestoneConfirmed: boolean;
  createdAt: string;
}
```

## Формула рейтинга (lib/scoring.ts)

Считаются только поля с `confirmed: true` и непустым значением. «Заполнено» = после trim не короче 15 символов.
Ключевые слова проверяем без учёта регистра, списки на русском, казахском и английском.

| Блок | Макс | Проверки (баллы) |
|---|---|---|
| contextNeed: Контекст и потребность | 20 | context заполнен (6); need заполнен (6); context ≥ 80 символов, описано текущее состояние (4); need ≥ 60 символов, описано, что изменить (4) |
| data: Данные и материалы | 20 | заполнено (10); указан тип или источник: csv, excel, xlsx, json, sql, api, база, бд, таблиц, выгрузк, лог, пример, документ, датасет, crm (5); указан объём или период, есть число (5) |
| expectedResult: Ожидаемый результат | 15 | заполнено (9); назван артефакт: прототип, бот, дашборд, отчёт, приложение, сайт, сервис, модель, api, скрипт, интеграц, mvp (6) |
| successCriteria: Критерии успеха | 15 | заполнено (8); есть измеримость: число, %, «не менее», «до», «сократить», «увеличить» (7) |
| constraints: Ограничения | 10 | заполнено (5); указан срок (дата, день, недел, месяц, дедлайн, срок) или технология или доступ (5) |
| users: Пользователи | 10 | заполнено (6); ≥ 40 символов или указано число или роль пользователей (4) |
| businessLink: Связь с бизнесом | 10 | contact содержит email, телефон или @telegram (5); interactionFormat заполнен (3); указана частота или формат обратной связи: раз в, еженедел, созвон, встреч, онлайн, офлайн, чат (2) |

`title` не даёт баллов, но обязателен для публикации.
`missing` = все непройденные проверки, отсортированные по баллам по убыванию, с конкретной подсказкой, например «Добавьте измеримый критерий, например "сократить время обработки заявки на 30%" (+7)».

Уровни (lib/levels.ts):

- 0–39 `draft` «Черновик · требует уточнения» (виден в каталоге с пометкой)
- 40–69 `workable` «Рабочая» (можно рекомендовать)
- 70–89 `ready` «Готовая» (повышенная позиция)
- 90–100 `priority` «Приоритетная» (выделена в каталоге)

Тесты: минимум 5 кейсов в `scoring.test.ts` (пустая карточка = 0; полная = 100; неподтверждённые поля не дают баллов; редактирование пересчитывает; границы уровней 39/40, 69/70, 89/90).

## Каталог

- Показываются ВСЕ опубликованные задачи любого уровня.
- Сортировка: `score.total` по убыванию, при равенстве более новые выше.
- Фильтры: отрасль, уровень готовности.
- `priority` визуально выделен, `draft` помечен «требует уточнения».
- Для выбранной команды отдельный блок «Рекомендовано вам» (только задачи уровня `workable` и выше) с объяснением: какие навыки и интересы совпали. Основной каталог при этом не фильтруется.
- После публикации бизнес видит свою позицию: «Ваша задача на N месте из M».

## ИИ (lib/ai)

1. `analyzeDraft(draftText, industry)` → `{ extracted: Partial<Record<FieldKey, { value: string; evidence: string }>>, missing: FieldKey[], questions: { id: string; field: FieldKey; question: string; why: string }[] }`
   - 3–6 вопросов, приоритет полям с наибольшим весом в рейтинге.
2. `buildCard(draftText, answers: { questionId: string; field: FieldKey; answer: string }[])` → `Record<FieldKey, { value: string; evidence: string } | null>`

Правила:

- Structured outputs по JSON Schema, низкая temperature. Ответ всегда валидируется zod.
- `evidence` обязан быть точной цитатой из черновика или ответов пользователя. `lib/ai/evidence.ts` проверяет вхождение (регистр и пробелы нормализуются). Не нашлось → поле отбрасывается и логируется как `rejected_unsupported`.
- Если сведений нет, поле = null. Никаких догадок.
- Отвечать на языке входа (ru / kk / en).
- Цепочка провайдеров: OpenAI → при ошибке, таймауте 12 с или невалидном JSON после 1 повтора → NVIDIA NIM → локальная заглушка (шаблонные вопросы по недостающим полям, извлечение без ИИ). UI показывает, какой провайдер ответил.
- Приложение ОБЯЗАНО работать без ключей (через заглушку), чтобы жюри могло запустить его по README.
- Каждый вызов сохраняет prompt, вход, сырой выход, результат валидации и провайдера. Это показывается в `AiDebugPanel` («Как работает ИИ»).
- Переменные окружения: `OPENAI_API_KEY`, `OPENAI_MODEL`, `NVIDIA_API_KEY`, `NVIDIA_MODEL` в `.env.local`. В репозиторий коммитится только `.env.example`. Ключи никогда не попадают в git.

## API (route handlers)

| Метод | Путь | Тело | Ответ |
|---|---|---|---|
| POST | /api/ai/analyze | `{ draftText, industry }` | результат analyzeDraft + debug |
| POST | /api/ai/build-card | `{ draftText, answers }` | поля карточки + debug |
| POST | /api/tasks | `{ businessName, industry, draftText, card }` | Task |
| PATCH | /api/tasks/:id | `{ card }` | Task (рейтинг пересчитан, запись в scoreHistory) |
| POST | /api/tasks/:id/publish | — | Task (400, если нет title) |
| GET | /api/tasks?industry=&level=&teamId= | — | отсортированный список (+ recommended и причина, если передан teamId) |
| POST | /api/tasks/:id/proposals | `{ teamId, idea, plan, timeline, prototypeUrl }` | Proposal |
| GET | /api/tasks/:id/proposals | — | Proposal[] с данными команд |
| PATCH | /api/proposals/:id | `{ action: 'accept' \| 'reject' \| 'confirmMilestone' }` | Proposal (confirmMilestone только для accepted, команде +50 баллов) |
| GET | /api/teams | — | Team[] по убыванию points |

Все входы валидируются zod. При ошибке `400 { error: string }`, в UI понятное сообщение.

## Тестовые данные (data/seed.json)

Минимум: 5 черновиков разной полноты и отраслей; 5 опубликованных карточек с баллами во всех четырёх уровнях; 5 профилей команд (название, интересы, навыки, технологии); 5 откликов (команда, идея, план, срок, ссылка). Данные синтетические, без реальных персональных данных.

## Разделение работы

- Разработчик A (логика и ИИ): `lib/**`, `app/api/**`, `data/**`, тесты.
- Разработчик B (интерфейс и демо): `app/**/page.tsx`, `components/**`, стили.
- `lib/types.ts` меняется только по договорённости обоих.
- Маленькие коммиты, `git pull --rebase` перед push. Перед коммитом `npm run lint && npm test`.

## Демо-сценарий (должен работать всегда)

1. Роль «Бизнес: Кофейня "Дала"». Черновик: «Клиенты стали реже возвращаться, хотим понять почему и что с этим сделать». Рейтинг низкий, уровень «Черновик».
2. ИИ задаёт вопросы → ответы → карточка → подтверждение полей → рейтинг растёт до уровня «Готовая».
3. Добавить измеримый критерий успеха → пересчёт → «Приоритетная».
4. Публикация → «Ваша задача на N месте из M».
5. Роль «Команда» → каталог / рекомендации → отклик.
6. Роль «Бизнес» → принять один отклик, отклонить другой → подтвердить этап → команде +50, видно на /teams.
