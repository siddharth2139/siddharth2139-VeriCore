
import React, { useState, useEffect, useRef } from 'react';
import { Camera, ShieldAlert, Check, ChevronRight, FileText, Target, PartyPopper, ArrowRight, RefreshCw, ChevronLeft, AlertCircle, RotateCcw } from 'lucide-react';
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
    let tip = "We encountered a technical error processing the document. Please try again.";

    const errorString = JSON.stringify(err).toLowerCase();
    const errorMsg = err.message?.toLowerCase() || "";
    
    if (errorString.includes("429") || errorString.includes("resource_exhausted") || errorMsg.includes("quota") || errorMsg.includes("rate limit")) {
      message = "Quota Reached (429)";
      tip = "You have reached the API limit. GEMINI FREE TIER: 15 Requests per Minute (RPM) and 1,500 Requests per Day. RPM resets every 60 seconds. Daily quota resets at 12:00 AM UTC. Please wait a moment and try again.";
    } 
    else if (errorString.includes("safety") || errorString.includes("candidate") || errorMsg.includes("blocked")) {
      message = "AI Safety Block";
      tip = "The AI system flagged this image. Ensure the ID is clearly visible with no sensitive background elements.";
    }

    setStageFeedback({ message, tip, isRetryable: true });
    setStep('ID_FEEDBACK');
  };

  const verifyIdentity = async (front: string, back?: string) => {
    setStep('ID_CHECKING');
    setThinkingLogs(["Scanning your ID card...", "Analyzing image quality..."]);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const parts = [
        { inlineData: { mimeType: 'image/jpeg', data: front.split(',')[1] } },
        { text: `IDENTITY CHECK: Indian ${selectedDocType}. 
          
          TASK: Critical visual audit. Identify WHY it might fail.
          
          AUDIT CODES (One of):
          - 'BLURRY': Text or face photo is not sharp.
          - 'GLARE': Reflection is obscuring data.
          - 'COVERED': Fingers/objects blocking ID photo, Name, or Number.
          - 'SCREEN_DETECTED': This is a photo of a screen, not a physical ID.
          - 'EXPIRED': Document has passed expiry date.
          - 'POOR_LIGHTING': Image is too dark.
          - 'SUCCESS': Document is perfect.
          
          If SUCCESS, extract Name, DOB (DD/MM/YYYY), Document Number, and Address.
          
          Return ONLY JSON following the defined schema.` }
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
              feedback: { type: Type.STRING },
              tip: { type: Type.STRING }
            },
            required: ["status"]
          }
        }
      });

      setTimeout(() => setThinkingLogs(prev => [...prev, "Checking for glare...", "Verifying original document..."]), 1000);

      const response = await responsePromise;
      const data = JSON.parse(response.text.trim() || '{}');
      await new Promise(resolve => setTimeout(resolve, 2000));

      if (data.status !== 'SUCCESS') {
        let title = "Verification Issue";
        switch (data.status) {
          case 'BLURRY': title = "Image is Blurry"; break;
          case 'GLARE': title = "Glare on Document"; break;
          case 'COVERED': title = "Document is Covered"; break;
          case 'SCREEN_DETECTED': title = "Physical ID Required"; break;
          case 'EXPIRED': title = "Document Expired"; break;
          case 'POOR_LIGHTING': title = "Too Dark to Read"; break;
        }
        setStageFeedback({ message: title, tip: `${data.feedback || "We couldn't read the ID."} ${data.tip || ""}`, isRetryable: true });
        setStep('ID_FEEDBACK');
        return;
      }

      const bucketsCovered = DOC_CONFIG[selectedDocType!]?.buckets || [];
      const newSatisfied = Array.from(new Set([...satisfiedBuckets, ...bucketsCovered]));
      setCapturedImages(prev => ({ ...prev, [selectedDocType!]: { front, back } }));
      setDocumentDetailsMap(prev => ({ ...prev, [selectedDocType!]: { type: selectedDocType!, number: data.documentNumber || "UNREADABLE" } }));
      setGlobalProfile(prev => ({ customerName: data.name || prev.customerName || "", dob: data.dob || prev.dob || "", address: data.address || prev.address || "" }));
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
    setThinkingLogs(["Scanning your face...", "Checking your security code..."]);
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
            { text: `Match the face in the selfie to the ID (0-100). Check for code '${currentPin}'.` }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: { pinVisible: { type: Type.BOOLEAN }, faceMatchScore: { type: Type.NUMBER }, feedback: { type: Type.STRING } },
            required: ["pinVisible", "faceMatchScore"]
          }
        }
      });
      setTimeout(() => setThinkingLogs(prev => [...prev, "Finalizing check..."]), 1500);
      const response = await responsePromise;
      const data = JSON.parse(response.text.trim() || '{}');
      await new Promise(resolve => setTimeout(resolve, 2000));
      if (data.pinVisible && data.faceMatchScore > (settings.strictFaceMatch ? 90 : 80)) {
        setStep('LIVENESS_SUCCESS');
        setTimeout(() => finalize(data), 1000);
      } else {
        setStageFeedback({ message: !data.pinVisible ? "Security code not found." : "Face match unsuccessful.", tip: "Hold the code clearly in good light.", isRetryable: true });
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
        return (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 animate-in fade-in zoom-in-95">
            <h2 className="text-xl font-bold text-slate-900 mb-2 text-center tracking-tight">Identity Verification</h2>
            <p className="text-slate-500 text-sm mb-8 text-center font-medium">Please select a document to scan</p>
            <div className="space-y-3">
              {available.map(doc => (
                <button key={doc} onClick={() => { setSelectedDocType(doc); setSide('front'); setStep('ID_CAPTURE'); }}
                  className="w-full flex items-center justify-between p-5 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 group transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-white border border-slate-200 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-slate-400 group-hover:text-indigo-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-slate-800 text-sm">{doc}</p>
                      <p className="text-[10px] text-slate-500 font-medium">Verify {DOC_CONFIG[doc].buckets.join(' & ')}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300" />
                </button>
              ))}
              {available.length === 0 && (
                <div className="py-6 text-center space-y-6">
                  <div className="w-14 h-14 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto border border-emerald-100"><Check className="w-7 h-7" strokeWidth={3} /></div>
                  <h3 className="text-lg font-bold text-slate-900">Documents Scanned</h3>
                  <button onClick={() => setStep('LIVENESS_CAPTURE')} className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 hover:bg-indigo-700 transition-colors">Start Selfie Check <ArrowRight className="w-4 h-4" /></button>
                </div>
              )}
            </div>
          </div>
        );
      case 'ID_CAPTURE':
        return (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
            <div className="flex justify-between items-center mb-6">
               <button onClick={() => setStep('DOC_SELECT')} className="p-2 hover:bg-slate-50 rounded-full text-slate-400"><ChevronLeft className="w-5 h-5" /></button>
               <h2 className="text-lg font-bold text-slate-900 tracking-tight">Scan {selectedDocType} ({side === 'front' ? 'Front' : 'Back'})</h2>
               <div className="w-9 h-1" />
            </div>
            <div className="relative rounded-xl overflow-hidden bg-slate-900 aspect-[1.5/1] border border-slate-200 shadow-inner">
               {isCameraActive ? (
                 <>
                   <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                   <div className="absolute inset-0 border-[40px] border-black/30 rounded-xl pointer-events-none" />
                   <button onClick={capturePhoto} className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white p-5 rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all">
                     <Camera className="w-8 h-8 text-slate-900" />
                   </button>
                 </>
               ) : (
                 <button onClick={handleStartCamera} className="mt-20 px-8 py-3 bg-indigo-600 text-white rounded-lg font-bold text-xs uppercase tracking-widest shadow-lg shadow-indigo-600/20">Open Camera</button>
               )}
            </div>
          </div>
        );
      case 'ID_CHECKING':
      case 'LIVENESS_CHECKING':
        return (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-16 text-center animate-in fade-in">
            <div className="w-12 h-12 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
            <h3 className="text-xl font-bold text-slate-900 mb-4 tracking-tight">Agentic AI Thinking...</h3>
            <div className="space-y-3 max-w-[200px] mx-auto text-left">
              {thinkingLogs.map((log, i) => (
                <div key={i} className="flex items-center gap-3 animate-in slide-in-from-left-2 fade-in">
                  <Check className={`w-3.5 h-3.5 ${i === thinkingLogs.length - 1 ? 'text-slate-200' : 'text-emerald-500'}`} strokeWidth={4} />
                  <span className="text-xs font-semibold text-slate-500">{log}</span>
                </div>
              ))}
            </div>
          </div>
        );
      case 'ID_FEEDBACK':
        return (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-10 text-center animate-in zoom-in-95">
            <ShieldAlert className="w-16 h-16 text-amber-500 mx-auto mb-6" />
            <h2 className="text-2xl font-bold mb-3 text-slate-900 tracking-tight">{stageFeedback?.message || "Verification Failed"}</h2>
            <div className="bg-amber-50 p-6 rounded-2xl text-sm text-amber-800 mb-8 text-left border border-amber-100 leading-relaxed shadow-inner">
              {stageFeedback?.tip || "Try taking a clearer photo."}
            </div>
            <div className="flex gap-4">
               <button onClick={retryCurrentDoc} className="flex-1 py-4 bg-indigo-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-2"><RefreshCw className="w-4 h-4" /> Retake Photo</button>
               <button onClick={resetAll} className="px-6 py-4 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-200 active:scale-95 transition-all">Reset All</button>
            </div>
          </div>
        );
      case 'LIVENESS_FEEDBACK':
        return (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-10 text-center animate-in zoom-in-95">
            <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-6" />
            <h2 className="text-2xl font-bold mb-3 text-slate-900 tracking-tight">Selfie Check Issue</h2>
            <div className="bg-amber-50 p-6 rounded-2xl text-sm text-amber-800 mb-8 text-left border border-amber-100 leading-relaxed shadow-inner">
              <p className="font-bold mb-2">{stageFeedback?.message}</p>
              {stageFeedback?.tip}
            </div>
            <div className="flex gap-4">
               <button onClick={retryLiveness} className="flex-1 py-4 bg-indigo-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-2"><RotateCcw className="w-4 h-4" /> Retake Selfie</button>
               <button onClick={resetAll} className="px-6 py-4 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-200 active:scale-95 transition-all">Cancel</button>
            </div>
          </div>
        );
      case 'LIVENESS_CAPTURE':
        return (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center animate-in zoom-in-95">
             <h2 className="text-2xl font-bold mb-2 text-slate-900 tracking-tight">Selfie Check</h2>
             <p className="text-slate-500 text-sm mb-8 font-medium">Hold a paper with code <span className="text-indigo-600 font-black bg-indigo-50 px-4 py-1.5 rounded-lg border border-indigo-100 shadow-sm">{currentPin}</span> clearly visible.</p>
             <div className="relative aspect-square max-w-[280px] mx-auto rounded-full overflow-hidden border-4 border-slate-50 shadow-2xl bg-slate-900">
                {isCameraActive ? (
                  <>
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                    <button onClick={capturePhoto} className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-white p-6 rounded-full shadow-2xl active:scale-90 hover:scale-105 transition-all"><Camera className="w-8 h-8 text-slate-900" /></button>
                  </>
                ) : (
                  <button onClick={handleStartCamera} className="mt-24 px-8 py-3 bg-indigo-600 text-white rounded-lg font-bold text-xs uppercase tracking-widest shadow-lg">Open Camera</button>
                )}
             </div>
             <div className="mt-10 p-8 bg-slate-900 rounded-2xl text-indigo-400 text-4xl font-mono font-black tracking-[0.2em] text-center shadow-2xl">{currentPin}</div>
          </div>
        );
      case 'RESULT':
        return (
          <div className="bg-white rounded-[32px] shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-700">
             <div className={`p-12 text-center text-white ${result?.status === 'Approved' ? 'bg-emerald-600' : 'bg-amber-600'} relative`}>
                <h2 className="text-3xl font-black mb-2 tracking-tight">{result?.status === 'Approved' ? 'Verification Success!' : 'Review Required'}</h2>
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] opacity-80">Reference: {result?.id}</p>
             </div>
             <div className="p-10 space-y-10">
                <div className="flex items-center gap-6 bg-slate-50 p-6 rounded-[24px] border border-slate-100">
                   <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-white shadow-xl bg-white flex-shrink-0"><img src={result?.selfieImage} className="w-full h-full object-cover" /></div>
                   <div className="flex-1">
                     <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Customer Profile</span>
                     <p className="text-2xl font-black text-slate-900 tracking-tight">{result?.customerName}</p>
                     <div className="mt-2 flex gap-2">
                        <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 uppercase">{result?.riskScore} Risk</span>
                        <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-indigo-600 uppercase">{result?.faceMatchScore}% Match</span>
                     </div>
                   </div>
                </div>
                <button onClick={resetAll} className="w-full py-6 bg-slate-900 text-white rounded-[20px] font-bold text-xs uppercase tracking-[0.1em] hover:bg-slate-800 active:scale-95 transition-all shadow-2xl">Start New KYC Verification</button>
             </div>
          </div>
        );
      default: return null;
    }
  };

  return (
    <div className="max-w-xl mx-auto pb-16 relative min-h-[450px]">
      <canvas ref={canvasRef} className="hidden" />
      {step !== 'RESULT' && step !== 'FATAL_ERROR' && (
        <div className="mb-8 flex flex-wrap justify-center gap-2">
          {settings.requiredBuckets.map(b => (
            <div key={b} className={`px-4 py-2 rounded-full border text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 transition-all duration-300 ${satisfiedBuckets.includes(b) ? 'bg-emerald-50 border-emerald-200 text-emerald-600 shadow-sm' : 'bg-white border-slate-200 text-slate-400'}`}>
              {satisfiedBuckets.includes(b) ? <Check className="w-3.5 h-3.5" strokeWidth={5} /> : <Target className="w-3.5 h-3.5 opacity-30" />} {b}
            </div>
          ))}
        </div>
      )}
      {renderContent()}
    </div>
  );
};
