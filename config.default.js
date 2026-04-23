/**
 * Default shop configuration (demo/fallback)
 * Used when no owner-saved configuration is found.
 */
window.__DEFAULT_SHOP_CONFIG__ = {
  shopName: "Sample Store",
  llmEnabled: true,   // Gemini 2.0 Flash LLM-first response
  businessType: "cafe",
  accentColor: "#6B5344",
  intro: "A chatbot demo for small businesses like cafes, restaurants, nail salons, photo studios, and clinics.",
  hours: "Weekdays 09:00–18:00, Weekends 10:00–17:00",
  closed: "Every Monday",
  address: "123 Teheran-ro, Gangnam-gu, Seoul",
  directions: "5-minute walk from Exit 3 of Yeoksam Station (Subway Line 2)",
  instagramUrl: "",
  naverMapUrl: "",
  googleMapUrl: "",
  wifiInfo: "WiFi password: 1234",
  restroomInfo: "",
  parkingInfo: "",
  reservation: "Reservations available via Instagram DM. Please share your party size and preferred time.",
  orderInfo: "Takeout available. Delivery by Instagram DM order only.",
  eventText: "10% group discount. Free drink for first-time visitors.",
  menu: [
    { name: "Americano", price: "4,500 KRW" },
    { name: "Cafe Latte", price: "5,000 KRW" },
    { name: "Bagel Set", price: "7,000 KRW" }
  ],
  customQA: [
    { question: "signature", answer: "Enter your signature menu item here. (e.g. Roasting Americano, Brown Sugar Latte)" },
    { question: "popular menu", answer: "Enter your best-selling menu item here." },
    { question: "cappuccino", answer: "Briefly explain the difference between latte and cappuccino. (e.g. Cappuccino has more milk foam and a stronger taste)" },
    { question: "cold brew", answer: "Explain the difference between cold brew and americano. (e.g. Cold brew is coffee extracted slowly with cold water over a long period)" },
    { question: "decaf", answer: "Enter decaf availability. (e.g. Decaf beans available upon request)" },
    { question: "sweet", answer: "Describe the sweetness level of cakes/breads. (e.g. On the sweeter side)" },
    { question: "dessert recommendation", answer: "Enter desserts that pair well with coffee." },
    { question: "kids", answer: "Enter kid-friendly or caffeine-free menu options. (e.g. Hot chocolate, strawberry smoothie, decaf)" },
    { question: "acidity", answer: "Enter bean change options for low-acidity preferences." },
    { question: "oat milk", answer: "Enter whether alternative milks like oat milk or soy milk are available." },
    { question: "syrup", answer: "Enter whether syrup and ice amount can be adjusted." },
    { question: "extra shot", answer: "Enter extra shot price. (e.g. +500 KRW)" },
    { question: "tumbler", answer: "Enter tumbler discount info. (e.g. 300 KRW discount for personal cups)" },
    { question: "wifi", answer: "Enter WiFi password and connection instructions." },
    { question: "restroom", answer: "Enter restroom location and access code." },
    { question: "parking", answer: "Enter parking availability, location, and free parking duration." },
    { question: "outlet", answer: "Enter info about seats with outlets or charging services." },
    { question: "tray return", answer: "Enter the location to return cups and trays." },
    { question: "closing time", answer: "Enter any additional info about closing time. (Default hours are shown in the operating info above)" },
    { question: "Apple Pay", answer: "Yes, Apple Pay is accepted." },
    { question: "points", answer: "Enter loyalty point or stamp card information." },
    { question: "takeout discount", answer: "Enter whether a discount applies for takeout orders." },
    { question: "outside food", answer: "Enter whether outside food (e.g. birthday cakes) is allowed." }
  ]
};
