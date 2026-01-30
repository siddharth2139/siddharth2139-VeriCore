
import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { LiveVerification } from './components/LiveVerification';
import { AgentDashboard } from './components/AgentDashboard';
import { PlatformConfig } from './components/PlatformConfig';
import { TabType, VerificationRecord, PlatformSettings, RequiredField } from './types';
import { INITIAL_RECORDS } from './constants';
import { Key, AlertCircle, ExternalLink, ShieldCheck } from 'lucide-react';

const ALL_FIELDS: RequiredField[] = [
  'name', 'dob', 'address', 'gender', 'fatherName', 
  'motherName', 'nationality', 'issueDate', 'expiryDate'
];

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('verification');
  const [records, setRecords] = useState<VerificationRecord[]>(INITIAL_RECORDS);
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [settings, setSettings] = useState<PlatformSettings>({
    requirePin: true,
    strictFaceMatch: true,
    autoRejectExpired: true,
    requiredBuckets: ['Tax', 'Address'],
    requiredFields: ALL_FIELDS // All fields selected by default
  });

  const checkKeyValidity = (key: any) => {
    return !!key && key !== 'undefined' && key !== '';
  };

  useEffect(() => {
    const checkKey = async () => {
      try {
        if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
          const selected = await window.aistudio.hasSelectedApiKey();
          if (selected) {
            setHasKey(true);
            return;
          }
        }
        const envKey = process.env.API_KEY;
        setHasKey(checkKeyValidity(envKey));
      } catch (e) {
        setHasKey(checkKeyValidity(process.env.API_KEY));
      }
    };
    checkKey();
  }, []);

  const handleConnectKey = async () => {
    try {
      if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
        await window.aistudio.openSelectKey();
        setHasKey(true); 
      }
    } catch (e) {
      console.error("Failed to open key selector", e);
    }
  };

  const handleNewVerification = (record: VerificationRecord) => {
    setRecords(prev => [record, ...prev]);
  };

  const handleUpdateStatus = (id: string, status: 'Approved' | 'Rejected') => {
    setRecords(prev => prev.map(r => r.id === id ? { ...r, status } : r));
  };

  if (hasKey === false) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50 p-6 text-center">
        <div className="bg-white p-10 rounded-[32px] shadow-2xl border border-slate-200 max-w-md w-full animate-in fade-in zoom-in duration-500">
          <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner">
            <Key className="w-10 h-10 text-indigo-600" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 mb-4 tracking-tight">API Key Required</h1>
          <p className="text-slate-500 text-sm mb-8 leading-relaxed font-medium">
            To use the Agentic Engine on Vercel, you must provide a valid API key.
          </p>
          <div className="space-y-4">
            <button 
              onClick={handleConnectKey}
              className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-sm shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 active:scale-95 transition-all"
            >
              Select / Connect API Key
            </button>
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 text-[11px] text-amber-700 text-left font-medium">
              <strong>Vercel Users:</strong> Ensure you added <code>API_KEY</code> in Project Settings and <strong>Redeployed</strong>.
            </div>
            <a 
              href="https://ai.google.dev/gemini-api/docs/billing" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-indigo-600 transition-colors pt-2"
            >
              Billing Documentation <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden text-slate-900">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      
      <main className="flex-1 overflow-y-auto">
        <header className="sticky top-0 z-20 bg-white border-b border-slate-200 px-8 py-5 flex justify-between items-center shadow-sm">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">VeriCore Workflow Engine</h1>
              <p className="text-xs text-slate-500 font-medium">Enterprise Agentic Orchestration</p>
            </div>
            <div className="h-8 w-px bg-slate-200 mx-2 hidden md:block" />
            <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-full">
              <div className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
              <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">Active Module: Identity Verification (KYC)</span>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 border border-emerald-100 rounded-lg">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-[10px] font-bold text-emerald-700 uppercase">Engine Connected</span>
          </div>
        </header>

        <div className="max-w-6xl mx-auto p-8">
          {activeTab === 'verification' && (
            <LiveVerification 
              onComplete={handleNewVerification} 
              settings={settings}
            />
          )}
          {activeTab === 'dashboard' && (
            <AgentDashboard 
              records={records} 
              onUpdateStatus={handleUpdateStatus}
              settings={settings}
            />
          )}
          {activeTab === 'config' && (
            <PlatformConfig 
              settings={settings} 
              onSettingsChange={setSettings} 
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
