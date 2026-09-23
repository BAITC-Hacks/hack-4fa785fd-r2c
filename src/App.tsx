import { useState } from 'react';
import BusinessHome from './features/business/BusinessHome';
import MarketplaceHome from './features/marketplace/MarketplaceHome';

type View = 'business' | 'marketplace';

export default function App() {
  const [view, setView] = useState<View>('business');

  return (
    <main className="shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="AI Sana — на главную">
          <span className="brand-mark">S</span>
          <span>AI Sana</span>
        </a>
        <div className="topbar-note">Практические задачи для реального бизнеса</div>
        <button className="avatar" type="button" aria-label="Демо профиль">AS</button>
      </header>

      <section className="hero" id="top">
        <div>
          <span className="eyebrow">ПРАКТИЧЕСКИЙ ХАКАТОН</span>
          <h1>Хорошие идеи начинаются<br />с ясной задачи.</h1>
          <p>Бизнес описывает вызов. Команды выбирают, над чем работать.</p>
        </div>
        <div className="hero-orbit" aria-hidden="true"><span>идея</span><i>✳</i></div>
      </section>

      <nav className="role-switch" aria-label="Режим приложения">
        <button className={view === 'business' ? 'active' : ''} onClick={() => setView('business')} type="button">Я представляю бизнес</button>
        <button className={view === 'marketplace' ? 'active' : ''} onClick={() => setView('marketplace')} type="button">Я в студенческой команде</button>
      </nav>

      {view === 'business' ? <BusinessHome /> : <MarketplaceHome />}

      <footer>AI Sana <span>·</span> Задачи выбирают команды, команды выбирает бизнес</footer>
    </main>
  );
}
