import React, { useState, useEffect } from 'react';
import { Navbar, ViewType } from './components/Navbar';
import { LandingView } from './views/LandingView';
import { PresentationView } from './views/PresentationView';
import { GameView } from './views/GameView';
import { AppendixView } from './views/AppendixView';
import { GAME_ENABLED } from './config/features';
import './styles/theme.css';

export const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewType>(() => {
    // If URL has ?room=, go directly to game view only when game is enabled
    if (typeof window !== 'undefined' && GAME_ENABLED) {
      const params = new URLSearchParams(window.location.search);
      if (params.get('room')) return 'game';
    }
    return 'landing';
  });

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) {
        entry.target.classList.add('is-revealed'); observer.unobserve(entry.target);
      }
    }, { threshold: 0.08 });
    document.querySelectorAll('.landing-view > section, .landing-view > div').forEach(element => {
      element.classList.add('scroll-reveal'); observer.observe(element);
    });
    return () => observer.disconnect();
  }, [currentView]);

  useEffect(() => {
    if (!GAME_ENABLED) return;
    const handleLocation = () => {
      const params = new URLSearchParams(window.location.search);
      if (params.get('room')) {
        setCurrentView('game');
      }
    };
    window.addEventListener('popstate', handleLocation);
    return () => window.removeEventListener('popstate', handleLocation);
  }, []);

  const handleSelectView = (view: ViewType) => {
    if (!GAME_ENABLED && view === 'game') {
      setCurrentView('landing');
      return;
    }
    setCurrentView(view);
  };

  return (
    <div className="min-h-screen bg-[#f6f3ed] text-[#171513] flex flex-col font-sans selection:bg-[#9d242b] selection:text-white">
      <Navbar currentView={currentView} onSelectView={handleSelectView} />

      <main key={currentView} className="flex-1 page-enter">
        {currentView === 'landing' && <LandingView onSelectView={handleSelectView} />}
        {currentView === 'slides' && <PresentationView onSelectView={handleSelectView} />}
        {GAME_ENABLED && currentView === 'game' && <GameView />}
        {currentView === 'appendix' && <AppendixView />}
      </main>
    </div>
  );
};

export default App;
