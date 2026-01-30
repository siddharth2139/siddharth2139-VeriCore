
import React, { useState, useEffect, useRef } from 'react';
// Added ShieldCheck to the lucide-react imports
import { Camera, ShieldAlert, Check, ChevronRight, FileText, Target, PartyPopper, ArrowRight, RefreshCw, ChevronLeft, AlertCircle, RotateCcw, ShieldCheck } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { PlatformSettings, VerificationRecord, DocBucket, DocumentInfo } from '../types';
import { DOC_CONFIG, AVAILABLE_DOCS } from '../constants';

interface LiveVerificationProps {
  onComplete: (record: VerificationRecord) => void;
  settings: PlatformSettings;
}

type Step = 'DOC_SELECT' | 'ID_CAPTURE' | 'ID_CHECKING' | 'ID_SUCCESS' | 'ID_FEEDBACK' | 'LIVENESS_CAPTURE' | 'LIVENESS_CHECKING' | 'LIVENESS_SUCCESS' | 'LIVENESS_FEEDBACK' | 'RESULT' | 'FATAL_ERROR';

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
    console.error("Agentic Engine Error:", err);
    let message = "Verification failed";
    const rawMsg = err.message || "Unknown error";
    let tip = `Technical Details: ${rawMsg}. Please ensure your Vercel API_KEY is set and valid.`;
    setStageFeedback({ message, tip, isRetryable: true });
    setStep('ID_FEEDBACK');
  };

  const verifyIdentity = async (front: string, back?: string) => {
    setStep('ID_CHECKING');
    setThinkingLogs(["Scanning Indian ID card...", "Recognizing document format..."]);
    
    try {
      // Corrected: Initialize GoogleGenAI directly with process.env.API_KEY as per guidelines
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const docRequirement = DOC_CONFIG[selectedDocType!];
      
      const prompt = `IDENTITY CHECK: Indian ${selectedDocType}. 
      
      IMPORTANT CONTEXT: 
      - If this is a PAN Card, it DOES NOT contain an address. Do not flag as failure if address is missing.
      - Aadhaar/Passport usually have addresses on the BACK side.
      - Extract: Name, DOB, Document Number, and Address (if present).
      
      SUCCESS CRITERIA:
      - If ${docRequirement.expectedFields.join(', ')} are visible and readable, set status to 'SUCCESS'.
      - Only fail for blurry images, glare, or physical obstruction.
      
      Return ONLY JSON.`;

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
              status: { type: Type.STRING, description: "SUCCESS or FAIL" },
              name: { type: Type.STRING },
              documentNumber: { type: Type.STRING },
              dob: { type: Type.STRING },
              address: { type: Type.STRING, description: "Address string, or null if not applicable/present" },
              feedback: { type: Type.STRING },
              tip: { type: Type.STRING }
            },
            required: ["status"]
          }
        }
      });

      setTimeout(() => setThinkingLogs(prev => [...prev, "Checking security holographic markers...", "Cross-referencing Indian ID patterns..."]), 1000);

      const response = await responsePromise;
      const data = JSON.parse(response.text.trim() || '{}');
      await new Promise(resolve => setTimeout(resolve, 2000));

      if (data.status !== 'SUCCESS') {
        setStageFeedback({ 
          message: "Clarification Needed", 
          tip: data.feedback || `The AI was unable to reliably extract ${selectedDocType} data. Ensure good lighting and clear text.`, 
          isRetryable: true 
        });
        setStep('ID_FEEDBACK');
        return;
      }

      const bucketsCovered = DOC_CONFIG[selectedDocType!]?.buckets || [];
      const newSatisfied = Array.from(new Set([...satisfiedBuckets, ...bucketsCovered]));
      
      setCapturedImages(prev => ({ ...prev, [selectedDocType!]: { front, back } }));
      setDocumentDetailsMap(prev => ({ ...prev, [selectedDocType!]: { type: selectedDocType!, number: data.documentNumber || "UNREADABLE" } }));
      setGlobalProfile(prev => ({ 
        customerName: data.name || prev.customerName || "", 
        dob: data.dob || prev.dob || "", 
        address: data.address || prev.address || "" 
      }));
      setSatisfiedBuckets(newSatisfied);
      setStep('ID_SUCCESS');
      
      setTimeout(() => {
          const done = settings.requiredBuckets.every(b => newSatisfied.includes(b));
          if (done) setStep('LIVENESS_CAPTURE');
          else { 
            setSelectedDocType(null); 
            setSide('front'); 
            setStep('DOC_SELECT'); 
          }
      }, 1000);
    } catch (err) { handleError(err); }
  };

  const verifyFace = async (selfie: string) => {
    setStep('LIVENESS_CHECKING');
    setThinkingLogs(["Analyzing facial biometrics...", "Detecting spoofing attempts..."]);
    try {
      // Corrected: Initialize GoogleGenAI directly with process.env.API_KEY as per guidelines
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const firstIdKey = Object.keys(capturedImages)[0];
      const idFront = capturedImages[firstIdKey].front;
      const responsePromise = ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: {
          parts: [
            { inlineData: { mimeType: 'image/jpeg', data: idFront.split(',')[1] } },
            { inlineData: { mimeType: 'image/jpeg', data: selfie.split(',')[1] } },
            { text: `BIOMETRIC ANALYSIS: Compare the face on the ID card to the live selfie. Return a similarity score (0-100). Also confirm if the security code '${currentPin}' is clearly visible in the selfie.` }
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
      setTimeout(() => setThinkingLogs(prev => [...prev, "Verifying security PIN match...", "Finalizing identity claim..."]), 1500);
      const response = await responsePromise;
      const data = JSON.parse(response.text.trim() || '{}');
      await new Promise(resolve => setTimeout(resolve, 2000));
      if (data.pinVisible && data.faceMatchScore > (settings.strictFaceMatch ? 90 : 80)) {
        setStep('LIVENESS_SUCCESS');
        setTimeout(() => finalize(data), 1000);
      } else {
        setStageFeedback({ message: !data.pinVisible ? "Security code missing" : "Facial verification failed", tip: "Ensure the document is held near your face and the code is readable.", isRetryable: true });
        setStep('LIVENESS_FEEDBACK');
      }
    } catch (err) { handleError(err); }
  };

  const finalize = (aiData: any) => {
    const isApproved = aiData.faceMatchScore > 85 && aiData.pinVisible && mismatches.length === 0;
    const record: VerificationRecord = {
      id: `KYC-${Math.floor(10000 + Math.random() * 90000)}`,
      timestamp: new Date().toLocaleString(),
      customerName: globalProfile.customerName || "Customer",
      dob: globalProfile.dob,
      address: globalProfile.address,
      documents: documentDetailsMap,
      idImages: capturedImages,
      selfieImage: selfieImage!,
      pin: currentPin,
      faceMatchScore: aiData.faceMatchScore,
      pinMatch: aiData.pinVisible,
      status: isApproved ? 'Approved' : 'Flagged',
      riskScore: mismatches.length > 0 ? 'High' : aiData.faceMatchScore > 90 ? 'Low' : 'Med',
      bucketsSatisfied: satisfiedBuckets,
      mismatches: mismatches
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
      case 'DOC_SELECT':
        const available = AVAILABLE_DOCS.filter(d => !Object.keys(capturedImages).includes(d));
        const allBuckets = settings.requiredBuckets;
        const missingBuckets = allBuckets.filter(b => !satisfiedBuckets.includes(b));
        
        return (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 animate-in fade-in zoom-in-95">
            <h2 className="text-xl font-bold text-slate-900 mb-2 text-center tracking-tight">Supply Verification Documents</h2>
            <p className="text-slate-500 text-sm mb-8 text-center font-medium">Please select a document to satisfy: <span className="text-indigo-600 font-bold">{missingBuckets.join(', ')}</span></p>
            <div className="space-y-3">
              {available.map(doc => {
                const docBuckets = DOC_CONFIG[doc].buckets;
                const helps = docBuckets.some(b => missingBuckets.includes(b));
                return (
                  <button 
                    key={doc} 
                    onClick={() => { setSelectedDocType(doc); setSide('front'); setStep('ID_CAPTURE'); }}
                    className={`w-full flex items-center justify-between p-5 bg-slate-50 border rounded-xl hover:bg-slate-100 group transition-all ${helps ? 'border-indigo-200 ring-2 ring-indigo-500/5' : 'border-slate-200 grayscale opacity-60'}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 bg-white border rounded-lg flex items-center justify-center ${helps ? 'border-indigo-200' : 'border-slate-200'}`}>
                        <FileText className={`w-5 h-5 ${helps ? 'text-indigo-600' : 'text-slate-400'}`} />
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-slate-800 text-sm">{doc}</p>
                        <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Provides: {docBuckets.join(' + ')}</p>
                      </div>
                    </div>
                    {helps && <div className="px-2 py-1 bg-indigo-50 text-indigo-600 text-[8px] font-black uppercase rounded border border-indigo-100">Required</div>}
                    {!helps && <ChevronRight className="w-4 h-4 text-slate-300" />}
                  </button>
                );
              })}
              {available.length === 0 || missingBuckets.length === 0 && (
                <div className="py-6 text-center space-y-6 animate-in zoom-in">
                  <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto border border-emerald-100 shadow-sm"><Check className="w-8 h-8" strokeWidth={3} /></div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Documents Verified</h3>
                    <p className="text-xs text-slate-400 font-medium">All required proof points have been satisfied.</p>
                  </div>
                  <button onClick={() => setStep('LIVENESS_CAPTURE')} className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all hover:translate-y-[-1px]">Proceed to Selfie Check <ArrowRight className="w-4 h-4" /></button>
                </div>
              )}
            </div>
          </div>
        );
      case 'ID_CAPTURE':
        return (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
            <div className="flex justify-between items-center mb-6">
               <button onClick={() => setStep('DOC_SELECT')} className="p-2 hover:bg-slate-50 rounded-full text-slate-400 transition-colors"><ChevronLeft className="w-5 h-5" /></button>
               <div>
                  <h2 className="text-lg font-bold text-slate-900 tracking-tight">{selectedDocType}</h2>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{side === 'front' ? 'Front Side' : 'Back Side (Address)'}</p>
               </div>
               <div className="w-9 h-1" />
            </div>
            <div className="relative rounded-2xl overflow-hidden bg-slate-900 aspect-[1.58/1] border border-slate-200 shadow-2xl">
               {isCameraActive ? (
                 <>
                   <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                   <div className="absolute inset-0 border-[3px] border-white/40 m-6 rounded-xl border-dashed pointer-events-none" />
                   <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/40 pointer-events-none" />
                   <button onClick={capturePhoto} className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-white p-6 rounded-full shadow-2xl hover:scale-105 active:scale-90 transition-all group">
                     <Camera className="w-8 h-8 text-slate-900 group-hover:text-indigo-600" />
                   </button>
                 </>
               ) : (
                 <div className="flex flex-col items-center justify-center h-full">
                   <button onClick={handleStartCamera} className="px-10 py-4 bg-white text-slate-900 rounded-xl font-bold text-xs uppercase tracking-widest shadow-xl flex items-center gap-2 hover:bg-slate-50 transition-all"><Camera className="w-4 h-4" /> Initialize Camera</button>
                 </div>
               )}
            </div>
            <p className="mt-6 text-xs text-slate-400 font-medium">Ensure all 4 corners of the ID are visible and text is sharp.</p>
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
            <h3 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">Agent Intelligence Active</h3>
            <p className="text-slate-500 text-sm mb-10 font-medium">Extracting data via multimodal spatial reasoning...</p>
            <div className="space-y-4 max-w-[280px] mx-auto text-left">
              {thinkingLogs.map((log, i) => (
                <div key={i} className="flex items-center gap-4 animate-in slide-in-from-left-4 fade-in duration-500">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center ${i === thinkingLogs.length - 1 ? 'bg-indigo-100 text-indigo-600' : 'bg-emerald-500 text-white shadow-sm'}`}>
                    {i === thinkingLogs.length - 1 ? <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" /> : <Check className="w-3 h-3" strokeWidth={5} />}
                  </div>
                  <span className={`text-[11px] font-bold tracking-tight ${i === thinkingLogs.length - 1 ? 'text-indigo-600' : 'text-slate-400 line-through decoration-slate-200'}`}>{log}</span>
                </div>
              ))}
            </div>
          </div>
        );
      case 'ID_FEEDBACK':
        return (
          <div className="bg-white rounded-[40px] shadow-2xl border border-slate-200 p-12 text-center animate-in zoom-in-95">
            <div className="w-20 h-20 bg-amber-50 rounded-[32px] flex items-center justify-center mx-auto mb-8 border border-amber-100">
              <ShieldAlert className="w-10 h-10 text-amber-500" />
            </div>
            <h2 className="text-3xl font-black mb-4 text-slate-900 tracking-tight">{stageFeedback?.message || "Verification Issue"}</h2>
            <div className="bg-slate-50 p-8 rounded-3xl text-sm text-slate-600 mb-10 text-left border border-slate-100 leading-relaxed shadow-inner">
              <p className="font-mono text-[11px]">{stageFeedback?.tip}</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
               <button onClick={retryCurrentDoc} className="flex-1 py-5 bg-indigo-600 text-white rounded-2xl font-bold text-xs uppercase tracking-[0.2em] shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-3"><RefreshCw className="w-4 h-4" /> Retake Photo</button>
               <button onClick={resetAll} className="px-10 py-5 bg-slate-100 text-slate-600 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-slate-200 active:scale-95 transition-all">Cancel Scan</button>
            </div>
          </div>
        );
      case 'LIVENESS_FEEDBACK':
        return (
          <div className="bg-white rounded-[40px] shadow-2xl border border-slate-200 p-12 text-center animate-in zoom-in-95">
            <div className="w-20 h-20 bg-rose-50 rounded-[32px] flex items-center justify-center mx-auto mb-8 border border-rose-100">
              <AlertCircle className="w-10 h-10 text-rose-500" />
            </div>
            <h2 className="text-3xl font-black mb-4 text-slate-900 tracking-tight">Selfie Validation Failure</h2>
            <div className="bg-slate-50 p-8 rounded-3xl text-xs text-slate-600 mb-10 text-left border border-slate-100 leading-relaxed shadow-inner font-mono">
              <p className="font-bold text-rose-700 mb-2 uppercase tracking-widest">{stageFeedback?.message}</p>
              {stageFeedback?.tip}
            </div>
            <div className="flex gap-4">
               <button onClick={retryLiveness} className="flex-1 py-5 bg-indigo-600 text-white rounded-2xl font-bold text-xs uppercase tracking-widest shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-2"><RotateCcw className="w-4 h-4" /> Restart Selfie Check</button>
            </div>
          </div>
        );
      case 'LIVENESS_CAPTURE':
        return (
          <div className="bg-white rounded-[40px] shadow-2xl border border-slate-200 p-10 text-center animate-in zoom-in-95">
             <h2 className="text-3xl font-black mb-2 text-slate-900 tracking-tight">Facial Liveness</h2>
             <p className="text-slate-500 text-sm mb-10 font-medium leading-relaxed">Please look directly at the camera and hold a paper showing the unique code below.</p>
             <div className="relative aspect-square max-w-[320px] mx-auto rounded-full overflow-hidden border-8 border-slate-50 shadow-2xl bg-slate-900 group">
                {isCameraActive ? (
                  <>
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-indigo-600/10 pointer-events-none" />
                    <button onClick={capturePhoto} className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-white p-8 rounded-full shadow-2xl active:scale-90 hover:scale-105 transition-all group">
                       <Camera className="w-10 h-10 text-slate-900 group-hover:text-indigo-600" />
                    </button>
                  </>
                ) : (
                  <button onClick={handleStartCamera} className="mt-28 px-10 py-4 bg-indigo-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg">Activate Lens</button>
                )}
             </div>
             <div className="mt-12 group">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Security Challenge Code</p>
                <div className="p-10 bg-slate-900 rounded-[32px] text-indigo-400 text-5xl font-mono font-black tracking-[0.2em] text-center shadow-2xl border border-slate-800 transition-transform group-hover:scale-105 duration-500">
                  {currentPin}
                </div>
             </div>
          </div>
        );
      case 'RESULT':
        return (
          <div className="bg-white rounded-[48px] shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-12 duration-1000">
             <div className={`p-16 text-center text-white ${result?.status === 'Approved' ? 'bg-emerald-600' : 'bg-amber-600'} relative`}>
                <div className="w-20 h-20 bg-white/20 rounded-[28px] flex items-center justify-center mx-auto mb-6 backdrop-blur-md">
                   {result?.status === 'Approved' ? <PartyPopper className="w-10 h-10" /> : <ShieldAlert className="w-10 h-10" />}
                </div>
                <h2 className="text-4xl font-black mb-2 tracking-tight uppercase">{result?.status === 'Approved' ? 'Identity Verified' : 'Session Flagged'}</h2>
                <p className="text-[11px] font-black uppercase tracking-[0.3em] opacity-80">AGENT REFERENCE: {result?.id}</p>
             </div>
             <div className="p-12 space-y-12">
                <div className="flex items-center gap-8 bg-slate-50 p-8 rounded-[40px] border border-slate-100 shadow-inner">
                   <div className="w-32 h-32 rounded-[32px] overflow-hidden border-4 border-white shadow-2xl bg-white flex-shrink-0 group">
                      <img src={result?.selfieImage} className="w-full h-full object-cover grayscale transition-transform duration-700 group-hover:scale-110" />
                   </div>
                   <div className="flex-1">
                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Authenticated Profile</span>
                     <p className="text-3xl font-black text-slate-900 tracking-tight uppercase mb-4">{result?.customerName}</p>
                     <div className="flex flex-wrap gap-3">
                        <span className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black text-slate-600 uppercase shadow-sm">{result?.riskScore} Risk Profile</span>
                        <span className="px-4 py-2 bg-white border border-indigo-200 rounded-xl text-[10px] font-black text-indigo-600 uppercase shadow-sm">{result?.faceMatchScore}% Face Similarity</span>
                     </div>
                   </div>
                </div>
                <button onClick={resetAll} className="w-full py-8 bg-slate-900 text-white rounded-[28px] font-bold text-sm uppercase tracking-[0.2em] hover:bg-slate-800 active:scale-95 transition-all shadow-2xl flex items-center justify-center gap-3 group">
                   <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" /> Start New Verification Session
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
      {step !== 'RESULT' && step !== 'FATAL_ERROR' && (
        <div className="mb-10 flex flex-wrap justify-center gap-3">
          {settings.requiredBuckets.map(b => (
            <div key={b} className={`px-6 py-3 rounded-full border text-[10px] font-black uppercase tracking-[0.1em] flex items-center gap-3 transition-all duration-500 ${satisfiedBuckets.includes(b) ? 'bg-emerald-50 border-emerald-200 text-emerald-600 shadow-xl shadow-emerald-600/5 translate-y-[-2px]' : 'bg-white border-slate-200 text-slate-400'}`}>
              <div className={`w-4 h-4 rounded-full flex items-center justify-center ${satisfiedBuckets.includes(b) ? 'bg-emerald-500' : 'bg-slate-100'}`}>
                {satisfiedBuckets.includes(b) ? <Check className="w-2.5 h-2.5 text-white" strokeWidth={5} /> : <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />}
              </div>
              {b} VERIFIED
            </div>
          ))}
        </div>
      )}
      {renderContent()}
    </div>
  );
};
