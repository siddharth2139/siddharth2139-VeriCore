
import React from 'react';
import { ShieldCheck, LayoutDashboard, Settings, UserCheck } from 'lucide-react';
import { TabType } from '../types';

interface SidebarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange }) => {
  const navItems = [
    { id: 'verification', label: 'Start Verification', icon: UserCheck },
    { id: 'dashboard', label: 'History & Review', icon: LayoutDashboard },
    { id: 'config', label: 'Settings', icon: Settings },
  ] as const;

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-full text-slate-300">
      <div className="p-6 flex items-center gap-3 border-b border-slate-800">
        <div className="bg-indigo-600 p-2 rounded-lg shadow-lg">
          <ShieldCheck className="w-6 h-6 text-white" />
        </div>
        <div>
          <span className="font-bold text-white block tracking-tight">VeriCore</span>
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">KYC Portal</span>
        </div>
      </div>

      <nav className="flex-1 p-4 mt-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                isActive 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
                  : 'hover:bg-slate-800 text-slate-400 hover:text-slate-100'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}`} />
              <span className="font-bold text-sm">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
};
