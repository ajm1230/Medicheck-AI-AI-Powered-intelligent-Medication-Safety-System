(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  const state = {
    screen: "home",
    health_problem: "",
    profile: MediStorage.getProfile() || {
      age: "",
      weight: "",
      allergies: [],
      alcohol: "never",
      smoking: "no",
      conditions: [],
      current_medicines: []
    },
    medicines: [],
    prescription: { image: "", ocr_text: "" },
    lastReport: null
  };

  const screens = $$('[data-screen]');
  const toast = $('#toast');

  function showToast(message, ms = 2400) {
    toast.textContent = message;
    toast.classList.remove('hidden');
    clearTimeout(showToast.t);
    showToast.t = setTimeout(() => toast.classList.add('hidden'), ms);
  }

  function go(screen) {
    state.screen = screen;
    screens.forEach(s => s.classList.toggle('active', s.dataset.screen === screen));
    $$('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.go === screen));
    $('#backBtn').style.visibility = screen === 'home' ? 'hidden' : 'visible';
    if (screen === 'history') renderHistory();
    window.scrollTo?.(0, 0);
  }

  function back() {
    const order = ['home', 'problem', 'profile', 'medicines', 'prescription', 'processing', 'report'];
    const idx = order.indexOf(state.screen);
    if (state.screen === 'history') return go('home');
    if (idx > 1) return go(order[idx - 1]);
    go('home');
  }

  function syncProfileUI() {
    $('#ageInput').value = state.profile.age || '';
    $('#weightInput').value = state.profile.weight || '';
    $('#currentMedsInput').value = (state.profile.current_medicines || []).join(', ');
    $$('#allergyChips .chip').forEach(chip => chip.classList.toggle('active', (state.profile.allergies || []).includes(chip.dataset.value)));
    $$('#conditionChips .chip').forEach(chip => chip.classList.toggle('active', (state.profile.conditions || []).includes(chip.dataset.value)));
    $$('.choice-card').forEach(card => {
      card.classList.toggle('active', state.profile[card.dataset.group] === card.dataset.value);
    });
  }

  function collectProfile() {
    state.profile.age = $('#ageInput').value.trim();
    state.profile.weight = $('#weightInput').value.trim();
    state.profile.current_medicines = $('#currentMedsInput').value.split(',').map(x => x.trim()).filter(Boolean);
    MediStorage.saveProfile(state.profile);
  }

  function toggleArray(arrName, value) {
    state.profile[arrName] ||= [];
    const idx = state.profile[arrName].indexOf(value);
    if (idx >= 0) state.profile[arrName].splice(idx, 1);
    else state.profile[arrName].push(value);
    syncProfileUI();
  }

  function setChoice(group, value) {
    state.profile[group] = value;
    syncProfileUI();
  }

  function renderMedicines() {
    const list = $('#medicineList');
    if (!state.medicines.length) {
      list.innerHTML = `<div class="empty">No medicine added yet. Add a photo or use demo medicines.</div>`;
      return;
    }
    list.innerHTML = state.medicines.map((m, index) => `
      <article class="medicine-card" data-id="${m.id}">
        <div class="medicine-top">
          <img class="med-img" src="${m.image || 'assets/logo.svg'}" alt="Medicine ${index + 1}" />
          <div class="med-meta">
            <h3>Medicine ${index + 1}</h3>
            <p>${m.status || 'Ready for AI check'}${m.barcode_data ? `<br>QR/Barcode: ${escapeHtml(m.barcode_data).slice(0, 64)}` : ''}</p>
          </div>
        </div>
        <textarea class="ocr-box" data-edit-id="${m.id}" placeholder="OCR text will appear here. You can edit if OCR is wrong.">${escapeHtml(m.ocr_text || '')}</textarea>
        <div class="card-actions">
          <button class="ghost-btn" data-remove-id="${m.id}">Remove</button>
          <button class="secondary-btn" data-rename-id="${m.id}">Mark Checked</button>
        </div>
      </article>
    `).join('');

    $$('[data-remove-id]').forEach(btn => btn.onclick = () => {
      state.medicines = state.medicines.filter(m => m.id !== btn.dataset.removeId);
      renderMedicines();
    });
    $$('[data-rename-id]').forEach(btn => btn.onclick = () => showToast('Medicine text ready for AI analysis'));
    $$('[data-edit-id]').forEach(area => area.oninput = () => {
      const med = state.medicines.find(m => m.id === area.dataset.editId);
      if (med) med.ocr_text = area.value;
    });
  }

  async function addMedicineFiles(files) {
    for (const file of files) {
      const id = `med_${Date.now()}_${Math.random().toString(16).slice(2)}`;
      const med = { id, image: '', ocr_text: '', barcode_data: '', status: 'Preparing image...' };
      state.medicines.push(med);
      renderMedicines();
      try {
        med.status = 'Scanning barcode/QR...'; renderMedicines();
        const barcode = await MediBarcode.scan(file);
        med.barcode_data = barcode.value || '';
        med.status = 'Running OCR...'; renderMedicines();
        const result = await MediOCR.recognize(file, progress => {
          med.status = `OCR: ${progress}`;
          renderMedicines();
        });
        med.image = result.preview;
        med.ocr_text = result.text || `OCR could not read clearly. File: ${file.name}. Please type medicine name, strength, expiry and batch if visible.`;
        med.status = result.text ? 'OCR completed' : 'OCR unclear — edit text manually';
      } catch (error) {
        med.status = 'Upload added — edit text manually';
        med.ocr_text = `OCR failed. File: ${file.name}. Type medicine label details here.`;
      }
      renderMedicines();
    }
  }

  async function loadPrescriptionFile(file) {
    const previewBox = $('#prescriptionPreview');
    previewBox.classList.remove('hidden');
    previewBox.innerHTML = `<p class="muted">Reading prescription...</p>`;
    try {
      if (file.type.includes('pdf')) {
        state.prescription.image = '';
        state.prescription.ocr_text = `PDF uploaded: ${file.name}. Please type prescription text here because browser OCR reads images only in this prototype.`;
        previewBox.innerHTML = `<p>📄 ${escapeHtml(file.name)}</p>`;
      } else {
        const result = await MediOCR.recognize(file, msg => {
          previewBox.innerHTML = `<p class="muted">OCR: ${escapeHtml(msg)}</p>`;
        });
        state.prescription.image = result.preview;
        state.prescription.ocr_text = result.text || `OCR unclear. File: ${file.name}. Please type prescription text here.`;
        previewBox.innerHTML = `<img src="${result.preview}" alt="Prescription preview" />`;
      }
      $('#prescriptionText').value = state.prescription.ocr_text;
    } catch (error) {
      state.prescription.ocr_text = `OCR failed. Please type prescription text here. File: ${file.name}`;
      $('#prescriptionText').value = state.prescription.ocr_text;
      previewBox.innerHTML = `<p class="muted">OCR failed. Manual edit enabled.</p>`;
    }
  }

  function addDemoMedicines() {
    const timestamp = Date.now();
    state.medicines = MediDemo.medicines.map((m, index) => ({
      id: `${m.id}_${timestamp}_${index}`,
      image: m.image,
      ocr_text: m.ocr_text,
      barcode_data: m.barcode_data,
      status: 'Demo sample added — same AI pipeline will run'
    }));
    renderMedicines();
    showToast('3 demo medicines added');
  }

  function setDemoPrescription() {
    state.prescription = { ...MediDemo.prescription };
    $('#prescriptionText').value = state.prescription.ocr_text;
    $('#prescriptionPreview').classList.remove('hidden');
    $('#prescriptionPreview').innerHTML = `<img src="${state.prescription.image}" alt="Handwritten prescription sample" />`;
    showToast('Demo prescription added');
  }

  function buildPayload() {
    syncMedicineTextFromUI();
    collectProfile();
    state.health_problem = $('#problemText').value.trim();
    state.prescription.ocr_text = $('#prescriptionText').value.trim();
    return {
      health_problem: state.health_problem,
      profile: state.profile,
      medicines: state.medicines.map(m => ({
        id: m.id,
        ocr_text: m.ocr_text,
        barcode_data: m.barcode_data || '',
        image_name: m.id
      })),
      prescription_ocr_text: state.prescription.ocr_text
    };
  }

  function syncMedicineTextFromUI() {
    $$('[data-edit-id]').forEach(area => {
      const med = state.medicines.find(m => m.id === area.dataset.editId);
      if (med) med.ocr_text = area.value;
    });
  }

  function validateBeforeAnalysis() {
    const messages = [];
    if (!$('#problemText').value.trim()) messages.push('Add health problem or use demo autofill.');
    if (!state.medicines.length) messages.push('Add at least one medicine photo or demo medicines.');
    if (!$('#prescriptionText').value.trim()) messages.push('Upload/add prescription or use demo prescription.');
    if (messages.length) {
      showToast(messages[0], 3400);
      return false;
    }
    return true;
  }

  async function runAnalysis() {
    if (!validateBeforeAnalysis()) return;
    const payload = buildPayload();
    go('processing');
    const logs = $('#processLogs');
    const progress = $('#progressBar');
    logs.innerHTML = '';
    progress.style.width = '0%';

    const pipeline = [
      'Reading medicine labels with OCR text...',
      'Checking QR/barcode data where supported...',
      'Extracting prescription details...',
      'Matching health problem with medicine purpose...',
      'Checking allergy profile and lifestyle risks...',
      'Checking duplicate salts and multiple medicine risks...',
      'Checking expiry/date signals from readable label...',
      MediAI.hasLiveKey() ? 'Calling OpenRouter AI for strict JSON report...' : 'Live AI key not found. Running safe local fallback analysis...',
      'Building visual safety report...'
    ];

    let reportPromise;
    for (let i = 0; i < pipeline.length; i++) {
      addLog(pipeline[i]);
      progress.style.width = `${Math.round(((i + 1) / pipeline.length) * 100)}%`;
      if (i === 7) reportPromise = MediAI.analyze(payload);
      await wait(i === 7 ? 260 : 350);
    }

    const report = await reportPromise;
    const record = {
      id: `report_${Date.now()}`,
      created_at: new Date().toISOString(),
      payload,
      report
    };
    state.lastReport = record;
    MediStorage.saveReport(record);
    renderReport(record);
    go('report');
    if (report.fallback_used) showToast('Live AI unavailable/key missing: fallback analysis generated locally.', 4200);
  }

  function addLog(text) {
    const line = document.createElement('div');
    line.className = 'log-line';
    line.textContent = text;
    $('#processLogs').prepend(line);
  }

  function wait(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

  function renderReport(record) {
    const report = record.report;
    const statusClass = report.overall_status === 'SAFE' ? 'safe' : report.overall_status === 'UNSAFE' ? 'unsafe' : 'moderate';
    const buckets = {
      safe: report.medicine_results.filter(m => m.category === 'safe'),
      moderate: report.medicine_results.filter(m => m.category === 'moderate'),
      unsafe: report.medicine_results.filter(m => m.category === 'unsafe')
    };
    const c = $('#reportContainer');
    c.innerHTML = `
      <div class="report-hero ${statusClass}">
        <span class="pill ${report.fallback_used ? '' : 'live'}">${report.fallback_used ? 'Fallback JSON Analysis' : 'Live AI JSON Analysis'}</span>
        <div class="score-bubble"><div>${Number(report.overall_score || 0)}<small>/100</small></div></div>
        <h2>${escapeHtml(report.overall_status)}</h2>
        <p>${escapeHtml(report.summary)}</p>
      </div>

      <div class="report-section-title">Medicine safety summary</div>
      <div class="safety-columns">
        ${bucketHtml('safe', '🟢 Safe Medicines', buckets.safe)}
        ${bucketHtml('moderate', '🟡 Moderate / Use With Caution', buckets.moderate)}
        ${bucketHtml('unsafe', '🔴 Unsafe / Avoid', buckets.unsafe)}
      </div>

      <div class="report-section-title">Individual medicine results</div>
      ${report.medicine_results.map(medReportHtml).join('')}

      <div class="report-section-title">Key checks</div>
      <div class="report-card">
        <div class="info-list">
          ${checkLine('⚠️', 'Allergy Check', report.allergy_check.details, report.allergy_check.risk_found)}
          ${checkLine('💊', 'Duplicate Salt', report.duplicate_salt_check.details, report.duplicate_salt_check.risk_found)}
          ${checkLine('🔁', 'Interaction Check', report.interaction_check.details, report.interaction_check.risk_found)}
          ${checkLine('📦', 'Expiry / Label', report.expiry_check.details, report.expiry_check.status !== 'clear')}
        </div>
      </div>

      <div class="report-section-title">Precautions, diet & water</div>
      <div class="care-grid">
        ${careCard('🛡 Precautions', report.care_guidance.precautions)}
        ${careCard('🍲 Diet / Food', report.care_guidance.diet)}
        ${careCard('💧 Water', report.care_guidance.water)}
        ${careCard('🚫 Avoid', report.care_guidance.avoid)}
        ${careCard('🩺 Contact doctor if', report.care_guidance.when_to_contact_doctor)}
      </div>

      <div class="report-section-title">Need doctor help?</div>
      ${MediDemo.doctors.map(doc => `
        <div class="doctor-card">
          <div class="doctor-left"><div class="avatar">👨‍⚕️</div><div><h4>${escapeHtml(doc.name)}</h4><p>${escapeHtml(doc.speciality)} • ${escapeHtml(doc.status)}</p></div></div>
          <div class="doctor-actions"><a href="tel:${doc.phone}">Call</a><button data-share-doctor="${escapeHtml(doc.name)}">Share</button></div>
        </div>
      `).join('')}

      <div class="report-card">
        <h3>No doctor available?</h3>
        <div class="info-list">
          <div><span>🚑</span><span><b>Emergency:</b> Call 108 or 112 in India for urgent medical help.</span></div>
          <div><span>⛔</span><span><b>Unsafe report:</b> Do not take unsafe medicine without doctor confirmation.</span></div>
        </div>
        <div class="row">
          <a class="primary-btn" href="tel:108">Call 108</a>
          <a class="secondary-btn" href="tel:112">Call 112</a>
        </div>
      </div>

      <div class="report-section-title">Actions</div>
      <button class="primary-btn full" id="speakReportBtn">🔊 Speak Summary</button>
      <button class="ghost-btn full" id="stopReportVoiceBtn">Stop Voice</button>
      <button class="secondary-btn full" id="copyReportBtn">Copy Doctor Summary</button>
      <button class="secondary-btn full" id="downloadReportBtn">Download JSON Report</button>
      <button class="ghost-btn full" id="scanAgainBtn">Scan Another Medicine</button>
    `;

    $('#speakReportBtn').onclick = () => MediVoice.speak(report.voice_summary || report.summary);
    $('#stopReportVoiceBtn').onclick = () => MediVoice.stop();
    $('#copyReportBtn').onclick = () => copyText(report.doctor_summary || report.summary);
    $('#downloadReportBtn').onclick = () => downloadJSON(record, `medicheck-report-${new Date(record.created_at).toISOString().slice(0,10)}.json`);
    $('#scanAgainBtn').onclick = resetForNewScan;
    $$('[data-share-doctor]').forEach(btn => btn.onclick = () => shareReport(report));
  }

  function bucketHtml(kind, title, items) {
    return `<div class="bucket ${kind}"><h3>${title}</h3>${items.length ? `<ul>${items.map(m => `<li>${escapeHtml(m.medicine_name)}</li>`).join('')}</ul>` : `<p class="muted">None</p>`}</div>`;
  }

  function medReportHtml(m) {
    const kind = m.category || 'moderate';
    return `
      <article class="report-card">
        <div class="status-row"><h3>${escapeHtml(m.medicine_name || 'Medicine')}</h3><span class="status-tag ${kind}">${escapeHtml(m.status || 'MODERATE')}</span></div>
        <div class="info-list">
          <div><span>📊</span><span><b>Score:</b> ${Number(m.score || 0)}/100</span></div>
          <div><span>🧠</span><span><b>Reason:</b> ${escapeHtml(m.reason || '')}</span></div>
          <div><span>📄</span><span><b>Prescription match:</b> ${m.prescription_match ? 'Yes' : 'Not clearly confirmed'}</span></div>
          <div><span>⚠️</span><span><b>Allergy risk:</b> ${m.allergy_risk ? 'Conflict found' : 'No conflict found'}</span></div>
          <div><span>⏱</span><span><b>Dose note:</b> ${escapeHtml(m.dose_note || '')}</span></div>
          <div><span>✅</span><span><b>Action:</b> ${escapeHtml(m.action || '')}</span></div>
        </div>
      </article>
    `;
  }

  function checkLine(icon, title, details, risk) {
    return `<div><span>${icon}</span><span><b>${title}:</b> ${escapeHtml(details || '')} ${risk ? '<b style="color:#e04343">Review needed.</b>' : ''}</span></div>`;
  }

  function careCard(title, items = []) {
    return `<div class="care-card"><h4>${title}</h4>${items.length ? `<ul>${items.map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ul>` : `<p class="muted">No specific guidance.</p>`}</div>`;
  }

  function renderHistory() {
    const reports = MediStorage.getReports();
    const list = $('#historyList');
    if (!reports.length) {
      list.innerHTML = `<div class="empty">No reports saved yet. Complete a scan to save records.</div>`;
      return;
    }
    list.innerHTML = reports.map(r => {
      const report = r.report || {};
      const meds = (report.medicine_results || []).map(m => m.medicine_name).slice(0, 2).join(', ') || 'Medicine report';
      const cls = report.overall_status === 'SAFE' ? 'safe' : report.overall_status === 'UNSAFE' ? 'unsafe' : 'moderate';
      return `
        <article class="history-card" data-history-id="${r.id}">
          <h3>${escapeHtml(meds)}</h3>
          <p>${escapeHtml(report.summary || '')}</p>
          <div class="history-meta">
            <span class="status-tag ${cls}">${escapeHtml(report.overall_status || 'MODERATE')}</span>
            <small>${new Date(r.created_at).toLocaleString()}</small>
          </div>
          <div class="card-actions">
            <button class="secondary-btn" data-open-report="${r.id}">Open</button>
            <button class="ghost-btn" data-delete-report="${r.id}">Delete</button>
          </div>
        </article>
      `;
    }).join('');
    $$('[data-open-report]').forEach(btn => btn.onclick = () => {
      const record = MediStorage.getReports().find(r => r.id === btn.dataset.openReport);
      if (record) { renderReport(record); go('report'); }
    });
    $$('[data-delete-report]').forEach(btn => btn.onclick = () => {
      MediStorage.deleteReport(btn.dataset.deleteReport);
      renderHistory();
    });
  }

  function resetForNewScan() {
    state.health_problem = '';
    state.medicines = [];
    state.prescription = { image: '', ocr_text: '' };
    $('#problemText').value = '';
    $('#prescriptionText').value = '';
    $('#prescriptionPreview').classList.add('hidden');
    renderMedicines();
    go('problem');
  }

  function downloadJSON(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      showToast('Copied');
    } catch (_) {
      showToast('Copy failed');
    }
  }

  async function shareReport(report) {
    const text = report.doctor_summary || report.summary;
    if (navigator.share) {
      try { await navigator.share({ title: 'MediCheck AI Report', text }); return; } catch (_) {}
    }
    copyText(text);
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;'
    }[char]));
  }

  function bind() {
    $('#backBtn').onclick = back;
    $('#startScanBtn').onclick = () => go('problem');
    $('#startIntroBtn').onclick = () => { $('#introModal').classList.add('hidden'); go('problem'); };
    $$('.quick-card, .nav-btn').forEach(btn => btn.onclick = () => go(btn.dataset.go));
    $('#voiceGuideBtn').onclick = () => {
      const guides = {
        home: 'Click the big plus button to start medicine safety check.',
        problem: 'Tell your health problem by speaking or typing. Judges can use auto fill.',
        profile: 'Select allergy, alcohol, smoking and health risk profile using the cards.',
        medicines: 'Add every medicine photo one by one, or use demo medicines for judges.',
        prescription: 'Upload prescription or use the example handwritten prescription, then submit for AI analysis.',
        report: 'This is your safety report. Use voice summary, doctor help, or download the report.',
        history: 'These are your saved reports stored on this device.'
      };
      MediVoice.speak(guides[state.screen] || 'MediCheck AI voice guide.');
    };

    $('#startSpeechBtn').onclick = () => MediVoice.startSpeechToText(text => {
      $('#problemText').value = text;
    }, status => $('#speechStatus').textContent = status);
    $('#stopSpeechBtn').onclick = () => MediVoice.stopSpeechToText();

    $('#demoProblemBtn').onclick = () => { $('#problemText').value = MediDemo.problem; showToast('Demo problem filled'); };
    $('#toProfileBtn').onclick = () => { state.health_problem = $('#problemText').value.trim(); go('profile'); };

    $$('#allergyChips .chip').forEach(chip => chip.onclick = () => toggleArray('allergies', chip.dataset.value));
    $$('#conditionChips .chip').forEach(chip => chip.onclick = () => toggleArray('conditions', chip.dataset.value));
    $$('.choice-card').forEach(card => card.onclick = () => setChoice(card.dataset.group, card.dataset.value));
    $('#addAllergyBtn').onclick = () => {
      const value = $('#customAllergy').value.trim();
      if (value && !state.profile.allergies.includes(value)) state.profile.allergies.push(value);
      $('#customAllergy').value = '';
      syncProfileUI();
    };
    $('#demoProfileBtn').onclick = () => {
      state.profile = JSON.parse(JSON.stringify(MediDemo.profile));
      syncProfileUI();
      showToast('Demo profile filled');
    };
    $('#toMedicinesBtn').onclick = () => { collectProfile(); go('medicines'); renderMedicines(); };

    $('#addMedicineBtn').onclick = () => $('#medicineFileInput').click();
    $('#medicineFileInput').onchange = e => addMedicineFiles([...e.target.files]);
    $('#demoMedsBtn').onclick = addDemoMedicines;
    $('#toPrescriptionBtn').onclick = () => {
      syncMedicineTextFromUI();
      if (!state.medicines.length) return showToast('Add at least one medicine first.');
      go('prescription');
    };

    $('#uploadPrescriptionBtn').onclick = () => $('#prescriptionFileInput').click();
    $('#prescriptionFileInput').onchange = e => { if (e.target.files[0]) loadPrescriptionFile(e.target.files[0]); };
    $('#demoPrescriptionBtn').onclick = setDemoPrescription;
    $('#submitAnalysisBtn').onclick = runAnalysis;

    $('#clearHistoryBtn').onclick = () => {
      MediStorage.clearReports();
      renderHistory();
      showToast('Records cleared');
    };
  }

  function init() {
    bind();
    syncProfileUI();
    renderMedicines();
    go('home');
    $('#backBtn').style.visibility = 'hidden';
    setTimeout(() => $('#introModal').classList.remove('hidden'), 2000);
    if ('speechSynthesis' in window) speechSynthesis.onvoiceschanged = () => {};
  }

  document.addEventListener('DOMContentLoaded', init);
})();
