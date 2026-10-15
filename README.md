# Curation Kitchen - The Smart Digital Culinary Assistant

> **Mission Statement**  
> Curation Kitchen is a modern, globally adaptable digital culinary assistant engineered to optimize wholesome, balanced, and sustainable eating habits. The platform actively benchmarks dietary wellness by defaulting on boot to **Health Canada's Dietary Reference Intakes (DRIs)** while offering effortless multi-region toggles for international users (including United States USDA and International WHO targets). Through automated nutritional balancing, smart pantry logistics, and localized grocery fulfillment, Curation Kitchen empowers cooks and families worldwide to plan, shop, and cook with dietary confidence.

---

## 1. Project Title & Mission

### Curation Kitchen — The Smart Digital Culinary Assistant
Curation Kitchen bridges culinary artistry, evidence-based nutrition science, and modern e-commerce convenience. Rather than relying on arbitrary diet trends, our nutritional calculation engine initializes with **Health Canada's Dietary Reference Intakes (DRIs)** for localized precision while maintaining full dynamic support for United States (USDA) and International (WHO) dietary standards.

Every saved meal, imported web recipe, and curated pantry staple is evaluated against international and Canadian nutritional benchmarks—including essential macronutrient ratios, dietary fibre thresholds, micronutrient targets, and sodium moderation guidelines.

Key nutritional pillars:
- **Health Canada DRI Default Baseline**: Transparent nutrient evaluations calculated against official Canadian dietary reference values on boot, with seamless switches to US (USDA) and Global (WHO) targets.
- **Portion & Macro Transparency**: Granular per-serving breakdowns across proteins, complex carbohydrates, healthy fats, sodium, and dietary fibre.
- **Accessibility & Global Practicality**: Bridging recipe planning with real-world grocery fulfillment and ingredient availability.

---

## 2. Technical Architecture

Curation Kitchen is built as a high-performance, cross-platform culinary platform operating seamlessly across modern web browsers and native mobile devices.

```
                      ┌──────────────────────────────────────────────┐
                      │            Curation Kitchen Client            │
                      ├──────────────────────┬───────────────────────┤
                      │   React 19 Web App   │ Android Native Client │
                      │  (Tailwind CSS +     │   (Jetpack Compose +  │
                      │    Glassmorphism)    │    Material 3 + MVI)  │
                      └──────────┬───────────┴───────────┬───────────┘
                                 │                       │
                                 ▼                       ▼
                      ┌──────────────────────────────────────────────┐
                      │         Node.js / Express Server API         │
                      │             (TypeScript Runtime)             │
                      ├──────────────────────────────────────────────┤
                      │  • Recipe Ingestion & Parsing Engine         │
                      │  • Multi-Region Health Benchmarking (CA/US/WHO│
                      │  • Gemini 3.6 Flash LLM Agent Integration    │
                      └──────────────────────┬───────────────────────┘
                                             │
                                             ▼
                      ┌──────────────────────────────────────────────┐
                      │    Canadian Grocery Fulfillment Pipeline     │
                      ├──────────────────────┬───────────────────────┤
                      │   Instacart Canada   │    Walmart Canada     │
                      │  • Loblaws / Costco  │  • Rollback Search    │
                      │  • Superstore/Metro  │  • Rakuten Affiliate  │
                      ├──────────────────────┴───────────────────────┤
                      │                Voilà by Sobeys               │
                      │  • Temperature-Controlled Warehousing        │
                      │  • Impact Affiliate SubID Routing            │
                      └──────────────────────────────────────────────┘
```

### Stack Components:
1. **Server Backend (Node.js & Express)**
   - **Runtime**: TypeScript executing on Node.js.
   - **AI Intelligence**: Powered by **Gemini 3.6 Flash** for instantaneous, context-aware web recipe ingestion, ingredient parsing, and taxonomy extraction.
   - **Data Flow**: RESTful API endpoints for recipe management, pantry inventory persistence, and nutritional benchmark verification.

2. **Web Frontend (React 19)**
   - **Framework**: React 19 with Vite, TanStack Query (React Query), and Motion layout transitions.
   - **Design System**: Warm culinary palette (Buttercream `#FAF6EE`, Terracotta Orange `#D95338`, Sage Green `#6E8B6B`, Charcoal `#2C2A29`) styled via modern Tailwind CSS with subtle glassmorphic surfaces, tactile micro-interactions, and accessible contrast ratios.
   - **Workspace Layout**: Responsive Culinary Workspace Grid with structured modules (Pantry Hub, Meal Planner, Collections Directory, Category Organizer, UPC Scanner, Recipe Search).

3. **Mobile Client (Native Android)**
   - **UI Toolkit**: Modern **Jetpack Compose** using Material 3 design tokens.
   - **Architecture**: Unidirectional Data Flow (UDF) with Kotlin StateFlow, Kotlin Coroutines, and Room / Repository pattern integration.
   - **Theming**: System-adaptive light and dark mode respecting the Buttercream and Terracotta visual guidelines.

---

## 3. Automated Feature Breakdown

### Instant Recipe Ingestion
- **One-Tap URL & Text Extraction**: Users can paste any recipe URL or raw unstructured recipe text.
- **Gemini 3.6 Flash Processing**: Structured extraction of recipe title, cook times, yields, step-by-step instructions, and exact ingredient measurements into a strongly-typed schema.
- **Dietary Tagging**: Automated parsing of dietary flags (high protein, low glycemic index, vegetarian, gluten-free, dairy-free) normalized against dietary reference frameworks.

### Intelligent Category Prediction
- **Semantic Classification**: Real-time taxonomic mapping of extracted ingredients into natural supermarket departments:
  - *Produce* (vegetables, fresh herbs, fruits)
  - *Dairy & Refrigerated* (cheeses, milks, butters, yogurts)
  - *Baking & Spices* (flours, leavening agents, extracts, spices)
  - *Grains & Pasta* (polenta, rice, legumes, pastas)
  - *Seafood & Proteins* (wild fish, poultry, cuts)
  - *Pantry Essentials & Oils* (olive oils, vinegars, stocks)
- **Auto-Deduplication**: Resolves culinary synonyms and measures into standardized pantry stock units.

### Pantry Shelf Hub
- **Live Inventory Ledger**: Tracks available units as clean decimal floats (e.g. `3.5 units available`) across active pantry shelves.
- **Automated Recipe Import Seeding**: Ingredients from imported recipes are automatically cross-checked and seeded into the pantry ledger.
- **Visual Stock Health Indicators**:
  - `● In Stock` (Sage Green) for active ingredients.
  - `● Out of Stock / Need to Buy` (Terracotta Orange) for depleted or missing items (`0.0 units`).
- **Interactive Multi-Filter**: Filter inventory instantly by supermarket department or keyword search.

---

## 4. E-Commerce Integration & Affiliate Monetization

### Canadian Grocery Delivery Fulfillment Module
The missing ingredient problem represents the single largest friction point between culinary inspiration and home cooking. Curation Kitchen solves this with an integrated, high-utility Canadian e-commerce routing pipeline designed specifically to drive qualified affiliate conversions.

```
  [Out of Stock Ingredient] ──► [Tap "Order Grocery Delivery"] 
                                           │
                                           ▼
                       ┌────────────────────────────────────────┐
                       │   Interactive Modal Bottom Sheet UI    │
                       │     "Select Grocery Delivery (🇨🇦)"     │
                       └───────────────────┬────────────────────┘
                                           │
         ┌─────────────────────────────────┼─────────────────────────────────┐
         ▼                                 ▼                                 ▼
┌──────────────────┐             ┌──────────────────┐             ┌──────────────────┐
│ Instacart Canada │             │  Walmart Canada  │             │ Voilà by Sobeys  │
│ Loblaws, Costco, │             │ Everyday Value & │             │ Fresh Guaranteed │
│ Superstore, Metro│             │ Store Pickup     │             │ Warehouse Direct │
└────────┬─────────┘             └────────┬─────────┘             └────────┬─────────┘
         │                                │                                │
         ▼                                ▼                                ▼
  Safe URI Encoding               Safe URI Encoding                Safe URI Encoding
  + Partner Affiliate ID          + Rakuten Affiliate ID           + Impact SubID
```

### Fulfillment Partners & Dynamic URL Generation
When a user encounters a depleted pantry staple or missing recipe ingredient, tapping the glassmorphic order button opens an interactive **Select Grocery Delivery** modal bottom sheet. Selecting a fulfillment partner triggers our centralized `triggerAffiliateFulfillment(storeName, ingredientName)` engine with strict query sanitization:

1. **Instacart Canada**
   - **Coverage**: Powers on-demand delivery for Canada's leading grocers, including Loblaws, Real Canadian Superstore, Costco Canada, Metro, and No Frills.
   - **URL Structure**:
     ```text
     https://instacart.ca/store/s?k={safelyEncodedIngredient}&affiliate_id=YOUR_PARTNER_ID_PLACEHOLDER
     ```
   - **Value Proposition**: 1–2 hour express fulfillment for urgent cooking needs.

2. **Walmart Canada**
   - **Coverage**: Nationwide distribution covering grocery delivery and express Click-and-Collect.
   - **URL Structure**:
     ```text
     https://walmart.ca/en/search?q={safelyEncodedIngredient}&utm_source=affiliate&utm_medium=YOUR_RAKUTEN_ID_PLACEHOLDER
     ```
   - **Value Proposition**: Everyday low prices on standard kitchen and pantry staples.

3. **Voilà by Sobeys**
   - **Coverage**: Automated, temperature-controlled robotic micro-fulfillment centers across major Canadian metropolitan areas (Ontario, Quebec, Atlantic Canada).
   - **URL Structure**:
     ```text
     https://voila.ca/products/search?q={safelyEncodedIngredient}&subid=YOUR_IMPACT_ID_PLACEHOLDER
     ```
   - **Value Proposition**: Guaranteed freshness and zero-contact climate-controlled delivery.

### Robust URI Sanitization & Reliability
To ensure foolproof deep linking across mobile browsers and web webviews without runtime exceptions:
- Query terms are strictly trimmed of extraneous whitespace.
- String characters are encoded using standard percent-encoding (`URLEncoder.encode` / `encodeURIComponent`), explicitly mapping spaces to `%20`.
- Browser intents are triggered with `Intent.FLAG_ACTIVITY_NEW_TASK` (Android) and `noopener,noreferrer` attributes (Web) to preserve security and performance.

---

## 5. Getting Started & Development

### Web Application
```bash
# Install dependencies
npm install

# Start local development server (Port 3000)
npm run dev

# Build production bundle & typecheck
npm run build
```

### Android Native Application
```bash
# Navigate to the Android root
cd android

# Compile and assemble debug APK
./gradlew assembleDebug

# Run unit and instrumentation tests
./gradlew test
```

---

*Curation Kitchen — Developed with high-utility consumer architecture and intentional culinary design.*
