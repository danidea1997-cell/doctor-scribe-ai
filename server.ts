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

// --- API ENDPOINTS ---

// AI Intake followup questions endpoint
app.post("/api/clinical/chat", async (req, res) => {
  const { messages, userResponse, currentStepName } = req.body;
  const ai = getGeminiClient();

  if (!ai) {
    // Elegant fallback simulation responses based on consultation phase if Gemini is not set up
    let reply = "I understand. Could you tell me if you are currently taking any medications or have any allergies?";
    if (currentStepName === 'chat_complaint') {
      reply = "Got it. How long have you been experiencing this headache and fever? Did it start suddenly or gradually?";
    } else if (currentStepName === 'chat_duration') {
      reply = "On a scale of 1-10, how severe is the pain, and how would you describe it? (e.g., throbbing, sharp, constant or coming in waves?)";
    } else if (currentStepName === 'chat_severity') {
      reply = "That sounds quite uncomfortable. Are you currently taking any prescription medications, or over-the-counter drugs? Also, do you have any allergies?";
    } else if (currentStepName === 'chat_medications') {
      reply = "Thank you. Lastly, do you have any pre-existing medical conditions, or is there a family history of migraines, high blood pressure, or diabetes?";
    } else if (currentStepName === 'chat_history') {
      reply = "Thank you for sharing. I am compiling all of this information now to generate your structured clinical summary of symptoms and medical history.";
    }
    return res.json({ reply, source: "simulation_engine" });
  }

  try {
    const chatHistory = messages.map((m: any) => ({
      role: m.sender === 'ai' ? 'user' : 'model', // inverted to represent standard chat format correctly
      parts: [{ text: m.text }]
    }));

    // Add prompt instructions
    const systemInstruction = `You are DoctorScribe AI, a world-class, professional medical intake assistant for our telehealth and clinical MVP.
Your job is to gather a complete clinical picture from the patient prior to their doctor's visit. 
Be highly empathetic, clinical, precise, and concise. Your replies must be 1-2 sentences. 
Target this step: ${currentStepName}. 
Ensure you ask follow-up questions about symptoms, duration, intensity, medications, and relevant medical history in an orderly, polite healthcare manner.
Do not make assumptions, do not prescribe medications, do not state diagnostics, and do not alarm the patient.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        ...messages.map((m: any) => `${m.sender === 'ai' ? 'AI Assistant' : 'Patient'}: ${m.text}`),
        `Patient Response: ${userResponse}`,
        `AI Intake Assistant (generate next relevant clinical question, polite, empathetic, 1-2 sentence maximum):`
      ].join("\n"),
      config: {
        systemInstruction,
        temperature: 0.3,
      }
    });

    const reply = response.text || "Thank you. Let's proceed to the next detail.";
    return res.json({ reply, source: "gemini_api" });
  } catch (error: any) {
    console.error("Gemini Chat API Error:", error);
    return res.json({ 
      reply: "Thank you for that information. Let's capture your medication details and active allergies now.",
      source: "error_fallback_engine" 
    });
  }
});

// Generate clinical overview and structured notes
app.post("/api/clinical/summarize", async (req, res) => {
  const { messages, patientDetails } = req.body;
  const ai = getGeminiClient();

  const conversationText = messages
    ? messages.map((m: any) => `${m.sender === 'ai' ? 'DoctorScribe AI' : 'Patient'}: ${m.text}`).join("\n")
    : "Headache, low-grade fever.";

  // Determine key complaint to tailor mock matching
  const hasHeadache = conversationText.toLowerCase().includes("headache") || (patientDetails?.chiefComplaint || "").toLowerCase().includes("head");
  const fallbackKey = hasHeadache ? "headache" : "general";
  const defaultFallback = fallbackSummaries[fallbackKey];

  if (!ai) {
    // Generate simulated note customized to whatever they typed or provided
    const name = patientDetails?.name || defaultFallback.patientName;
    const age = patientDetails?.age || defaultFallback.patientAge;
    const gender = patientDetails?.gender || defaultFallback.patientGender;
    
    // Customize base response with entered detail
    const customized = {
      ...defaultFallback,
      patientName: name,
      patientAge: age,
      patientGender: gender,
      chiefComplaint: patientDetails?.chiefComplaint || defaultFallback.chiefComplaint,
    };
    return res.json({ summary: customized, source: "simulation_engine" });
  }

  try {
    const prompt = `Review the clinical conversation below between our Medical Intake Scribe and the Patient. 
Generate a beautifully structured, highly professional Clinical Summary.
Ensure your response adheres exactly to this JSON schema layout:

{
  "patientName": "Patient's full name (Use '${patientDetails?.name || "Alex Mercer"}' if found, or extract from dialogue)",
  "patientAge": "Patient's age (Use '${patientDetails?.age || "34"}' or extract)",
  "patientGender": "Patient's gender (Use '${patientDetails?.gender || "Male"}' or extract)",
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

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
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
      }
    });

    const parsed = JSON.parse(response.text || "{}");
    return res.json({ summary: parsed, source: "gemini_api" });
  } catch (error: any) {
    console.error("Gemini Summarize API Error:", error);
    // Safe response fallback
    const name = patientDetails?.name || defaultFallback.patientName;
    const age = patientDetails?.age || defaultFallback.patientAge;
    const gender = patientDetails?.gender || defaultFallback.patientGender;
    const customized = {
      ...defaultFallback,
      patientName: name,
      patientAge: age,
      patientGender: gender,
      chiefComplaint: patientDetails?.chiefComplaint || defaultFallback.chiefComplaint,
    };
    return res.json({ 
      summary: customized, 
      source: "error_fallback_engine",
      errorMessage: error.message 
    });
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
