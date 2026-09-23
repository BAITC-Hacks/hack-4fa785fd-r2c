import Link from "next/link";
import { ArrowUpRight, ArrowRight, Check, Sparkles, Layers3, Users, TrendingUp } from "lucide-react";
import { RoleEntryLink } from "@/components/RoleEntryLink";
import { readDb } from "@/lib/store";

const steps = [
  { number: "01", icon: Sparkles, title: "Расскажите об идее", text: "ИИ задаст нужные вопросы и поможет собрать понятную карточку задачи." },
  { number: "02", icon: Layers3, title: "Добавьте ясности", text: "Подтвердите сведения и узнайте, что ещё нужно для старта. Каждое улучшение видно в рейтинге." },
  { number: "03", icon: Users, title: "Найдите свою команду", text: "Опубликуйте задачу, сравните предложения и выберите, с кем двигаться дальше." },
];

export default async function HomePage() {
  const { teams } = await readDb();
  const teamIds = teams.map(({ id }) => ({ id }));
  return <div className="home-page">
    <section className="home-hero" aria-labelledby="hero-title">
      <div className="hero-copy">
        <span className="hero-kicker"><span className="size-2 rounded-full bg-primary" /> Бизнес встречает новые таланты</span>
        <h1 id="hero-title">Большие решения.<br /><span>С понятной задачи.</span></h1>
        <p className="hero-description">Превратите идею в проект, к которому хочется присоединиться. С поддержкой ИИ и студенческих команд.</p>
        <div className="entry-grid">
          <RoleEntryLink mode="business" teams={teamIds} href="/business/new" className="entry-card entry-business">
            <span className="entry-audience">ДЛЯ БИЗНЕСА</span>
            <h2>У меня есть задача</h2>
            <p>ИИ поможет уточнить идею.<br />Команды предложат решения.</p>
            <span className="entry-button">Создать задачу <ArrowUpRight className="size-5" /></span>
            <span className="entry-hint">Начните с описания своими словами</span>
          </RoleEntryLink>
          <RoleEntryLink mode="team" teams={teamIds} href="/catalog" className="entry-card entry-team">
            <span className="entry-audience">ДЛЯ КОМАНДЫ</span>
            <h2>Хочу найти проект</h2>
            <p>Выберите реальную задачу<br />и предложите свой подход.</p>
            <span className="entry-button">Найти проект <ArrowUpRight className="size-5" /></span>
            <span className="entry-hint">Сначала посмотрите, что интересно</span>
          </RoleEntryLink>
        </div>
        <div className="hero-note"><span className="flex -space-x-2" aria-hidden="true"><span>Б</span><span>К</span><span>И</span></span><p>Ваш опыт + свежий взгляд<br /><strong>Вместе — больше возможностей</strong></p></div>
      </div>

      <div className="hero-visual" aria-label="Пример: от черновика к готовой задаче с рейтингом 92 из 100">
        <div className="visual-orbit orbit-one" /><div className="visual-orbit orbit-two" />
        <div className="idea-tile"><span className="text-xs font-medium text-muted-foreground">Всё начинается с идеи</span><p>«Хочется, чтобы<br />клиенты возвращались»</p><span className="idea-tag">Черновик <ArrowRight className="size-3" /></span></div>
        <div className="ready-tile">
          <div className="flex items-center justify-between"><span className="tile-label">ГОТОВНОСТЬ К СТАРТУ</span><span className="tile-symbol"><ArrowUpRight className="size-5" /></span></div>
          <div className="demo-score">92<span>/100</span></div>
          <div className="demo-track"><span /></div>
          <h2>Изучить, что возвращает<br />гостей в кофейню</h2>
          <div className="space-y-2.5">{["Понятная цель", "Данные для работы", "Измеримый результат"].map((text) => <p className="flex items-center gap-2 text-sm" key={text}><Check className="size-4" />{text}</p>)}</div>
          <div className="tile-bottom"><span className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-current" /> Приоритетная</span><span>Пример карточки</span></div>
        </div>
        <div className="ai-tile"><span className="ai-symbol"><Sparkles className="size-5" /></span><div><strong>ИИ помогает уточнить</strong><p>Решение остаётся за вами</p></div></div>
        <span className="visual-caption">Меньше неопределённости. Больше движения.</span>
      </div>
    </section>

    <section className="home-facts" aria-label="Принципы платформы">
      <div><strong>100<span> баллов</span></strong><p>Прозрачная оценка готовности</p></div>
      <div><strong>7<span> блоков</span></strong><p>От контекста до критериев успеха</p></div>
      <div><strong>+50<span> за этап</span></strong><p>Команде за подтверждённый прогресс</p></div>
      <div className="fact-principle"><Check className="size-5" /><p>ИИ помогает.<br /><strong>Человек решает.</strong></p></div>
    </section>

    <section className="home-steps" aria-labelledby="steps-title">
      <div className="section-heading"><div><p className="eyebrow">Путь к результату</p><h2 id="steps-title">Хорошему старту<br />нужна ясность.</h2></div><p>От первого «а что, если…»<br />до совместной работы над решением.</p></div>
      <div className="grid grid-cols-3 gap-5">{steps.map(({ number, icon: Icon, title, text }) => <article className="step-tile" key={number}><div className="flex items-center justify-between"><span className="step-icon"><Icon className="size-6" /></span><span className="step-number">{number}</span></div><h3>{title}</h3><p>{text}</p></article>)}</div>
    </section>

    <section className="audience-grid" aria-label="Выберите свой путь">
      <RoleEntryLink mode="business" teams={teamIds} href="/business/tasks" className="audience-tile business-tile"><div className="flex justify-between"><span className="eyebrow">Для бизнеса</span><ArrowUpRight /></div><h2>Свежий взгляд<br />на ваши задачи.</h2><p>Соберите понятный запрос и найдите команду, которая предложит свой подход.</p><span className="audience-link">Перейти в кабинет <ArrowRight className="size-4" /></span></RoleEntryLink>
      <RoleEntryLink mode="team" teams={teamIds} href="/catalog" className="audience-tile team-tile"><div className="flex justify-between"><span className="eyebrow">Для команд</span><ArrowUpRight /></div><h2>Настоящие проекты.<br />Ваш следующий шаг.</h2><p>Применяйте знания на практике, предлагайте решения и зарабатывайте баллы за результат.</p><span className="audience-link">Выбрать проект <ArrowRight className="size-4" /></span></RoleEntryLink>
    </section>
    <div className="home-closing"><TrendingUp className="size-5 text-primary" /><p>Каждый подтверждённый шаг — движение вперёд.</p><Link href="/teams">Рейтинг команд <ArrowUpRight className="size-4" /></Link></div>
  </div>;
}
