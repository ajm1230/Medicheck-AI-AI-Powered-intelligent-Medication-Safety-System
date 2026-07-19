window.MediAI = (() => {
  // Prototype hardcoded API location. Replace the value below with your OpenRouter key.
  // WARNING: Frontend hardcoding exposes the key. For production, move this to a backend.
  const OPENROUTER_API_KEY = "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";
  const OPENROUTER_MODEL = "openai/gpt-4o-mini";

  const hasLiveKey = () => OPENROUTER_API_KEY && !OPENROUTER_API_KEY.includes("PASTE_") && OPENROUTER_API_KEY.length > 20;

  function extractJson(text) {
    if (!text) throw new Error("Empty AI response");
    try { return JSON.parse(text); } catch (_) {}
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error("AI response was not valid JSON");
  }

  function buildPrompt(payload) {
    return `You are MediCheck AI, a medication-safety assistant for a hackathon prototype.
You must return ONLY valid JSON. No markdown. No explanation outside JSON.
This is not a doctor replacement. Give cautious, user-friendly guidance.

Analyze:
- health problem match
- prescription match
- allergy risks
- duplicate salt risks
- interaction/combination risks
- dose caution
- expiry/label signals from OCR
- care guidance: precautions, diet, water, avoid, when to contact doctor

Use this exact schema:
{
  "overall_status": "SAFE | MODERATE | UNSAFE",
  "overall_score": 0,
  "summary": "short user-friendly summary",
  "medicine_results": [
    {
      "medicine_name": "string",
      "status": "SAFE | MODERATE | UNSAFE",
      "score": 0,
      "category": "safe | moderate | unsafe",
      "reason": "string",
      "prescription_match": true,
      "allergy_risk": false,
      "dose_note": "string",
      "action": "string"
    }
  ],
  "allergy_check": { "risk_found": false, "details": "string" },
  "duplicate_salt_check": { "risk_found": false, "details": "string" },
  "interaction_check": { "risk_found": false, "details": "string" },
  "expiry_check": { "status": "clear | not_clear | expired | missing", "details": "string" },
  "care_guidance": {
    "precautions": ["string"],
    "diet": ["string"],
    "water": ["string"],
    "avoid": ["string"],
    "when_to_contact_doctor": ["string"]
  },
  "doctor_summary": "short summary for doctor",
  "voice_summary": "short spoken summary"
}

Input JSON:
${JSON.stringify(payload, null, 2)}`;
  }

  async function callOpenRouter(payload) {
    if (!hasLiveKey()) throw new Error("OpenRouter API key missing in js/ai.js");
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": location.origin || "http://localhost",
        "X-Title": "MediCheck AI"
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        temperature: 0.15,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "Return only strict JSON for medication safety analysis. Do not provide medical diagnosis." },
          { role: "user", content: buildPrompt(payload) }
        ]
      })
    });
    if (!res.ok) throw new Error(`OpenRouter error ${res.status}`);
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    return normalizeReport(extractJson(content), false);
  }

  function includesAny(text, words) {
    const lower = String(text || "").toLowerCase();
    return words.some(w => lower.includes(w.toLowerCase()));
  }

  function detectName(text) {
    const t = String(text || "");
    const rules = [
      { words: ["paracetamol", "dolo", "crocin", "calpol"], name: "Paracetamol 650 mg", salt: "paracetamol" },
      { words: ["ibuprofen", "ibugesic", "brufen"], name: "Ibuprofen 400 mg", salt: "ibuprofen" },
      { words: ["amoxicillin", "amox", "amoxycillin"], name: "Amoxicillin 500 mg", salt: "amoxicillin" },
      { words: ["cetirizine", "cetrizine"], name: "Cetirizine", salt: "cetirizine" },
      { words: ["azithromycin", "azee", "azithral"], name: "Azithromycin", salt: "azithromycin" },
      { words: ["omeprazole", "pantoprazole", "pan"], name: "Acidity medicine", salt: "ppi" }
    ];
    const found = rules.find(r => includesAny(t, r.words));
    return found || { name: t.split(/[\n,.]/)[0]?.slice(0, 42) || "Unknown medicine", salt: "unknown" };
  }

  function scoreToStatus(score) {
    if (score <= 35) return "UNSAFE";
    if (score <= 69) return "MODERATE";
    return "SAFE";
  }

  function analyzeFallback(payload, reason = "Live AI unavailable") {
    const profile = payload.profile || {};
    const allergies = (profile.allergies || []).map(x => String(x).toLowerCase());
    const problem = String(payload.health_problem || "").toLowerCase();
    const prescription = String(payload.prescription_ocr_text || "").toLowerCase();
    const alcohol = String(profile.alcohol || "").toLowerCase();
    const conditions = (profile.conditions || []).map(x => String(x).toLowerCase());
    const detected = (payload.medicines || []).map(m => ({ ...m, detected: detectName(`${m.ocr_text} ${m.barcode_data}`) }));
    const saltCounts = detected.reduce((acc, m) => {
      if (m.detected.salt !== "unknown") acc[m.detected.salt] = (acc[m.detected.salt] || 0) + 1;
      return acc;
    }, {});

    const results = detected.map(item => {
      const text = `${item.ocr_text} ${item.barcode_data}`.toLowerCase();
      const salt = item.detected.salt;
      let score = 82;
      let reasonText = "Medicine details were read from the photo/label text.";
      let action = "Use only as per prescription and confirm if unsure.";
      const prescriptionMatch = prescription.includes(salt) || (salt === "paracetamol" && includesAny(prescription, ["dolo", "crocin", "calpol"])) || (salt === "unknown" ? false : prescription.includes(item.detected.name.toLowerCase().split(" ")[0]));
      let allergyRisk = allergies.some(a => salt.includes(a) || a.includes(salt) || text.includes(a));

      if (allergyRisk) {
        score = 15;
        reasonText = `Allergy conflict found for ${item.detected.name}.`;
        action = "Do not take this medicine. Contact doctor or emergency help if symptoms appear.";
      } else if (salt === "amoxicillin" || salt === "azithromycin") {
        score = prescriptionMatch ? 70 : 52;
        reasonText = prescriptionMatch ? "Antibiotic appears in prescription, but should still be taken only as prescribed." : "Antibiotic is not clearly matched with the prescription/health problem.";
        action = "Take antibiotic only if doctor prescribed it. Do not self-medicate.";
      } else if (salt === "ibuprofen") {
        score = conditions.includes("acidity") || conditions.includes("kidney problem") || problem.includes("acidity") ? 48 : 67;
        reasonText = "Pain/fever medicine, but may be risky with acidity, kidney issues, asthma or allergy.";
        action = "Use with caution and doctor confirmation, especially if acidity or allergy history exists.";
      } else if (salt === "paracetamol") {
        score = prescriptionMatch || includesAny(problem, ["fever", "body pain", "pain"]) ? 88 : 72;
        reasonText = "Generally matches fever/body pain use and prescription if doctor wrote it.";
        action = "Can be taken as per prescription. Avoid overdose.";
        if (alcohol === "regularly" || conditions.includes("liver problem")) {
          score = 58;
          reasonText = "Paracetamol detected, but liver/alcohol profile increases caution.";
          action = "Avoid alcohol and confirm dose with doctor.";
        }
      } else if (salt === "ppi") {
        score = includesAny(problem, ["acidity", "gas", "stomach"]) || prescriptionMatch ? 78 : 62;
        reasonText = "Acidity medicine detected. Match depends on symptoms/prescription.";
        action = "Use as prescribed, usually before food if doctor advised.";
      } else {
        score = 55;
        reasonText = "Medicine could not be confidently identified from available text.";
        action = "Verify label manually and confirm with a doctor/pharmacist.";
      }

      if (saltCounts[salt] > 1 && salt !== "unknown") {
        score = Math.min(score, 54);
        reasonText += " Duplicate salt may be present.";
        action = "Do not take duplicate medicines with the same salt together.";
      }

      const status = scoreToStatus(score);
      return {
        medicine_name: item.detected.name,
        status,
        score,
        category: status.toLowerCase() === "moderate" ? "moderate" : status.toLowerCase(),
        reason: reasonText,
        prescription_match: Boolean(prescriptionMatch),
        allergy_risk: Boolean(allergyRisk),
        dose_note: prescriptionMatch ? "Follow dose written in prescription. Do not repeat dose early." : "Dose not clearly confirmed by prescription.",
        action
      };
    });

    const unsafe = results.filter(r => r.status === "UNSAFE").length;
    const moderate = results.filter(r => r.status === "MODERATE").length;
    const safe = results.filter(r => r.status === "SAFE").length;
    let overall_status = unsafe ? "UNSAFE" : moderate ? "MODERATE" : "SAFE";
    const overall_score = results.length ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length) : 50;
    const duplicateRisk = Object.keys(saltCounts).filter(k => saltCounts[k] > 1);
    const expiryTexts = detected.map(m => String(m.ocr_text || "").toLowerCase()).join(" ");
    const expiryFound = /(exp|expiry|expires|use before)[:\s]*\d{1,2}[\/\-]\d{2,4}/i.test(expiryTexts);

    return normalizeReport({
      fallback_used: true,
      fallback_reason: reason,
      overall_status,
      overall_score,
      summary: `${safe} medicine(s) appear safe, ${moderate} need caution, and ${unsafe} are unsafe/avoid based on profile and prescription text.`,
      medicine_results: results,
      allergy_check: {
        risk_found: results.some(r => r.allergy_risk),
        details: results.some(r => r.allergy_risk) ? "Allergy conflict detected in one or more medicines." : "No allergy conflict found from selected profile."
      },
      duplicate_salt_check: {
        risk_found: duplicateRisk.length > 0,
        details: duplicateRisk.length ? `Possible duplicate salt: ${duplicateRisk.join(", ")}.` : "No duplicate salt detected from readable text."
      },
      interaction_check: {
        risk_found: results.length > 1 && (moderate > 0 || unsafe > 0),
        details: results.length > 1 ? "Multiple medicines detected. Confirm combination with prescription/doctor." : "Single medicine added. Interaction risk cannot be fully checked without full medicine list."
      },
      expiry_check: {
        status: expiryFound ? "clear" : "not_clear",
        details: expiryFound ? "Expiry-like date detected from medicine label text." : "Expiry not clearly detected. Please verify manually on strip/box."
      },
      care_guidance: {
        precautions: ["Follow doctor dose and timing", "Do not take unsafe medicines", "Do not mix duplicate salts", "Stop and seek help if allergy signs appear"],
        diet: ["Eat light food such as khichdi, soup, rice/dal or curd if suitable", "Avoid oily and very spicy food during fever/acidity"],
        water: ["Drink enough water through the day unless doctor restricted fluids", "Take small sips frequently during fever"],
        avoid: ["Alcohol", "Smoking", "Unknown herbal supplements", "Taking multiple painkillers together"],
        when_to_contact_doctor: ["Fever continues more than 2–3 days", "Rash, swelling, breathing problem or fainting", "Severe vomiting or chest pain", "Report says unsafe or allergy conflict"]
      },
      doctor_summary: `Patient problem: ${payload.health_problem || "not provided"}. Report: ${overall_status}. Medicines: ${results.map(r => `${r.medicine_name} ${r.status}`).join("; ")}.`,
      voice_summary: `MediCheck found ${results.length} medicine${results.length === 1 ? "" : "s"}. ${safe} appear safe, ${moderate} need caution, and ${unsafe} are unsafe or avoid. ${unsafe ? "Do not take unsafe medicine and contact a doctor." : "Follow your prescription and precautions."}`
    }, true);
  }

  function normalizeReport(report, fallbackUsed) {
    const normalized = report || {};
    normalized.fallback_used = Boolean(normalized.fallback_used || fallbackUsed);
    normalized.overall_status = String(normalized.overall_status || "MODERATE").toUpperCase().replace("CAUTION", "MODERATE");
    normalized.overall_score = Number(normalized.overall_score ?? 60);
    normalized.summary = normalized.summary || "MediCheck generated a safety report.";
    normalized.medicine_results = Array.isArray(normalized.medicine_results) ? normalized.medicine_results : [];
    normalized.medicine_results = normalized.medicine_results.map(m => {
      const status = String(m.status || "MODERATE").toUpperCase().replace("CAUTION", "MODERATE");
      return { ...m, status, category: status === "SAFE" ? "safe" : status === "UNSAFE" ? "unsafe" : "moderate" };
    });
    normalized.allergy_check ||= { risk_found: false, details: "Not checked." };
    normalized.duplicate_salt_check ||= { risk_found: false, details: "Not checked." };
    normalized.interaction_check ||= { risk_found: false, details: "Not checked." };
    normalized.expiry_check ||= { status: "not_clear", details: "Expiry not clearly detected." };
    normalized.care_guidance ||= { precautions: [], diet: [], water: [], avoid: [], when_to_contact_doctor: [] };
    normalized.voice_summary ||= normalized.summary;
    normalized.doctor_summary ||= normalized.summary;
    return normalized;
  }

  async function analyze(payload) {
    try {
      const live = await callOpenRouter(payload);
      live.ai_source = "openrouter";
      return live;
    } catch (error) {
      const fallback = analyzeFallback(payload, error.message || "Live AI failed");
      fallback.ai_source = "local-fallback";
      return fallback;
    }
  }

  return { analyze, analyzeFallback, hasLiveKey, OPENROUTER_MODEL };
})();
