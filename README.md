# MediCheck AI — AI-Powered Medication Safety Web App

**Team:** Quantaa  
**Project:** MediCheck AI: Intelligent Medicine Verification and Healthcare Assistance Platform  
**Hackathon focus:** Confluence 2.0 prototype / technical progress round

MediCheck AI is a modern mobile-first web app prototype that helps users verify a medicine before taking it. It combines medicine pack photo OCR, QR/barcode data, prescription text, allergy profile, drug interaction rules, fake/expiry risk checks, and AI-generated safety reports.

> Important: This is a hackathon prototype and decision-support demo. It is not a replacement for a doctor, pharmacist, or official medicine verification system.


---
># 🚀 Live Demo

Experience **MediCheck AI** directly in your browser.

🔗 **Live App Preview:**
https://ajm1230.github.io/Medicheck-AI-AI-Powered-Medication-Safety-System/

> **Recommended Demo Flow (≈2 minutes):**
>
> 1. Click **Start Safety Check**
> 2. Use the **Demo Autofill** buttons to quickly load sample data.
> 3. Review the AI-generated medication safety report.
> 4. Explore allergy detection, medicine interaction analysis, voice summary, diet & precaution recommendations, and doctor assistance.

### ✨ Highlights

* 🤖 AI-powered medication safety analysis
* 📷 OCR-based medicine & prescription scanning
* 💊 Multiple medicine verification
* ⚠️ Allergy & medicine interaction detection
* 📄 Prescription matching
* 🟢🟡🔴 Safe / Caution / Unsafe classification
* 🥗 Personalized precautions, diet & hydration guidance
* 🔊 Voice assistant with start/stop controls
* 👨‍⚕️ Doctor assistance section
* 📜 Report history with local storage
* 📱 Responsive glassmorphism UI optimized for desktop and mobile

**For the best experience, open the demo in a modern browser such as Chrome, Edge, or Safari.**




## 1. What the app does

MediCheck AI follows a simple flow:

1. User selects **Judge Demo Mode** or **Real Mode**.
2. User adds health profile data such as name, age, allergies, conditions, and current medicines.
3. User scans/uploads a medicine pack photo and QR/barcode image.
4. User adds prescription text or uploads a prescription image for OCR.
5. App checks:
   - medicine OCR recognition,
   - barcode/QR match,
   - prescription medicine match,
   - dose/strength visibility,
   - allergy conflicts,
   - drug interaction risk,
   - disease/condition compatibility,
   - fake/expiry/tamper warning,
   - symptom/use-case compatibility.
6. App generates a **Green / Yellow / Red safety report** with score, checks, explanation, recommendations, voice guidance, and local history.

---

## 2. Modes

### Judge Demo Mode

Designed for hackathon reviewers.

- No Gmail required
- No password required
- No real medicine required
- No API key required
- Four instant demo cases:
  - SAFE: Correct medicine
  - WARNING: Interaction risk
  - DANGER: Allergy mismatch
  - DANGER: Barcode and pack mismatch / fake risk

This mode helps judges understand the technical workflow quickly during a short review.

### Real Mode

Designed for a normal user workflow.

- Local profile creation
- Name, email/Gmail, age
- Allergies
- Existing health conditions
- Current medicines
- Medicine photo upload
- QR/barcode upload/manual entry
- Prescription OCR/manual entry
- Local scan history
- Optional OpenRouter/Gemini AI analysis

All profile and report data is stored in the browser's `localStorage`.

---

## 3. Key features included

- Premium Apple/Google-style white and blue mobile UI
- Laptop-centered mobile app frame
- Responsive design for phone and desktop
- Central `+` scan button in footer
- Judge Demo Mode for easy evaluation
- Real Mode profile workflow
- Medicine OCR using Tesseract.js CDN when available
- Barcode/QR support using browser `BarcodeDetector` when available
- Manual fallback fields for OCR/barcode data
- Prescription OCR screen
- Allergy and health-condition profile
- Local rule-based medicine safety engine
- Optional OpenRouter AI integration
- Optional Gemini API integration
- Detailed safety report screen
- Safety score out of 100
- Green / Yellow / Red risk state
- AI recommendation block
- Voice guidance with Web Speech API
- Save report to local history
- Export single report as `.txt`
- Export history as `.json`
- Local privacy-first storage

---

## 4. Tech stack

This app is intentionally built as a simple GitHub-ready static web app:

```text
HTML5
CSS3
Vanilla JavaScript
LocalStorage
Web Speech API
BarcodeDetector API when supported
Tesseract.js OCR via CDN when available
OpenRouter API optional
Gemini API optional
```

No build step is required.

---

## 5. Folder structure

```text
medicheck-ai-webapp/
├── index.html
├── README.md
├── read.md
├── css/
│   └── styles.css
├── js/
│   ├── app.js
│   └── data.js
└── assets/
    ├── logo.svg
    └── medicine-card.svg
```

---

## 6. How to run locally

### Option A: Open directly

Open `index.html` in your browser.

### Option B: Run local server

Recommended for camera/OCR/API testing:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

---

## 7. How to use for judging

1. Open the app.
2. Click **Judge Demo Mode**.
3. Tap the center `+` button or **Scan Medicine**.
4. Choose a demo case:
   - Safe case
   - Warning case
   - Danger allergy case
   - Fake/expired risk case
5. Click **Verify Medicine**.
6. Show the generated safety report.
7. Use **Speak Report**, **Save**, or **Export TXT**.

This is the fastest path for a 2–3 minute technical demo.

---

## 8. How the safety engine works

The local engine uses sample medicine data from `js/data.js`.

For each verification, it calculates a risk score from:

- OCR recognition confidence
- barcode/QR match
- prescription match
- strength/dose visibility
- allergy conflicts
- drug interactions
- disease-condition conflicts
- fake/expiry/tamper indicators
- symptom/use-case compatibility

Result logic:

```text
Score ≥ 78 and no critical issue  => Safe
Score 45–77 or caution signals    => Warning / Caution
Score < 45 or critical issue      => Danger
```

Critical issues include allergy conflict, expired medicine, and prescription mismatch.

---

## 9. Optional AI integration

The app works without an API key using the local rule engine.

To test real AI mode:

1. Open **Settings**.
2. Select **OpenRouter AI** or **Gemini API**.
3. Paste your API key.
4. Enter a model name.
5. Save settings.
6. Run a medicine verification.

### OpenRouter example models

```text
mistralai/mistral-7b-instruct:free
openai/gpt-4o-mini
google/gemini-flash-1.5
```

### Gemini example model

```text
gemini-1.5-flash
```

API keys are stored only in the browser localStorage for prototype use. For production, move API calls to a secure backend.

---

## 10. Implementation status

Current prototype includes:

- UI screens
- judge mode
- real mode
- profile system
- OCR upload flow
- barcode/QR manual and browser detection flow
- safety engine
- detailed report
- voice guidance
- local history
- export features
- optional AI provider settings

Planned production improvements:

- backend authentication
- verified government/pharmacy medicine database
- secure prescription storage
- doctor/pharmacist review panel
- real barcode medicine registry lookup
- multilingual OCR
- family/caregiver alerts
- emergency guidance flow
- hospital/pharmacy integrations
- model monitoring and medical safety validation

---

## 11. Why this is useful

Medication mistakes can happen when a patient receives the wrong medicine, wrong strength, expired product, duplicate medicine, allergy-conflicting medicine, or medicine that does not match the prescription.

MediCheck AI reduces this risk by creating a simple safety checkpoint before medicine consumption:

```text
Prescription → Medicine scan → Patient profile → AI/rule safety check → Clear report
```

The goal is to make medicine verification simple for patients, elderly users, families, and low-literacy users through clear color signals and voice guidance.

---

## 12. Safety disclaimer

MediCheck AI is a prototype. It does not diagnose, prescribe, or replace professional medical advice. Always consult a doctor or pharmacist for final medicine decisions, especially for children, pregnancy, severe allergies, chronic disease, emergencies, or complex prescriptions.
