window.MediDemo = {
  problem: "Fever, body pain, mild acidity. Patient is allergic to ibuprofen.",
  profile: {
    age: 16,
    weight: "",
    allergies: ["Ibuprofen"],
    alcohol: "sometimes",
    smoking: "no",
    conditions: ["Acidity"],
    current_medicines: []
  },
  medicines: [
    {
      id: "demo_med_1",
      name: "Paracetamol 650 mg",
      image: "assets/sample-medicine-1.svg",
      ocr_text: "Dolo 650 Tablet. Composition: Paracetamol 650 mg. Batch: DL650A. Exp: 08/2027. Manufacturer: Micro Labs. For fever and body pain.",
      barcode_data: "DEMO-DL650-PARACETAMOL"
    },
    {
      id: "demo_med_2",
      name: "Ibuprofen 400 mg",
      image: "assets/sample-medicine-2.svg",
      ocr_text: "Ibugesic 400 Tablet. Composition: Ibuprofen 400 mg. Batch: IB400Q. Exp: 01/2027. Pain relief anti-inflammatory medicine.",
      barcode_data: "DEMO-IB400-IBUPROFEN"
    },
    {
      id: "demo_med_3",
      name: "Amoxicillin 500 mg",
      image: "assets/sample-medicine-3.svg",
      ocr_text: "Amox 500 Capsule. Composition: Amoxicillin 500 mg. Antibiotic. Batch: AMX500. Exp: 11/2026. Take only on doctor prescription.",
      barcode_data: "DEMO-AMX500-AMOXICILLIN"
    }
  ],
  prescription: {
    image: "assets/sample-prescription.svg",
    ocr_text: "Handwritten prescription: Patient has fever and body pain. Rx: Paracetamol 650 mg, 1 tablet after food, twice daily for 3 days. ORS/water. Avoid ibuprofen due to allergy. Review if fever continues."
  },
  doctors: [
    { name: "Dr. Kumar", speciality: "General Physician", status: "Available now", phone: "108" },
    { name: "Dr. Harsh", speciality: "Medicine Specialist", status: "Available in 10 min", phone: "108" },
    { name: "Dr. Ansh", speciality: "Emergency Consultant", status: "Available now", phone: "112" }
  ]
};
