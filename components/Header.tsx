
import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="h-16 border-b border-white/5 px-8 flex items-center justify-between bg-[#050505]/80 backdrop-blur-md sticky top-0 z-50">
      <div className="flex items-center gap-4">
        <span className="px-2 py-0.5 border border-white/20 text-[10px] mono text-white/40 rounded uppercase">v3.1.0-Fast</span>
        <div className="h-4 w-[1px] bg-white/10" />
        <p className="text-xs text-white/40 uppercase tracking-widest mono">Node-X // Tokyo // London</p>
      </div>
      <div className="flex items-center gap-6">
        <button className="text-[10px] mono text-white/40 uppercase hover:text-white transition-colors">Documentation</button>
        <button className="text-[10px] mono text-white/40 uppercase hover:text-white transition-colors">API Keys</button>
        <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center bg-white/5 overflow-hidden">
          <img src="https://picsum.photos/seed/user/100/100" alt="Avatar" className="w-full h-full object-cover opacity-80" />
        </div>
      </div>
    </header>
  );
};

export default Header;
