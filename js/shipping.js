// Missara Clothing — NimbusPost Shipping Integration Module
// Handles: Pincode serviceability, zone mapping, rate calculation,
// delivery estimation, AWB generation, and tracking URLs.

// ==========================================
// NIMBUSPOST PARTNER CONFIG
// ==========================================
const NIMBUSPOST = {
  name: "NimbusPost",
  tagline: "AI-Powered Shipping Aggregator",
  icon: "fa-paper-plane",
  baseRate: 19,          // ₹19 per 500g (Zone A)
  perExtraKg: 12,        // ₹12 per additional 500g
  zoneBRate: 29,          // ₹29 per 500g (Zone B - Tier 2)
  zoneCRate: 42,          // ₹42 per 500g (Zone C - Remote)
  codCharge: 25,          // ₹25 flat COD handling fee
  codAvailable: true,
  awbPrefix: "NP",
  trackingBaseUrl: "https://ship.nimbuspost.com/shipping/tracking/",
  courierPartners: [
    "Delhivery", "BlueDart", "XpressBees", "Shadowfax",
    "Ecom Express", "DTDC", "India Post"
  ],
  features: [
    "AI Courier Selection",
    "29,000+ Pincodes",
    "WhatsApp Notifications",
    "RTO Management",
    "Branded Tracking Page",
    "Fraud Detection"
  ]
};

// ==========================================
// INDIAN PINCODE → ZONE MAPPING
// ==========================================
// Zone A = Metro (2-3 days) | Zone B = Tier-2 (3-5 days) | Zone C = Remote (5-7 days)
const PINCODE_ZONE_MAP = {
  // Zone A — Metro Cities
  "110": { zone: "A", city: "New Delhi", state: "Delhi" },
  "400": { zone: "A", city: "Mumbai", state: "Maharashtra" },
  "560": { zone: "A", city: "Bangalore", state: "Karnataka" },
  "600": { zone: "A", city: "Chennai", state: "Tamil Nadu" },
  "700": { zone: "A", city: "Kolkata", state: "West Bengal" },
  "411": { zone: "A", city: "Pune", state: "Maharashtra" },
  "500": { zone: "A", city: "Hyderabad", state: "Telangana" },
  "380": { zone: "A", city: "Ahmedabad", state: "Gujarat" },

  // Zone B — Tier-2 Cities
  "482": { zone: "B", city: "Jabalpur", state: "Madhya Pradesh" },
  "302": { zone: "B", city: "Jaipur", state: "Rajasthan" },
  "226": { zone: "B", city: "Lucknow", state: "Uttar Pradesh" },
  "452": { zone: "B", city: "Indore", state: "Madhya Pradesh" },
  "462": { zone: "B", city: "Bhopal", state: "Madhya Pradesh" },
  "440": { zone: "B", city: "Nagpur", state: "Maharashtra" },
  "360": { zone: "B", city: "Rajkot", state: "Gujarat" },
  "395": { zone: "B", city: "Surat", state: "Gujarat" },
  "208": { zone: "B", city: "Kanpur", state: "Uttar Pradesh" },
  "201": { zone: "B", city: "Noida/Ghaziabad", state: "Uttar Pradesh" },
  "122": { zone: "B", city: "Gurugram", state: "Haryana" },
  "160": { zone: "B", city: "Chandigarh", state: "Chandigarh" },
  "141": { zone: "B", city: "Ludhiana", state: "Punjab" },
  "143": { zone: "B", city: "Amritsar", state: "Punjab" },
  "800": { zone: "B", city: "Patna", state: "Bihar" },
  "751": { zone: "B", city: "Bhubaneswar", state: "Odisha" },
  "530": { zone: "B", city: "Visakhapatnam", state: "Andhra Pradesh" },
  "520": { zone: "B", city: "Vijayawada", state: "Andhra Pradesh" },
  "682": { zone: "B", city: "Kochi", state: "Kerala" },
  "695": { zone: "B", city: "Thiruvananthapuram", state: "Kerala" },
  "641": { zone: "B", city: "Coimbatore", state: "Tamil Nadu" },
  "625": { zone: "B", city: "Madurai", state: "Tamil Nadu" },
  "474": { zone: "B", city: "Gwalior", state: "Madhya Pradesh" },
  "486": { zone: "B", city: "Rewa", state: "Madhya Pradesh" },
  "470": { zone: "B", city: "Sagar", state: "Madhya Pradesh" },
  "473": { zone: "B", city: "Datia", state: "Madhya Pradesh" },
  "492": { zone: "B", city: "Raipur", state: "Chhattisgarh" },
  "490": { zone: "B", city: "Bilaspur", state: "Chhattisgarh" },
  "250": { zone: "B", city: "Meerut", state: "Uttar Pradesh" },
  "282": { zone: "B", city: "Agra", state: "Uttar Pradesh" },
  "211": { zone: "B", city: "Prayagraj", state: "Uttar Pradesh" },
  "221": { zone: "B", city: "Varanasi", state: "Uttar Pradesh" },
  "305": { zone: "B", city: "Ajmer", state: "Rajasthan" },
  "313": { zone: "B", city: "Udaipur", state: "Rajasthan" },
  "342": { zone: "B", city: "Jodhpur", state: "Rajasthan" },
  "334": { zone: "B", city: "Bikaner", state: "Rajasthan" },
  "831": { zone: "B", city: "Jamshedpur", state: "Jharkhand" },
  "834": { zone: "B", city: "Ranchi", state: "Jharkhand" },
  "370": { zone: "B", city: "Kutch", state: "Gujarat" },
  "180": { zone: "B", city: "Jammu", state: "J&K" },
  "248": { zone: "B", city: "Dehradun", state: "Uttarakhand" },
};

// Delivery day ranges per zone
const ZONE_DELIVERY_DAYS = {
  "A": { min: 2, max: 3, label: "Metro Express" },
  "B": { min: 3, max: 5, label: "Standard" },
  "C": { min: 5, max: 7, label: "Remote Area" }
};

// ==========================================
// PINCODE SERVICEABILITY CHECK
// ==========================================
function checkPincode(pincode) {
  const pin = String(pincode).trim();

  // Basic validation
  if (!/^\d{6}$/.test(pin)) {
    return {
      serviceable: false,
      error: "Invalid pincode. Please enter a valid 6-digit Indian pincode."
    };
  }

  // Find zone by first 3 digits
  const prefix3 = pin.substring(0, 3);
  const zoneInfo = PINCODE_ZONE_MAP[prefix3];

  if (zoneInfo) {
    // Known mapped pincode
    const days = ZONE_DELIVERY_DAYS[zoneInfo.zone];
    return {
      serviceable: true,
      pincode: pin,
      zone: zoneInfo.zone,
      zoneLabel: days.label,
      city: zoneInfo.city,
      state: zoneInfo.state,
      estimatedDays: days,
      estimatedDate: getEstimatedDelivery(zoneInfo.zone),
      rate: calculateRate(zoneInfo.zone, 0.5),
      codAvailable: NIMBUSPOST.codAvailable,
      partner: NIMBUSPOST.name
    };
  }

  // For unmapped but valid-looking Indian pincodes, classify as Zone C (Remote)
  const firstDigit = parseInt(pin[0]);
  if (firstDigit >= 1 && firstDigit <= 8) {
    const days = ZONE_DELIVERY_DAYS["C"];
    return {
      serviceable: true,
      pincode: pin,
      zone: "C",
      zoneLabel: days.label,
      city: "Remote Area",
      state: getStateFromFirstDigit(firstDigit),
      estimatedDays: days,
      estimatedDate: getEstimatedDelivery("C"),
      rate: calculateRate("C", 0.5),
      codAvailable: NIMBUSPOST.codAvailable,
      partner: NIMBUSPOST.name
    };
  }

  return {
    serviceable: false,
    error: "This pincode is currently not serviceable. Please try a nearby pincode."
  };
}

// Rough state mapping from first digit of Indian pincode
function getStateFromFirstDigit(d) {
  const map = {
    1: "Delhi / Haryana / Punjab / HP / J&K",
    2: "Uttar Pradesh / Uttarakhand",
    3: "Rajasthan / Gujarat",
    4: "Maharashtra / Goa / Madhya Pradesh",
    5: "Andhra Pradesh / Telangana / Karnataka",
    6: "Tamil Nadu / Kerala",
    7: "West Bengal / Odisha / NE States",
    8: "Bihar / Jharkhand"
  };
  return map[d] || "India";
}

// ==========================================
// RATE CALCULATOR
// ==========================================
function calculateRate(zone, weightKg) {
  const weight = Math.max(0.5, weightKg || 0.5);
  let baseRate;

  switch (zone) {
    case "A": baseRate = NIMBUSPOST.baseRate; break;
    case "B": baseRate = NIMBUSPOST.zoneBRate; break;
    case "C": baseRate = NIMBUSPOST.zoneCRate; break;
    default:  baseRate = NIMBUSPOST.zoneCRate;
  }

  // Calculate extra weight charge (per additional 500g after first 500g)
  const extraSlabs = Math.ceil((weight - 0.5) / 0.5);
  const extraCharge = extraSlabs > 0 ? extraSlabs * NIMBUSPOST.perExtraKg : 0;

  return baseRate + extraCharge;
}

// ==========================================
// DELIVERY DATE ESTIMATOR
// ==========================================
function getEstimatedDelivery(zone) {
  const days = ZONE_DELIVERY_DAYS[zone] || ZONE_DELIVERY_DAYS["C"];

  // Calculate estimated delivery date (max days from now, skipping Sundays)
  const today = new Date();
  let businessDaysAdded = 0;
  const targetDays = days.max;
  const deliveryDate = new Date(today);

  while (businessDaysAdded < targetDays) {
    deliveryDate.setDate(deliveryDate.getDate() + 1);
    // Skip Sundays (0 = Sunday)
    if (deliveryDate.getDay() !== 0) {
      businessDaysAdded++;
    }
  }

  return deliveryDate.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

// Get delivery date range string (e.g., "2-3 business days")
function getDeliveryRangeText(zone) {
  const days = ZONE_DELIVERY_DAYS[zone] || ZONE_DELIVERY_DAYS["C"];
  return `${days.min}-${days.max} business days`;
}

// ==========================================
// AWB NUMBER GENERATOR
// ==========================================
function generateNimbusAWB() {
  const digits = Math.floor(100000000 + Math.random() * 900000000);
  return `${NIMBUSPOST.awbPrefix}-${digits}`;
}

// ==========================================
// TRACKING URL BUILDER
// ==========================================
function getNimbusTrackingUrl(awbNumber) {
  return `${NIMBUSPOST.trackingBaseUrl}${encodeURIComponent(awbNumber)}`;
}

// ==========================================
// AI COURIER SUGGESTION (Simulated)
// ==========================================
function suggestCourier(zone) {
  // Simulated AI recommendation based on zone
  const suggestions = {
    "A": { courier: "Delhivery", reason: "Fastest metro delivery with 98.5% success rate" },
    "B": { courier: "XpressBees", reason: "Best cost-to-speed ratio for Tier-2 cities" },
    "C": { courier: "India Post", reason: "Widest rural coverage with reliable last-mile delivery" }
  };
  return suggestions[zone] || suggestions["C"];
}

// ==========================================
// SHIPPING LABEL DATA GENERATOR
// ==========================================
function generateShippingLabelData(order) {
  const pincodeResult = checkPincode(order.customer.pincode || "000000");

  return {
    // Sender (Missara Boutique)
    sender: {
      name: "MISSARA CLOTHING",
      address: "1st Floor, Agrawal Building, Bilhari Main Road",
      city: "Jabalpur",
      state: "Madhya Pradesh",
      pincode: "482020",
      phone: "+91 9713962329",
      gstin: "23XXXXX1234X1ZX"
    },
    // Receiver (Customer)
    receiver: {
      name: order.customer.name,
      address: order.customer.address,
      city: order.customer.city || "",
      state: order.customer.state || "",
      pincode: order.customer.pincode || "",
      phone: order.customer.phone
    },
    // Shipment details
    orderId: order.orderId,
    awb: order.trackingId || generateNimbusAWB(),
    courier: order.courierPartner || suggestCourier(pincodeResult.zone || "C").courier,
    weight: order.packageWeight || "0.5 Kg",
    items: order.items,
    totalItems: order.items.reduce((sum, i) => sum + i.quantity, 0),
    orderValue: order.total,
    paymentMethod: order.paymentMethod,
    isCOD: (order.paymentMethod || "").toUpperCase().includes("COD"),
    codAmount: (order.paymentMethod || "").toUpperCase().includes("COD") ? order.total : 0,
    zone: pincodeResult.zone || "C",
    estimatedDelivery: pincodeResult.estimatedDate || getEstimatedDelivery("C"),
    shipDate: new Date().toLocaleDateString("en-IN", {
      day: "numeric", month: "short", year: "numeric"
    }),
    partner: NIMBUSPOST.name
  };
}

// Make functions globally available
window.checkPincode = checkPincode;
window.calculateRate = calculateRate;
window.getEstimatedDelivery = getEstimatedDelivery;
window.getDeliveryRangeText = getDeliveryRangeText;
window.generateNimbusAWB = generateNimbusAWB;
window.getNimbusTrackingUrl = getNimbusTrackingUrl;
window.suggestCourier = suggestCourier;
window.generateShippingLabelData = generateShippingLabelData;
window.NIMBUSPOST = NIMBUSPOST;
window.ZONE_DELIVERY_DAYS = ZONE_DELIVERY_DAYS;
