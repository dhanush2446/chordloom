import React, { useState } from 'react';
import { LandingPage } from './components/LandingPage';
import { InstrumentPage } from './components/InstrumentPage';

const App: React.FC = () => {
  const [view, setView] = useState<'landing' | 'instrument'>('landing');

  return view === 'landing'
    ? <LandingPage onLaunch={() => setView('instrument')} />
    : <InstrumentPage onExit={() => setView('landing')} />;
};

export default App;
