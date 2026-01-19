
import React from 'react';
import { AppView } from '../types';

interface SidebarProps {
  currentView: AppView;
  setView: (view: AppView) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, setView }) => {
  const navItems = [
    { id: AppView.LAB, label: 'Audio Lab', icon: '◈' },
    { id: AppView.LIVE, label: 'Neural Chat', icon: '◎' },
    { id: AppView.ARCHITECT, label: 'Architect', icon: '⧇' },
    { id: AppView.COVER_ART, label: 'Cover Art', icon: '▣' },
    { id: AppView.TRANSCRIBE, label: 'Lexicon', icon: '◰' },
  ];

  return (
    <div className="w-64 border-r border-white/5 bg-[#0a0a0a] flex flex-col h-full">
      <div className="p-8">
        <h1 className="text-xl font-bold tracking-tighter mb-1">VIRTUAL SONICS</h1>
        <p className="text-[10px] mono text-white/40 uppercase tracking-[0.2em]">Speculative Audio Agency</p>
      </div>

      <nav className="flex-1 px-4 space-y-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setView(item.id)}
            className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg transition-all duration-300 text-sm font-medium ${
              currentView === item.id 
                ? 'bg-white text-black' 
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <span className="text-lg leading-none">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      <div className="p-8 border-t border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-gradient-to-tr from-blue-500 to-purple-500 animate-pulse" />
          <div>
            <p className="text-[10px] mono text-white/40 uppercase">Status</p>
            <p className="text-[11px] font-medium text-emerald-400">System Nominal</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;