
import React from 'react';
import { Settings, Shield, Check, Layers, Landmark, User, Home, ClipboardList } from 'lucide-react';
import { PlatformSettings, DocBucket, RequiredField } from '../types';
import { DOC_BUCKET_MAP } from '../constants';

interface PlatformConfigProps {
  settings: PlatformSettings;
  onSettingsChange: (settings: PlatformSettings) => void;
}

const BUCKETS: { id: DocBucket; label: string; icon: any; color: string }[] = [
  { id: 'Tax', label: 'Tax Proof (e.g. PAN)', icon: Landmark, color: 'text-rose-500' },
  { id: 'Identity', label: 'Identity Proof (e.g. DL)', icon: User, color: 'text-indigo-500' },
  { id: 'Address', label: 'Address Proof (e.g. Aadhaar)', icon: Home, color: 'text-emerald-500' },
];

const FIELDS: { id: RequiredField; label: string }[] = [
  { id: 'name', label: 'Person Full Name' },
  { id: 'dob', label: 'Date of Birth' },
  { id: 'gender', label: 'Gender' },
  { id: 'address', label: 'Physical Address' },
  { id: 'fatherName', label: "Father's Name" },
  { id: 'motherName', label: "Mother's Name" },
  { id: 'nationality', label: 'Nationality' },
  { id: 'issueDate', label: 'Document Issue Date' },
  { id: 'expiryDate', label: 'Document Expiry Date' },
];

export const PlatformConfig: React.FC<PlatformConfigProps> = ({ settings, onSettingsChange }) => {
  const toggleBucket = (bucket: DocBucket) => {
    const newBuckets = settings.requiredBuckets.includes(bucket)
      ? settings.requiredBuckets.filter(b => b !== bucket)
      : [...settings.requiredBuckets, bucket];
    onSettingsChange({ ...settings, requiredBuckets: newBuckets });
  };

  const toggleField = (field: RequiredField) => {
    const newFields = settings.requiredFields.includes(field)
      ? settings.requiredFields.filter(f => f !== field)
      : [...settings.requiredFields, field];
    onSettingsChange({ ...settings, requiredFields: newFields });
  };

  const toggleSetting = (key: keyof PlatformSettings) => {
    if (typeof settings[key] === 'boolean') {
      onSettingsChange({ ...settings, [key]: !settings[key] });
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-20">
      <div className="flex items-center gap-6 mb-8">
        <div className="p-4 bg-slate-900 rounded-2xl shadow-lg text-white">
          <Settings className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Setup Verification Rules</h2>
          <p className="text-slate-500 font-medium text-sm">Choose what documents and details are required for a user to pass.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-8">
          <section className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-xl">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
              <Layers className="w-4 h-4" /> Required Document Types
            </h3>
            <div className="space-y-4">
              {BUCKETS.map(bucket => {
                const Icon = bucket.icon;
                const isActive = settings.requiredBuckets.includes(bucket.id);
                return (
                  <button 
                    key={bucket.id}
                    onClick={() => toggleBucket(bucket.id)}
                    className={`w-full flex items-center gap-4 p-5 rounded-[24px] border transition-all text-left ${
                      isActive 
                        ? 'bg-indigo-600 border-indigo-600 shadow-lg text-white' 
                        : 'bg-slate-50 border-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <div className={`p-3 rounded-xl ${isActive ? 'bg-white/20' : 'bg-white shadow-sm'}`}>
                      <Icon className={`w-5 h-5 ${isActive ? 'text-white' : bucket.color}`} />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-sm">{bucket.label}</p>
                      <p className={`text-[10px] font-medium ${isActive ? 'text-white/70' : 'text-slate-500'}`}>
                        Any of: {Object.keys(DOC_BUCKET_MAP).filter(doc => DOC_BUCKET_MAP[doc].includes(bucket.id)).join(', ')}
                      </p>
                    </div>
                    {isActive && <Check className="w-5 h-5" />}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-xl">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
              <Shield className="w-4 h-4" /> Security Options
            </h3>
            <div className="space-y-6">
               {[
                 { key: 'requireLivenessGesture', label: 'Hand gesture liveness', sub: 'User must perform a specific hand gesture in selfie' },
                 { key: 'strictFaceMatch', label: 'Strict face matching', sub: 'Require high confidence between ID and selfie' },
                 { key: 'autoRejectExpired', label: 'Block expired documents', sub: 'Auto-fail if document date has passed' },
               ].map((toggle) => (
                 <div key={toggle.key} className="flex items-center justify-between gap-4">
                   <div>
                     <p className="text-sm font-bold text-slate-800">{toggle.label}</p>
                     <p className="text-[10px] text-slate-400 font-medium">{toggle.sub}</p>
                   </div>
                   <button 
                     onClick={() => toggleSetting(toggle.key as any)}
                     className={`shrink-0 w-12 h-6 rounded-full transition-all flex items-center px-1 ${
                       settings[toggle.key as keyof PlatformSettings] ? 'bg-indigo-600' : 'bg-slate-200'
                     }`}
                   >
                     <div className={`w-4 h-4 rounded-full bg-white shadow-md transition-transform ${
                       settings[toggle.key as keyof PlatformSettings] ? 'translate-x-6' : 'translate-x-0'
                     }`} />
                   </button>
                 </div>
               ))}
            </div>
          </section>
        </div>

        <div className="space-y-8">
           <section className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-xl">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                <ClipboardList className="w-4 h-4" /> Fields to Extract
              </h3>
              <p className="text-xs text-slate-500 mb-6 font-medium">
                Choose which details must be captured and checked across all provided IDs.
              </p>
              <div className="grid grid-cols-1 gap-3">
                {FIELDS.map(field => (
                  <button 
                    key={field.id}
                    onClick={() => toggleField(field.id)}
                    className={`flex items-center justify-between p-4 rounded-2xl border transition-all text-left ${
                      settings.requiredFields.includes(field.id) 
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-bold' 
                        : 'bg-white border-slate-100 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-xs font-bold uppercase tracking-tight">{field.label}</span>
                    {settings.requiredFields.includes(field.id) && <Check className="w-4 h-4" />}
                  </button>
                ))}
              </div>
           </section>
        </div>
      </div>
    </div>
  );
};
