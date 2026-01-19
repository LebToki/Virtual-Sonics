
import React, { useState, useEffect } from 'react';
import { AppView } from './types';
import Sidebar from './components/Sidebar';
import AudioLab from './components/AudioLab';
import ProductArchitect from './components/ProductArchitect';
import CoverCreator from './components/CoverCreator';
import AudioTranscriber from './components/AudioTranscriber';
import LiveSession from './components/LiveSession';
import Header from './components/Header';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.LAB);
  const [isApiKeySelected, setIsApiKeySelected] = useState(false);

  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio?.hasSelectedApiKey) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setIsApiKeySelected(hasKey);
      }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio?.openSelectKey) {
      await window.aistudio.openSelectKey();
      setIsApiKeySelected(true);
    }
  };

  const renderView = () => {
    switch (currentView) {
      case AppView.LAB:
        return <AudioLab />;
      case AppView.ARCHITECT:
        return <ProductArchitect onSelectKey={handleSelectKey} isKeyActive={isApiKeySelected} />;
      case AppView.COVER_ART:
        return <CoverCreator onSelectKey={handleSelectKey} isKeyActive={isApiKeySelected} />;
      case AppView.TRANSCRIBE:
        return <AudioTranscriber />;
      case AppView.LIVE:
        return <LiveSession onSelectKey={handleSelectKey} isKeyActive={isApiKeySelected} />;
      default:
        return <AudioLab />;
    }
  };

  return (
    <div className="flex h-screen bg-[#050505] text-white selection:bg-white selection:text-black">
      <Sidebar currentView={currentView} setView={setCurrentView} />
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <Header />
        <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {renderView()}
        </main>
        
        {/* Ambient Glow Background */}
        <div className="fixed top-0 right-0 w-[50vw] h-[50vh] bg-blue-500/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="fixed bottom-0 left-0 w-[40vw] h-[40vh] bg-purple-500/5 blur-[120px] rounded-full translate-y-1/2 -translate-x-1/2 pointer-events-none" />
      </div>
    </div>
  );
};

export default App;