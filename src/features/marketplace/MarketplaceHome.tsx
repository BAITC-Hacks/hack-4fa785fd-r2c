import { useMemo, useState, type FormEvent } from 'react';
import { readData, writeData } from '../../shared/store';
import type { Submission, SubmissionStatus, Task } from '../../shared/types';
import './MarketplaceHome.css';

type ReadinessFilter = 'all' | 'draft' | 'working' | 'ready' | 'priority';
type SortOrder = 'score-desc' | 'score-asc' | 'newest';

function readinessKey(score: number): Exclude<ReadinessFilter, 'all'> {
  if (score >= 90) return 'priority';
  if (score >= 70) return 'ready';
  if (score >= 40) return 'working';
  return 'draft';
}

export default function MarketplaceHome() {
  const [data, setData] = useState(() => readData());
  const [industry, setIndustry] = useState('Все направления');
  const [readiness, setReadiness] = useState<ReadinessFilter>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('score-desc');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [teamName, setTeamName] = useState('Команда Sana');
  const [idea, setIdea] = useState('');
  const [plan, setPlan] = useState('');
  const [timeline, setTimeline] = useState('');
  const [prototypeUrl, setPrototypeUrl] = useState('');
  const [notice, setNotice] = useState('');

  const tasks = useMemo(() => data.tasks
    .filter((task) => task.status === 'published')
    .filter((task) => industry === 'Все направления' || task.industry === industry)
    .filter((task) => readiness === 'all' || readinessKey(task.score) === readiness)
    .sort((a, b) => {
      if (sortOrder === 'score-asc') return a.score - b.score;
      if (sortOrder === 'newest') return b.createdAt.localeCompare(a.createdAt);
      return b.score - a.score;
    }), [data.tasks, industry, readiness, sortOrder]);
  const selectedTask = data.tasks.find((task) => task.id === selectedTaskId);
  const availableIndustries = [...new Set(data.tasks.filter((task) => task.status === 'published').map((task) => task.industry))];

  function saveData(next: typeof data) {
    writeData(next);
    setData(next);
  }

  function submitProposal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTask || !idea.trim() || !plan.trim()) return;
    const submission: Submission = {
      id: crypto.randomUUID(), taskId: selectedTask.id, teamName: teamName.trim() || 'Студенческая команда',
      idea: idea.trim(), plan: plan.trim(), timeline: timeline.trim(), prototypeUrl: prototypeUrl.trim(),
      status: 'pending', createdAt: new Date().toISOString().slice(0, 10),
    };
    saveData({ ...data, submissions: [...data.submissions, submission] });
    setIdea(''); setPlan(''); setTimeline(''); setPrototypeUrl('');
    setNotice('Предложение отправлено бизнесу. Команда не назначается автоматически.');
  }

  function decideSubmission(submissionId: string, status: Exclude<SubmissionStatus, 'pending'>) {
    const submissions = data.submissions.map((submission) => submission.id === submissionId ? { ...submission, status } : submission);
    saveData({ ...data, submissions });
  }

  function readiness(score: number) {
    if (score >= 90) return 'Приоритетная';
    if (score >= 70) return 'Готовая';
    if (score >= 40) return 'Рабочая';
    return 'Черновик';
  }

  return (
    <section className="marketplace">
      <header className="market-header">
        <div><span className="eyebrow">ОБЩИЙ КАТАЛОГ</span><h2>Выберите задачу, которая вам интересна</h2><p>Задачи открыты всем командам. Изучите условия и предложите свой план.</p></div>
        <div className="market-filters">
          <label className="market-filter"><span>Направление</span><select value={industry} onChange={(event) => setIndustry(event.target.value)}><option>Все направления</option>{availableIndustries.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className="market-filter"><span>Готовность</span><select value={readiness} onChange={(event) => setReadiness(event.target.value as ReadinessFilter)}><option value="all">Любой уровень</option><option value="draft">Черновик · 0–39</option><option value="working">Рабочая · 40–69</option><option value="ready">Готовая · 70–89</option><option value="priority">Приоритетная · 90–100</option></select></label>
          <label className="market-filter"><span>Сортировка</span><select value={sortOrder} onChange={(event) => setSortOrder(event.target.value as SortOrder)}><option value="score-desc">По рейтингу: сначала выше</option><option value="score-asc">По рейтингу: сначала ниже</option><option value="newest">Сначала новые</option></select></label>
        </div>
      </header>

      {notice && <div className="market-notice" role="status">✓ {notice}<button type="button" onClick={() => setNotice('')} aria-label="Закрыть">×</button></div>}

      <div className="market-meta"><span>{tasks.length} задач{tasks.length === 1 ? 'а' : ''}</span><span>Сначала самые готовые</span></div>
      <div className="market-grid">
        {tasks.map((task: Task) => {
          const expanded = selectedTaskId === task.id;
          const taskSubmissions = data.submissions.filter((submission) => submission.taskId === task.id);
          return <article className={`market-card${expanded ? ' expanded' : ''}`} key={task.id}>
            <div className="market-card-top"><span className="market-industry">{task.industry}</span><span className="market-ready">{readiness(task.score)}</span></div>
            <h3>{task.title}</h3>
            <p className="market-summary">{task.summary || task.need}</p>
            <div className="market-score-row"><div className="market-progress"><span style={{ width: `${task.score}%` }} /></div><strong>{task.score}<small>/100</small></strong></div>
            <div className="market-card-foot"><span>{taskSubmissions.length} предложени{taskSubmissions.length === 1 ? 'е' : 'й'}</span><button type="button" onClick={() => { setSelectedTaskId(expanded ? null : task.id); setNotice(''); }}>{expanded ? 'Свернуть' : 'Подробнее'} <span>→</span></button></div>

            {expanded && <div className="market-detail">
              <div className="market-detail-columns">
                <div><h4>О задаче</h4><p><b>Контекст</b>{task.context || 'Пока не указан'}</p><p><b>Потребность</b>{task.need || 'Пока не указана'}</p><p><b>Пользователи</b>{task.users || 'Пока не указаны'}</p><p><b>Данные</b>{task.data || 'Пока не указаны'}</p></div>
                <div><h4>Ожидаемый результат</h4><p>{task.expectedResult || 'Бизнес уточнит ожидаемый результат вместе с командой.'}</p><p><b>Критерии успеха</b>{task.successCriteria || 'Ещё обсуждаются'}</p><p><b>Ограничения</b>{task.constraints || 'Не указаны'}</p></div>
              </div>

              <form className="proposal-form" onSubmit={submitProposal}>
                <h4>Предложить решение</h4><p>Бизнес рассмотрит отклик и сам решит, продолжать ли работу с командой.</p>
                <label>Название команды<input required value={teamName} onChange={(event) => setTeamName(event.target.value)} placeholder="Например, Digital Lab" /></label>
                <label>Идея решения<textarea required rows={2} value={idea} onChange={(event) => setIdea(event.target.value)} placeholder="Какой подход вы предлагаете?" /></label>
                <label>План работы<textarea required rows={2} value={plan} onChange={(event) => setPlan(event.target.value)} placeholder="Какие шаги выполнит команда?" /></label>
                <div className="proposal-row"><label>Срок<input value={timeline} onChange={(event) => setTimeline(event.target.value)} placeholder="Например, 3 недели" /></label><label>Ссылка на прототип<input type="url" value={prototypeUrl} onChange={(event) => setPrototypeUrl(event.target.value)} placeholder="https://" /></label></div>
                <button className="primary-button" type="submit">Отправить предложение <span>→</span></button>
              </form>

              <div className="business-responses"><h4>Решение бизнеса <span>{taskSubmissions.length}</span></h4>
                {taskSubmissions.length === 0 ? <p className="empty-responses">Когда команды откликнутся, здесь появятся их предложения.</p> : taskSubmissions.map((submission) => <div className="response-card" key={submission.id}>
                  <div className="response-heading"><strong>{submission.teamName}</strong><span className={`response-status ${submission.status}`}>{submission.status === 'pending' ? 'На рассмотрении' : submission.status === 'accepted' ? 'Выбрана бизнесом' : 'Отклонена'}</span></div>
                  <p><b>Идея:</b> {submission.idea}</p><p><b>План:</b> {submission.plan}</p>
                  {submission.timeline && <p><b>Срок:</b> {submission.timeline}</p>}{submission.prototypeUrl && <p><b>Прототип:</b> <a href={submission.prototypeUrl} target="_blank" rel="noreferrer">Открыть ссылку</a></p>}
                  {submission.status === 'pending' && <div className="decision-buttons"><button type="button" onClick={() => decideSubmission(submission.id, 'accepted')}>Выбрать команду</button><button type="button" onClick={() => decideSubmission(submission.id, 'rejected')}>Отклонить</button></div>}
                </div>)}
              </div>
            </div>}
          </article>;
        })}
      </div>
      {tasks.length === 0 && <div className="market-empty"><strong>Пока нет задач в этом направлении</strong><span>Попробуйте выбрать другой фильтр.</span></div>}
    </section>
  );
}
