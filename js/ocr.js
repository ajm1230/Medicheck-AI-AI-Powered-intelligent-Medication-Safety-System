window.MediOCR = (() => {
  let tesseractPromise = null;

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if ([...document.scripts].some(s => s.src === src)) return resolve();
      const s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  async function ensureTesseract() {
    if (window.Tesseract) return window.Tesseract;
    if (!tesseractPromise) {
      tesseractPromise = loadScript("https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js")
        .then(() => window.Tesseract);
    }
    return tesseractPromise;
  }

  function fileToDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function resizeImage(dataUrl, maxWidth = 1200) {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.72));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  }

  async function recognize(file, onProgress) {
    const preview = await fileToDataURL(file);
    const smallImage = await resizeImage(preview);
    try {
      const Tesseract = await ensureTesseract();
      const result = await Tesseract.recognize(smallImage, "eng", {
        logger: m => {
          if (m.status && onProgress) onProgress(`${m.status} ${Math.round((m.progress || 0) * 100)}%`);
        }
      });
      return {
        preview,
        text: (result?.data?.text || "").trim(),
        source: "tesseract"
      };
    } catch (error) {
      return {
        preview,
        text: "",
        source: "ocr-unavailable",
        error: error.message || "OCR unavailable"
      };
    }
  }

  return { recognize, fileToDataURL };
})();
