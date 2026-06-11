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
  ClipboardCheck,
  Award,
  ChevronRight,
  ShieldAlert,
  Copy,
  Download,
  Check
} from "lucide-react";
import { DoctorDocument } from "../types";
import { jsPDF } from "jspdf";

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
      chiefComplaint: "Persistent wheezing and dry cough",
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
  const [isCopied, setIsCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

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

  // Copy full intake clinical documentation to clipboard
  const handleCopySummary = async () => {
    if (!activeDoc) return;
    const formattedText = `DOCTORSCRIBE AI - CLINICAL INTAKE SUMMARY
=============================================
Document ID: ${activeDoc.id}
Generated: ${activeDoc.timestamp}

PATIENT DEMOGRAPHICS
Name: ${activeDoc.patientName}
Age / Gender: ${activeDoc.patientAge} years / ${activeDoc.patientGender}

INTAKE INTERVIEW HIGHLIGHTS
Chief Complaint: ${activeDoc.chiefComplaint}
Symptoms Identified: ${(activeDoc.summary.symptoms || []).join(", ") || "None declared"}
Duration of Symptoms: ${activeDoc.summary.duration || "N/A"}
Current Medications & Allergies: ${activeDoc.summary.currentMedications || "None"}
Medical & Family History: ${activeDoc.summary.medicalHistory || "None"}

STRUCTURED CLINICAL SOAP REPORT
---------------------------------------------
${activeDoc.summary.clinicalSummary}

${activeDoc.clinicalNotes ? `\nPHYSICIAN SIGN-OFF ADDENDUM\n------------------\n${activeDoc.clinicalNotes}` : ""}

=============================================
DISCLAIMER: This tool assists with patient intake and medical documentation only and does not provide diagnosis or treatment recommendations. The attending clinician is legally responsible for verifying all facts prior to care selection.`;

    try {
      await navigator.clipboard.writeText(formattedText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy to clipboard", err);
    }
  };

  // Generate and download formal clinicial PDF
  const handleDownloadPDF = () => {
    if (!activeDoc) return;
    setIsDownloading(true);

    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      let y = 15;
      const margin = 15;
      const width = 210 - (margin * 2);

      const addText = (text: string, size = 10, isBold = false, color = [15, 23, 42], gap = 5) => {
        doc.setFont("helvetica", isBold ? "bold" : "normal");
        doc.setFontSize(size);
        doc.setTextColor(color[0], color[1], color[2]);
        const lines = doc.splitTextToSize(text, width);
        doc.text(lines, margin, y);
        y += (lines.length * (size * 0.35)) + gap;
      };

      // Header top accent line
      doc.setFillColor(79, 70, 229); // indigo-600
      doc.rect(0, 0, 210, 6, "F");

      y += 5;

      // Primary Title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.setTextColor(30, 41, 59); // slate-800
      doc.text("DoctorScribe AI", margin, y);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139); // slate-500
      doc.text("ELECTRONIC HEALTH RECORDS COMPANION", margin + 115, y - 1);
      y += 8;

      // Doc description
      addText(`Clinical Intake & Medical Documentation Summary`, 11, true, [79, 70, 229], 3);
      addText(`EHR Queue ID: ${activeDoc.id} | Transmission: Synced Telehealth Intake | Stamp: Yesterday / Live`, 8.5, false, [100, 116, 139], 6);

      // Line divider
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, y, 210 - margin, y);
      y += 8;

      // Patient Demographics Row Table Box
      doc.setFillColor(248, 250, 252); // slate-50 background text
      doc.rect(margin, y, width, 32, "F");
      doc.rect(margin, y, width, 32, "S");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85);
      doc.text("PATIENT DISCLOSURE & DEMOGRAPHICS CARD", margin + 4, y + 6);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(9.5);
      doc.text(`Patient Name:  ${activeDoc.patientName}`, margin + 4, y + 13);
      doc.text(`Age / Gender:  ${activeDoc.patientAge} years / ${activeDoc.patientGender}`, margin + 4, y + 19);
      doc.text(`Phone Callback:  555-0199 (Verified)`, margin + 4, y + 25);
      
      doc.text(`Chief Complaint:  ${activeDoc.chiefComplaint}`, margin + width/2, y + 13);
      doc.text(`EHR Connection:  Epic Cloud Synced (Pass)`, margin + width/2, y + 19);
      doc.text(`Status Category:  Intake Queue Verified`, margin + width/2, y + 25);

      y += 40;

      // Part 1: Gathered Variables
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(79, 70, 229);
      doc.text("1. CLINICAL SYMPTOMS & HISTORY GATHERED", margin, y);
      y += 6;

      addText(`Reported Symptoms: ${(activeDoc.summary.symptoms || []).join(", ") || "None"}`, 9.5, false, [15, 23, 42], 4);
      addText(`Duration of Symptoms: ${activeDoc.summary.duration || "N/A"}`, 9.5, false, [15, 23, 42], 4);
      addText(`Current Medications & Allergies: ${activeDoc.summary.currentMedications || "None declared"}`, 9.5, false, [15, 23, 42], 4);
      addText(`Medical & Family History: ${activeDoc.summary.medicalHistory || "None declared"}`, 9.5, false, [15, 23, 42], 8);

      // Part 2: Structured SOAP
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(79, 70, 229);
      doc.text("2. GENERATED STRUCTURED CLINICAL DOCUMENTATION", margin, y);
      y += 6;

      const soapNoteText = activeDoc.summary.clinicalSummary || "No documentation generated.";
      const linesArray = soapNoteText.split("\n");

      linesArray.forEach(line => {
        if (y > 270) {
          doc.addPage();
          doc.setFillColor(79, 70, 229);
          doc.rect(0, 0, 210, 6, "F");
          y = 20;
        }

        const isHeader = line.startsWith("#") || line.startsWith("###") || line.startsWith("**SUBJECTIVE") || line.startsWith("**OBJECTIVE") || line.startsWith("**ASSESSMENT") || line.startsWith("**PLAN");
        if (isHeader) {
          addText(line.replace(/[\*#]/g, "").trim(), 9.5, true, [30, 41, 59], 3.5);
        } else {
          addText(line.replace(/[\*]/g, "").trim(), 9, false, [15, 23, 42], 3);
        }
      });

      y += 6;

      // Part 3: Clinician Addendum if signed
      if (activeDoc.clinicalNotes) {
        if (y > 250) {
          doc.addPage();
          doc.setFillColor(79, 70, 229);
          doc.rect(0, 0, 210, 6, "F");
          y = 20;
        }
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(79, 70, 229);
        doc.text("3. PHYSICIAN REVIEW & STATUS PROGRESSION", margin, y);
        y += 6;
        addText(`Status: Signature Logged (${activeDoc.status.toUpperCase()})`, 9.5, true, [16, 185, 129], 3.5);
        addText(`Attending Notes: ${activeDoc.clinicalNotes}`, 9, false, [15, 23, 42], 8);
      }

      // Legal clinical disclaimer warning
      if (y > 255) {
        doc.addPage();
        doc.setFillColor(79, 70, 229);
        doc.rect(0, 0, 210, 6, "F");
        y = 20;
      }

      doc.setDrawColor(254, 226, 226); // red-100
      doc.setFillColor(254, 242, 242); // red-50
      doc.rect(margin, y, width, 18, "F");
      doc.rect(margin, y, width, 18, "S");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(185, 28, 28);
      doc.text("IMPORTANT CLINICAL INTELLIGENCE DISCLAIMER", margin + 3, y + 5);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(153, 27, 27);
      const disText = "This tool assists with patient intake and medical documentation only and does not provide diagnosis or treatment recommendations.";
      const disLines = doc.splitTextToSize(disText, width - 6);
      doc.text(disLines, margin + 3, y + 9);

      // Page footer print
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text("Created with DoctorScribe AI workspace companion. Subject to administrative health safety protocols.", margin, 286);

      doc.save(`DoctorScribe_Intake_${activeDoc.patientName.replace(/\s+/g, "_")}.pdf`);
    } catch (err) {
      console.error("PDF generation failure", err);
    } finally {
      setIsDownloading(false);
    }
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

  return (
    <div id="doctor-workstation-panel" className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col h-full overflow-hidden text-slate-800 shadow-sm select-none">
      
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1 px-2.5 rounded bg-indigo-50 text-indigo-700 text-[10px] font-bold font-sans tracking-wide border border-indigo-100 uppercase">
              Clinician Workspace Suite
            </span>
            <div className="flex items-center gap-1 text-slate-500 text-xs font-semibold">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Attending Shift Active</span>
            </div>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">DoctorScribe EHR Workstation</h2>
          <p className="text-xs text-slate-550">Review telehealth check-ins, approve structured SOAP logs, and export securely to the hospital's central database.</p>
        </div>

        {/* Sync counters */}
        <div className="flex items-center gap-3">
          <div className="bg-slate-50 rounded-xl px-4 py-2 border border-slate-200 text-center">
            <div className="text-[10px] text-slate-500 font-bold block">PENDING INTAKES</div>
            <div className="text-lg font-extrabold text-indigo-600 animate-pulse">
              {documents.filter(d => d.status === 'pending').length}
            </div>
          </div>
          <div className="bg-slate-50 rounded-xl px-3.5 py-2 border border-slate-200 text-center">
            <div className="text-[10px] text-slate-500 font-bold block">SIGNED TODAY</div>
            <div className="text-lg font-extrabold text-emerald-600">
              {documents.filter(d => d.status === 'signed').length}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 overflow-hidden pt-4">
        
        {/* LEFT COLUMN: Synced Patients Log (35%) */}
        <div className="lg:col-span-4 flex flex-col space-y-3 overflow-y-auto pr-1">
          <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase block pb-1">
            Active Digital Intake Live Queue
          </span>
          
          <div className="space-y-2.5">
            {documents.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 flex flex-col items-center justify-center space-y-2">
                <ShieldAlert className="w-8 h-8 text-slate-300" />
                <span className="text-xs">No active intakes transmitted yet. Enter details inside the simulator to initiate.</span>
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
                    className={`p-3.5 rounded-xl cursor-pointer border transition-all relative ${
                      isSelected 
                        ? 'bg-indigo-50/70 border-indigo-300 shadow-sm' 
                        : 'bg-slate-50/50 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    {/* Live Highlight Tag */}
                    {isSentLive && doc.status === 'pending' && (
                      <span className="absolute -top-1.5 -right-1.5 bg-indigo-600 text-white font-bold text-[8px] py-0.5 px-2 rounded-full uppercase tracking-wider animate-bounce flex items-center gap-0.5">
                        <Cpu className="w-2.5 h-2.5" /> LIVE STREAM
                      </span>
                    )}

                    <div className="flex items-center justify-between pb-1">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-[12px] font-bold text-slate-800">{doc.patientName}</span>
                      </div>
                      <span className="text-[9px] text-slate-500 font-mono font-semibold">{doc.timestamp}</span>
                    </div>

                    <p className="text-[11px] text-slate-500 line-clamp-1 italic">
                      "{doc.chiefComplaint}"
                    </p>

                    <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-100">
                      <span className="text-[9px] font-mono font-medium text-slate-400">{doc.id}</span>
                      
                      {/* Badge indicator */}
                      <div>
                        {doc.status === 'pending' ? (
                          <span className="text-[8px] bg-amber-50 text-amber-700 font-bold py-0.5 px-2 rounded-full border border-amber-200 flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" /> Queue Pending
                          </span>
                        ) : doc.status === 'signed' ? (
                          <span className="text-[8px] bg-emerald-50 text-emerald-700 font-bold py-0.5 px-2 rounded-full border border-emerald-200 flex items-center gap-1">
                            <CheckCircle className="w-2.5 h-2.5" /> Signed & EHR Verified
                          </span>
                        ) : (
                          <span className="text-[8px] bg-slate-105 text-slate-600 font-bold py-0.5 px-2 rounded-full border border-slate-200 flex items-center gap-1">
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
        <div className="lg:col-span-8 flex flex-col min-h-64 lg:h-full bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
          {activeDoc ? (
            <div className="flex-1 flex flex-col overflow-hidden bg-white">
              
              {/* Document Sub-Header bar */}
              <div className="bg-slate-50 p-4 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2 text-xs">
                <div className="flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  <span className="font-sans text-[11px] font-bold tracking-wide text-slate-700">
                    DIAGNOSTIC CASE RECORDER &bull; {activeDoc.id}
                  </span>
                </div>
                <div className="flex items-center space-x-1 text-slate-500 font-semibold">
                  <span>File State:</span>
                  <strong className="text-slate-700 font-bold">Active Demographics</strong>
                </div>
              </div>

              {/* Editable SOAP Report layout */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                
                {/* Alert Notification for Intake or live origin */}
                {(!INITIAL_DOCTOR_DOCS.find(d => d.id === activeDoc.id)) && (
                  <div className="p-3 rounded-lg bg-indigo-50/70 border border-indigo-100 flex gap-2.5">
                    <Cpu className="w-5 h-5 text-indigo-600 shrink-0" />
                    <div className="text-[11px] leading-relaxed text-indigo-900 font-medium">
                      <strong>Digital Stream Registered:</strong> This record was processed from the Patient-End Check-In Screen with a HIPAA-isolated telemetry handshake.
                    </div>
                  </div>
                )}

                {/* Patient Primary Details Banner */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <div>
                    <span className="text-slate-500 font-semibold block">Patient Name</span>
                    <strong className="text-slate-800 font-bold">{activeDoc.patientName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 font-semibold block">Age / Gender</span>
                    <strong className="text-slate-800 font-bold">{activeDoc.patientAge} years, {activeDoc.patientGender}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 font-semibold block">Primary Complaint</span>
                    <strong className="text-slate-800 font-bold line-clamp-1">{activeDoc.chiefComplaint}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 font-semibold block">EHR Verification</span>
                    <strong className="text-slate-800 font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active Health ID
                    </strong>
                  </div>
                </div>

                {/* Core medical variables summary log: 8 Required Fields shown elegantly */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Variables Frame 1: Symptoms and Duration */}
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                    <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wide block border-b border-indigo-100/60 pb-1">
                      1. Symptoms & Course Timeline
                    </span>
                    <div className="space-y-1.5 text-[11px]">
                      <div>
                        <span className="text-slate-500 font-bold block">RECOGNIZED SYMPTOMS:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {activeDoc.summary.symptoms.map((s, index) => (
                            <span key={index} className="text-[10px] bg-white text-slate-700 px-2 py-0.5 rounded border border-slate-200 font-medium">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="pt-1">
                        <span className="text-slate-500 font-bold block">DURATION OF SYMPTOMS:</span>
                        <p className="text-slate-700 font-medium mt-0.5">{activeDoc.summary.duration}</p>
                      </div>
                    </div>
                  </div>

                  {/* Variables Frame 2: Medications & Clinical History */}
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                    <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wide block border-b border-indigo-100/60 pb-1">
                      2. Medications & Medical History
                    </span>
                    <div className="space-y-1.5 text-[11px]">
                      <div>
                        <span className="text-slate-500 font-bold block">CURRENT MEDICATIONS & ALLERGIES:</span>
                        <p className="text-slate-755 font-medium mt-0.5 leading-tight">{activeDoc.summary.currentMedications || "None declared"}</p>
                      </div>
                      <div>
                        <span className="text-slate-500 font-bold block">MEDICAL / FAMILY HISTORY:</span>
                        <p className="text-slate-755 font-medium mt-0.5 leading-tight">{activeDoc.summary.medicalHistory || "No pre-existing history registered"}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Displaying AI Generated Clinical SOAP Note content */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 tracking-wider block uppercase">
                      Clinician SOAP Note Output
                    </span>
                    
                    {/* ENHANCEMENTS: Copy & Download tools inside Doctor Workstation details */}
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={handleCopySummary}
                        className={`py-1 px-2.5 rounded text-[10px] font-bold flex items-center gap-1 shadow-sm transition-all border ${
                          isCopied 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                            : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 cursor-pointer'
                        }`}
                      >
                        {isCopied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-slate-500" />}
                        <span>{isCopied ? "Copied Summary!" : "Copy Summary Text"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleDownloadPDF}
                        disabled={isDownloading}
                        className="py-1 px-2.5 rounded bg-white hover:bg-slate-50 text-slate-700 font-bold text-[10px] flex items-center gap-1 shadow-sm border border-slate-200 cursor-pointer"
                      >
                        {isDownloading ? (
                          <div className="w-3 h-3 rounded-full border border-dashed border-slate-500 animate-spin" />
                        ) : (
                          <Download className="w-3 h-3 text-slate-500" />
                        )}
                        <span>Download Clinical PDF</span>
                      </button>
                    </div>
                  </div>

                  {/* SOAP report visual page layout */}
                  <div className="p-4.5 bg-slate-50 rounded-xl border border-slate-200 font-mono text-[11.5px] leading-relaxed text-slate-700 whitespace-pre-wrap max-h-[350px] overflow-y-auto">
                    {activeDoc.summary.clinicalSummary}
                  </div>
                </div>

                {/* Patient Safety Warning Disclaimer */}
                <div className="p-3.5 rounded-lg bg-red-50 border border-red-100 flex gap-2 w-full">
                  <ShieldAlert className="w-4.5 h-4.5 text-red-600 shrink-0 mt-0.5" />
                  <div className="text-[10.5px] text-red-800 leading-relaxed font-medium">
                    <strong className="block font-bold pb-0.5 uppercase tracking-wide">Patient Safety & Diagnostic Disclaimer</strong>
                    This tool assists with patient intake and medical documentation only and does not provide diagnosis or treatment recommendations. The attending clinician assumes full diagnostic legal responsibilities.
                  </div>
                </div>

                {/* Doctor's Addendum Notes */}
                <div className="space-y-2 pt-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Physician Custom Addendum / Directives</span>
                  {activeDoc.status === 'signed' ? (
                    <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-100 text-xs">
                      <span className="text-[10px] font-bold text-emerald-700 uppercase block pb-1">ELECTRONICALLY SIGNED ADDENDUM</span>
                      <p className="text-slate-700 italic font-medium">"{activeDoc.clinicalNotes || "Approved and finalized without secondary notes."}"</p>
                      <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-bold pt-2 mt-2 border-t border-emerald-100">
                        <Award className="w-4 h-4 text-emerald-600" />
                        <span>Electronically Signed by Clinician Digital Scribe Protocol</span>
                      </div>
                    </div>
                  ) : activeDoc.status === 'referred' ? (
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                      <span className="text-[10px] font-bold text-slate-600 uppercase block pb-1">REFERRED RECORD SENT OUT</span>
                      <p className="text-slate-700 italic font-medium">"{activeDoc.clinicalNotes || "Referred to secondary specialist."}"</p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <textarea
                        rows={2}
                        value={typedNotes}
                        onChange={(e) => setTypedNotes(e.target.value)}
                        placeholder="Add secondary physician notes, modify care pathways, or insert referral notes prior to final signoff..."
                        className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 placeholder-slate-400"
                      />
                    </div>
                  )}
                </div>

                {/* Synced EHR Integrations panel */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2.5">
                  <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wide block">Direct Hospital EHR Synchronizer</span>
                  <div className="flex flex-wrap gap-2">
                    <button 
                      onClick={() => triggerEHRSync('Epic')}
                      disabled={isSyncingToEHR}
                      className="py-1 px-3 bg-white hover:bg-slate-50 border border-slate-200 text-[10px] text-slate-600 rounded font-semibold flex items-center gap-1 shadow-xs cursor-pointer"
                    >
                      <Database className="w-3.5 h-3.5 text-orange-500" /> Transmit EHR (Epic)
                    </button>
                    <button 
                      onClick={() => triggerEHRSync('Cerner')}
                      disabled={isSyncingToEHR}
                      className="py-1 px-3 bg-white hover:bg-slate-50 border border-slate-200 text-[10px] text-slate-600 rounded font-semibold flex items-center gap-1 shadow-xs cursor-pointer"
                    >
                      <Database className="w-3.5 h-3.5 text-blue-500" /> Transmit EHR (Cerner)
                    </button>
                    <button 
                      onClick={handleDownloadPDF}
                      className="py-1 px-3 bg-white hover:bg-slate-50 border border-slate-200 text-[10px] text-slate-600 rounded font-semibold flex items-center gap-1 shadow-xs cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5 text-indigo-500" /> Print / Save PDF Copy
                    </button>
                  </div>

                  {isSyncingToEHR && syncStatus && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="p-2.5 rounded bg-indigo-50 border border-indigo-100 font-mono text-[9px] text-indigo-700 flex items-center gap-2"
                    >
                      <Cpu className="w-3.5 h-3.5 text-indigo-600 animate-spin" />
                      <span>{syncStatus}</span>
                    </motion.div>
                  )}
                </div>

              </div>

              {/* Detail Footer workstation primary actions */}
              {activeDoc.status === 'pending' && (
                <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
                  <button 
                    onClick={handleRefer}
                    className="py-2.5 px-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold text-xs rounded-xl flex items-center gap-1 cursor-pointer"
                  >
                    Flag for Referral
                  </button>
                  
                  <button 
                    onClick={handleSignOff}
                    className="py-2.5 px-5 bg-indigo-600 hover:bg-indigo-500 font-bold text-xs text-white rounded-xl flex items-center gap-1 shadow-sm hover:shadow active:scale-98 transition-all cursor-pointer"
                  >
                    <ClipboardCheck className="w-4 h-4 text-indigo-100" /> Sign Off SOAP Documentation & Finalize
                  </button>
                </div>
              )}

            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-center items-center p-8 text-center text-slate-400 space-y-2">
              <FileText className="w-12 h-12 text-slate-200" />
              <span>Select an intake record from the live queue stream to initiate.</span>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
