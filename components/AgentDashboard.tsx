
import React, { useState } from 'react';
import { Search, X, AlertCircle, Clock, ShieldCheck, User, ImageIcon, Check, Eye, ClipboardList, Filter, Send, History, MessageSquare, ArrowUpRight, UserPlus, ChevronDown } from 'lucide-react';
import { VerificationRecord, PlatformSettings } from '../types';

interface AgentDashboardProps {
  records: VerificationRecord[];
  onUpdateStatus: (id: string, status: 'Approved' | 'Rejected') => void;
  settings: PlatformSettings;
}

export const AgentDashboard: React.FC<AgentDashboardProps> = ({ records, onUpdateStatus, settings }) => {
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'All' | 'Approved' | 'Flagged' | 'Rejected'>('All');
  const [taskFilter, setTaskFilter] = useState<'All' | 'My Tasks'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [commentInput, setCommentInput] = useState('');

  // Simulation of "Current User" for the "My Tasks" filter
  const CURRENT_USER = "Sarah L.";

  const activeReview = records.find(r => r.id === reviewId);

  const filteredRecords = records.filter(record => {
    const matchesStatus = statusFilter === 'All' || record.status === statusFilter;
    const matchesTask = taskFilter === 'All' || record.assignee === CURRENT_USER;
    const matchesSearch = record.customerName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          record.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesTask && matchesSearch;
  });

  const renderDataValue = (val: string | undefined) => {
    if (!val || val.toLowerCase() === 'null' || val === "" || val.toLowerCase() === 'unreadable') 
      return <span className="text-slate-400 italic text-[11px] px-2 py-0.5 bg-slate-50 rounded">No data found</span>;
    return <span className="text-slate-900 font-semibold">{val}</span>;
  };

  const getAvatarColor = (initials: string) => {
    const colors = ['bg-indigo-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-sky-500'];
    const index = initials.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
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
          <div key={i} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm transition-transform hover:translate-y-[-2px]">
            <div className="flex items-center justify-between mb-2">
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
              <p className="text-slate-400 text-[9px] font-bold uppercase tracking-widest">{stat.label}</p>
            </div>
            <p className="text-2xl font-bold text-slate-900 tracking-tight">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <h3 className="text-base font-bold text-slate-900 tracking-tight">Audit Trail & Collaboration</h3>
            <div className="h-4 w-px bg-slate-200 mx-1" />
            
            {/* Task Filter Dropdown */}
            <div className="relative group">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100 transition-all">
                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Scope: {taskFilter}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </div>
              <div className="absolute top-full left-0 mt-1 w-40 bg-white border border-slate-200 rounded-xl shadow-xl hidden group-hover:block z-30 overflow-hidden">
                <button 
                  onClick={() => setTaskFilter('All')}
                  className={`w-full text-left px-4 py-2 text-[10px] font-bold uppercase hover:bg-slate-50 ${taskFilter === 'All' ? 'text-indigo-600' : 'text-slate-500'}`}
                >
                  All Tasks
                </button>
                <button 
                  onClick={() => setTaskFilter('My Tasks')}
                  className={`w-full text-left px-4 py-2 text-[10px] font-bold uppercase hover:bg-slate-50 ${taskFilter === 'My Tasks' ? 'text-indigo-600' : 'text-slate-500'}`}
                >
                  My Tasks
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-3 flex-wrap">
            {/* Status Filter Dropdown */}
            <div className="relative flex items-center bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400 mr-2" />
              <select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-transparent text-xs font-semibold text-slate-700 outline-none cursor-pointer pr-4 appearance-none"
              >
                <option value="All">All Statuses</option>
                <option value="Approved">Approved</option>
                <option value="Flagged">Review Required</option>
                <option value="Rejected">Rejected</option>
              </select>
              <ChevronDown className="absolute right-3 w-3 h-3 text-slate-300 pointer-events-none" />
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
              <input 
                type="text" 
                placeholder="Search case ID or name..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium w-full sm:w-64 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all" 
              />
            </div>
          </div>
        </div>

        {/* Table Content */}
        {filteredRecords.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-24 text-center">
            <ShieldCheck className="w-12 h-12 text-slate-200 mb-4" />
            <p className="text-sm font-semibold text-slate-400">No verification sessions match your criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">KYC Session</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer Profile</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Assignee</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Decision</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-5">
                      <p className="text-xs font-bold text-slate-900 mb-0.5">{record.id}</p>
                      <p className="text-[10px] text-slate-400 font-medium">{record.timestamp}</p>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <img src={record.selfieImage} className="w-10 h-10 rounded-xl object-cover grayscale border border-slate-200 bg-white" />
                        <div>
                          <p className="text-xs font-bold text-slate-800 tracking-tight">{record.customerName}</p>
                          <div className="flex gap-2 mt-1">
                             <span className="text-[8px] font-black uppercase text-indigo-500 px-1.5 py-0.5 bg-indigo-50 rounded">{record.riskScore} Risk</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col items-center gap-1.5">
                        {record.assignee ? (
                          <div className="flex flex-col items-center gap-1 group/assignee cursor-pointer">
                             <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black text-white shadow-sm ring-2 ring-white ${getAvatarColor(getInitials(record.assignee))}`}>
                               {getInitials(record.assignee)}
                             </div>
                             <span className="text-[9px] font-bold text-slate-500 uppercase">{record.assignee.split(' ')[0]}</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-1 group/assignee">
                             <button className="w-8 h-8 rounded-full border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-300 hover:border-indigo-400 hover:text-indigo-500 hover:bg-indigo-50 transition-all">
                               <UserPlus className="w-3.5 h-3.5" />
                             </button>
                             <span className="text-[9px] font-bold text-slate-300 uppercase">Unassigned</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                       <div className="flex justify-center">
                         <span className={`px-3 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest border shadow-sm ${
                           record.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                           record.status === 'Flagged' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                           record.status === 'Rejected' ? 'bg-red-50 text-red-700 border-red-100' : 'bg-slate-50 text-slate-400 border-slate-100'
                         }`}>
                           {record.status === 'Flagged' ? 'In Review' : record.status}
                         </span>
                       </div>
                    </td>
                    <td className="px-6 py-5 text-right">
                       <button onClick={() => setReviewId(record.id)} className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all active:scale-95 shadow-sm">
                          <Eye className="w-4 h-4" />
                          <span className="text-[10px] font-bold uppercase tracking-wider">Review</span>
                       </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Review Modal with 2-Column Layout */}
      {reviewId && activeReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-6 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl w-full max-w-6xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] border border-slate-200">
            {/* Modal Header */}
            <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
               <div className="flex items-center gap-4">
                 <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                    <ClipboardList className="w-5 h-5 text-indigo-600" />
                 </div>
                 <div>
                   <h3 className="text-xl font-bold text-slate-900 tracking-tight">Case Review: {activeReview.customerName}</h3>
                   <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{activeReview.id}</span>
                      <div className="w-1 h-1 bg-slate-200 rounded-full" />
                      <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest">Manual Decision Required</span>
                   </div>
                 </div>
               </div>
               <button onClick={() => setReviewId(null)} className="p-2.5 hover:bg-slate-100 rounded-full transition-colors text-slate-400"><X className="w-5 h-5" /></button>
            </div>

            <div className="flex flex-1 overflow-hidden">
               {/* LEFT COLUMN (70%): Data Validation */}
               <div className="flex-[7] overflow-y-auto p-10 space-y-12 bg-white custom-scrollbar">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    {/* Visual Evidence Section */}
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
                                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-4 flex items-end">
                                   <p className="text-[10px] text-white font-bold uppercase">Subject: {activeReview.customerName}</p>
                                </div>
                             </div>
                          </div>
                          
                          {/* FIX: Explicitly cast 'sides' to the expected object type to avoid 'unknown' type error */}
                          {Object.entries(activeReview.idImages).map(([docType, sides]) => {
                            const images = sides as { front: string; back?: string };
                            return (
                              <div key={docType} className="space-y-3 pt-6 border-t border-slate-100">
                                 <p className="text-[10px] font-bold text-slate-600 uppercase">{docType} - High Fidelity Scan</p>
                                 <div className="group relative rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-white aspect-video flex items-center justify-center">
                                    <img src={images.front} className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-500" />
                                 </div>
                              </div>
                            );
                          })}
                       </div>
                    </div>

                    {/* Extracted Data Section */}
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
                             <div className="col-span-2">
                                <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Residential Address</p>
                                <p className="text-xs leading-relaxed font-bold text-slate-700 bg-white/60 p-3 rounded-xl border border-slate-200 shadow-sm">{renderDataValue(activeReview.address)}</p>
                             </div>
                          </div>
                       </div>

                       <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm">
                          <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-8 flex items-center gap-2">
                             <ShieldCheck className="w-4 h-4" /> Agent Intelligence Audit
                          </h4>
                          <div className="space-y-5">
                             <div className="flex flex-col gap-2">
                                <div className="flex justify-between items-center mb-1">
                                   <span className="text-[10px] font-bold text-slate-500 uppercase">Bio-Similarity Analysis</span>
                                   <span className={`text-xs font-black ${activeReview.faceMatchScore > 85 ? 'text-emerald-600' : 'text-amber-600'}`}>
                                      {activeReview.faceMatchScore}% Match
                                   </span>
                                </div>
                                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200 p-0.5">
                                   <div 
                                      className={`h-full rounded-full transition-all duration-1000 ${activeReview.faceMatchScore > 85 ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]'}`} 
                                      style={{ width: `${activeReview.faceMatchScore}%` }} 
                                   />
                                </div>
                             </div>
                             
                             <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <span className="text-[10px] font-bold text-slate-600 uppercase">Cryptographic PIN Auth</span>
                                <div className={`flex items-center gap-2 px-3 py-1 rounded-lg ${activeReview.pinMatch ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                  {activeReview.pinMatch ? <Check className="w-3.5 h-3.5" strokeWidth={5} /> : <X className="w-3.5 h-3.5" strokeWidth={5} />}
                                  <span className="text-[10px] font-black uppercase tracking-widest">{activeReview.pinMatch ? 'Valid' : 'Invalid'}</span>
                                </div>
                             </div>
                          </div>
                       </div>

                       {activeReview.mismatches && activeReview.mismatches.length > 0 && (
                          <div className="bg-rose-50 p-8 rounded-[32px] border border-rose-100 shadow-sm">
                             <h4 className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-5 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" /> Human Verification Required
                             </h4>
                             <ul className="space-y-4">
                                {activeReview.mismatches.map((m, i) => (
                                  <li key={i} className="text-xs font-bold text-rose-800 flex items-start gap-4 p-3 bg-white/40 rounded-xl border border-rose-100">
                                     <div className="w-2 h-2 rounded-full bg-rose-500 mt-1 shrink-0 animate-pulse" />
                                     {m}
                                  </li>
                                ))}
                             </ul>
                          </div>
                       )}
                    </div>
                  </div>
               </div>

               {/* RIGHT COLUMN (30%): Collaboration & Activity Panel */}
               <div className="flex-[3] bg-slate-50 border-l border-slate-200 flex flex-col min-w-[340px] shadow-inner">
                  <div className="p-8 flex-1 overflow-y-auto space-y-10 custom-scrollbar">
                     {/* Activity Stream Section */}
                     <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                           <History className="w-4 h-4" /> Transaction History
                        </h4>
                        <div className="space-y-6 relative before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-px before:bg-slate-200">
                           {activeReview.activity?.map((act, i) => (
                             <div key={i} className="flex gap-4 relative z-10">
                                <div className="mt-1.5 shrink-0">
                                   <div className="w-3.5 h-3.5 rounded-full border-2 border-white bg-indigo-500 shadow-sm" />
                                </div>
                                <div className="space-y-1">
                                   <p className="text-[11px] font-bold text-slate-800 leading-tight">{act.action}</p>
                                   <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">{act.time}</p>
                                </div>
                             </div>
                           )) || (
                             <div className="text-center p-6 border border-dashed border-slate-200 rounded-2xl">
                                <p className="text-[10px] font-bold text-slate-400 uppercase">No history records found</p>
                             </div>
                           )}
                        </div>
                     </div>

                     {/* Internal Comments Section */}
                     <div className="animate-in fade-in slide-in-from-right-6 duration-700">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                           <MessageSquare className="w-4 h-4" /> Internal Notes
                        </h4>
                        <div className="space-y-4">
                           {activeReview.comments?.map((comment, i) => (
                             <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3 transition-all hover:shadow-md">
                                <div className="flex justify-between items-center">
                                   <div className="flex items-center gap-2">
                                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[7px] font-black text-white ${getAvatarColor(getInitials(comment.user))}`}>
                                         {getInitials(comment.user)}
                                      </div>
                                      <span className="text-[10px] font-black text-slate-900 uppercase">{comment.user}</span>
                                   </div>
                                   <span className="text-[9px] text-slate-400 font-bold uppercase">{comment.time}</span>
                                </div>
                                <p className="text-xs text-slate-600 font-medium leading-relaxed italic border-l-2 border-indigo-100 pl-3">
                                  {comment.text}
                                </p>
                             </div>
                           ))}
                           {(!activeReview.comments || activeReview.comments.length === 0) && (
                             <div className="text-center p-8 bg-white/50 border border-dashed border-slate-200 rounded-2xl">
                               <p className="text-[10px] font-bold text-slate-400 uppercase">Start a discussion...</p>
                             </div>
                           )}
                        </div>
                     </div>
                  </div>

                  {/* Input & Action Panel */}
                  <div className="p-8 border-t border-slate-200 bg-white space-y-5 shadow-[0_-4px_20px_rgba(0,0,0,0.03)] shrink-0">
                     <div className="relative group">
                        <textarea 
                          placeholder="Add a team comment or mention @Admin..."
                          value={commentInput}
                          onChange={(e) => setCommentInput(e.target.value)}
                          className="w-full h-24 p-4 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none resize-none transition-all placeholder:text-slate-400"
                        />
                        <button className="absolute bottom-4 right-4 p-2.5 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-600/20 hover:scale-105 active:scale-95 transition-all">
                           <Send className="w-4 h-4" />
                        </button>
                     </div>
                     
                     <div className="grid grid-cols-2 gap-3">
                        <button 
                          onClick={() => { onUpdateStatus(activeReview.id, 'Approved'); setReviewId(null); }}
                          className="py-4 bg-indigo-600 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 active:scale-95 transition-all"
                        >
                          Approve KYC
                        </button>
                        <button 
                          onClick={() => { onUpdateStatus(activeReview.id, 'Rejected'); setReviewId(null); }}
                          className="py-4 bg-rose-600 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-xl shadow-rose-600/20 hover:bg-rose-700 active:scale-95 transition-all"
                        >
                          Reject Case
                        </button>
                        <button 
                          className="col-span-2 py-4 bg-slate-50 border border-slate-200 text-slate-600 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-slate-100 hover:text-slate-900 active:scale-95 transition-all flex items-center justify-center gap-3"
                        >
                           <ArrowUpRight className="w-4 h-4" /> Forward to Compliance Lead
                        </button>
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
