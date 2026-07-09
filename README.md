# 🛒 Zentra: High-Performance Static Affiliate Engine

Zentra is an offline-first, high-performance static site generator (SSG) built to power large-scale affiliate websites. It parses, filters, and aggregates product data feeds (CSV format with over 140,000+ entries) and compiles them into a fast, fully SEO-optimized directory of 2,300+ static pages.

By compiling the site into pure HTML, CSS, and lightweight client-side JavaScript, Zentra eliminates database load, achieves sub-second page loads, and runs with zero server runtime overhead.

---

## ⚡ Key Capabilities & Features

*   **📂 Massive Feed Aggregation:** Parses and normalizes 220MB+ CSV files from affiliate platforms (e.g., Awin) using a custom line-by-line streaming parser in Node.js.
*   **🛠️ Static Compilation:** Generates 2,300+ paginated categories, brand archives, product detail pages, and dynamic price-comparison grids.
*   **📈 Advanced SEO Engine:** Automatically embeds structural JSON-LD metadata, Breadcrumbs, FAQ pages, canonical URLs, and dynamic Open Graph images on compile.
*   **📱 PWA Ready:** Implements offline fallback capabilities, dark mode theme switcher, and app shortcut support.
*   **🔒 Local Security Architecture:** Deploys easily with a secure FTP upload pipeline (configured via GitHub Actions Secrets) to minimize host environment risks.

---

## 🛠️ Technology Stack

*   **Core Parser & Generator:** Node.js, Custom streaming CSV Parser, SQLite
*   **Frontend Engine:** Vanilla HTML5, CSS3, ES6+ Javascript (no heavy frameworks, zero layout shifts)
*   **Automation:** Python scripts for asset resizing (PIL) and OG image rendering
*   **Database Integration:** Firebase / Firestore (optional client-side sync for user wishlists and reviews)

---

## 🚀 Setup & Local Build

### Prerequisites
*   Node.js (v18+)

### Installation
1.  **Clone the repository:**
    ```bash
    git clone https://github.com/Salko-Agent/zentra-static-engine.git
    cd zentra-static-engine
    ```
2.  **Configure Firebase:**
    *   Create a Firebase project.
    *   Add your client config keys into `firebase-config.js`.
3.  **Prepare Product Feed:**
    *   A lightweight mock feed (`datafeed_2630106.csv`) is provided for testing.
    *   Replace this file with your actual CSV feed containing the standard Awin schema.
4.  **Run Build Script:**
    *   Compile the static site:
        ```bash
        node build.js
        ```
    *   The completed static site will be compiled into the `dist/` directory.
