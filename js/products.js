// Centralized Product Database for Missara Clothing - Loaded from Server

const BACKUP_PRODUCTS = [
  {
    id: 1,
    title: "Pastel Pink Anarkali Suit Set",
    category: "Kurtas & Suits",
    price: 1899,
    originalPrice: 3799,
    rating: 4.8,
    reviewsCount: 142,
    inventory: 8,
    image: "images/hero_banner_1.png", // Main beautiful image
    hoverImage: "images/product_kurta.png",
    description: "An elegant pastel pink cotton Anarkali suit set, featuring exquisite white embroidery on the neckline and borders. Perfect for festive celebrations, family gatherings, and weddings. Fabric is pure cotton, breathable, and designed for a royal silhouette.",
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Pastel Pink", "Off-White"],
    tag: "Best Seller",
    fabric: "Cotton",
    occasion: "Festive",
    pattern: "Embroidered",
    style: "Anarkali",
    sleeveLength: "3/4 Sleeves",
    neck: "V-Neck",
    details: {
      fabric: "100% Premium Cotton",
      length: "Calf Length",
      neck: "V-Neck",
      washCare: "Dry Clean Preferred or Hand Wash Separately in Cold Water"
    }
  },
  {
    id: 2,
    title: "Pink Floral Printed Silk Saree",
    category: "Sarees",
    price: 3299,
    originalPrice: 6599,
    rating: 4.9,
    reviewsCount: 98,
    inventory: 12,
    image: "images/hero_banner_2.png",
    hoverImage: "images/product_saree.png",
    description: "Adorn yourself in this gorgeous pink floral printed silk saree. Crafted with high-quality silk, it features delicate gold border piping and comes with an unstitched white designer blouse piece. It offers a smooth drape and a radiant sheen.",
    sizes: ["FS"], // Free Size
    colors: ["Floral Pink", "Blush Pink"],
    tag: "Trending",
    fabric: "Silk",
    occasion: "Festive",
    pattern: "Floral Printed",
    style: "Draped Saree",
    sleeveLength: "N/A",
    neck: "N/A",
    details: {
      fabric: "Pure Art Silk",
      length: "5.5 Meters + 0.8 Meter Blouse Piece",
      neck: "N/A",
      washCare: "Dry Clean Only"
    }
  },
  {
    id: 3,
    title: "Premium Cotton Embroidered Kurta Set",
    category: "Kurtas & Suits",
    price: 1599,
    originalPrice: 3199,
    rating: 4.7,
    reviewsCount: 215,
    inventory: 15,
    image: "images/product_kurta.png",
    hoverImage: "images/hero_banner_1.png",
    description: "A chic, minimalist embroidered pink kurta set featuring straight-fit trousers and a floral printed organza dupatta. Made with premium cotton, this outfit is both soft and breathable, making it suitable for hot summer days or office wear.",
    sizes: ["M", "L", "XL", "XXL"],
    colors: ["Rose Pink", "White"],
    tag: "Best Seller",
    fabric: "Cotton",
    occasion: "Office Wear",
    pattern: "Embroidered",
    style: "Straight Fit",
    sleeveLength: "3/4 Sleeves",
    neck: "Round Neck",
    details: {
      fabric: "Premium Cotton Blend",
      length: "Knee Length",
      neck: "Round Neck",
      washCare: "Machine wash cold with light colors"
    }
  },
  {
    id: 4,
    title: "Pastel Pink & Gold Lehenga Choli",
    category: "Lehengas",
    price: 8999,
    originalPrice: 17999,
    rating: 5.0,
    reviewsCount: 34,
    inventory: 5,
    image: "images/product_lehenga.png",
    hoverImage: "images/hero_banner_1.png",
    description: "A breathtaking lehenga choli set in soft pastel pink, decorated with golden sequin patterns and thread embroidery. Paired with a delicate net dupatta, this ensemble is a dream choice for modern bridesmaids and brides alike.",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Pastel Pink", "Champagne Gold"],
    tag: "Festive Special",
    fabric: "Georgette",
    occasion: "Wedding",
    pattern: "Sequin Pattern",
    style: "Lehenga Choli",
    sleeveLength: "Sleeveless",
    neck: "Sweetheart Neck",
    details: {
      fabric: "Georgette with Net Dupatta",
      length: "Floor Length",
      neck: "Sweetheart Neck",
      washCare: "Dry Clean Only"
    }
  },
  {
    id: 5,
    title: "Floral Pink Ethnic Fusion Dress",
    category: "Fusion Wear",
    price: 1499,
    originalPrice: 2999,
    rating: 4.6,
    reviewsCount: 88,
    inventory: 9,
    image: "images/product_dress.png",
    hoverImage: "images/hero_banner_2.png",
    description: "A trendy fusion dress combining modern silhouette with traditional floral ethnic motifs. Designed in lightweight georgette, this outfit features tier styling, a flattering waist tie, and a comfortable inner lining.",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Magenta Pink", "White"],
    tag: "New Arrival",
    fabric: "Georgette",
    occasion: "Casual",
    pattern: "Floral Printed",
    style: "A-Line",
    sleeveLength: "Full Sleeves",
    neck: "Mandarin Collar",
    details: {
      fabric: "Fine Georgette",
      length: "Maxi Length",
      neck: "Mandarin Collar",
      washCare: "Hand wash separately"
    }
  },
  {
    id: 6,
    title: "Blush Pink Cotton Tunic",
    category: "Tunics & Tops",
    price: 899,
    originalPrice: 1799,
    rating: 4.5,
    reviewsCount: 56,
    inventory: 0, // OUT OF STOCK
    image: "images/product_kurta.png",
    hoverImage: "images/product_dress.png",
    description: "A lightweight, stylish blush pink short tunic kurta. Features delicate lace inserts on the sleeves and collar, perfect to pair with jeans or ethnic leggings for a casual day out.",
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Blush Pink"],
    tag: "Trending",
    fabric: "Cotton",
    occasion: "Casual",
    pattern: "Solid",
    style: "Tunic",
    sleeveLength: "Half Sleeves",
    neck: "Mandarin Collar",
    details: {
      fabric: "100% Khadi Cotton",
      length: "Short Tunic",
      neck: "Mandarin Collar with Placket",
      washCare: "Gentle Machine Wash"
    }
  },
  {
    id: 7,
    title: "Deep Pink Embroidered Velvet Suit",
    category: "Kurtas & Suits",
    price: 4299,
    originalPrice: 8599,
    rating: 4.9,
    reviewsCount: 43,
    inventory: 6,
    image: "images/hero_banner_1.png",
    hoverImage: "images/product_lehenga.png",
    description: "Indulge in sheer luxury with this deep rose pink velvet suit set. Adorned with heavy zari embroidery and beadwork, this suit is designed to keep you warm and glamorous at winter weddings.",
    sizes: ["M", "L", "XL", "XXL"],
    colors: ["Deep Rose Velvet"],
    tag: "New Arrival",
    fabric: "Velvet",
    occasion: "Wedding",
    pattern: "Embroidered",
    style: "Straight Fit",
    sleeveLength: "Full Sleeves",
    neck: "Round Neck",
    details: {
      fabric: "Premium Velvet",
      length: "Calf Length",
      neck: "Round Neck with Slit",
      washCare: "Dry Clean Only"
    }
  },
  {
    id: 8,
    title: "Pink Banarasi Silk Saree",
    category: "Sarees",
    price: 4999,
    originalPrice: 9999,
    rating: 4.9,
    reviewsCount: 65,
    inventory: 10,
    image: "images/product_saree.png",
    hoverImage: "images/hero_banner_2.png",
    description: "A traditional Banarasi silk saree showcasing intricate silver and gold brocade weaving. A rich border and heavy pallu make this a timeless heirloom piece for weddings and special rituals.",
    sizes: ["FS"],
    colors: ["Hot Pink", "Gold"],
    tag: "Best Seller",
    fabric: "Silk",
    occasion: "Wedding",
    pattern: "Zari Woven",
    style: "Draped Saree",
    sleeveLength: "N/A",
    neck: "N/A",
    details: {
      fabric: "Pure Katan Silk Blend",
      length: "5.5 Meters + Blouse",
      neck: "N/A",
      washCare: "Dry Clean Only"
    }
  },
  {
    id: 9,
    title: "Pastel Pink Embroidered Co-Ord Set",
    category: "Co-Ord Sets",
    price: 2499,
    originalPrice: 4999,
    rating: 4.8,
    reviewsCount: 37,
    inventory: 15,
    image: "images/product_dress.png",
    hoverImage: "images/hero_banner_1.png",
    description: "A stylish pastel pink 2-piece Co-Ord Set featuring a chic tunic top and matching trousers with delicate embroidery. Crafted in premium cotton for ultimate comfort and contemporary elegance.",
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Pastel Pink", "Off-White"],
    tag: "Trending",
    fabric: "Cotton",
    occasion: "Casual",
    pattern: "Embroidered",
    style: "Co-Ord Set",
    sleeveLength: "3/4 Sleeves",
    neck: "V-Neck",
    sku: "MSR-CRD-1009",
    details: {
      fabric: "100% Pure Premium Cotton",
      length: "Hip Length Top + Full Length Trousers",
      neck: "V-Neck",
      washCare: "Hand Wash Separately or Machine Wash Cold"
    }
  }
];

let PRODUCTS = [];

// Load products catalog from server
async function loadProductsCatalog() {
  try {
    const res = await fetch('/api/products?t=' + Date.now(), { cache: 'no-store' });
    if (!res.ok) throw new Error('API server returned error');
    PRODUCTS = await res.json();
  } catch (e) {
    console.error("Error loading products from server, falling back to backup list:", e);
    PRODUCTS = BACKUP_PRODUCTS;
  }
}

// Helper functions for Database
function getProductById(id) {
  return PRODUCTS.find(p => p.id === parseInt(id));
}

function getFeaturedProducts(tag) {
  return PRODUCTS.filter(p => p.tag === tag);
}

function getProductsByCategory(category) {
  return PRODUCTS.filter(p => p.category.toLowerCase() === category.toLowerCase());
}
