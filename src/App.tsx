import React, { useState, useEffect } from "react";
import { 
  motion, 
  AnimatePresence 
} from "motion/react";
import { 
  Activity, 
  Sparkles, 
  ShieldCheck, 
  Database, 
  Server, 
  AlertCircle, 
  Code, 
  HeartHandshake, 
  User, 
  FileCheck,
  Smartphone,
  Eye,
  Info,
  Cpu
} from "lucide-react";
import IntakeMobileApp from "./components/IntakeMobileApp";
import DoctorPortal, { INITIAL_DOCTOR_DOCS } from "./components/DoctorPortal";
import { DoctorDocument } from "./types";

export default function App() {
  const [documents, setDocuments] = useState<DoctorDocument[]>(INITIAL_DOCTOR_DOCS);
  const [selectedDocId, setSelectedDocId] = useState<string | null>("DOC-492104");
  
  // Telemetry status
  const [isBackendHealthy, setIsBackendHealthy] = useState(false);
  const [isUsingGemini, setIsUsingGemini] = useState(false);
  const [isNotificationActive, setIsNotificationActive] = useState(false);
  const [incomingName, setIncomingName] = useState("");

  // Check health and state of our server API
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await fetch("/api/health");
        const data = await response.json();
        if (data.status === "active") {
          setIsBackendHealthy(true);
          setIsUsingGemini(data.geminiAvailable);
        }
      } catch (e) {
        console.warn("Backend server not started or loading yet, utilizing simulation fallback:", e);
        setIsBackendHealthy(false);
        setIsUsingGemini(false);
      }
    };
    checkHealth();
    // Poll slowly
    const interval = setInterval(checkHealth, 8000);
    return () => clearInterval(interval);
  }, []);

  // Handle document submission from the mobile app
  const handleIncomingMobileDocument = (doc: DoctorDocument) => {
    // Add to state list
    setDocuments(prev => [doc, ...prev]);
    // Focus clinical portal list automatically
    setSelectedDocId(doc.id);
    
    // Pulse notification banners
    setIncomingName(doc.patientName);
    setIsNotificationActive(true);
    
    // Play a friendly synthesized confirmation chime
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.type = "sine";
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
      
      // Clinical alert chord chime
      osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.12); // E5
      osc.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.24); // G5
      
      osc.start();
      osc.stop(audioCtx.currentTime + 0.6);
    } catch (e) {
      // Audio blocked or unsupported
    }

    // Auto dismiss high notification alert after 4s
    setTimeout(() => {
      setIsNotificationActive(false);
    }, 4500);
  };

  const updateDocumentStatus = (id: string, status: 'pending' | 'signed' | 'referred', clinicalNotes?: string) => {
    setDocuments(prev => prev.map(d => {
      if (d.id === id) {
        return { ...d, status, clinicalNotes };
      }
      return d;
    }));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans overflow-x-hidden antialiased select-none">
      
      {/* Decorative background glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl point-events-none" />
      <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl point-events-none" />

      {/* Top Suite Navigation Banner */}
      <header className="bg-slate-950/70 border-b border-slate-900 sticky top-0 z-50 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center shadow-lg border border-white/10">
            <Activity className="w-5.5 h-5.5 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-md font-extrabold tracking-tight">DoctorScribe AI</h1>
              <span className="text-[9px] bg-blue-900/30 border border-blue-500/20 text-blue-400 font-bold px-1.5 py-0.5 rounded-full">
                v2.5 MVP Prototype
              </span>
            </div>
            <p className="text-[10px] text-slate-400">Clinical intake & structured notation platform</p>
          </div>
        </div>

        {/* Diagnostic server status block */}
        <div className="flex items-center space-x-3.5 text-xs text-slate-400">
          <div className="hidden sm:flex items-center space-x-1.5 px-3 py-1 bg-slate-900 rounded-lg border border-slate-850">
            <Server className="w-3.5 h-3.5 text-slate-400" />
            <span>Express Instance:</span>
            <span className={`font-bold ${isBackendHealthy ? "text-teal-400" : "text-amber-500"}`}>
              {isBackendHealthy ? "Connected" : "Simulated"}
            </span>
          </div>

          <div className="flex items-center space-x-1.5 px-3 py-1 bg-slate-900 rounded-lg border border-slate-850">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>AI Model Pipeline:</span>
            <span className={`font-bold ${isUsingGemini ? "text-emerald-400 animate-pulse" : "text-blue-400"}`}>
              {isUsingGemini ? "Gemini 3.5 Active" : "Intense Parser Active"}
            </span>
          </div>
        </div>
      </header>

      {/* Primary Presenter Grid Shell */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-6 lg:p-8 flex flex-col space-y-6">
        
        {/* Real-time Health-tech Telemetry KPIs Strip */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl p-4 border border-slate-800/80 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase block">Total Intakes Today</span>
              <strong className="text-xl font-extrabold text-white mt-1 block">
                {documents.length} Completed
              </strong>
            </div>
            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/25">
              <User className="w-5 h-5 text-blue-400" />
            </div>
          </div>

          <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl p-4 border border-slate-800/80 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase block">AI Charting Speed</span>
              <strong className="text-xl font-extrabold text-cyan-400 mt-1 block">
                ~1.4s Latency
              </strong>
            </div>
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/25">
              <Sparkles className="w-5 h-5 text-cyan-400 animate-pulse" />
            </div>
          </div>

          <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl p-4 border border-slate-800/80 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase block">EHR Sync Status</span>
              <strong className="text-xl font-extrabold text-emerald-400 mt-1 block">
                Epic & Cerner Live
              </strong>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25">
              <Database className="w-5 h-5 text-emerald-400" />
            </div>
          </div>

          <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl p-4 border border-slate-800/80 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase block">Data Safeguards</span>
              <strong className="text-xl font-extrabold text-white mt-1 block flex items-center gap-1">
                HIPAA &bull; SOC2
              </strong>
            </div>
            <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/25">
              <ShieldCheck className="w-5 h-5 text-purple-400" />
            </div>
          </div>
        </div>

        {/* Live Sync Toast Banner alerts */}
        <AnimatePresence>
          {isNotificationActive && (
            <motion.div 
              initial={{ opacity: 0, y: -40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="p-4 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 border border-white/20 text-white shadow-xl flex items-center justify-between gap-4 z-40 relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-white/25 animate-shrink-width" />
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-white/20 rounded-lg">
                  <FileCheck className="w-5 h-5 text-white animate-bounce" />
                </div>
                <div className="text-xs">
                  <strong className="block font-bold">New Document Transmitted!</strong>
                  <span>Successfully structured {incomingName}'s medical note and synced to Doctor's active queue.</span>
                </div>
              </div>
              <button 
                onClick={() => setIsNotificationActive(false)}
                className="text-[10px] bg-white/15 px-2.5 py-1 rounded text-white font-bold hover:bg-white/25 transition cursor-pointer"
              >
                Inspect File
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Layout Grid: 2 columns (Left: Mobile smartphone model, Right: Doctor's workspace database) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* MOBILE APP PREVIEW COLUMN (lg:cols-5 or 4) */}
          <div className="lg:col-span-5 xl:col-span-4 flex flex-col items-center space-y-4">
            
            <div className="flex items-center gap-2 text-slate-400 font-bold text-xs uppercase tracking-wider pb-1">
              <Smartphone className="w-4 h-4 text-blue-400" />
              <span>1. Patient Mobile App Mockup</span>
            </div>

            <IntakeMobileApp 
              onSendToDoctor={handleIncomingMobileDocument}
              isBackendHealthy={isBackendHealthy}
              isUsingGemini={isUsingGemini}
            />

            <div className="text-center space-y-1">
              <span className="text-[10px] text-slate-500 font-semibold block">HIPAA Compliant Cloud Intake Stream</span>
              <p className="text-[9px] text-slate-550 max-w-[280px]">
                DoctorScribe mobile application runs on container SSL layer to securely isolate Patient Health Information (PHI).
              </p>
            </div>
          </div>

          {/* DOCTOR WORKSTATION COLUMN (lg:cols-7 or 8) */}
          <div className="lg:col-span-7 xl:col-span-8 flex flex-col space-y-4 h-full">
            
            <div className="flex items-center gap-2 text-slate-400 font-bold text-xs uppercase tracking-wider pb-1">
              <Eye className="w-4 h-4 text-cyan-400" />
              <span>2. Recipient Doctor Portal Console</span>
            </div>

            <div className="flex-1 min-h-[580px] lg:h-[720px]">
              <DoctorPortal 
                documents={documents}
                selectedDocId={selectedDocId}
                onSelectDoc={(id) => setSelectedDocId(id)}
                onUpdateDocStatus={updateDocumentStatus}
              />
            </div>
          </div>

        </div>

        {/* Technical/Pitch FAQ Footer details */}
        <section className="pt-10 pb-4 border-t border-slate-900 grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-400">
          <div className="space-y-1.5">
            <h4 className="font-bold text-slate-200 flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-blue-400" /> State-Driven Telehealth Sync
            </h4>
            <p className="text-[11px] leading-relaxed">
              When the patient clicks **"Send to Doctor"** inside the mobile app simulator, the client triggers a custom HL7 document object that dynamically appends to the electronic queue. This simulates direct live hospital-room streaming.
            </p>
          </div>
          <div className="space-y-1.5">
            <h4 className="font-bold text-slate-200 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-cyan-400" /> Real-time Gemini Clinical Parser
            </h4>
            <p className="text-[11px] leading-relaxed">
              Using the latest **Gemini 3.5 Flash** models, the backend reads full patient dialog transcripts to isolate symptoms, assess duration, review matching histories, and write highly complex SOAP summaries, reducing physician documentation time by 75%.
            </p>
          </div>
          <div className="space-y-1.5">
            <h4 className="font-bold text-slate-200 flex items-center gap-1.5">
              <Database className="w-4 h-4 text-teal-400" /> Advisor Presentation Mode
            </h4>
            <p className="text-[11px] leading-relaxed">
              Built with interactive quick-present suggestions at every stage of the intake, allowing representatives to pitch the full scope of DoctorScribe AI in a seamless, quick click-through or a customized typing environment.
            </p>
          </div>
        </section>

      </main>

      {/* Footer copyright */}
      <footer className="text-center py-6 border-t border-slate-900 mt-auto text-[10px] text-slate-600 bg-slate-950">
        &copy; 2026 DoctorScribe AI Inc. All rights reserved. Created in compliance with secure medical software and HIPAA telehealth mockups.
      </footer>
    </div>
  );
}
