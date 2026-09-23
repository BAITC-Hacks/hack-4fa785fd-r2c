import { useMemo, useState } from 'react';
import { readData, writeData } from '../../shared/store';
import type { Task } from '../../shared/types';
import { getReadinessLabel, getTaskScore, ratingParts } from './rating';

const questions = [
  { field: 'context', label: 'Что происходит сейчас и в чём проблема?', placeholder: 'Например: гости ждут заказ дольше 15 минут в обеденный пик.' },
  { field: 'users', label: 'Для кого нужно решение?', placeholder: 'Например: посетители кафе и сотрудники кассы.' },
  { field: 'data', label: 'Какие данные, материалы или примеры доступны?', placeholder: 'Например: обезличенная статистика заказов за последние 3 месяца.' },
  { field: 'expectedResult', label: 'Какой результат вы ждёте от команды?', placeholder: 'Например: прототип и план пилотного запуска.' },
  { field: 'successCriteria', label: 'По каким признакам поймёте, что решение сработало?', placeholder: 'Например: медианное время ожидания снизилось на 15%.' },
  { field: 'constraints', label: 'Какие есть ограничения?', placeholder: 'Например: нельзя менять кассовую систему, срок пилота — до 6 недель.' },
  { field: 'contact', label: 'Как команда сможет общаться с вами?', placeholder: 'Например: встреча с управляющим раз в неделю.' },
] as const;

type EditableField = (typeof questions)[number]['field'] | 'need' | 'title' | 'industry';

function newTask(description: string): Task {
  const title = description.trim().split(/[.!?\n]/)[0]?.slice(0, 72) || 'Новая бизнес-задача';
  return {
    id: crypto.randomUUID(), title, industry: 'Другое', summary: description.trim(),
    context: '', need: description.trim(), users: '', data: '', constraints: '',
    expectedResult: '', successCriteria: '', contact: '', score: 0, status: 'draft',
    createdAt: new Date().toISOString().slice(0, 10),
  };
}

export default function BusinessHome() {
  const [description, setDescription] = useState('');
  const [task, setTask] = useState<Task | null>(null);
  const [stage, setStage] = useState<'start' | 'questions' | 'card' | 'published'>('start');
  const [industry, setIndustry] = useState('Другое');
  const score = useMemo(() => task ? getTaskScore(task) : 0, [task]);

  function updateTask(field: EditableField, value: string) {
    setTask((current) => {
      if (!current) return current;
      const updated = { ...current, [field]: value, industry: field === 'industry' ? value : industry };
      updated.score = getTaskScore(updated);
      const data = readData();
      const found = data.tasks.some((item) => item.id === updated.id);
      data.tasks = found ? data.tasks.map((item) => item.id === updated.id ? updated : item) : [...data.tasks, updated];
      writeData(data);
      return updated;
    });
  }

  function startQuestions() {
    const created = newTask(description);
    setTask(created);
    const data = readData();
    data.tasks = [...data.tasks.filter((item) => item.id !== created.id), created];
    writeData(data);
    setStage('questions');
  }

  function publishTask() {
    if (!task) return;
    const published = { ...task, industry, score, status: 'published' as const };
    const data = readData();
    data.tasks = data.tasks.map((item) => item.id === published.id ? published : item);
    writeData(data);
    setTask(published);
    setStage('published');
  }

  function resetForm() {
    setDescription('');
    setTask(null);
    setStage('start');
  }

  return (
    <section className="business-flow">
      <div className="business-heading">
        <div>
          <span className="eyebrow">КАБИНЕТ БИЗНЕСА</span>
          <h2>Превратите проблему в задачу для команды</h2>
          <p>Опишите вызов своими словами. Sana поможет собрать понятную карточку и покажет, что ещё стоит уточнить.</p>
        </div>
        {stage !== 'start' && <button className="text-button" type="button" onClick={resetForm}>Начать заново</button>}
      </div>

      {stage === 'start' && (
        <div className="panel form-panel">
          <label className="field-label" htmlFor="business-description">Какая задача сейчас стоит перед вашим бизнесом?</label>
          <textarea id="business-description" rows={4} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Например: хотим уменьшить очереди в кафе…" />
          <div className="form-actions"><span>Можно начать с черновой идеи</span><button className="primary-button" disabled={description.trim().length < 8} onClick={startQuestions} type="button">Уточнить задачу <span>→</span></button></div>
        </div>
      )}

      {stage === 'questions' && task && (
        <div className="panel form-panel">
          <div className="step-heading"><span className="step-number">01</span><div><h3>Давайте уточним детали</h3><p>Sana предложила вопросы по полям, которых не хватает в черновике.</p></div></div>
          <div className="ai-note"><span>✳</span> В демо вопросы сформированы по шаблону. Ответы попадут в карточку и повысят её готовность.</div>
          <div className="questions-list">
            {questions.slice(0, 3).map((question) => <label className="question-item" key={question.field}><span>{question.label}</span><textarea rows={2} value={task[question.field]} onChange={(event) => updateTask(question.field, event.target.value)} placeholder={question.placeholder} /></label>)}
          </div>
          <div className="form-actions"><span>В карточке можно будет заполнить остальные поля</span><button className="primary-button" onClick={() => setStage('card')} type="button">Собрать карточку <span>→</span></button></div>
        </div>
      )}

      {stage === 'card' && task && (
        <div className="card-layout">
          <div className="panel form-panel">
            <div className="step-heading"><span className="step-number">02</span><div><h3>Проверьте карточку задачи</h3><p>Отредактируйте формулировки и добавьте недостающую информацию.</p></div></div>
            <label className="question-item"><span>Название задачи</span><input value={task.title} onChange={(event) => updateTask('title', event.target.value)} /></label>
            <label className="question-item"><span>Отрасль</span><select value={industry} onChange={(event) => { setIndustry(event.target.value); updateTask('industry', event.target.value); }}><option>Другое</option><option>Общепит</option><option>Образование</option><option>Здравоохранение</option><option>Розничная торговля</option><option>Логистика</option><option>Финансы</option></select></label>
            <label className="question-item"><span>Потребность: что нужно изменить?</span><textarea rows={2} value={task.need} onChange={(event) => updateTask('need', event.target.value)} placeholder="Опишите желаемое изменение" /></label>
            {questions.map((question) => <label className="question-item" key={question.field}><span>{question.label}</span><textarea rows={2} value={task[question.field]} onChange={(event) => updateTask(question.field, event.target.value)} placeholder={question.placeholder} /></label>)}
            <div className="form-actions"><span>Публикация станет доступна после вашего подтверждения</span><button className="primary-button" onClick={publishTask} type="button">Подтвердить и опубликовать <span>→</span></button></div>
          </div>
          <aside className="panel score-panel">
            <span className="eyebrow">ГОТОВНОСТЬ ЗАДАЧИ</span>
            <div className="score-number">{score}<small>/100</small></div>
            <div className="score-level">{getReadinessLabel(score)}</div>
            <div className="score-track"><span style={{ width: `${score}%` }} /></div>
            <p className="score-tip">Заполните поля, чтобы командам было проще оценить задачу и предложить решение.</p>
            <div className="rating-lines">{ratingParts.map((part) => {
              const complete = part.fields.every((field) => task[field].trim().length >= 8);
              return <div className="rating-line" key={part.label}><span className={complete ? 'rating-check done' : 'rating-check'}>{complete ? '✓' : '·'}</span><span>{part.label}</span><b>{complete ? part.points : 0}<small>/{part.points}</small></b></div>;
            })}</div>
          </aside>
        </div>
      )}

      {stage === 'published' && task && (
        <div className="panel success-panel"><div className="success-icon">✓</div><span className="eyebrow">ЗАДАЧА ОПУБЛИКОВАНА</span><h3>{task.title}</h3><p>Карточка добавлена в общий каталог. Команды смогут изучить её и отправить предложение.</p><div className="success-score"><strong>{score}/100</strong><span>{getReadinessLabel(score)} · {task.industry}</span></div><button className="secondary-button" onClick={resetForm} type="button">Создать ещё одну задачу</button></div>
      )}
    </section>
  );
}
