export interface Message {
  id: string;
  sender: 'ai' | 'patient';
  text: string;
  timestamp: string;
  step?: number;
}

export interface IntakeSummary {
  patientName: string;
  patientAge: string;
  patientGender: string;
  chiefComplaint: string;
  symptoms: string[];
  duration: string;
  currentMedications: string;
  medicalHistory: string;
  clinicalSummary: string; // The parsed clinical SOAP note
  rawConversation?: string;
}

export type ScreeningStep = 
  | 'welcome' 
  | 'chat_complaint' 
  | 'chat_duration' 
  | 'chat_severity' 
  | 'chat_medications' 
  | 'chat_history' 
  | 'generating' 
  | 'summary';

export interface DoctorDocument {
  id: string;
  patientName: string;
  patientAge: string;
  patientGender: string;
  chiefComplaint: string;
  timestamp: string;
  status: 'pending' | 'signed' | 'referred';
  summary: IntakeSummary;
  clinicalNotes?: string;
  audioRecordingUrl?: string;
}
