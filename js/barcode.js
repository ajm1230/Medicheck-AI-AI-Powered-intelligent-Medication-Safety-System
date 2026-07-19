window.MediBarcode = (() => {
  async function scan(file) {
    if (!("BarcodeDetector" in window)) {
      return { supported: false, value: "", note: "BarcodeDetector not supported on this browser." };
    }
    try {
      const formats = await BarcodeDetector.getSupportedFormats();
      const detector = new BarcodeDetector({ formats: formats.includes("qr_code") ? formats : undefined });
      const bitmap = await createImageBitmap(file);
      const codes = await detector.detect(bitmap);
      return {
        supported: true,
        value: codes.map(c => c.rawValue).join(", "),
        note: codes.length ? "Barcode/QR detected." : "No barcode/QR detected."
      };
    } catch (error) {
      return { supported: true, value: "", note: error.message || "Barcode scan failed." };
    }
  }
  return { scan };
})();
