import React, { useState } from "react";
import { 
  motion, 
  AnimatePresence 
} from "motion/react";
import { 
  FileText, 
  Clock, 
  User, 
  Cpu, 
  CheckCircle, 
  ArrowUpRight, 
  Printer, 
  Database, 
  AlertCircle, 
  PlusCircle, 
  ExternalLink,
  ClipboardCheck,
  Award,
  ChevronRight,
  ShieldAlert
} from "lucide-react";
import { DoctorDocument } from "../types";

interface DoctorPortalProps {
  documents: DoctorDocument[];
  selectedDocId: string | null;
  onSelectDoc: (id: string) => void;
  onUpdateDocStatus: (id: string, status: 'pending' | 'signed' | 'referred', clinicalNotes?: string) => void;
}

// Preloaded mock medical records to show a rich healthcare database instantly
export const INITIAL_DOCTOR_DOCS: DoctorDocument[] = [
  {
    id: "DOC-271948",
    patientName: "Clara Oswald",
    patientAge: "64",
    patientGender: "Female",
    chiefComplaint: "Atypical dry cough with persistent wheezing, rule out early bronchitis",
    timestamp: "2:15 PM",
    status: "signed",
    summary: {
      patientName: "Clara Oswald",
      patientAge: "64",
      patientGender: "Female",
      chiefComplaint: "Persistent wheezing and deep dry cough",
      symptoms: ["Dry cough", "Expiratory wheezing", "Grade 1 dyspnea on exertion", "Chest tightness"],
      duration: "10 days",
      currentMedications: "Albuterol rescue inhaler, Vitamin D3",
      medicalHistory: "Mild seasonal asthma. No surgical history.",
      clinicalSummary: `### CLINICAL SOAP NOTE

**SUBJECTIVE (S):**
The patient is a 64-year-old female presenting with a 10-day history of dry, non-productive episodic cough, progressive chest tightness, and expiratory wheezing. Subjectively exacerbates during cool evenings. She reports using her Albuterol rescue inhaler 3 times in the past 48 hours, yielding only brief transient relief. Denies night sweats, high fever, or blood in sputum.

**OBJECTIVE (O):**
*Intake Vitals / Reported metrics:* BP: 122/78 mmHg. Respiratory rate is slightly elevated at 19/min. Ambient SpO2 97% on room air. Alert and fully responsive.

**ASSESSMENT (A):**
1. **Acute Bronchitis (suspected):** Episodic dry cough with wheezing in patient with baseline mild asthma.
2. **Asthma Exacerbation** secondary to seasonal environmental viral pathogens.

**PLAN (P):**
1. **Therapy:** Prescribed Budesonide/Formoterol maintenance inhaler for anti-inflammatory support. Refilled Albuterol.
2. **Follow-up:** Check back via telehealth in 5 days, or present to emergency facility immediately if experiencing respiratory distress or SpO2 drops below 92%.`
    },
    clinicalNotes: "EHR finalized. Sent prescription to local CVS Pharmacy #4210."
  },
  {
    id: "DOC-492104",
    patientName: "Marcus Aurelius",
    patientAge: "45",
    patientGender: "Male",
    chiefComplaint: "Acute right outer ankle strain with mild localized edema",
    timestamp: "1:40 PM",
    status: "pending",
    summary: {
      patientName: "Marcus Aurelius",
      patientAge: "45",
      patientGender: "Male",
      chiefComplaint: "Ankle strain after trip on stairs",
      symptoms: ["Lateral ankle tenderness", "Localized swelling/edema", "Pain on weight-bearing"],
      duration: "Yesterday morning",
      currentMedications: "Baby Aspirin 81mg, daily multivitamin",
      medicalHistory: "Controlled hyperlipidemia (atorvastatin 10mg). No prior ankle trauma.",
      clinicalSummary: `### CLINICAL SOAP NOTE

**SUBJECTIVE (S):**
The patient is a 45-year-old male presenting with acute lateral pain in the right ankle following an inversion injury yesterday. He states he missed the last step on a staircase. He reports immediate sharp pain and swelling, currently rated at 4/10 when resting, and 8/10 on attempted weight-bearing.

**OBJECTIVE (O):**
*Patient claims:* No open skin lesions. Visual bruising on the lateral malleolus. Complete range of motion limited solely by pain parameters.

**ASSESSMENT (A):**
1. **Right ankle inversion sprain (Grade I vs. II):** Tenderness concentrated over the anterior talofibular ligament (ATFL). Ottawa Ankle Rules are negative (no midfoot or malleolar bone-point tenderness).

**PLAN (P):**
1. **Conservative management:** Instructed on conservative R.I.C.E protocol (Rest, Ice, Compression with elastic bandage, Elevation of right limb).
2. **Symptom relief:** Take Ibuprofen 400mg every 6 hours as needed with meals.
3. **Diagnostics:** Ordered offline X-ray screening if weight bearing fails to improve within 72 hours.`
    }
  }
];

export default function DoctorPortal({ documents, selectedDocId, onSelectDoc, onUpdateDocStatus }: DoctorPortalProps) {
  const [typedNotes, setTypedNotes] = useState("");
  const [isSyncingToEHR, setIsSyncingToEHR] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  // Find currently active doc
  const activeDoc = documents.find(d => d.id === selectedDocId) || documents[0];

  const handleSignOff = () => {
    if (!activeDoc) return;
    onUpdateDocStatus(activeDoc.id, 'signed', typedNotes);
    setTypedNotes("");
  };

  const handleRefer = () => {
    if (!activeDoc) return;
    onUpdateDocStatus(activeDoc.id, 'referred', typedNotes);
    setTypedNotes("");
  };

  // Simulated epic/cerner synchronization protocol
  const triggerEHRSync = (ehrSystem: 'Epic' | 'Cerner' | 'athenahealth') => {
    if (!activeDoc) return;
    setIsSyncingToEHR(true);
    setSyncStatus(`Translating clinical nomenclature to FHIR HL7 models...`);
    
    setTimeout(() => {
      setSyncStatus(`Authenticating securely with HIPAA ${ehrSystem} Gateway...`);
      setTimeout(() => {
        setSyncStatus(`Document payload uploaded! Confirmation hash: TX-${Math.floor(Math.random() * 89999 + 10000)}`);
        setTimeout(() => {
          setIsSyncingToEHR(false);
          setSyncStatus(null);
          alert(`Successfully synced ${activeDoc.patientName}'s clinical chart note directly to your database into ${ehrSystem} integration.`);
        }, 1200);
      }, 1200);
    }, 1200);
  };

  const printDocumentSimulation = () => {
    window.print();
  };

  return (
    <div className="bg-slate-900 rounded-3xl border border-slate-850 p-6 flex flex-col h-full overflow-hidden text-slate-100 select-none shadow-xl">
      
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1 px-2.5 rounded-lg bg-blue-500/10 text-blue-400 text-xs font-bold font-mono tracking-wider border border-blue-500/20">
              CLINICIAN INTERFACE PORTAL
            </span>
            <div className="flex items-center gap-1 text-slate-400 text-xs font-medium">
              <Clock className="w-3.5 h-3.5" />
              <span>Shift Active</span>
            </div>
          </div>
          <h2 className="text-xl font-extrabold tracking-tight">DoctorScribe Workstation</h2>
          <p className="text-xs text-slate-400">Review AI Intake reports, sign off clinical SOAP summaries, and transmit directly to Epic/Cerner EHR.</p>
        </div>

        {/* Sync counters */}
        <div className="flex items-center gap-3">
          <div className="bg-slate-950/80 rounded-xl px-4 py-2 border border-slate-800 text-center">
            <div className="text-[10px] text-slate-400 font-bold block">PENDING REVIEW</div>
            <div className="text-lg font-black text-blue-400 animate-pulse">
              {documents.filter(d => d.status === 'pending').length}
            </div>
          </div>
          <div className="bg-slate-950/80 rounded-xl px-3.5 py-2 border border-slate-800 text-center">
            <div className="text-[10px] text-slate-400 font-bold block">SIGNED TODAY</div>
            <div className="text-lg font-black text-emerald-400">
              {documents.filter(d => d.status === 'signed').length}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 overflow-hidden pt-4">
        
        {/* LEFT COLUMN: Synced Patients Log (35%) */}
        <div className="lg:col-span-4 flex flex-col space-y-3 overflow-y-auto pr-1">
          <span className="text-[11px] font-bold text-slate-400 tracking-wider uppercase block pb-1">
            Incoming Mobile Intake Stream
          </span>
          
          <div className="space-y-2.5">
            {documents.length === 0 ? (
              <div className="p-8 text-center bg-slate-950/30 rounded-2xl border border-dashed border-slate-800 text-slate-500 flex flex-col items-center justify-center space-y-2">
                <ShieldAlert className="w-8 h-8 text-slate-700" />
                <span className="text-xs">No active intakes transmitted yet. Use the mobile app model on the left to start first.</span>
              </div>
            ) : (
              documents.map((doc) => {
                const isSelected = activeDoc?.id === doc.id;
                const isSentLive = !INITIAL_DOCTOR_DOCS.find(d => d.id === doc.id);
                return (
                  <motion.div
                    key={doc.id}
                    onClick={() => onSelectDoc(doc.id)}
                    whileHover={{ scale: 1.01 }}
                    className={`p-3.5 rounded-2xl cursor-pointer border transition-all relative ${
                      isSelected 
                        ? 'bg-blue-950/40 border-blue-500/80 shadow-md shadow-blue-500/5' 
                        : 'bg-slate-950/50 border-slate-850 hover:bg-slate-950 hover:border-slate-800'
                    }`}
                  >
                    {/* Live Highlight Tag */}
                    {isSentLive && doc.status === 'pending' && (
                      <span className="absolute -top-1.5 -right-1.5 bg-cyan-500 text-white font-extrabold text-[8px] py-0.5 px-2 rounded-full uppercase tracking-wider animate-bounce flex items-center gap-0.5">
                        <Cpu className="w-2.5 h-2.5" /> LIVE INTAKE
                      </span>
                    )}

                    <div className="flex items-center justify-between pb-1">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-xs font-bold text-slate-200">{doc.patientName}</span>
                      </div>
                      <span className="text-[9px] text-slate-500 font-mono">{doc.timestamp}</span>
                    </div>

                    <p className="text-[11px] text-slate-400 line-clamp-1 italic">
                      "{doc.chiefComplaint}"
                    </p>

                    <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-slate-900">
                      <span className="text-[9px] font-mono text-slate-500">{doc.id}</span>
                      
                      {/* Badge indicator */}
                      <div>
                        {doc.status === 'pending' ? (
                          <span className="text-[9px] bg-blue-900/40 text-blue-300 font-bold py-0.5 px-2 rounded-full border border-blue-800/30 flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" /> Queue Pending
                          </span>
                        ) : doc.status === 'signed' ? (
                          <span className="text-[9px] bg-emerald-950/60 text-emerald-300 font-bold py-0.5 px-2 rounded-full border border-emerald-900/30 flex items-center gap-1">
                            <CheckCircle className="w-2.5 h-2.5" /> Approved / EHR Final
                          </span>
                        ) : (
                          <span className="text-[9px] bg-amber-950/60 text-amber-300 font-bold py-0.5 px-2 rounded-full border border-amber-900/30 flex items-center gap-1">
                            <ArrowUpRight className="w-2.5 h-2.5" /> Referred Out
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Interactive Document detail panel (65%) */}
        <div className="lg:col-span-8 flex flex-col min-h-64 lg:h-full bg-slate-950 rounded-2xl border border-slate-850 overflow-hidden">
          {activeDoc ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              
              {/* Document Sub-Header bar */}
              <div className="bg-slate-900/70 p-4 border-b border-slate-850 flex items-center justify-between flex-wrap gap-2 text-xs">
                <div className="flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-cyan-400" />
                  <span className="font-mono text-[11px] font-bold tracking-wide text-slate-300">
                    DIAGNOSTIC WORKBENCH &bull; {activeDoc.id}
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="text-slate-400">File Age:</span>
                  <strong className="text-slate-200">Freshly Synced</strong>
                </div>
              </div>

              {/* Editable SOAP Report layout */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                
                {/* Alert Notification for Intake origin */}
                {(!INITIAL_DOCTOR_DOCS.find(d => d.id === activeDoc.id)) && (
                  <div className="p-3 rounded-xl bg-blue-950/35 border border-blue-900/50 flex gap-2.5">
                    <Cpu className="w-5 h-5 text-cyan-400 shrink-0" />
                    <div className="text-[11px] leading-relaxed text-blue-300 font-medium">
                      <strong>AI Scribe Event Stream:</strong> This intake document was completed via the patient's remote mobile intake app and automatically generated with Gemini's raw clinical SOAP analyzer.
                    </div>
                  </div>
                )}

                {/* Patient Primary Details Banner */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-900/50 border border-slate-850 text-xs">
                  <div>
                    <span className="text-slate-400 font-medium block">Patient Name</span>
                    <strong className="text-slate-100 font-bold">{activeDoc.patientName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">Age / Gender</span>
                    <strong className="text-slate-100 font-bold">{activeDoc.patientAge} years, {activeDoc.patientGender}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">Primary Complaint</span>
                    <strong className="text-slate-100 font-bold line-clamp-1">{activeDoc.chiefComplaint}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">Transmission</span>
                    <strong className="text-slate-100 font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Mobile Scribe ID
                    </strong>
                  </div>
                </div>

                {/* Core medical variables summary log */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-850 text-xs space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Intake Interview Checklist</span>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-slate-500 block font-bold">SYMPTOMS</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {activeDoc.summary.symptoms.map((s, index) => (
                            <span key={index} className="text-[9px] bg-slate-950 hover:bg-slate-900 text-slate-300 px-1.5 py-0.5 rounded border border-slate-800">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-500 block font-bold">DURATION</span>
                        <p className="text-slate-200 mt-1">{activeDoc.summary.duration}</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-850 text-xs space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Risk Variables & Baseline</span>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-slate-500 block font-bold">MEDS & ALLERGIES</span>
                        <p className="text-slate-200 mt-1 leading-tight line-clamp-2">{activeDoc.summary.currentMedications}</p>
                      </div>
                      <div>
                        <span className="text-slate-500 block font-bold">MEDICAL HISTORY</span>
                        <p className="text-slate-200 mt-1 leading-tight line-clamp-2">{activeDoc.summary.medicalHistory}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Displaying AI Generated Clinical SOAP Note content */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-400 tracking-wider block uppercase">
                    AI Clinical SOAP documentation
                  </span>
                  <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 font-mono text-xs leading-relaxed text-slate-300 whitespace-pre-wrap max-h-[300px] overflow-y-auto">
                    {activeDoc.summary.clinicalSummary}
                  </div>
                </div>

                {/* Doctor's Addendum Notes */}
                <div className="space-y-2 pt-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Physician Addendum / Clinical Review</span>
                  {activeDoc.status === 'signed' ? (
                    <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-900/35 text-xs">
                      <span className="text-[10px] font-bold text-emerald-400 uppercase block pb-1">Signed Doctor Note</span>
                      <p className="text-slate-200 italic">"{activeDoc.clinicalNotes || "Approved and finalized without secondary notes."}"</p>
                      <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold pt-2 mt-2 border-t border-emerald-900/30">
                        <Award className="w-4 h-4" />
                        <span>Electronically Signed by Clinician Workspace Scribe Protocol</span>
                      </div>
                    </div>
                  ) : activeDoc.status === 'referred' ? (
                    <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-900/35 text-xs">
                      <span className="text-[10px] font-bold text-amber-400 uppercase block pb-1">Refferal Outbox Instruction</span>
                      <p className="text-slate-200 italic">"{activeDoc.clinicalNotes || "Referred to secondary provider/hospital context."}"</p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <textarea
                        rows={2}
                        value={typedNotes}
                        onChange={(e) => setTypedNotes(e.target.value)}
                        placeholder="Add secondary physician notes, modify diagnosis plan prescriptions, or specify review alerts..."
                        className="w-full bg-slate-900 border border-slate-850 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-blue-500 placeholder-slate-650"
                      />
                    </div>
                  )}
                </div>

                {/* Synced Integrations panel */}
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-850 text-xs space-y-2.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Direct EHR Database Syncer</span>
                  <div className="flex flex-wrap gap-2">
                    <button 
                      onClick={() => triggerEHRSync('Epic')}
                      disabled={isSyncingToEHR}
                      className="py-1 px-3 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-[10px] text-slate-300 rounded font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Database className="w-3.5 h-3.5 text-orange-400" /> Integrate EHR (Epic)
                    </button>
                    <button 
                      onClick={() => triggerEHRSync('Cerner')}
                      disabled={isSyncingToEHR}
                      className="py-1 px-3 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-[10px] text-slate-300 rounded font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Database className="w-3.5 h-3.5 text-blue-400" /> Integrate EHR (Cerner)
                    </button>
                    <button 
                      onClick={printDocumentSimulation}
                      className="py-1 px-3 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-[10px] text-slate-300 rounded font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5 text-cyan-400" /> Save PDF / Print
                    </button>
                  </div>

                  {isSyncingToEHR && syncStatus && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="p-2.5 rounded bg-blue-950/40 border border-blue-900/60 font-mono text-[9px] text-blue-400 flex items-center gap-2"
                    >
                      <Cpu className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                      <span>{syncStatus}</span>
                    </motion.div>
                  )}
                </div>

              </div>

              {/* Detail Footer workstation primary actions */}
              {activeDoc.status === 'pending' && (
                <div className="p-4 bg-slate-900/80 border-t border-slate-850 flex items-center justify-end gap-3">
                  <button 
                    onClick={handleRefer}
                    className="py-2.5 px-4 bg-amber-950/30 border border-amber-900 hover:bg-amber-950/60 text-slate-200 font-semibold text-xs rounded-xl flex items-center gap-1 cursor-pointer"
                  >
                    Refer to Specialist
                  </button>
                  
                  <button 
                    onClick={handleSignOff}
                    className="py-2.5 px-5 bg-blue-600 hover:bg-blue-500 font-bold text-xs rounded-xl flex items-center gap-1 shadow-lg shadow-blue-500/10 cursor-pointer"
                  >
                    <ClipboardCheck className="w-4 h-4" /> Approved SOAP Note & Sign Off
                  </button>
                </div>
              )}

            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-center items-center p-8 text-center text-slate-500 space-y-2">
              <FileText className="w-12 h-12 text-slate-800" />
              <span>Select a patient intake document from the stream queue to inspect clinical files.</span>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
