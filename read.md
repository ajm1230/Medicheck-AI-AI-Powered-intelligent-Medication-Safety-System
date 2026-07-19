# 🛡️ MediCheck AI — Intelligent Medication Safety Platform

**Team:** Team Horizonn  
**Project:** MediCheck AI: Intelligent Medicine Verification and Healthcare Assistance Platform  
**Hackathon Focus:** Prototype / Technical Progress Round  

---

### 🌐 Live Demo
* **Development App URL**: [https://ais-dev-en4kxlnkkdyxarqzvxikfg-637840215868.asia-southeast1.run.app](https://ais-dev-en4kxlnkkdyxarqzvxikfg-637840215868.asia-southeast1.run.app)
* **Shared App URL**: [https://ais-pre-en4kxlnkkdyxarqzvxikfg-637840215868.asia-southeast1.run.app](https://ais-pre-en4kxlnkkdyxarqzvxikfg-637840215868.asia-southeast1.run.app)

---

## 🎙️ Partner Integration: Gnani.ai Voice Engine

MediCheck AI features a deep, seamless integration with **Gnani.ai (Vachana Speech Engine)** for high-fidelity **Text-to-Speech (TTS)** and voice output. 

To deliver a caring, accessible, and natural user experience—especially for elderly and low-literacy users—we generate a **single-request, continuous voice summary in conversational everyday Hindi (Hinglish phonetics written in Devanagari script)**.

### ⚡ Key Features of Our Gnani.ai Integration
1. **Single-Request Complete Summary**: We combine all individual report sections (greeting, score explanation, medicines list, precautions, warnings, diet advice, and closing) into a single, cohesive text block. This is transmitted in **one single JSON POST request** to prevent any sentence-by-sentence streaming lag, buffering, or robotic word-by-word pauses.
2. **Natural Devanagari Flow**: The Gemini-generated script is optimized to avoid roman script, pure Sanskritized Hindi, or raw lists. Common medical terms are spelled phonetically in Devanagari (e.g., "मेडिसिन", "हेल्थ", "डोज़", "ट्रीटमेंट", "स्कोर") so Pranav's voice sounds smooth, fluent, and human-like.
3. **Graceful Web Speech API Fallback**: If the server-side proxy is offline or fails, the interface smoothly falls back to the native browser SpeechSynthesis API.

---

## 💻 Integration Code Snippets

Here is exactly how our application interacts with the **Gnani.ai Vachana Voice Engine** across our full-stack architecture:

### 📡 1. Backend API Proxy (`/server.js`)
To secure API keys and prevent CORS restrictions in client-side containers, all requests are routed through a secure Express.js proxy.

```javascript
// Secure proxy endpoint for Gnani AI TTS
app.post('/api/tts', async (req, res) => {
  try {
    const { text, voice = 'Pranav', model = 'vachana-voice-v3' } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Missing text in request body' });
    }

    const gnaniApiKey = "YOUR_API_KEY_HERE";

    const response = await fetch("https://api.vachana.ai/api/v1/tts/inference", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key-ID": gnaniApiKey
      },
      body: JSON.stringify({
        text,
        voice,
        model,
        audio_config: {
          sample_rate: 44100,
          num_channels: 1,
          sample_width: 2,
          encoding: "linear_pcm",
          container: "wav"
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).send(errText);
    }

    // Pipe the audio stream directly back to the client
    const arrayBuffer = await response.arrayBuffer();
    res.set('Content-Type', 'audio/wav');
    res.send(Buffer.from(arrayBuffer));
  } catch (error) {
    console.error('Gnani TTS Proxy Error:', error);
    res.status(500).json({ error: 'Failed to process voice request' });
  }
});
```

### 🎛️ 2. Frontend Player & Single-Request Dispatch (`index.html`)
The frontend merges the sections of the report into one continuous narrative and plays it dynamically with a responsive player state.

```javascript
// Merges all sections of the voice script into a single continuous playback
const parts = [
  vs.greeting,
  vs.scoreSummary,
  vs.overallSummary,
  vs.medicines,
  vs.precautions,
  vs.warningSigns,
  vs.diet,
  vs.closing
].filter(Boolean);

const fullScript = parts.join(' \n\n ');

try {
  const response = await fetch('/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: fullScript, voice: 'Pranav' })
  });

  if (!response.ok) throw new Error('TTS server error');

  const audioBlob = await response.blob();
  const audioUrl = URL.createObjectURL(audioBlob);

  this.audioObj = new Audio(audioUrl);
  this.audioObj.play().catch(err => {
    // If autoplay fails, fallback to local TTS synthesis
    fallbackToSpeechSynthesis(fullScript);
  });
} catch (err) {
  // Graceful fallback to client-side Web Speech Synthesis
  fallbackToSpeechSynthesis(fullScript);
}
```

---

## 🛠️ App Workflow & Features

1. **🏥 Profile & Context Setup**: Input key details including Patient Name, Age, Allergies (e.g., penicillin, sulfa), chronic conditions, and current medications.
2. **📸 Multi-modal Scanning**:
   - **Medicine Pack OCR**: Automatically detects medicine names, expiration date, and chemical formulas.
   - **QR/Barcode Recognition**: Verifies structural authenticity.
   - **Prescription Match**: Checks if the scanned drug matches the official physician prescription.
3. **🧬 Safety Assessment Engine**: Core logic flags allergy conflicts, high-risk drug interactions, wrong dosage/strength, and suspicious/expired packs, yielding an automated safety score out of 100 with clear color codes:
   - 🟢 **Safe to Use (Score ≥ 78)**: Clean bill of health.
   - 🟡 **Use with Caution (Score 45–77)**: Mild interaction or side effects.
   - 🔴 **Do Not Use (Score < 45)**: Severe allergy triggers or wrong prescription matches.
4. **⚙️ Real vs. Judge Demo Mode**: Includes pre-loaded demo scenarios for instant hackathon evaluations (SAFE, WARNING, DANGER: Allergy mismatch, DANGER: Mismatched Fake Code).

---

## 📂 Tech Stack

* **Frontend**: HTML5, CSS3, Vanilla ES6 JavaScript, Tailwind CSS, FontAwesome Icons.
* **Libraries**: Tesseract.js (Client-side Prescription and Medicine OCR).
* **AI Capabilities**: Gemini AI Model API for customized clinical safety analysis & conversational voice scripts.
* **Voice Engine**: **Gnani.ai (Vachana TTS Pranav Voice)** with an automated native browser fallback.
* **Server**: Node.js Express Server for proxying Gemini APIs and Gnani AI.

---

## 🏁 How to Run Locally

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Development Server
```bash
npm run dev
```
The app will spin up on port `3000`. Navigate to `http://localhost:3000` to preview it!

---

## 🛡️ Clinical Disclaimer
MediCheck AI is an educational decision-support prototype. It does not replace professional medical diagnosis, advice, or pharmacist counseling. Always consult your physician before starting or stopping any medication.
