import React, { useState, useEffect, useRef } from "react";
import { 
  motion, 
  AnimatePresence 
} from "motion/react";
import { 
  Activity, 
  ArrowRight, 
  Send, 
  Sparkles, 
  User, 
  ShieldCheck, 
  RefreshCw, 
  Edit3, 
  Check, 
  AlertCircle, 
  PhoneCall, 
  ChevronRight, 
  HeartHandshake
} from "lucide-react";
import { Message, IntakeSummary, ScreeningStep, DoctorDocument } from "../types";

interface IntakeMobileAppProps {
  onSendToDoctor: (doc: DoctorDocument) => void;
  isBackendHealthy: boolean;
  isUsingGemini: boolean;
}

// Prompt suggestions to make presenting effortless and seamless for advisors
const SUGGESTED_ANSWERS: Record<string, string[]> = {
  welcome: ["Demo Dr Scribe: Male, 34, Severe Headache", "Demo Dr Scribe: Female, 29, Flu Symptoms", "Type My Own Details"],
  chat_complaint: ["I have a severe pulsating headache and fever.", "I am feeling extremely weak and have seasonal congestion.", "I have some chest tightness and cough."],
  chat_duration: ["It started suddenly 3 days ago.", "I've had this gradually worsening over 5 days.", "It comes and goes for about a week now."],
  chat_severity: ["On a scale of 1-10, it is an 8 (very intense).", "It is about a 4/10, mostly manageable but constant.", "A fluctuating 6/10, worst in the mornings."],
  chat_medications: ["I take Ibuprofen 400mg occasionally. No medical allergies.", "I am not taking any medications. No allergies.", "I take Lisinopril 10mg daily. I'm allergic to Penicillin."],
  chat_history: ["I have controlled high blood pressure. My mom gets migraines.", "I have a history of seasonal asthma but no other conditions.", "No major history, generally healthy and active."]
};

export default function IntakeMobileApp({ onSendToDoctor, isBackendHealthy, isUsingGemini }: IntakeMobileAppProps) {
  // Mobile app state management
  const [step, setStep] = useState<ScreeningStep>('welcome');
  const [patientName, setPatientName] = useState("Alex Mercer");
  const [patientAge, setPatientAge] = useState("34");
  const [patientGender, setPatientGender] = useState("Male");
  const [chiefComplaintInput, setChiefComplaintInput] = useState("Severe headache with low-grade fever");
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [currentPromptSuggestions, setCurrentPromptSuggestions] = useState<string[]>([]);
  
  // Compiled summary state
  const [compiledSummary, setCompiledSummary] = useState<IntakeSummary | null>(null);
  const [isEditingSummary, setIsEditingSummary] = useState(false);
  const [hasSentToDoctor, setHasSentToDoctor] = useState(false);
  
  // UI clock state
  const [mobileTime, setMobileTime] = useState("10:00 AM");

  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Set real time in mockup status bar
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      let hours = now.getHours();
      const minutes = now.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12; // safety
      setMobileTime(`${hours}:${minutes} ${ampm}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  // Update suggestions based on state
  useEffect(() => {
    if (step === 'welcome') {
      setCurrentPromptSuggestions(SUGGESTED_ANSWERS.welcome);
    } else {
      setCurrentPromptSuggestions(SUGGESTED_ANSWERS[step] || []);
    }
  }, [step]);

  // Scroll mobile chat screen
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  // Handle Demo triggers on welcome
  const handleWelcomeDemoChoice = (choice: string) => {
    if (choice.includes("Severe Headache")) {
      setPatientName("Alex Mercer");
      setPatientAge("34");
      setPatientGender("Male");
      setChiefComplaintInput("Severe headache and low-grade fever");
      startConsultation("Alex Mercer", "34", "Male", "Severe headache and low-grade fever");
    } else if (choice.includes("Flu Symptoms")) {
      setPatientName("Jordan Vance");
      setPatientAge("29");
      setPatientGender("Non-binary");
      setChiefComplaintInput("Extreme fatigue and allergy congestion");
      startConsultation("Jordan Vance", "29", "Non-binary", "Extreme fatigue and allergy congestion");
    } else {
      // Prompt user to inspect inputs
      const elements = document.getElementById("mobile-intro-form");
      if (elements) {
        elements.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const startConsultation = (name: string, age: string, gen: string, complaint: string) => {
    setStep('chat_complaint');
    setHasSentToDoctor(false);
    
    // Setup primary greeting
    const welcomeMsg: Message = {
      id: "wel-1",
      sender: "ai",
      text: `Hello ${name}! I'm DoctorScribe, your clinical intake assistant. I see you're checked in today for ${complaint || "a consultation"}. Let's summarize your clinical situation for the provider. Can you describe exactly what you've been feeling?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      step: 1
    };
    setMessages([welcomeMsg]);
  };

  const submitPatientResponse = async (text: string) => {
    if (!text.trim()) return;
    
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: "patient",
      text: text,
      timestamp: timeStr
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue("");
    setIsTyping(true);

    // Determine target step progress
    let nextStep: ScreeningStep = 'chat_complaint';
    if (step === 'chat_complaint') nextStep = 'chat_duration';
    else if (step === 'chat_duration') nextStep = 'chat_severity';
    else if (step === 'chat_severity') nextStep = 'chat_medications';
    else if (step === 'chat_medications') nextStep = 'chat_history';
    else if (step === 'chat_history') nextStep = 'generating';

    // Call live backend endpoint
    try {
      const response = await fetch("/api/clinical/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg],
          userResponse: text,
          currentStepName: step
        })
      });

      const data = await response.json();
      setIsTyping(false);

      const aiReply: Message = {
        id: `ai-${Date.now()}`,
        sender: "ai",
        text: data.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, aiReply]);
      
      // Advance stage
      if (nextStep === 'generating') {
        generateSummaryReport([...messages, userMsg, aiReply]);
      } else {
        setStep(nextStep);
      }
    } catch (e) {
      console.error("Failed fetching chat followup:", e);
      setIsTyping(false);
      // Hard fallback
      setStep(nextStep);
    }
  };

  const generateSummaryReport = async (fullConversation?: Message[]) => {
    setStep('generating');
    
    try {
      const activeMsgs = fullConversation || messages;
      const response = await fetch("/api/clinical/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: activeMsgs,
          patientDetails: {
            name: patientName,
            age: patientAge,
            gender: patientGender,
            chiefComplaint: chiefComplaintInput
          }
        })
      });

      const data = await response.json();
      setCompiledSummary(data.summary);
      setStep('summary');
    } catch (e) {
      console.error("Summary creation failed:", e);
      // Fallback
      setStep('summary');
    }
  };

  // Skip step to instantly show summary for quick product presentations
  const handleFastTrackSummary = () => {
    // Generate dummy messages to simulate conversational history
    const mockMsgs: Message[] = [
      { id: "1", sender: "ai", text: "Hello! What brings you here today?", timestamp: "10:00 AM" },
      { id: "2", sender: "patient", text: "I've had a bad headache and fever.", timestamp: "10:01 AM" },
      { id: "3", sender: "ai", text: "Got it. How long have you been experiencing this headache and fever?", timestamp: "10:01 AM" },
      { id: "4", sender: "patient", text: "Since Sunday, so about 3 days. It is a pulsating pain.", timestamp: "10:02 AM" },
      { id: "5", sender: "ai", text: "On a scale of 1 to 10, how severe would you rate the pain?", timestamp: "10:02 AM" },
      { id: "6", sender: "patient", text: "It is around an 8. I took Ibuprofen which helped a little bit.", timestamp: "10:03 AM" }
    ];
    setMessages(mockMsgs);
    setPatientName("Alex Mercer");
    setPatientAge("34");
    setPatientGender("Male");
    setChiefComplaintInput("Severe headache with low-grade fever");
    generateSummaryReport(mockMsgs);
  };

  // Submit back to Doctor's workspace
  const handleSendToDoctor = () => {
    if (!compiledSummary) return;
    
    const doc: DoctorDocument = {
      id: `DOC-${Math.floor(100000 + Math.random() * 900000)}`,
      patientName: compiledSummary.patientName,
      patientAge: compiledSummary.patientAge,
      patientGender: compiledSummary.patientGender,
      chiefComplaint: compiledSummary.chiefComplaint,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'pending',
      summary: compiledSummary
    };

    onSendToDoctor(doc);
    setHasSentToDoctor(true);
  };

  const getStepProgressIndex = () => {
    switch (step) {
      case 'chat_complaint': return 1;
      case 'chat_duration': return 2;
      case 'chat_severity': return 3;
      case 'chat_medications': return 4;
      case 'chat_history': return 5;
      default: return 5;
    }
  };

  const resetAll = () => {
    setStep('welcome');
    setMessages([]);
    setCompiledSummary(null);
    setHasSentToDoctor(false);
  };

  return (
    <div className="relative mx-auto w-full max-w-[400px]">
      
      {/* Decorative Outer Glow behind the mobile screen */}
      <div className="absolute -inset-2 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-[50px] blur-xl opacity-75" />

      {/* Primary Smartphone Container */}
      <div className="relative w-full aspect-[9/19.5] bg-slate-950 rounded-[48px] border-8 border-slate-900 shadow-2xl overflow-hidden flex flex-col font-sans select-none text-slate-100">
        
        {/* Physical Speaker Notch / Dynamic Island Simulator */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-32 h-6 bg-black rounded-full z-50 flex items-center justify-between px-3">
          <div className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-800" />
          <div className="w-12 h-1.5 rounded-full bg-slate-800/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-blue-900/40 border border-blue-950 flex items-center justify-center">
            <div className="w-1 h-1 rounded-full bg-blue-400" />
          </div>
        </div>

        {/* Mock OS Status Bar */}
        <div className="pt-8 px-6 pb-2 bg-slate-900/60 flex items-center justify-between text-xs font-semibold z-40">
          <span className="text-slate-300 font-medium">{mobileTime}</span>
          <div className="flex items-center space-x-1 text-slate-300">
            {/* WiFi Signal bar */}
            <div className="flex items-end space-x-0.5 h-3">
              <div className="w-0.5 h-1 bg-slate-400 rounded-xs" />
              <div className="w-0.5 h-1.5 bg-slate-400 rounded-xs" />
              <div className="w-0.5 h-2.4 bg-slate-400 rounded-xs" />
              <div className="w-0.5 h-3 bg-blue-400 rounded-xs" />
            </div>
            {/* Battery Indicator */}
            <div className="w-5.5 h-3 rounded-md border border-slate-400 flex items-center p-0.5 relative">
              <div className="w-full h-full bg-blue-400 rounded-xs" style={{ width: "85%" }} />
              <div className="w-0.5 h-1 bg-slate-400 rounded-r-xs absolute -right-1 top-0.8" />
            </div>
          </div>
        </div>

        {/* Floating status badges for API / AI connectivity */}
        <div className="absolute top-12 left-0 right-0 px-6 py-1 bg-blue-950/45 border-b border-blue-900/40 flex items-center justify-between text-[10px] tracking-wide text-slate-300 backdrop-blur-md z-30">
          <div className="flex items-center gap-1.5">
            <span className={`inline-block w-1.5 h-1.5 rounded-full ${isBackendHealthy ? 'bg-teal-400' : 'bg-amber-400'}`} />
            <span>AI Platform: {isBackendHealthy ? 'Online' : 'Simulating'}</span>
          </div>
          <div className="flex items-center gap-1">
            <Sparkles className="w-2.5 h-2.5 text-blue-400" />
            <span>Mode: {isUsingGemini ? "Live Gemini" : "Local Smart Parser"}</span>
          </div>
        </div>

        {/* Screens Outlet */}
        <div className="flex-1 overflow-hidden relative flex flex-col bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 pt-6">
          <AnimatePresence mode="wait">
            
            {/* SCREEN 1: Welcome / Branding screen */}
            {step === 'welcome' && (
              <motion.div 
                key="welcome"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.25 }}
                className="absolute inset-0 flex flex-col justify-between p-5 overflow-y-auto"
              >
                <div className="flex-1 flex flex-col justify-center items-center text-center space-y-6 pt-6">
                  {/* Glowing Pulse Logo */}
                  <div className="relative">
                    <div className="absolute -inset-4 bg-blue-500/30 rounded-full blur-xl animate-pulse" />
                    <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center shadow-lg border border-white/10 relative z-10">
                      <Activity className="w-8 h-8 text-white animate-bounce" />
                    </div>
                    {/* Tiny overlay for Scribe */}
                    <div className="absolute -bottom-1 -right-1 bg-slate-900 p-1.5 rounded-lg border border-slate-700 z-20">
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-spin" style={{ animationDuration: '6s' }} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-blue-200 bg-clip-text text-transparent">
                      DoctorScribe AI
                    </h1>
                    <p className="text-[11px] uppercase tracking-wider text-blue-400 font-bold">
                      Telehealth MVP Series
                    </p>
                    <p className="text-slate-300 text-xs px-2 leading-relaxed">
                      "AI Patient Intake & Medical Documentation Assistant"
                    </p>
                  </div>

                  {/* Form inputs container */}
                  <div id="mobile-intro-form" className="w-full bg-slate-900/60 backdrop-blur-md rounded-2xl p-4 border border-slate-800/80 text-left space-y-3.5 self-stretch">
                    <span className="text-[11px] font-bold text-slate-400 tracking-wider block uppercase">
                      Patient Intake Form Setup
                    </span>
                    
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-semibold block">Full Patient Name</label>
                      <div className="relative">
                        <User className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
                        <input 
                          type="text" 
                          value={patientName} 
                          onChange={(e) => setPatientName(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 pl-9 pr-3 text-xs text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-semibold block">Age</label>
                        <input 
                          type="number" 
                          value={patientAge} 
                          onChange={(e) => setPatientAge(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-semibold block">Gender</label>
                        <select 
                          value={patientGender} 
                          onChange={(e) => setPatientGender(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-2 text-xs text-white focus:outline-none focus:border-blue-500"
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Non-binary">Non-binary</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-semibold block">Chief Complaint</label>
                      <input 
                        type="text" 
                        value={chiefComplaintInput} 
                        onChange={(e) => setChiefComplaintInput(e.target.value)}
                        placeholder="e.g. Headache, coughing, throat pain"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Actions Section */}
                <div className="space-y-3.5 pt-4">
                  {/* Quick-tap choices for demonstration convenience */}
                  <div className="space-y-1 text-center">
                    <span className="text-[9px] text-slate-400 font-semibold uppercase block tracking-wider">
                      One-Click Presenter demo load
                    </span>
                    <div className="flex flex-col gap-1.5">
                      {currentPromptSuggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          onClick={() => handleWelcomeDemoChoice(suggestion)}
                          className="w-full py-1.5 px-3 text-[10px] text-left rounded-lg bg-slate-900 border border-slate-800 hover:border-blue-500 hover:bg-slate-800 transition-all text-slate-300 flex items-center justify-between"
                        >
                          <span>{suggestion}</span>
                          <ChevronRight className="w-3 h-3 text-slate-500 shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>

                  <button 
                    onClick={() => startConsultation(patientName, patientAge, patientGender, chiefComplaintInput)}
                    className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold rounded-xl py-3 px-4 text-xs flex items-center justify-center space-x-2 shadow-lg shadow-blue-500/20 active:scale-98 transition-transform cursor-pointer"
                  >
                    <span>Start Consultation</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={handleFastTrackSummary}
                    className="w-full bg-slate-900/80 border border-dashed border-blue-500/40 text-blue-400 hover:text-blue-300 rounded-xl py-2 px-4 text-[11px] text-center flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3 text-cyan-400" />
                    <span>Fast-Track Generated SOAP Note</span>
                  </button>
                </div>
              </motion.div>
            )}

            {/* SCREEN 2 & 3: Chat conversation (Symptom interview) */}
            {['chat_complaint', 'chat_duration', 'chat_severity', 'chat_medications', 'chat_history'].includes(step) && (
              <motion.div 
                key="chat-screen"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="absolute inset-0 flex flex-col justify-between"
              >
                {/* Stepper Header indicator */}
                <div className="px-4 py-2.5 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between z-10">
                  <div className="flex items-center space-x-2">
                    <Activity className="w-4 h-4 text-blue-400" />
                    <span className="text-xs font-bold text-slate-200">Patient Intake Chat</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="text-[10px] bg-blue-950 text-blue-400 py-0.5 px-2 rounded-full font-black">
                      Step {getStepProgressIndex()} of 5
                    </span>
                  </div>
                </div>

                {/* Dynamic Step tracker bar */}
                <div className="w-full h-1 bg-slate-900 relative">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 ease-out transition-all duration-300" 
                    style={{ width: `${(getStepProgressIndex() / 5) * 100}%` }}
                  />
                </div>

                {/* Chat Message Scrollport */}
                <div 
                  ref={chatContainerRef}
                  className="flex-1 overflow-y-auto p-4 space-y-3.5 scroll-smooth"
                >
                  {messages.map((m) => (
                    <div 
                      key={m.id}
                      className={`flex ${m.sender === 'ai' ? 'justify-start' : 'justify-end'}`}
                    >
                      <div className={`flex items-start gap-1.5 max-w-[85%] ${m.sender === 'ai' ? '' : 'flex-row-reverse'}`}>
                        {/* Sender Avatar badge */}
                        <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${
                          m.sender === 'ai' 
                            ? 'bg-blue-600 font-bold text-white text-[10px]' 
                            : 'bg-slate-800 text-slate-300 text-[10px]'
                        }`}>
                          {m.sender === 'ai' ? 'DS' : 'PT'}
                        </div>

                        <div className="space-y-1">
                          <div className={`rounded-2xl px-3 py-2.5 text-[11px] leading-relaxed shadow-sm ${
                            m.sender === 'ai' 
                              ? 'bg-slate-900 text-slate-100 border border-slate-800 rounded-tl-none' 
                              : 'bg-blue-600 text-white rounded-tr-none'
                          }`}>
                            {m.text}
                          </div>
                          <span className={`text-[9px] block text-slate-500 ${m.sender === 'ai' ? 'text-left' : 'text-right'}`}>
                            {m.timestamp}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Typing Simulator */}
                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="flex items-start gap-1.5 max-w-[85%]">
                        <div className="w-6 h-6 rounded-md bg-blue-600 text-white text-[10px] flex items-center justify-center font-bold">
                          DS
                        </div>
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl rounded-tl-none px-4 py-2.5 flex items-center space-x-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Interaction & Suggested Controls */}
                <div className="p-3 bg-slate-950/90 border-t border-slate-900 space-y-3.5">
                  
                  {/* Smart Presenter Pill Responses */}
                  {currentPromptSuggestions.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[9px] text-slate-400 font-bold block uppercase pb-0.5 tracking-wider text-center">
                        Demo Rapid-Reply (Recommended)
                      </span>
                      <div className="flex flex-col gap-1">
                        {currentPromptSuggestions.map((suggestion, index) => (
                          <button
                            key={index}
                            onClick={() => submitPatientResponse(suggestion)}
                            className="text-[10px] text-left px-2.5 py-2.5 rounded-lg border border-blue-900/30 bg-blue-950/30 text-blue-300 hover:bg-blue-950/60 hover:text-cyan-200 transition-all leading-tight cursor-pointer"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Message Input line */}
                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      submitPatientResponse(inputValue);
                    }}
                    className="flex items-center space-x-1.5"
                  >
                    <input 
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder="Type your symptoms or select a demo..."
                      className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-[11px] text-white focus:outline-none focus:border-blue-500 placeholder-slate-500 focus:ring-1 focus:ring-blue-500/30"
                    />
                    <button 
                      type="submit"
                      disabled={!inputValue.trim()}
                      className={`p-2 rounded-xl flex items-center justify-center transition-all ${
                        inputValue.trim() 
                          ? 'bg-blue-600 hover:bg-blue-500 text-white cursor-pointer' 
                          : 'bg-slate-850 text-slate-600'
                      }`}
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>

                  {/* Reset action in chat */}
                  <div className="flex justify-between items-center text-[10px] text-slate-500">
                    <button type="button" onClick={resetAll} className="hover:text-slate-300 flex items-center gap-1">
                      <RefreshCw className="w-3 h-3" /> Start Over
                    </button>
                    <button type="button" onClick={() => generateSummaryReport()} className="text-blue-400 hover:text-blue-300 font-bold block">
                      Skip directly to summary
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* SCREEN: Generating Clinical report spinner */}
            {step === 'generating' && (
              <motion.div 
                key="generating"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col justify-center items-center text-center p-6 space-y-4"
              >
                <div className="relative">
                  <div className="w-14 h-14 rounded-full border-2 border-dashed border-blue-500 animate-spin" style={{ animationDuration: '3s' }} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-cyan-400 animate-bounce" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-sm font-bold text-slate-100">DoctorScribe AI Synthesizing</h3>
                  <p className="text-[11px] text-slate-400 px-3">
                    Structuring diagnosis code indicators, chief complaints, matching family history, and framing clinical SOAP summary...
                  </p>
                </div>
              </motion.div>
            )}

            {/* SCREEN 4: Generated Medical Summary */}
            {step === 'summary' && compiledSummary && (
              <motion.div 
                key="summary-screen"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col"
              >
                {/* Header inside phone */}
                <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-slate-200">AI Documentation Summary</span>
                  </div>
                  {/* Close and Reset */}
                  <button 
                    onClick={resetAll}
                    className="text-[10px] bg-slate-800 text-slate-300 py-0.5 px-2 rounded-md hover:bg-slate-700 transition"
                  >
                    Reset
                  </button>
                </div>

                {/* Content log scrollport */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  
                  {/* Patient Info Card */}
                  <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800 shadow-sm space-y-2">
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                      <span className="text-[10px] font-bold text-blue-400 tracking-wider uppercase">Patient Information</span>
                    </div>

                    {isEditingSummary ? (
                      <div className="space-y-2 text-xs">
                        <div>
                          <label className="text-[9px] text-slate-400">Name</label>
                          <input 
                            type="text" 
                            value={compiledSummary.patientName} 
                            onChange={(e) => setCompiledSummary({...compiledSummary, patientName: e.target.value})}
                            className="w-full bg-slate-950 border border-slate-800 rounded py-1 px-2 text-xs"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[9px] text-slate-400">Age</label>
                            <input 
                              type="text" 
                              value={compiledSummary.patientAge} 
                              onChange={(e) => setCompiledSummary({...compiledSummary, patientAge: e.target.value})}
                              className="w-full bg-slate-950 border border-slate-800 rounded py-1 px-2 text-xs"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] text-slate-400">Gender</label>
                            <input 
                              type="text" 
                              value={compiledSummary.patientGender} 
                              onChange={(e) => setCompiledSummary({...compiledSummary, patientGender: e.target.value})}
                              className="w-full bg-slate-950 border border-slate-800 rounded py-1 px-2 text-xs"
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-y-1.5 gap-x-2 text-[11px]">
                        <div><span className="text-slate-400">Name:</span> <strong className="text-slate-200">{compiledSummary.patientName}</strong></div>
                        <div><span className="text-slate-400">Age:</span> <strong className="text-slate-200">{compiledSummary.patientAge}</strong></div>
                        <div><span className="text-slate-400">Gender:</span> <strong className="text-slate-200">{compiledSummary.patientGender}</strong></div>
                        <div><span className="text-slate-400">Verified:</span> <span className="text-emerald-400 text-[10px] inline-flex items-center gap-0.5 font-bold">✔ Health ID</span></div>
                      </div>
                    )}
                  </div>

                  {/* Complaint & Symptoms */}
                  <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800 shadow-sm space-y-2">
                    <span className="text-[10px] font-bold text-blue-400 tracking-wider uppercase block">Initial Interview Data</span>
                    
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-500 font-bold block">Chief Complaint</span>
                      {isEditingSummary ? (
                        <input 
                          type="text" 
                          value={compiledSummary.chiefComplaint} 
                          onChange={(e) => setCompiledSummary({...compiledSummary, chiefComplaint: e.target.value})}
                          className="w-full bg-slate-950 border border-slate-800 rounded py-1 px-2 text-[11px]"
                        />
                      ) : (
                        <p className="text-[11px] text-slate-250 italic bg-slate-950/60 p-1.5 rounded border border-slate-900">
                          "{compiledSummary.chiefComplaint}"
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                      <div>
                        <span className="text-slate-500 font-bold text-[10px] block">Duration</span>
                        {isEditingSummary ? (
                          <input 
                            type="text" 
                            value={compiledSummary.duration} 
                            onChange={(e) => setCompiledSummary({...compiledSummary, duration: e.target.value})}
                            className="w-full bg-slate-950 border border-slate-800 rounded py-1 px-2 text-[11px]"
                          />
                        ) : (
                          <span className="text-slate-200">{compiledSummary.duration}</span>
                        )}
                      </div>
                      <div>
                        <span className="text-slate-500 font-bold text-[10px] block">Current Medications</span>
                        {isEditingSummary ? (
                          <input 
                            type="text" 
                            value={compiledSummary.currentMedications} 
                            onChange={(e) => setCompiledSummary({...compiledSummary, currentMedications: e.target.value})}
                            className="w-full bg-slate-950 border border-slate-800 rounded py-1 px-2 text-[11px]"
                          />
                        ) : (
                          <span className="text-slate-200 line-clamp-1">{compiledSummary.currentMedications}</span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1 pt-1">
                      <span className="text-[10px] text-slate-500 font-bold block">Symptoms Identified</span>
                      <div className="flex flex-wrap gap-1">
                        {compiledSummary.symptoms && compiledSummary.symptoms.map((sym, index) => (
                          <span 
                            key={index}
                            className="text-[9px] bg-blue-950 text-blue-300 px-2 py-0.5 rounded-full font-medium border border-blue-900/30"
                          >
                            {sym}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1 pt-1">
                      <span className="text-[10px] text-slate-550 font-bold block">Medical / Family History</span>
                      {isEditingSummary ? (
                        <input 
                          type="text" 
                          value={compiledSummary.medicalHistory} 
                          onChange={(e) => setCompiledSummary({...compiledSummary, medicalHistory: e.target.value})}
                          className="w-full bg-slate-950 border border-slate-800 rounded py-1 px-2 text-[11px]"
                        />
                      ) : (
                        <p className="text-[11px] text-slate-300">{compiledSummary.medicalHistory}</p>
                      )}
                    </div>
                  </div>

                  {/* AI Generated Clinical SOAP Note Content */}
                  <div className="bg-gradient-to-br from-slate-900 to-blue-950/20 rounded-xl p-3.5 border border-slate-800 shadow-sm space-y-2 relative">
                    <div className="absolute top-3.5 right-3.5">
                      <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
                    </div>
                    
                    <span className="text-[10px] font-bold text-cyan-400 tracking-wider uppercase block">AI Clinical Scribe Assessment</span>
                    
                    {isEditingSummary ? (
                      <textarea
                        rows={6}
                        value={compiledSummary.clinicalSummary}
                        onChange={(e) => setCompiledSummary({...compiledSummary, clinicalSummary: e.target.value})}
                        className="w-full bg-slate-950 border border-slate-800 rounded py-1.5 px-2 text-[10px] font-mono text-cyan-100 focus:outline-none"
                      />
                    ) : (
                      <div className="bg-slate-950/80 rounded-lg p-2.5 border border-slate-900 text-[10px] font-mono leading-relaxed max-h-48 overflow-y-auto text-slate-300 space-y-2 whitespace-pre-wrap">
                        {compiledSummary.clinicalSummary}
                      </div>
                    )}
                  </div>

                </div>

                {/* Send/Edit buttons inside phone screen bottom */}
                <div className="p-3 bg-slate-950 border-t border-slate-900 space-y-2 z-10">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setIsEditingSummary(!isEditingSummary)}
                      className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${
                        isEditingSummary 
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white' 
                          : 'bg-slate-900 border border-slate-800 hover:bg-slate-820 text-slate-300'
                      }`}
                    >
                      {isEditingSummary ? <Check className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
                      <span>{isEditingSummary ? "Save Changes" : "Edit Summary"}</span>
                    </button>

                    <button
                      onClick={handleSendToDoctor}
                      disabled={hasSentToDoctor}
                      className={`py-2 px-3 rounded-lg text-xs font-bold text-white flex items-center justify-center gap-1.5 shadow-lg cursor-pointer ${
                        hasSentToDoctor 
                          ? 'bg-slate-800 text-slate-500 shadow-none cursor-not-allowed' 
                          : 'bg-gradient-to-r from-blue-600 to-cyan-500 hover:opacity-95'
                      }`}
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{hasSentToDoctor ? "Sent Successfully" : "Send to Doctor"}</span>
                    </button>
                  </div>

                  {hasSentToDoctor && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-2 rounded bg-emerald-950/40 border border-emerald-900/60 text-center flex items-center justify-center gap-2"
                    >
                      <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                      <span className="text-[10px] text-emerald-300 font-bold">Document transmitted to clinic console</span>
                    </motion.div>
                  )}
                </div>

              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Physical Home Indicator bar */}
        <div className="h-6 bg-slate-950/60 pb-1.5 flex items-center justify-center z-40">
          <div className="w-36 h-1 bg-slate-800 rounded-full" />
        </div>

      </div>
    </div>
  );
}
