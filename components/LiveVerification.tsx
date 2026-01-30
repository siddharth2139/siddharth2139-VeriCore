
import React, { useState, useEffect, useRef } from 'react';
import { Camera, ShieldAlert, Check, ChevronRight, FileText, Target, PartyPopper, ArrowRight, RefreshCw, ChevronLeft, AlertCircle, RotateCcw, ShieldCheck, Clock } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { PlatformSettings, VerificationRecord, DocBucket, DocumentInfo, VerificationStatus } from '../types';
import { DOC_CONFIG, AVAILABLE_DOCS } from '../constants';

interface LiveVerificationProps {
  onComplete: (record: VerificationRecord) => void;
  settings: PlatformSettings;
}

type Step = 'DOC_SELECT' | 'ID_CAPTURE' | 'ID_CHECKING' | 'ID_SUCCESS' | 'ID_FEEDBACK' | 'LIVENESS_CAPTURE' | 'LIVENESS_CHECKING' | 'LIVENESS_SUCCESS' | 'LIVENESS_FEEDBACK' | 'RESULT' | 'FATAL_ERROR' | 'QUOTA_ERROR';

export const LiveVerification: React.FC<LiveVerificationProps> = ({ onComplete, settings }) => {
  const [step, setStep] = useState<Step>('DOC_SELECT');
  const [satisfiedBuckets, setSatisfiedBuckets] = useState<DocBucket[]>([]);
  const [selectedDocType, setSelectedDocType] = useState<string | null>(null);
  const [side, setSide] = useState<'front' | 'back'>('front');
  
  const [capturedImages, setCapturedImages] = useState<Record<string, { front: string; back?: string }>>({});
  const [documentDetailsMap, setDocumentDetailsMap] = useState<Record<string, DocumentInfo>>({});
  const [currentFront, setCurrentFront] = useState<string | null>(null);
  const [selfieImage, setSelfieImage] = useState<string | null>(null);
  
  const [globalProfile, setGlobalProfile] = useState<Partial<VerificationRecord>>({});
  const [mismatches, setMismatches] = useState<string[]>([]);
  
  const [currentPin] = useState(() => Math.floor(1000 + Math.random() * 9000).toString());
  const [stageFeedback, setStageFeedback] = useState<{ message: string; tip?: string; isRetryable: boolean } | null>(null);
  const [result, setResult] = useState<VerificationRecord | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [thinkingLogs, setThinkingLogs] = useState<string[]>([]);
  const [retryTimer, setRetryTimer] = useState(60);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsCameraActive(false);
  };

  const handleStartCamera = () => setIsCameraActive(true);

  useEffect(() => {
    if (step === 'ID_CAPTURE' || step === 'LIVENESS_CAPTURE') {
      handleStartCamera();
    } else {
      stopCamera();
    }
  }, [step]);

  useEffect(() => {
    if (step === 'QUOTA_ERROR') {
      const timer = setInterval(() => {
        setRetryTimer(prev => (prev > 0 ? prev - 1 : 0));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [step]);

  useEffect(() => {
    let active = true;
    const initCamera = async () => {
      if (isCameraActive && videoRef.current && !streamRef.current) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: (step === 'ID_CAPTURE') ? 'environment' : 'user', width: 1280, height: 720 } 
          });
          if (active && videoRef.current) {
            videoRef.current.srcObject = stream;
            streamRef.current = stream;
          }
        } catch (err) {
          setIsCameraActive(false);
          setStageFeedback({ 
            message: "Camera Access Denied", 
            tip: "Please allow camera access in your browser settings to continue.",
            isRetryable: true
          });
          setStep('FATAL_ERROR');
        }
      }
    };
    initCamera();
    return () => { active = false; };
  }, [isCameraActive, step]);

  const capturePhoto = async () => {
    if (videoRef.current && canvasRef.current) {
      try {
        const canvas = canvasRef.current;
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          stopCamera();
          
          if (step === 'ID_CAPTURE') {
            const needsBack = DOC_CONFIG[selectedDocType!]?.needsBack;
            if (side === 'front' && needsBack) {
              setCurrentFront(dataUrl);
              setSide('back');
              setStep('ID_CAPTURE');
            } else {
              verifyIdentity(side === 'back' ? currentFront! : dataUrl, side === 'back' ? dataUrl : undefined);
            }
          } else {
            setSelfieImage(dataUrl);
            verifyFace(dataUrl);
          }
        }
      } catch (err) {
        setStageFeedback({ message: "Capture failed", tip: "Something went wrong while taking the photo. Please try again.", isRetryable: true });
        setStep('FATAL_ERROR');
      }
    }
  };

  const handleError = (err: any) => {
    const errorMsg = err.message?.toLowerCase() || "";
    const errorString = JSON.stringify(err).toLowerCase();

    if (errorString.includes("429") || errorMsg.includes("quota") || errorMsg.includes("rate limit") || errorMsg.includes("resource exhausted")) {
      setRetryTimer(60);
      setStep('QUOTA_ERROR');
      return;
    }

    let message = "Verification Issue";
    let tip = err.message || "An unexpected error occurred during processing.";
    
    setStageFeedback({ message, tip, isRetryable: true });
    setStep('ID_FEEDBACK');
  };

  const verifyIdentity = async (front: string, back?: string) => {
    setStep('ID_CHECKING');
    setThinkingLogs(["Scanning Indian ID card...", "Identifying document type..."]);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const docRequirement = DOC_CONFIG[selectedDocType!];
      
      const prompt = `IDENTITY EXTRACTION: Indian ${selectedDocType}. 
      
      CONSTRAINTS:
      - PAN Cards: No address. Extract Father's Name and Number.
      - Aadhaar/Passport: Full Address usually on reverse. Extract Gender, Nationality, Issue/Expiry Date.
      
      TASK: Extract all fields from the provided images. 
      SUCCESS: Set status 'SUCCESS' if Name and Number are clearly visible.
      Return valid JSON.`;

      const parts = [
        { inlineData: { mimeType: 'image/jpeg', data: front.split(',')[1] } },
        { text: prompt }
      ];
      if (back) parts.push({ inlineData: { mimeType: 'image/jpeg', data: back.split(',')[1] } });

      const responsePromise = ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: { parts },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              status: { type: Type.STRING },
              name: { type: Type.STRING },
              documentNumber: { type: Type.STRING },
              dob: { type: Type.STRING },
              address: { type: Type.STRING },
              fatherName: { type: Type.STRING },
              motherName: { type: Type.STRING },
              gender: { type: Type.STRING },
              nationality: { type: Type.STRING },
              issueDate: { type: Type.STRING },
              expiryDate: { type: Type.STRING },
              feedback: { type: Type.STRING }
            },
            required: ["status"]
          }
        }
      });

      setTimeout(() => setThinkingLogs(prev => [...prev, "Extracting text via OCR...", "Verifying field integrity..."]), 1000);

      const response = await responsePromise;
      const data = JSON.parse(response.text.trim() || '{}');
      await new Promise(resolve => setTimeout(resolve, 2000));

      if (data.status !== 'SUCCESS') {
        setStageFeedback({ 
          message: "Data Extraction Incomplete", 
          tip: data.feedback || "We couldn't read your ID clearly. Please try again with better lighting.", 
          isRetryable: true 
        });
        setStep('ID_FEEDBACK');
        return;
      }

      const bucketsCovered = docRequirement.buckets;
      const newSatisfied = Array.from(new Set([...satisfiedBuckets, ...bucketsCovered]));
      
      setCapturedImages(prev => ({ ...prev, [selectedDocType!]: { front, back } }));
      setDocumentDetailsMap(prev => ({ 
        ...prev, 
        [selectedDocType!]: { 
          type: selectedDocType!, 
          number: data.documentNumber || "UNREADABLE",
          issueDate: data.issueDate,
          expiryDate: data.expiryDate
        } 
      }));
      
      setGlobalProfile(prev => ({ 
        customerName: data.name || prev.customerName, 
        dob: data.dob || prev.dob, 
        address: data.address || prev.address,
        fatherName: data.fatherName || prev.fatherName,
        motherName: data.motherName || prev.motherName,
        gender: data.gender || prev.gender,
        nationality: data.nationality || prev.nationality
      }));
      
      setSatisfiedBuckets(newSatisfied);
      setStep('ID_SUCCESS');
      
      setTimeout(() => {
          const done = settings.requiredBuckets.every(b => newSatisfied.includes(b));
          if (done) setStep('LIVENESS_CAPTURE');
          else { setSelectedDocType(null); setSide('front'); setStep('DOC_SELECT'); }
      }, 1000);
    } catch (err) { handleError(err); }
  };

  const verifyFace = async (selfie: string) => {
    setStep('LIVENESS_CHECKING');
    setThinkingLogs(["Analyzing facial biometrics...", "Confirming security pin..."]);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const firstIdKey = Object.keys(capturedImages)[0];
      const idFront = capturedImages[firstIdKey].front;
      const responsePromise = ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: {
          parts: [
            { inlineData: { mimeType: 'image/jpeg', data: idFront.split(',')[1] } },
            { inlineData: { mimeType: 'image/jpeg', data: selfie.split(',')[1] } },
            { text: `Match the face in the selfie with the ID. Check for code '${currentPin}'.` }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: { 
              pinVisible: { type: Type.BOOLEAN }, 
              faceMatchScore: { type: Type.NUMBER }, 
              feedback: { type: Type.STRING } 
            },
            required: ["pinVisible", "faceMatchScore"]
          }
        }
      });
      setTimeout(() => setThinkingLogs(prev => [...prev, "Matching facial geometry...", "Confirming authenticity..."]), 1500);
      const response = await responsePromise;
      const data = JSON.parse(response.text.trim() || '{}');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Auto-rejection logic: Score < 70
      if (data.faceMatchScore < 70) {
        setStageFeedback({ 
          message: "Verification Declined", 
          tip: "Bio-similarity analysis failed significantly. This session has been automatically rejected for security purposes.", 
          isRetryable: false 
        });
        setStep('LIVENESS_FEEDBACK');
        finalize(data); // Call finalize to record the rejection
        return;
      }

      if (data.pinVisible && data.faceMatchScore >= 70) {
        setStep('LIVENESS_SUCCESS');
        setTimeout(() => finalize(data), 1000);
      } else {
        setStageFeedback({ 
          message: !data.pinVisible ? "Security code missing" : "Insufficient match quality", 
          tip: "Please try again. Ensure the code is clearly visible and your face is well-lit.", 
          isRetryable: true 
        });
        setStep('LIVENESS_FEEDBACK');
      }
    } catch (err) { handleError(err); }
  };

  const finalize = (aiData: any) => {
    const score = aiData.faceMatchScore;
    const pinOk = aiData.pinVisible;
    
    // Automatic Decision Logic
    let status: VerificationStatus = 'Flagged'; // Default to manual review
    
    if (score > 90 && pinOk && mismatches.length === 0) {
      status = 'Approved'; // Auto-Approved
    } else if (score < 70) {
      status = 'Rejected'; // Auto-Rejected
    }

    const record: VerificationRecord = {
      id: `KYC-${Math.floor(10000 + Math.random() * 90000)}`,
      timestamp: new Date().toLocaleString(),
      customerName: globalProfile.customerName || "Customer",
      dob: globalProfile.dob,
      address: globalProfile.address,
      fatherName: globalProfile.fatherName,
      motherName: globalProfile.motherName,
      gender: globalProfile.gender,
      nationality: globalProfile.nationality,
      documents: documentDetailsMap,
      idImages: capturedImages,
      selfieImage: selfieImage!,
      pin: currentPin,
      faceMatchScore: score,
      pinMatch: pinOk,
      status: status,
      riskScore: score < 70 ? 'High' : score > 90 ? 'Low' : 'Med',
      bucketsSatisfied: satisfiedBuckets,
      mismatches: mismatches,
      activity: [
        { action: `Agent session initialized`, time: new Date().toLocaleTimeString() },
        { action: `Biometric score: ${score}%`, time: new Date().toLocaleTimeString() },
        { action: status === 'Flagged' ? 'Case escalated for human review' : `Decision: ${status} (Auto-Process)`, time: new Date().toLocaleTimeString() }
      ]
    };
    setResult(record);
    setStep('RESULT');
    onComplete(record);
  };

  const resetAll = () => { setSatisfiedBuckets([]); setCapturedImages({}); setDocumentDetailsMap({}); setGlobalProfile({}); setMismatches([]); setResult(null); setSide('front'); setSelectedDocType(null); setStep('DOC_SELECT'); };
  const retryLiveness = () => { setSelfieImage(null); setStep('LIVENESS_CAPTURE'); };
  const retryCurrentDoc = () => { setSide('front'); setStep('ID_CAPTURE'); };

  const renderContent = () => {
    switch (step) {
      case 'QUOTA_ERROR':
        return (
          <div className="bg-white rounded-[40px] shadow-2xl border border-slate-200 p-16 text-center animate-in zoom-in-95">
            <div className="w-24 h-24 bg-indigo-50 rounded-[40px] flex items-center justify-center mx-auto mb-10 shadow-inner">
              <Clock className="w-12 h-12 text-indigo-600 animate-pulse" />
            </div>
            <h2 className="text-3xl font-black mb-4 text-slate-900 tracking-tight">System Cooling Down</h2>
            <p className="text-slate-500 text-sm mb-12 font-medium max-w-sm mx-auto">
              Our Agentic Engine has reached its temporary throughput limit. Please wait a moment while the resources are recalibrated.
            </p>
            <div className="relative w-24 h-24 mx-auto mb-8">
               <svg className="w-full h-full" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" fill="none" stroke="#f1f5f9" strokeWidth="8" />
                  <circle cx="50" cy="50" r="45" fill="none" stroke="#4f46e5" strokeWidth="8" strokeDasharray="283" strokeDashoffset={283 - (283 * retryTimer / 60)} strokeLinecap="round" className="transition-all duration-1000" />
               </svg>
               <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-black text-slate-900">{retryTimer}</span>
                  <span className="text-[8px] font-black uppercase text-slate-400">Seconds</span>
               </div>
            </div>
            {retryTimer === 0 && (
              <button onClick={retryCurrentDoc} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-indigo-600/20 hover:scale-105 active:scale-95 transition-all">Retry Now</button>
            )}
          </div>
        );
      case 'DOC_SELECT':
        const available = AVAILABLE_DOCS.filter(d => !Object.keys(capturedImages).includes(d));
        const missingBuckets = settings.requiredBuckets.filter(b => !satisfiedBuckets.includes(b));
        return (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 animate-in fade-in zoom-in-95">
            <h2 className="text-xl font-bold text-slate-900 mb-2 text-center tracking-tight">Select Identity Proof</h2>
            <p className="text-slate-500 text-sm mb-8 text-center font-medium">Remaining proof required for: <span className="text-indigo-600 font-bold">{missingBuckets.join(', ')}</span></p>
            <div className="space-y-3">
              {available.map(doc => (
                <button key={doc} onClick={() => { setSelectedDocType(doc); setSide('front'); setStep('ID_CAPTURE'); }}
                  className="w-full flex items-center justify-between p-5 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-all">
                  <div className="flex items-center gap-4 text-left">
                    <FileText className="w-5 h-5 text-indigo-600" />
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{doc}</p>
                      <p className="text-[10px] text-slate-500 font-medium">Proof of {DOC_CONFIG[doc].buckets.join(' & ')}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300" />
                </button>
              ))}
              {(available.length === 0 || missingBuckets.length === 0) && (
                <button onClick={() => setStep('LIVENESS_CAPTURE')} className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-xl flex items-center justify-center gap-2">Continue to Selfie Check <ArrowRight className="w-4 h-4" /></button>
              )}
            </div>
          </div>
        );
      case 'ID_CAPTURE':
        return (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
            <div className="flex justify-between items-center mb-6">
               <button onClick={() => setStep('DOC_SELECT')} className="p-2 hover:bg-slate-50 rounded-full text-slate-400"><ChevronLeft className="w-5 h-5" /></button>
               <h2 className="text-lg font-bold text-slate-900">{selectedDocType} ({side === 'front' ? 'Front' : 'Back'})</h2>
               <div className="w-9 h-1" />
            </div>
            <div className="relative rounded-2xl overflow-hidden bg-slate-900 aspect-[1.58/1] border border-slate-200 shadow-2xl">
               {isCameraActive ? (
                 <>
                   <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                   <button onClick={capturePhoto} className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-white p-6 rounded-full shadow-2xl active:scale-90 transition-all"><Camera className="w-8 h-8 text-slate-900" /></button>
                 </>
               ) : (
                 <button onClick={handleStartCamera} className="mt-20 px-8 py-3 bg-white text-slate-900 rounded-xl font-bold text-xs">Open Camera</button>
               )}
            </div>
          </div>
        );
      case 'ID_CHECKING':
      case 'LIVENESS_CHECKING':
        return (
          <div className="bg-white rounded-[32px] shadow-2xl border border-slate-100 p-20 text-center animate-in fade-in zoom-in-95">
            <div className="relative w-20 h-20 mx-auto mb-10">
               <div className="absolute inset-0 border-4 border-indigo-100 rounded-full" />
               <div className="absolute inset-0 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
               <ShieldCheck className="absolute inset-0 m-auto w-8 h-8 text-indigo-600" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">Agent Analysis in Progress</h3>
            <div className="space-y-4 max-w-[280px] mx-auto text-left">
              {thinkingLogs.map((log, i) => (
                <div key={i} className="flex items-center gap-4 animate-in slide-in-from-left-4 fade-in duration-500">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center ${i === thinkingLogs.length - 1 ? 'bg-indigo-100 text-indigo-600' : 'bg-emerald-500 text-white'}`}>
                    {i === thinkingLogs.length - 1 ? <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" /> : <Check className="w-3 h-3" strokeWidth={5} />}
                  </div>
                  <span className={`text-[11px] font-bold tracking-tight ${i === thinkingLogs.length - 1 ? 'text-indigo-600' : 'text-slate-400'}`}>{log}</span>
                </div>
              ))}
            </div>
          </div>
        );
      case 'ID_FEEDBACK':
      case 'LIVENESS_FEEDBACK':
        return (
          <div className="bg-white rounded-[40px] shadow-2xl border border-slate-200 p-12 text-center animate-in zoom-in-95">
            <div className="w-20 h-20 bg-amber-50 rounded-[32px] flex items-center justify-center mx-auto mb-8 border border-amber-100">
              <ShieldAlert className="w-10 h-10 text-amber-500" />
            </div>
            <h2 className="text-3xl font-black mb-4 text-slate-900 tracking-tight">{stageFeedback?.message || "Verification Issue"}</h2>
            <div className="bg-slate-50 p-8 rounded-3xl text-xs text-slate-600 mb-10 text-left border border-slate-100 leading-relaxed shadow-inner font-mono">
              {stageFeedback?.tip}
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
               {stageFeedback?.isRetryable && (
                 <button onClick={retryCurrentDoc} className="flex-1 py-5 bg-indigo-600 text-white rounded-2xl font-bold text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-3"><RefreshCw className="w-4 h-4" /> Try Again</button>
               )}
               <button onClick={resetAll} className="px-10 py-5 bg-slate-100 text-slate-600 rounded-2xl font-bold text-xs uppercase tracking-widest flex-1">Restart Portal</button>
            </div>
          </div>
        );
      case 'LIVENESS_CAPTURE':
        return (
          <div className="bg-white rounded-[40px] shadow-2xl border border-slate-200 p-10 text-center animate-in zoom-in-95">
             <h2 className="text-3xl font-black mb-2 text-slate-900 tracking-tight">Facial Liveness</h2>
             <p className="text-slate-500 text-sm mb-10 font-medium leading-relaxed">Please look directly at the camera and hold a paper showing the unique code below.</p>
             <div className="relative aspect-square max-w-[320px] mx-auto rounded-full overflow-hidden border-8 border-slate-50 shadow-2xl bg-slate-900">
                {isCameraActive ? (
                  <>
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                    <button onClick={capturePhoto} className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-white p-8 rounded-full shadow-2xl active:scale-90 transition-all"><Camera className="w-10 h-10 text-slate-900" /></button>
                  </>
                ) : (
                  <button onClick={handleStartCamera} className="mt-28 px-10 py-4 bg-indigo-600 text-white rounded-xl font-bold text-xs shadow-lg">Start Selfie</button>
                )}
             </div>
             <div className="mt-12">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Security Code</p>
                <div className="p-10 bg-slate-900 rounded-[32px] text-indigo-400 text-5xl font-mono font-black tracking-[0.2em] text-center shadow-2xl">
                  {currentPin}
                </div>
             </div>
          </div>
        );
      case 'RESULT':
        const isReject = result?.status === 'Rejected';
        return (
          <div className="bg-white rounded-[48px] shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-12 duration-1000">
             <div className={`p-16 text-center text-white ${isReject ? 'bg-rose-600' : result?.status === 'Approved' ? 'bg-emerald-600' : 'bg-amber-600'}`}>
                <h2 className="text-4xl font-black mb-2 tracking-tight uppercase">
                  {result?.status === 'Approved' ? 'Identity Verified' : result?.status === 'Rejected' ? 'Session Rejected' : 'Under Manual Review'}
                </h2>
                <p className="text-[11px] font-black uppercase tracking-[0.3em] opacity-80">AGENT REF: {result?.id}</p>
             </div>
             <div className="p-12 space-y-12">
                <div className="flex items-center gap-8 bg-slate-50 p-8 rounded-[40px] border border-slate-100">
                   <img src={result?.selfieImage} className="w-32 h-32 rounded-[32px] object-cover border-4 border-white shadow-2xl" />
                   <div className="flex-1">
                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Authenticated Profile</span>
                     <p className="text-3xl font-black text-slate-900 tracking-tight uppercase mb-4">{result?.customerName}</p>
                     <div className="flex flex-wrap gap-3">
                        <span className={`px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase ${isReject ? 'text-rose-600' : 'text-slate-600'}`}>{result?.riskScore} Risk Profile</span>
                        <span className="px-4 py-2 bg-white border border-indigo-200 rounded-xl text-[10px] font-black text-indigo-600 uppercase">{result?.faceMatchScore}% Face similarity</span>
                     </div>
                   </div>
                </div>
                <button onClick={resetAll} className="w-full py-8 bg-slate-900 text-white rounded-[28px] font-bold text-sm uppercase tracking-[0.2em] hover:bg-slate-800 transition-all shadow-2xl flex items-center justify-center gap-3">
                   <RefreshCw className="w-5 h-5" /> Start New Verification
                </button>
             </div>
          </div>
        );
      default: return null;
    }
  };

  return (
    <div className="max-w-2xl mx-auto pb-20 relative min-h-[500px]">
      <canvas ref={canvasRef} className="hidden" />
      {step !== 'RESULT' && step !== 'FATAL_ERROR' && step !== 'QUOTA_ERROR' && (
        <div className="mb-10 flex flex-wrap justify-center gap-3">
          {settings.requiredBuckets.map(b => (
            <div key={b} className={`px-6 py-3 rounded-full border text-[10px] font-black uppercase tracking-[0.1em] flex items-center gap-3 transition-all duration-500 ${satisfiedBuckets.includes(b) ? 'bg-emerald-50 border-emerald-200 text-emerald-600 shadow-xl' : 'bg-white border-slate-200 text-slate-400'}`}>
              <Check className={`w-3 h-3 ${satisfiedBuckets.includes(b) ? 'text-emerald-500' : 'text-slate-200'}`} strokeWidth={5} /> {b}
            </div>
          ))}
        </div>
      )}
      {renderContent()}
    </div>
  );
};
