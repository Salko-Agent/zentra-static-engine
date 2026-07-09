# 🛒 Zentra: High-Performance Static Affiliate Engine

> Advanced compiler-based static site generator (SSG) that compiles massive product feeds (140k+ entries) into 2,300+ paginated, ultra-fast, and SEO-optimized static category and product pages.

![Zentra Showcase Mockup](assets/images/og-home.jpg) *(OG Image placeholder)*

---

## 🔗 Live & Links
*   **Live Demo:** [bmsdigitalsolutions.com/demos/zentra/](https://bmsdigitalsolutions.com/demos/zentra/) *(Demo location on portfolio hub)*
*   **Tech Stack:** Node.js, Custom CSV Stream Parser, SQLite, Vanilla HTML5, CSS3, ES6+ Javascript, Python (asset optimization)

---

## 💡 Project Overview

### ❌ Was war das Problem?
Klassische, datenbankgestützte Affiliate- und Vergleichsportale sind bei steigenden Produktzahlen oft träge, teuer im Serverunterhalt und anfällig für Sicherheitslücken. Dynamische Datenbankabfragen bei jedem Seitenaufruf verlangsamen die Ladezeiten, was sich negativ auf die Conversion-Rate und das Google SEO-Ranking (Core Web Vitals) auswirkt.

### 🛠️ Was habe ich gebaut?
Eine **compiler-basierte statische Engine**, die große CSV-Feeds (z. B. Awin mit über 140.000 Produkten) offline einliest, normalisiert und direkt in ein voll funktionsfähiges, statisches HTML/CSS-Verzeichnis kompiliert (über 2.300 Detail- und Kategorieseiten). Dadurch wird der Server zur reinen Datei-Auslieferung genutzt – mit Ladezeiten im Millisekundenbereich und 0 % Datenbanklast.

### 🌟 Was ist besonders?
*   **⚡ Memory-Efficient Stream Parsing:** Ein maßgeschneiderter Zeilen-Streaming-Parser verarbeitet 220MB+ große CSV-Feeds speicherschonend in Node.js, ohne den RAM zu überlasten.
*   **📈 Rich-Snippet Automatisierung:** Jede generierte statische HTML-Seite erhält beim Build-Prozess automatisch valide JSON-LD Metadaten (Breadcrumbs, Product, FAQ und CollectionPage Schemas) für maximale Sichtbarkeit in den Google-Suchergebnissen.
*   **🚀 100/100 Core Web Vitals:** Die generierten Seiten nutzen DNS-Prefetching für externe Assets, preloaded critical CSS, asynchron geladene Webfonts und aufgeschobene JS-Ausführung, um maximale Ladegeschwindigkeiten zu garantieren.
*   **🔒 Keine Datenbank-Sicherheitsrisiken:** Da im Live-Betrieb keine Datenbank genutzt wird, sind SQL-Injections, Serverabstürze und Datenlecks im Frontend technisch ausgeschlossen.

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
    *   Add your client config keys into `firebase-config.js` (for wishlists/reviews support).
3.  **Prepare Product Feed:**
    *   A lightweight mock feed (`datafeed_2630106.csv`) is provided for testing.
    *   Replace this file with your actual CSV feed containing the standard Awin schema.
4.  **Run Build Script:**
    *   Compile the static site:
        ```bash
        node build.js
        ```
    *   The completed static site will be compiled into the `dist/` directory.
