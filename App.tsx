
import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { LiveVerification } from './components/LiveVerification';
import { AgentDashboard } from './components/AgentDashboard';
import { PlatformConfig } from './components/PlatformConfig';
import { TabType, VerificationRecord, PlatformSettings } from './types';
import { INITIAL_RECORDS } from './constants';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('verification');
  const [records, setRecords] = useState<VerificationRecord[]>(INITIAL_RECORDS);
  const [settings, setSettings] = useState<PlatformSettings>({
    requirePin: true,
    strictFaceMatch: true,
    autoRejectExpired: true,
    requiredBuckets: ['Tax', 'Address'],
    requiredFields: ['name', 'dob', 'address', 'gender', 'fatherName']
  });

  const handleNewVerification = (record: VerificationRecord) => {
    setRecords(prev => [record, ...prev]);
  };

  const handleUpdateStatus = (id: string, status: 'Approved' | 'Rejected') => {
    setRecords(prev => prev.map(r => r.id === id ? { ...r, status } : r));
  };

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
