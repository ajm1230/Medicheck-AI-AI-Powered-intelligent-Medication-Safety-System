window.MediVoice = (() => {
  let recognition = null;
  let activeUtterance = null;

  function pickVoice() {
    const voices = window.speechSynthesis ? speechSynthesis.getVoices() : [];
    const preferred = voices.find(v => /india|indian|en-IN/i.test(`${v.name} ${v.lang}`))
      || voices.find(v => /google.*english/i.test(v.name))
      || voices.find(v => /english/i.test(`${v.name} ${v.lang}`));
    return preferred || null;
  }

  function speak(text, opts = {}) {
    if (!window.speechSynthesis || !text) return false;
    stop();
    activeUtterance = new SpeechSynthesisUtterance(text);
    activeUtterance.rate = opts.rate || 0.92;
    activeUtterance.pitch = opts.pitch || 1;
    activeUtterance.volume = opts.volume || 1;
    const voice = pickVoice();
    if (voice) activeUtterance.voice = voice;
    speechSynthesis.speak(activeUtterance);
    return true;
  }

  function stop() {
    if (window.speechSynthesis) speechSynthesis.cancel();
    activeUtterance = null;
  }

  function startSpeechToText(onText, onStatus) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      onStatus && onStatus("Speech-to-text not supported in this browser. Type manually.");
      return false;
    }
    stopSpeechToText();
    recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.interimResults = true;
    recognition.continuous = true;
    let finalText = "";
    recognition.onstart = () => onStatus && onStatus("Listening... speak clearly.");
    recognition.onerror = e => onStatus && onStatus(`Speech error: ${e.error}`);
    recognition.onend = () => onStatus && onStatus("Speech stopped.");
    recognition.onresult = event => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += text + " ";
        else interim += text;
      }
      onText && onText((finalText + interim).trim());
    };
    recognition.start();
    return true;
  }

  function stopSpeechToText() {
    if (recognition) {
      try { recognition.stop(); } catch (_) {}
      recognition = null;
    }
  }

  return { speak, stop, startSpeechToText, stopSpeechToText };
})();
