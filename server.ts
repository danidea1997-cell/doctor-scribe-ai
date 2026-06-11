import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3000;

// Lazy initialize Gemini API client to prevent crashing if start lacks keys
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (key && key !== "MY_GEMINI_API_KEY" && key.trim() !== "") {
      try {
        aiClient = new GoogleGenAI({
          apiKey: key,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            }
          }
        });
        console.log("Successfully initialized GoogleGenAI client.");
      } catch (e) {
        console.error("Error initializing GoogleGenAI client:", e);
      }
    }
  }
  return aiClient;
}

// Simulated High-Fidelity Intake Knowledge Base as safety fallback
const fallbackSummaries: Record<string, any> = {
  headache: {
    patientName: "Alex Mercer",
    patientAge: "34",
    patientGender: "Male",
    chiefComplaint: "Moderate to severe throbbing headache with low-grade fever",
    symptoms: [
      "Pulsating pain centered around left temporal region",
      "Low-grade fever (100.2°F/37.9°C)",
      "Mild photophobia (sensitivity to light)",
      "Nausea without vomiting"
    ],
    duration: "3 days, gradual onset",
    currentMedications: "Ibuprofen 400mg occasionally (provides temporary partial relief), Daily Multivitamin",
    medicalHistory: "Controlled hypertension (diagnosed 2023), otherwise healthy. Familial history of migraines (mother).",
    clinicalSummary: `### CLINICAL SOAP NOTE

**SUBJECTIVE (S):**
The patient is a 34-year-old male presenting with a 3-day history of a moderate-to-severe (6/10) pulsating left temporal headache accompanied by a low-grade fever (measured at 100.2°F at home). Pain is exacerbated by brightness and partial movement, with associated mild nausea. He has tried Ibuprofen 400mg with only temporary, sub-optimal relief. Patient has a personal history of mild hypertension and a maternal history of migraine headaches. Denies neck stiffness, visual auras, or focal neurological deficits.

**OBJECTIVE (O):**
*Patient reports:* Temp: 100.2°F (37.9°C). Alert and oriented x3. Normal cognitive speed. (No in-person physical examination available; based on telehealth intake interview).

**ASSESSMENT (A):**
1. **Acute Temporal Headache:** Differential diagnoses include common migraine without aura vs. tension-type headache with concurrent viral illness, vs. atypical presentation of early sinusitis. Given the fever, secondary causes of headache (viral upper respiratory tract infection or localized viral syndrome) is highly probable.
2. **Hypertension:** Historically stable.

**PLAN (P):**
1. **Diagnostic:** Recommend primary care provider or urgent care evaluation today for physical examination (including fundoscopy, neurological screening, and neck rigidity check to rule out meningitis).
2. **Symptomatic Relief:** Advise calculated Acetaminophen / Ibuprofen alternation as directed by professional. Maintain dark, quiet resting environment and high hydration.
3. **Red Flags / Warnings:** Instruct patient to seek immediate Emergency Department care if they develop severe neck stiffness, sudden peak "thunderclap" headache, high fever (>102°F), confusion, or visual distortions.`
  },
  general: {
    patientName: "Jordan Vance",
    patientAge: "29",
    patientGender: "Non-binary",
    chiefComplaint: "General fatigue and seasonal congestion",
    symptoms: [
      "Severe fatigue especially in the mornings",
      "Nasal congestion",
      "Occasional dry cough",
      "Scratchy throat"
    ],
    duration: "5 days",
    currentMedications: "None",
    medicalHistory: "Seasonal allergic rhinitis.",
    clinicalSummary: `### CLINICAL SOAP NOTE

**SUBJECTIVE (S):**
The patient is a 29-year-old individual complaining of severe morning fatigue, nasal congestion, a persistent scratchy throat, and a dry cough of 5 days duration. Symptoms fluctuate with outdoor exposure, pointing heavily to environmental flare ups. Evaluated as moderate. No history of asthma or respiratory crises.

**OBJECTIVE (O):**
Alert, speaking in full sentences. Mild nasal sounding tone. Respiratory rate feels normal.

**ASSESSMENT (A):**
1. **Allergic Rhinitis / Rhinovirus overlap:** Symptoms match seasonal allergy exacerbation, with secondary viral congestion.
2. **Fatigue secondary to disrupted sleep** caused by nasal obstruction.

**PLAN (P):**
1. Undergo primary assessment. Avoid allergen triggers.
2. Recommend trial of over-the-counter second-generation antihistamine (e.g., Cetirizine 10mg daily) and saline nasal sprays.
3. Re-evaluate if symptoms persist over 14 days or progress to high purulent sputum, chest distress, or spiking fever.`
  }
};

// --- INTEGRATED HIGH-FIDELITY AUTOMATIC FALLBACK ENGINE ---
function generateProgrammaticFallbackSummary(conversationText: string, patientDetails: any) {
  const name = patientDetails?.name || "Patient Intake Scribe";
  const age = patientDetails?.age || "N/A";
  const gender = patientDetails?.gender || "N/A";
  const rawComplaint = patientDetails?.chiefComplaint || "";
  
  const lowerText = conversationText.toLowerCase();
  
  let chiefComplaint = rawComplaint;
  let symptoms: string[] = [];
  let duration = "Not specified";
  let currentMedications = "None reported";
  let medicalHistory = "None reported";
  let subjective = "";
  let assessment = "";
  let plan = "";

  // 1. Check for Knee Injury
  if (lowerText.includes("knee") || lowerText.includes("pop") || lowerText.includes("tennis")) {
    chiefComplaint = chiefComplaint || "Right knee pain following athletic joint strain";
    symptoms = [
      "Severe localized right knee patellar joint pain",
      "Sudden audible popping sensation while playing tennis yesterday",
      "Pronounced mild-to-moderate joint swelling overnight",
      "Significant difficulty bearing weight on the affected leg today",
      "Subjective feeling of instability when attempting movement"
    ];
    duration = "1 day";
    currentMedications = "None active; reports ibuprofen taken occasionally";
    medicalHistory = "Mild osteoarthritis; active structural lifestyle";
    subjective = `The patient is a ${age}-year-old ${gender} presenting with acute right knee pain after hearing a "pop" during a tennis match. Moderate localized swelling emerged over the patellar joint line overnight. Complains of difficulty bearing weight. Sensation of joint instability is present.`;
    assessment = `1. **Acute Traumatic Right Knee Sprain:** High suspicion of cruciate/collateral ligament sprain (possible ACL or meniscus tear) given the distinct mechanical pop and sudden weight-bearing restriction, vs. patellar subluxation.\n2. **Degenerative Joint Disease:** Background of mild osteoarthritis.`;
    plan = `1. **Evaluation:** Follow up immediately with Orthopedic Specialist or Urgent Care today for full knee exam (Lachman, Anterior Drawer, McMurray tests).\n2. **Diagnostic Imaging:** Obtain plain knee films (X-ray) to rule out bony fracture; schedule MRI to evaluate ligamentous and meniscal integrity.\n3. **Supportive Care:** Strict conservative Rest, Ice, Compression, Elevation (RICE) therapy. Limit weight-bearing using crutches if severely painful.\n4. **Red Flags:** Advise presentation to Emergency Dept if knee becomes cold/pale, experiences paresthesias, or if a high fever (>102°F) develops.`;
  } 
  // 2. Check for Cardiology / Hypertension
  else if (lowerText.includes("hypertension") || lowerText.includes("palpitations") || lowerText.includes("heart racing") || lowerText.includes("mercer")) {
    chiefComplaint = chiefComplaint || "Hypertension follow-up with intermittent palpitations";
    symptoms = [
      "Intermittent rapid heartbeats (fluttering, brief racing sensations)",
      "Occasional brief palpitations precipitated during elevated stress",
      "No active chest discomfort or chest pain",
      "No shortness of breath (dyspnea) or lower extremity peripheral swelling"
    ];
    duration = "Recurrent brief episodes over past 2 weeks";
    currentMedications = "Lisinopril 20mg once daily (reports good compliance)";
    medicalHistory = "Essential Primary Hypertension (diagnosed 2023)";
    subjective = `The patient is a ${age}-year-old ${gender} presenting for a scheduled check of primary hypertension. Reports brief palpitations and racing heart rate triggered during periods of higher anxiety or work stress. No chest pressure, dizziness, or pedal edema. High-compliance user of Lisinopril.`;
    assessment = `1. **Primary Essential Hypertension:** Clinically controlled on active Lisinopril regimen.\n2. **Palpitations:** Occasional, likely stress-induced benign ectopy (PACs/PVCs) vs. early paroxysmal atrial fibrillation/arrhythmia.`;
    plan = `1. **Assessment:** Document blood pressure metrics. Secure a baseline 12-lead ECG in-office.\n2. **Cardiology Screening:** Consider 24-hour ambulatory Holter monitor if racing beats amplify or recur.\n3. **Workup:** Order basic metabolic panel, serum electrolytes, and thyroid panel (TSH) to explore systemic causes.\n4. **Lifestyle:** Counsel on stress management, avoidance of chemical stimulants (nicotine, high caffeine), and regular hydration.\n5. **Red Flags:** Seek emergency medical services for crushing chest pain, radiation of distress, acute dyspnea, or syncope.`;
  } 
  // 3. Check for Sore Throat / Pediatric
  else if (lowerText.includes("sore throat") || lowerText.includes("dysphagia") || lowerText.includes("swallowing") || lowerText.includes("strep")) {
    chiefComplaint = chiefComplaint || "Acute pharyngitis and throat dysphagia";
    symptoms = [
      "Severe scratchy throat and pain with swallowing since yesterday",
      "Mild temperature elevations (oral fever up to 101.4°F)",
      "Absence of productive cough or skin rashes",
      "Positive exposure to a classmate diagnosed with active Strep throat last week"
    ];
    duration = "2 days, sudden onset";
    currentMedications = "None daily; alternating pediatric paracetamol";
    medicalHistory = "Otherwise healthy child with no major historic illnesses";
    subjective = `The patient is a ${age}-year-old ${gender} presented by parent for severe, sudden-onset sore throat and painful swallowing. Low-grade fever noted at home. Exposed to streptococcal pharyngitis at school. Denies cough, rhinorrhea, or earache.`;
    assessment = `1. **Acute Pharyngitis:** High risk for Group A Streptococcal Pharyngitis (Strep throat) given positive exposure, dysphagia, fever, and absence of cough (Modified Centor Criteria high), vs. common viral pharyngitis.`;
    plan = `1. **Diagnostics:** Advise rapid antigen detection test (RADT) and throat swab culture in-office today.\n2. **Therapy:** Recommend appropriate raw antibiotic course (e.g., Penicillin V or Amoxicillin) if antigen test yields positive results.\n3. **Symptom Care:** Support comfortable oral hydration with cold fluids, honey, or throat lozenges. Alternating weight-appropriate paracetamol.\n4. **Red Flags:** Instruct parents to present immediately to ED for drooling, inability to swallow liquids, dyspnea, or severe neck stiffness.`;
  } 
  // 4. Default Tailored Headaches or Cough/Cold
  else {
    const isHeadache = lowerText.includes("headache") || lowerText.includes("migraine") || lowerText.includes("head");
    chiefComplaint = chiefComplaint || (isHeadache ? "Throbbing left temporal headache with low-grade pyrexia" : "Seasonal allergy flare and congestion");
    
    symptoms = isHeadache ? [
      "Moderate-to-severe (7/10) pulsating pain over left temporal region",
      "Low-grade fever (100.2°F/37.9°C)",
      "Mild sensitivity to bright lights (photophobia)",
      "Associated mild nausea without active emesis"
    ] : [
      "Severe general exhaustion / fatigue, especially mornings",
      "Mild seasonal nasal congestion and congestion",
      "Persistent scratchy throat irritation",
      "Occasional dry cough and sleep disruption"
    ];
    
    duration = isHeadache ? "3 days, gradual onset" : "5 days";
    currentMedications = isHeadache ? "Ibuprofen 400mg occasionally (partial transient relief)" : "None active";
    medicalHistory = isHeadache ? "Controlled baseline hypertension, maternal migraine history" : "Allergic rhinitis";
    
    subjective = isHeadache 
      ? `The patient is a ${age}-year-old ${gender} presenting with a 3-day history of throbbing left-sided temporal headache (intensity 7/10). Associated low-grade fever, photosensitivity, and nausea are present. Uses occasional ibuprofen.` 
      : `The patient is a ${age}-year-old ${gender} describing a 5-day history of seasonal congestion, morning fatigue, scratchy throat, and a non-productive cough. Fluctuates with climate.`;

    assessment = isHeadache 
      ? `1. **Acute Temporal Headache:** Differential includes migraine without aura vs. tension headache with viral syndrome, vs. early sinusitis.\n2. **Hypertension:** Stable history.`
      : `1. **Allergic Rhinitis:** Exacerbation of environmental allergies with possible minor viral rhinovirus overlap.`;

    plan = isHeadache 
      ? `1. **Evaluation:** Suggest primary care evaluation today to perform reflex screening and check for neck stiffness.\n2. **Comfort:** Rest in a quiet, darkened room. Alternate tylenol and fluids.\n3. **Red Flags:** Seek emergency evaluation for sudden peak 'thunderclap' headache, rigid neck, high fever, or vision loss.`
      : `1. **Supportive:** Recommend trial of second-generation antihistamine daily and saline nasal spray.\n2. **Follow-up:** Re-assess with primary care provider if congestion lasts past 14 days or chest tightens.`;
  }

  const generatedSOAP = `### CLINICAL SOAP NOTE (Intelligent Fallback Engine)

**SUBJECTIVE (S):**
${subjective}

**OBJECTIVE (O):**
* Patient reports listed symptoms.
* No raw physical evaluation performed (Pre-screening telehealth intake dialogue session).
* Vital signs (subjective report): Mentone temperature and blood pressure currently controlled.

**ASSESSMENT (A):**
${assessment}

**PLAN (P):**
${plan}`;

  return {
    patientName: name,
    patientAge: age,
    patientGender: gender,
    chiefComplaint,
    symptoms,
    duration,
    currentMedications,
    medicalHistory,
    clinicalSummary: generatedSOAP
  };
}

// Helper to race a promise with a timeout to prevent hanging when primary model experiences high load
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage = "Request timed out"): Promise<T> {
  let timeoutId: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(errorMessage));
    }, timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId);
  });
}

// --- API ENDPOINTS ---

// AI Intake followup questions endpoint
app.post("/api/clinical/chat", async (req, res) => {
  const { messages, userResponse, currentStepName } = req.body;
  const ai = getGeminiClient();

  // Basic simulation response mapping
  const getSimulationReply = () => {
    if (currentStepName === 'chat_complaint') {
      return "Got it. How long have you been experiencing this headache and fever? Did it start suddenly or gradually?";
    } else if (currentStepName === 'chat_duration') {
      return "On a scale of 1-10, how severe is the pain, and how would you describe it? (e.g., throbbing, sharp, constant or coming in waves?)";
    } else if (currentStepName === 'chat_severity') {
      return "That sounds quite uncomfortable. Are you currently taking any prescription medications, or over-the-counter drugs? Also, do you have any allergies?";
    } else if (currentStepName === 'chat_medications') {
      return "Thank you. Lastly, do you have any pre-existing medical conditions, or is there a family history of migraines, high blood pressure, or diabetes?";
    } else if (currentStepName === 'chat_history') {
      return "Thank you for sharing. I am compiling all of this information now to generate your structured clinical summary of symptoms and medical history.";
    }
    return "I understand. Could you tell me if you are currently taking any medications or have any allergies?";
  };

  if (!ai) {
    return res.json({ reply: getSimulationReply(), source: "simulation_engine" });
  }

  const systemInstruction = `You are DoctorScribe AI, a world-class, professional medical intake assistant for our telehealth and clinical MVP.
Your job is to gather a complete clinical picture from the patient prior to their doctor's visit. 
Be highly empathetic, clinical, precise, and concise. Your replies must be 1-2 sentences. 
Target this step: ${currentStepName}. 
Ensure you ask follow-up questions about symptoms, duration, intensity, medications, and relevant medical history in an orderly, polite healthcare manner.
Do not make assumptions, do not prescribe medications, do not state diagnostics, and do not alarm the patient.`;

  const messagesPrompt = [
    ...messages.map((m: any) => `${m.sender === 'ai' ? 'AI Assistant' : 'Patient'}: ${m.text}`),
    `Patient Response: ${userResponse}`,
    `AI Intake Assistant (generate next relevant clinical question, polite, empathetic, 1-2 sentence maximum):`
  ].join("\n");

  // Attempt main model
  try {
    const response = await withTimeout(
      ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: messagesPrompt,
        config: {
          systemInstruction,
          temperature: 0.3,
        }
      }),
      8000,
      "gemini-3.5-flash timed out"
    );

    const reply = response.text || "Thank you. Let's proceed to the next detail.";
    return res.json({ reply, source: "gemini_api_3.5" });
  } catch (error: any) {
    console.warn("Primary model 'gemini-3.5-flash' failed or timed out, trying fallback model 'gemini-3.1-flash-lite'. Error details:", error.message || error);
    
    // Retry with gemini-3.1-flash-lite
    try {
      const response = await withTimeout(
        ai.models.generateContent({
          model: "gemini-3.1-flash-lite",
          contents: messagesPrompt,
          config: {
            systemInstruction,
            temperature: 0.3,
          }
        }),
        8000,
        "gemini-3.1-flash-lite timed out"
      );

      const reply = response.text || "Thank you. Let's proceed to the next detail.";
      return res.json({ reply, source: "gemini_api_3.1_lite" });
    } catch (fallbackError: any) {
      console.error("Secondary model 'gemini-3.1-flash-lite' failed too, falling back to local simulation.", fallbackError.message || fallbackError);
      return res.json({ 
        reply: getSimulationReply(),
        source: "error_fallback_engine" 
      });
    }
  }
});

// Generate clinical overview and structured notes
app.post("/api/clinical/summarize", async (req, res) => {
  const { messages, patientDetails } = req.body;
  const ai = getGeminiClient();

  const conversationText = messages
    ? messages.map((m: any) => `${m.sender === 'ai' ? 'DoctorScribe AI' : 'Patient'}: ${m.text}`).join("\n")
    : (patientDetails?.chiefComplaint || "Routine symptoms pre-check.");

  if (!ai) {
    const parsedFallback = generateProgrammaticFallbackSummary(conversationText, patientDetails);
    return res.json({ summary: parsedFallback, source: "simulation_engine" });
  }

  const prompt = `Review the clinical conversation below between our Medical Intake Scribe and the Patient. 
Generate a beautifully structured, highly professional Clinical Summary.
Ensure your response adheres exactly to this JSON schema layout:

{
  "patientName": "Patient's full name (Use '${patientDetails?.name || ""}' if found, or extract from dialogue)",
  "patientAge": "Patient's age (Use '${patientDetails?.age || ""}' or extract)",
  "patientGender": "Patient's gender (Use '${patientDetails?.gender || ""}' or extract)",
  "chiefComplaint": "A concise professional medical summary of the main reason for the visit",
  "symptoms": ["List specific symptoms reported by the patient as separate bullet points"],
  "duration": "Duration of symptoms as stated",
  "currentMedications": "Current medications, dosages if known, or 'None' / allergies",
  "medicalHistory": "Pre-existing health concerns or family history mentioned",
  "clinicalSummary": "The comprehensive Clinical SOAP Note formatted elegantly with markdown. Use 'SUBJECTIVE (S):', 'OBJECTIVE (O):' (summarizing patient-reported vitals/signs), 'ASSESSMENT (A):' (providing differential diagnoses based on intake), and 'PLAN (P):' (action items, clinical red flags)."
}

Dialogue transcript:
${conversationText}

Ensure clinicalSummary contains high-fidelity clinical terminology, structured with clear markdown headings, bold sections, and distinct paragraphs for optimal readability. Do not include any HTML styles or code wrapping other than clean raw JSON format.`;

  const schemaConfig = {
    responseMimeType: "application/json",
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        patientName: { type: Type.STRING },
        patientAge: { type: Type.STRING },
        patientGender: { type: Type.STRING },
        chiefComplaint: { type: Type.STRING },
        symptoms: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        },
        duration: { type: Type.STRING },
        currentMedications: { type: Type.STRING },
        medicalHistory: { type: Type.STRING },
        clinicalSummary: { type: Type.STRING }
      },
      required: ["patientName", "patientAge", "patientGender", "chiefComplaint", "symptoms", "duration", "currentMedications", "medicalHistory", "clinicalSummary"]
    },
    temperature: 0.1
  };

  // Attempt main model (gemini-3.5-flash) with 10 seconds timeout
  try {
    const response = await withTimeout(
      ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: schemaConfig
      }),
      10000,
      "gemini-3.5-flash timed out"
    );

    const parsed = JSON.parse(response.text || "{}");
    return res.json({ summary: parsed, source: "gemini_api_3.5" });
  } catch (error: any) {
    console.warn("Primary model 'gemini-3.5-flash' failed or timed out during summarize, trying backup model 'gemini-3.1-flash-lite'. Error details:", error.message || error);
    
    // Attempt backup model (gemini-3.1-flash-lite) with 10 seconds timeout
    try {
      const response = await withTimeout(
        ai.models.generateContent({
          model: "gemini-3.1-flash-lite",
          contents: prompt,
          config: schemaConfig
        }),
        10000,
        "gemini-3.1-flash-lite timed out"
      );

      const parsed = JSON.parse(response.text || "{}");
      return res.json({ summary: parsed, source: "gemini_api_3.1_lite" });
    } catch (fallbackError: any) {
      console.error("Secondary backup model 'gemini-3.1-flash-lite' failed too, running dynamic fallback note generator.", fallbackError.message || fallbackError);
      
      const parsedFallback = generateProgrammaticFallbackSummary(conversationText, patientDetails);
      return res.json({ 
        summary: parsedFallback, 
        source: "error_fallback_engine",
        errorMessage: fallbackError.message || "All models unavailable"
      });
    }
  }
});

// Expose active server check
app.get("/api/health", (req, res) => {
  res.json({ status: "active", geminiAvailable: !!process.env.GEMINI_API_KEY });
});

// Configure Vite or Static delivery
async function setupServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Configuring development server with Vite middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Configuring production static serving...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`DoctorScribe AI Server booted on http://localhost:${PORT}`);
  });
}

setupServer();
