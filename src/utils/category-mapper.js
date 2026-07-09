/**
 * Category Mapper Utility - Zentra RECOVERY Edition
 * Strict mapping to 3 verticals: Computing, Maker, Software.
 * Everything else is filtered out.
 */

// Strict Mapping (English Raw -> Zentra Vertical Slug)
const CATEGORY_MAPPING = {
    // --- VERTICAL 1: COMPUTING & WORKSTATIONS ---
    "Graphics Cards": "computing-workstation",
    "Video Cards": "computing-workstation",
    "CPUs": "computing-workstation",
    "Processors": "computing-workstation",
    "RAM": "computing-workstation",
    "Memory": "computing-workstation",
    "Motherboards": "computing-workstation",
    "Mainboards": "computing-workstation",
    "Computer Components": "computing-workstation",
    "PC Components": "computing-workstation",
    "Hard Drives": "computing-workstation",
    "SSD": "computing-workstation",
    "Storage Media": "computing-workstation",
    "Server": "computing-workstation",
    "Network Attached Storage": "computing-workstation",
    "Computers": "computing-workstation",
    "Laptops": "computing-workstation",
    "Desktops": "computing-workstation",
    "Monitors": "computing-workstation",
    "Keyboards": "computing-workstation",
    "Mice": "computing-workstation",
    "Webcams": "computing-workstation",
    "Networking": "computing-workstation",
    "Routers": "computing-workstation",

    // --- VERTICAL 2: MAKER & ELECTRONICS ---
    "Tools": "maker-electronics",
    "Hand Tools": "maker-electronics",
    "Power Tools": "maker-electronics",
    "Soldering": "maker-electronics",
    "Electronics": "maker-electronics",
    "Components": "maker-electronics",
    "SBC": "maker-electronics",
    "Single Board Computers": "maker-electronics",
    "Arduino": "maker-electronics",
    "Raspberry Pi": "maker-electronics",
    "3D Printing": "maker-electronics",
    "Filament": "maker-electronics",
    "Robotics": "maker-electronics",
    "Drones": "maker-electronics",
    "Toy Models": "maker-electronics", // Keep for advanced kits (Tamiya/Revell)
    "Hobbies": "maker-electronics",     // Potential overlap, check keywords later

    // --- VERTICAL 3: SOFTWARE & SECURITY ---
    "Software": "software-security",
    "Security Software": "software-security",
    "Antivirus": "software-security",
    "VPN": "software-security",
    "Operating Systems": "software-security",
    "Office Software": "software-security",
    "Utilities": "software-security"
};

const CATEGORY_NAMES = {
    "computing-workstation": "Computing & Workstations",
    "maker-electronics": "Maker & Electronics",
    "software-security": "Software & Security"
};

const CATEGORY_ICONS = {
    "computing-workstation": "<i class='fas fa-desktop' style='font-size: 3.5rem; color: #00f0ff;'></i>",
    "maker-electronics": "<i class='fas fa-microchip' style='font-size: 3.5rem; color: #00f0ff;'></i>",
    "software-security": "<i class='fas fa-shield-alt' style='font-size: 3.5rem; color: #00f0ff;'></i>"
};

module.exports = {
    getSlug: (rawCategory) => {
        if (!rawCategory) return null; // Drop empty
        // Direct match
        if (CATEGORY_MAPPING[rawCategory]) return CATEGORY_MAPPING[rawCategory];
        
        // Fuzzy match for critical keywords
        const lower = rawCategory.toLowerCase();
        if (lower.includes("graphic") || lower.includes("gpu") || lower.includes("ryzen") || lower.includes("intel") || lower.includes("nvidia")) return "computing-workstation";
        if (lower.includes("soldering") || lower.includes("3d print") || lower.includes("arduino")) return "maker-electronics";
        if (lower.includes("antivirus") || lower.includes("vpn")) return "software-security";
        
        return null; // FILTER EVERYTHING ELSE (No Lifestyle, No Clothes!)
    },

    getDisplayName: (slug) => CATEGORY_NAMES[slug] || slug,
    getIcon: (slug) => CATEGORY_ICONS[slug] || "",
    getDescription: (slug) => "High-Quality Tech Gear", 
    
    // For build wizard to get allowed categories
    getAllowedSlugs: () => ["computing-workstation", "maker-electronics", "software-security"]
};
