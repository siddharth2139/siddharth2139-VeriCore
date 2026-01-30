
import React, { useState } from 'react';
import { Search, X, AlertCircle, Clock, ShieldCheck, User, ImageIcon, Check, Eye, ClipboardList, Filter, Send, History, MessageSquare, ArrowUpRight, UserPlus, ChevronDown, Landmark, ShieldAlert, ArrowRightLeft } from 'lucide-react';
import { VerificationRecord, PlatformSettings, DocumentInfo } from '../types';

interface AgentDashboardProps {
  records: VerificationRecord[];
  onUpdateStatus: (id: string, status: 'Approved' | 'Rejected') => void;
  settings: PlatformSettings;
}

export const AgentDashboard: React.FC<AgentDashboardProps> = ({ records, onUpdateStatus, settings }) => {
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'All' | 'Approved' | 'Flagged' | 'Rejected'>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const activeReview = records.find(r => r.id === reviewId);

  const filteredRecords = records.filter(record => {
    const matchesStatus = statusFilter === 'All' || record.status === statusFilter;
    const matchesSearch = record.customerName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          record.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const renderDataValue = (val: string | undefined) => {
    if (!val || val.toLowerCase() === 'null' || val === "" || val.toLowerCase() === 'unreadable' || val.toLowerCase().includes('not found') || val === 'N/A') 
      return <span className="text-slate-400 italic text-[11px] px-2 py-0.5 bg-slate-50 rounded">NO DATA FOUND</span>;
    return (
      <div className="flex items-center gap-2">
        <span className="text-slate-900 font-bold uppercase">{val}</span>
        {/* Fix: Lucide icons do not accept 'title' prop directly. Removed to fix type error. */}
        <Check className="w-3 h-3 text-indigo-500" strokeWidth={4} />
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-6xl mx-auto">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total KYC Checks', value: records.length, icon: Clock, color: 'text-indigo-500' },
          { label: 'Approved', value: records.filter(r => r.status === 'Approved').length, icon: ShieldCheck, color: 'text-emerald-500' },
          { label: 'Review Required', value: records.filter(r => r.status === 'Flagged').length, icon: AlertCircle, color: 'text-amber-500' },
          { label: 'Rejected', value: records.filter(r => r.status === 'Rejected').length, icon: X, color: 'text-red-500' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
              <p className="text-slate-400 text-[9px] font-bold uppercase tracking-widest">{stat.label}</p>
            </div>
            <p className="text-2xl font-bold text-slate-900 tracking-tight">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between gap-4 flex-wrap">
          <h3 className="text-base font-bold text-slate-900 tracking-tight">Audit Trail & Decision Engine</h3>
          <div className="flex gap-3 flex-wrap">
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none"
            >
              <option value="All">All Statuses</option>
              <option value="Approved">Approved</option>
              <option value="Flagged">Review Required</option>
              <option value="Rejected">Rejected</option>
            </select>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
              <input 
                type="text" 
                placeholder="Search sessions..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium w-full sm:w-64" 
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">KYC Session</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer Profile</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Assigned To</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.map((record) => (
                <tr key={record.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-5">
                    <p className="text-xs font-bold text-slate-900">{record.id}</p>
                    <p className="text-[10px] text-slate-400 font-medium">{record.timestamp}</p>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <img src={record.selfieImage} className="w-10 h-10 rounded-xl object-cover grayscale border border-slate-200 bg-white" />
                      <div>
                        <p className="text-xs font-bold text-slate-800 tracking-tight">{record.customerName}</p>
                        <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${
                          record.riskScore === 'High' ? 'bg-red-50 text-red-500' : 'bg-indigo-50 text-indigo-500'
                        }`}>{record.riskScore} Risk</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                       <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500 border border-slate-200">
                          {record.assignee?.split(' ')[0][0]}{record.assignee?.split(' ')[1][0]}
                       </div>
                       <span className="text-[11px] font-bold text-slate-600">{record.assignee}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className={`px-3 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest border ${
                      record.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                      record.status === 'Flagged' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                      record.status === 'Rejected' ? 'bg-red-50 text-red-700 border-red-100' : 'bg-slate-50 text-slate-400'
                    }`}>
                      {record.status}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <button onClick={() => setReviewId(record.id)} className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-indigo-600 hover:text-white transition-all shadow-sm">
                      <Eye className="w-4 h-4" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Review</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {reviewId && activeReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-6 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl w-full max-w-6xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] border border-slate-200">
            <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center shrink-0">
               <div className="flex items-center gap-4">
                 <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                    <ClipboardList className="w-5 h-5 text-indigo-600" />
                 </div>
                 <div>
                   <h3 className="text-xl font-bold text-slate-900 tracking-tight uppercase">Case Review: {activeReview.customerName}</h3>
                   <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{activeReview.id}</span>
                      <div className="w-1 h-1 bg-slate-200 rounded-full" />
                      <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest">
                        {activeReview.status === 'Flagged' ? 'Manual Decision Required' : 'Automated Agent Decision'}
                      </span>
                   </div>
                 </div>
               </div>
               <button onClick={() => setReviewId(null)} className="p-2.5 hover:bg-slate-100 rounded-full transition-colors text-slate-400"><X className="w-5 h-5" /></button>
            </div>

            <div className="flex flex-1 overflow-hidden">
               {/* Data Panel */}
               <div className="flex-[7] overflow-y-auto p-10 space-y-12 bg-white custom-scrollbar">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    <div className="space-y-8">
                       <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-3 flex items-center gap-2">
                         <ImageIcon className="w-4 h-4" /> Captured Evidence
                       </h4>
                       <div className="space-y-8">
                          <div className="space-y-3">
                             <div className="flex justify-between items-center">
                                <p className="text-[10px] font-bold text-slate-600 uppercase">Verification Selfie</p>
                                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-md border border-emerald-100 text-[9px] font-bold uppercase">
                                  <Check className="w-3 h-3" strokeWidth={4} /> Liveness Confirmed
                                </div>
                             </div>
                             <div className="group relative rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-50 aspect-video flex items-center justify-center">
                                <img src={activeReview.selfieImage} className="w-full h-full object-cover grayscale transition-transform duration-500 group-hover:scale-110" />
                             </div>
                          </div>
                          
                          {Object.entries(activeReview.idImages).map(([docType, sides]) => {
                            const images = sides as { front: string; back?: string };
                            const docInfo = activeReview.documents[docType];
                            return (
                              <div key={docType} className="space-y-3 pt-6 border-t border-slate-100">
                                 <div className="flex justify-between items-center">
                                    <p className="text-[10px] font-bold text-slate-600 uppercase">{docType} - High Fidelity Scan</p>
                                    <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded border border-indigo-100">ID NO: {docInfo?.number || 'N/A'}</span>
                                 </div>
                                 <div className="group relative rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-white aspect-video flex items-center justify-center">
                                    <img src={images.front} className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-500" />
                                 </div>
                              </div>
                            );
                          })}
                       </div>
                    </div>

                    <div className="space-y-10">
                       <div className="bg-slate-50 p-8 rounded-[32px] border border-slate-200/50 shadow-inner">
                          <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-8 flex items-center gap-2">
                             <User className="w-4 h-4" /> Agent-Extracted Profile
                          </h4>
                          <div className="grid grid-cols-2 gap-y-8 gap-x-6">
                             <div className="col-span-2">
                                <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Legal Customer Name</p>
                                <p className="text-2xl font-black text-slate-900 tracking-tight uppercase">{renderDataValue(activeReview.customerName)}</p>
                             </div>
                             
                             <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Birth Date</p>
                                <p className="text-sm font-bold text-slate-800">{renderDataValue(activeReview.dob)}</p>
                             </div>
                             <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Gender</p>
                                <p className="text-sm font-bold text-slate-800 uppercase">{renderDataValue(activeReview.gender)}</p>
                             </div>
                             <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Father's Name</p>
                                <p className="text-sm font-bold text-slate-800 uppercase">{renderDataValue(activeReview.fatherName)}</p>
                             </div>
                             <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Mother's Name</p>
                                <p className="text-sm font-bold text-slate-800 uppercase">{renderDataValue(activeReview.motherName)}</p>
                             </div>
                             <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Nationality</p>
                                <p className="text-sm font-bold text-slate-800 uppercase">{renderDataValue(activeReview.nationality)}</p>
                             </div>
                             <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Document Dates</p>
                                {(Object.values(activeReview.documents) as DocumentInfo[]).map((doc, idx) => (
                                  <div key={idx} className="space-y-1 mt-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[9px] font-black text-slate-400 uppercase">Issue:</span>
                                      {renderDataValue(doc.issueDate)}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-[9px] font-black text-slate-400 uppercase">Expiry:</span>
                                      {renderDataValue(doc.expiryDate)}
                                    </div>
                                  </div>
                                ))}
                             </div>
                             <div className="col-span-2">
                                <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Residential Address</p>
                                <div className="p-4 bg-white rounded-2xl border border-slate-200 text-xs font-bold text-slate-700 leading-relaxed shadow-sm">
                                  {renderDataValue(activeReview.address)}
                                </div>
                             </div>
                          </div>
                       </div>

                       <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm">
                          <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-8 flex items-center gap-2">
                             <ShieldCheck className="w-4 h-4" /> Intelligence Audit
                          </h4>
                          <div className="space-y-6">
                             <div className="flex flex-col gap-2">
                                <div className="flex justify-between items-center mb-1">
                                   <span className="text-[10px] font-bold text-slate-500 uppercase">Bio-Similarity Analysis</span>
                                   <span className={`text-xs font-black ${activeReview.faceMatchScore > 90 ? 'text-emerald-600' : activeReview.faceMatchScore < 70 ? 'text-rose-600' : 'text-amber-600'}`}>{activeReview.faceMatchScore}% Match</span>
                                </div>
                                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200 p-0.5">
                                   <div className={`h-full rounded-full transition-all duration-1000 ${activeReview.faceMatchScore > 90 ? 'bg-emerald-500' : activeReview.faceMatchScore < 70 ? 'bg-rose-500' : 'bg-amber-500'}`} style={{ width: `${activeReview.faceMatchScore}%` }} />
                                </div>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight mt-1">
                                  {activeReview.faceMatchScore > 90 ? 'THRESHOLD: AUTO-APPROVED (90%+)' : activeReview.faceMatchScore < 70 ? 'THRESHOLD: AUTO-REJECTED (<70%)' : 'THRESHOLD: MANUAL REVIEW (70-90%)'}
                                </p>
                             </div>
                             <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <span className="text-[10px] font-bold text-slate-600 uppercase">PIN Challenge Result</span>
                                <div className={`flex items-center gap-2 px-3 py-1 rounded-lg ${activeReview.pinMatch ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                  {activeReview.pinMatch ? <Check className="w-3.5 h-3.5" strokeWidth={5} /> : <X className="w-3.5 h-3.5" strokeWidth={5} />}
                                  <span className="text-[10px] font-black uppercase tracking-widest">{activeReview.pinMatch ? 'Match' : 'No Match'}</span>
                                </div>
                             </div>
                          </div>
                       </div>
                    </div>
                  </div>
               </div>

               {/* Activity Panel */}
               <div className="flex-[3] bg-slate-50 border-l border-slate-200 flex flex-col min-w-[340px]">
                  <div className="p-8 flex-1 overflow-y-auto space-y-10 custom-scrollbar">
                     <div>
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2"><History className="w-4 h-4" /> Workflow Actions</h4>
                        <div className="space-y-3">
                           <button className="w-full flex items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl hover:border-indigo-600 transition-all group">
                             <div className="flex items-center gap-3">
                               <Landmark className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
                               <span className="text-[10px] font-bold text-slate-700 uppercase">Forward to Compliance</span>
                             </div>
                             <ChevronDown className="w-4 h-4 text-slate-300" />
                           </button>
                           <button className="w-full flex items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl hover:border-indigo-600 transition-all group">
                             <div className="flex items-center gap-3">
                               <ShieldAlert className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
                               <span className="text-[10px] font-bold text-slate-700 uppercase">Escalate to AML/Fraud</span>
                             </div>
                             <ChevronDown className="w-4 h-4 text-slate-300" />
                           </button>
                           <button className="w-full flex items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl hover:border-indigo-600 transition-all group">
                             <div className="flex items-center gap-3">
                               <ArrowRightLeft className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
                               <span className="text-[10px] font-bold text-slate-700 uppercase">Request EDD</span>
                             </div>
                             <ChevronDown className="w-4 h-4 text-slate-300" />
                           </button>
                        </div>

                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 mt-10 flex items-center gap-2"><History className="w-4 h-4" /> Trail</h4>
                        <div className="space-y-6 relative before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-px before:bg-slate-200">
                           {activeReview.activity?.map((act, i) => (
                             <div key={i} className="flex gap-4 relative z-10">
                                <div className="mt-1.5 shrink-0"><div className="w-3.5 h-3.5 rounded-full border-2 border-white bg-indigo-500 shadow-sm" /></div>
                                <div className="space-y-1">
                                   <p className="text-[11px] font-bold text-slate-800 leading-tight">{act.action}</p>
                                   <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">{act.time}</p>
                                </div>
                             </div>
                           )) || <p className="text-center text-[10px] text-slate-400 font-bold uppercase p-6 border border-dashed border-slate-200 rounded-2xl">No history records</p>}
                        </div>
                     </div>
                  </div>

                  <div className="p-8 border-t border-slate-200 bg-white space-y-5 shadow-[0_-4px_20px_rgba(0,0,0,0.03)] shrink-0">
                     <textarea placeholder="Add compliance notes..." className="w-full h-24 p-4 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-2xl focus:border-indigo-500 outline-none resize-none transition-all" />
                     <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => { onUpdateStatus(activeReview.id, 'Approved'); setReviewId(null); }} className="py-4 bg-indigo-600 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 transition-all">Approve KYC</button>
                        <button onClick={() => { onUpdateStatus(activeReview.id, 'Rejected'); setReviewId(null); }} className="py-4 bg-rose-600 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-xl shadow-rose-600/20 hover:bg-rose-700 transition-all">Reject Case</button>
                     </div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
