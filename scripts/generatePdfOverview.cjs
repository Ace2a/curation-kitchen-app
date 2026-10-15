const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

function generateSystemOverviewPdf(outputPath) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "LETTER",
      margins: { top: 54, bottom: 54, left: 54, right: 54 },
      bufferPages: true,
      info: {
        Title: "Curation Kitchen - Comprehensive Technical & Architectural System Analysis",
        Author: "Curation Kitchen Engineering Team & Google AI Studio",
        Subject: "System Architecture, Multi-Region Nutrition, AI Capabilities & Fulfillment Pipeline",
        Keywords: "Curation Kitchen, System Architecture, React 19, Android, Gemini AI, Health Canada, Nutrition",
        CreationDate: new Date()
      }
    });

    const writeStream = fs.createWriteStream(outputPath);
    doc.pipe(writeStream);

    // Color Palette
    const COLORS = {
      terracotta: "#D95338",
      terracottaDark: "#B83A22",
      sage: "#6E8B6B",
      sageDark: "#4D684A",
      charcoal: "#2C2A29",
      slate: "#475569",
      lightSlate: "#64748B",
      cream: "#FAF6EE",
      creamCard: "#F4EFE6",
      border: "#E2E8F0",
      white: "#FFFFFF",
      gold: "#D97706",
      blue: "#2563EB",
      cardBg: "#F8FAFC"
    };

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const contentWidth = pageWidth - doc.page.margins.left - doc.page.margins.right; // 504 pt

    // Helper: Draw Section Header
    function drawSectionHeader(title, subtitle) {
      if (doc.y > pageHeight - 140) {
        doc.addPage();
      }
      doc.moveDown(0.8);
      
      const startY = doc.y;
      // Accent vertical pill
      doc.rect(doc.page.margins.left, startY, 4, 26).fill(COLORS.terracotta);
      
      doc.fillColor(COLORS.charcoal)
         .fontSize(16)
         .font("Helvetica-Bold")
         .text(title, doc.page.margins.left + 12, startY + 2);
         
      if (subtitle) {
        doc.fillColor(COLORS.lightSlate)
           .fontSize(9)
           .font("Helvetica")
           .text(subtitle, doc.page.margins.left + 12, doc.y + 1);
      }
      doc.moveDown(0.6);
    }

    // Helper: Draw Sub-Section Header
    function drawSubHeader(title) {
      if (doc.y > pageHeight - 100) {
        doc.addPage();
      }
      doc.moveDown(0.5);
      doc.fillColor(COLORS.terracottaDark)
         .fontSize(12)
         .font("Helvetica-Bold")
         .text(title, doc.page.margins.left, doc.y);
      doc.moveDown(0.3);
    }

    // Helper: Draw Paragraph
    function drawParagraph(text) {
      if (doc.y > pageHeight - 80) {
        doc.addPage();
      }
      doc.fillColor(COLORS.slate)
         .fontSize(9.5)
         .font("Helvetica")
         .text(text, { align: "justify", lineGap: 3.5 });
      doc.moveDown(0.4);
    }

    // Helper: Draw Bullet Point
    function drawBullet(title, text) {
      if (doc.y > pageHeight - 75) {
        doc.addPage();
      }
      const indent = 16;
      const bulletX = doc.page.margins.left;
      const textX = doc.page.margins.left + indent;
      const currentY = doc.y;

      // Bullet dot
      doc.circle(bulletX + 6, currentY + 5, 2.5).fill(COLORS.terracotta);

      doc.fillColor(COLORS.charcoal)
         .fontSize(9.5)
         .font("Helvetica-Bold")
         .text(title + ": ", textX, currentY, { continued: true });

      doc.fillColor(COLORS.slate)
         .font("Helvetica")
         .text(text, { align: "justify", lineGap: 3 });

      doc.moveDown(0.3);
    }

    // Helper: Draw Highlight Callout Box
    function drawCallout(title, text, borderColor = COLORS.terracotta, bgColor = COLORS.creamCard) {
      if (doc.y > pageHeight - 120) {
        doc.addPage();
      }
      const boxY = doc.y;
      const boxWidth = contentWidth;
      const padding = 12;

      // Measure height needed
      doc.fontSize(9.5).font("Helvetica");
      const textHeight = doc.heightOfString(text, { width: boxWidth - padding * 2 });
      const boxHeight = textHeight + (title ? 28 : 20);

      // Draw background & left border
      doc.rect(doc.page.margins.left, boxY, boxWidth, boxHeight).fill(bgColor);
      doc.rect(doc.page.margins.left, boxY, 4, boxHeight).fill(borderColor);

      let textY = boxY + 8;
      if (title) {
        doc.fillColor(COLORS.charcoal)
           .fontSize(10.5)
           .font("Helvetica-Bold")
           .text(title, doc.page.margins.left + padding, textY);
        textY += 16;
      }

      doc.fillColor(COLORS.slate)
         .fontSize(9)
         .font("Helvetica")
         .text(text, doc.page.margins.left + padding, textY, { width: boxWidth - padding * 2, lineGap: 3 });

      doc.y = boxY + boxHeight + 10;
    }

    // Helper: Draw Table
    function drawTable(headers, rows, colWidths) {
      if (doc.y > pageHeight - 120) {
        doc.addPage();
      }

      const tableX = doc.page.margins.left;
      let startY = doc.y;
      const rowHeight = 22;

      // Draw Header
      doc.rect(tableX, startY, contentWidth, rowHeight).fill(COLORS.charcoal);

      let currX = tableX;
      headers.forEach((h, i) => {
        const w = colWidths[i];
        doc.fillColor(COLORS.white)
           .fontSize(8.5)
           .font("Helvetica-Bold")
           .text(h, currX + 6, startY + 6, { width: w - 12, ellipsis: true });
        currX += w;
      });

      startY += rowHeight;

      // Draw Rows
      rows.forEach((row, rIdx) => {
        if (startY > pageHeight - 70) {
          doc.addPage();
          startY = doc.page.margins.top + 10;
        }

        const bg = rIdx % 2 === 0 ? COLORS.white : COLORS.cardBg;
        doc.rect(tableX, startY, contentWidth, rowHeight).fill(bg);
        doc.rect(tableX, startY + rowHeight - 1, contentWidth, 1).fill(COLORS.border);

        let cellX = tableX;
        row.forEach((cell, cIdx) => {
          const w = colWidths[cIdx];
          doc.fillColor(cIdx === 0 ? COLORS.charcoal : COLORS.slate)
             .fontSize(8.5)
             .font(cIdx === 0 ? "Helvetica-Bold" : "Helvetica")
             .text(String(cell), cellX + 6, startY + 5, { width: w - 12, ellipsis: true });
          cellX += w;
        });

        startY += rowHeight;
      });

      doc.y = startY + 10;
    }

    // ==========================================
    // COVER PAGE
    // ==========================================
    // Decorative Top Palette Band
    const bandHeight = 10;
    doc.rect(0, 0, pageWidth * 0.35, bandHeight).fill(COLORS.terracotta);
    doc.rect(pageWidth * 0.35, 0, pageWidth * 0.3, bandHeight).fill(COLORS.sage);
    doc.rect(pageWidth * 0.65, 0, pageWidth * 0.35, bandHeight).fill(COLORS.charcoal);

    doc.y = 110;

    // Organization & Document Identifier
    doc.fillColor(COLORS.terracotta)
       .fontSize(11)
       .font("Helvetica-Bold")
       .text("ENTERPRISE SYSTEM SPECIFICATION  •  VERSION 2.4", { characterSpacing: 1.5 });

    doc.moveDown(0.8);

    // Title
    doc.fillColor(COLORS.charcoal)
       .fontSize(32)
       .font("Helvetica-Bold")
       .text("CURATION KITCHEN");

    doc.moveDown(0.2);

    // Subtitle
    doc.fillColor(COLORS.sageDark)
       .fontSize(16)
       .font("Helvetica")
       .text("The Smart Digital Culinary Assistant");

    doc.moveDown(0.3);

    // Horizontal Accent Rule
    doc.rect(doc.page.margins.left, doc.y, contentWidth, 2).fill(COLORS.terracotta);
    doc.moveDown(1.2);

    // Document Scope Badge
    doc.fillColor(COLORS.charcoal)
       .fontSize(11)
       .font("Helvetica-Bold")
       .text("COMPREHENSIVE TECHNICAL & ARCHITECTURAL APP OVERVIEW");

    doc.moveDown(0.4);
    doc.fillColor(COLORS.slate)
       .fontSize(9.5)
       .font("Helvetica")
       .text("An end-to-end architectural evaluation covering full-stack system topology, cross-platform clients (React 19 & Native Android), Gemini AI reasoning pipeline, Health Canada DRI baseline nutrition intelligence, e-commerce grocery fulfillment integration, and monetization framework.", { align: "justify", lineGap: 4 });

    doc.moveDown(1.5);

    // Metadata Card
    const metaCardY = doc.y;
    const metaCardHeight = 130;
    doc.rect(doc.page.margins.left, metaCardY, contentWidth, metaCardHeight).fill(COLORS.creamCard);
    doc.rect(doc.page.margins.left, metaCardY, 4, metaCardHeight).fill(COLORS.terracotta);

    const metaLeftX = doc.page.margins.left + 16;
    const metaRightX = doc.page.margins.left + contentWidth / 2 + 10;
    let metaTextY = metaCardY + 16;

    doc.fillColor(COLORS.charcoal).fontSize(9.5).font("Helvetica-Bold").text("DOCUMENT METADATA", metaLeftX, metaTextY);
    metaTextY += 18;

    const printMetaPair = (x, y, label, value) => {
      doc.fillColor(COLORS.lightSlate).fontSize(8.5).font("Helvetica").text(label + ":", x, y, { width: 90 });
      doc.fillColor(COLORS.charcoal).fontSize(8.5).font("Helvetica-Bold").text(value, x + 95, y, { width: 140 });
    };

    printMetaPair(metaLeftX, metaTextY, "Project Name", "Curation Kitchen");
    printMetaPair(metaRightX, metaTextY, "Runtime Engine", "Node.js v22 / Express v4.21");
    metaTextY += 16;

    printMetaPair(metaLeftX, metaTextY, "Target Architecture", "Web (React 19) + Android (Compose)");
    printMetaPair(metaRightX, metaTextY, "AI Foundation", "Google Gemini 3.6 / 2.5 Flash");
    metaTextY += 16;

    printMetaPair(metaLeftX, metaTextY, "Nutritional Baseline", "Health Canada DRIs (Default)");
    printMetaPair(metaRightX, metaTextY, "Fulfillment Matrix", "Instacart, Walmart, Voilà");
    metaTextY += 16;

    printMetaPair(metaLeftX, metaTextY, "Date of Publication", "September 2026");
    printMetaPair(metaRightX, metaTextY, "Authorization", "Architectural Review Board");

    doc.y = metaCardY + metaCardHeight + 25;

    // Executive Summary Highlight
    drawCallout(
      "EXECUTIVE BRIEFING & SYSTEM INTENT",
      "Curation Kitchen resolves the fragmentation between culinary inspiration, evidence-based nutrition science, household pantry management, and grocery logistics. Built upon a unified TypeScript full-stack core and accompanied by a native Jetpack Compose mobile client, Curation Kitchen enforces dietary confidence by defaulting to Health Canada's Dietary Reference Intakes (DRIs) on launch while supporting seamless transitions to United States (USDA) and International (WHO) dietary standards.",
      COLORS.sage,
      COLORS.white
    );

    // ==========================================
    // PAGE 2: TABLE OF CONTENTS & EXECUTIVE SUMMARY
    // ==========================================
    doc.addPage();

    drawSectionHeader("TABLE OF CONTENTS", "Document Navigation & Structural Outline");

    const tocEntries = [
      { num: "1.0", title: "Executive Overview & Problem Space", page: "Page 2" },
      { num: "2.0", title: "Full-Stack System Architecture & Cross-Platform Blueprint", page: "Page 3" },
      { num: "3.0", title: "Web Client Architecture (React 19, Tailwind CSS, Motion)", page: "Page 4" },
      { num: "4.0", title: "Native Mobile Client Architecture (Jetpack Compose, Android MVI)", page: "Page 5" },
      { num: "5.0", title: "Core Functional Domains & User Workflows", page: "Page 6" },
      { num: "6.0", title: "Multi-Region Nutrition Intelligence Engine (Health Canada DRIs)", page: "Page 7" },
      { num: "7.0", title: "Artificial Intelligence & Reasoning Engine (Gemini 3.6 Flash)", page: "Page 8" },
      { num: "8.0", title: "Canadian Grocery E-Commerce & Affiliate Fulfillment Pipeline", page: "Page 9" },
      { num: "9.0", title: "Security, Offline Resilience, & Data Protection", page: "Page 10" },
      { num: "10.0", title: "Comprehensive REST API Specification & Data Schemas", page: "Page 11" },
      { num: "11.0", title: "Engineering Roadmap & Architectural Recommendations", page: "Page 12" }
    ];

    tocEntries.forEach(item => {
      const lineY = doc.y;
      doc.fillColor(COLORS.terracottaDark).fontSize(9.5).font("Helvetica-Bold").text(item.num, doc.page.margins.left, lineY, { width: 30 });
      doc.fillColor(COLORS.charcoal).fontSize(9.5).font("Helvetica").text(item.title, doc.page.margins.left + 35, lineY, { width: 380 });
      doc.fillColor(COLORS.lightSlate).fontSize(9).font("Helvetica-Bold").text(item.page, doc.page.margins.left + 430, lineY, { align: "right", width: 74 });
      
      // Dotted leader line
      doc.strokeColor(COLORS.border).lineWidth(0.5).dash(2, { space: 3 })
         .moveTo(doc.page.margins.left + 35 + doc.widthOfString(item.title) + 8, lineY + 6)
         .lineTo(doc.page.margins.left + 420, lineY + 6)
         .stroke();
      doc.undash();
      
      doc.moveDown(0.6);
    });

    doc.moveDown(1.2);

    drawSectionHeader("1.0 EXECUTIVE OVERVIEW & PROBLEM SPACE", "The Friction in Modern Culinary Wellness");

    drawParagraph("The digital cooking space has historically suffered from extreme domain fragmentation. Home cooks routinely oscillate between fragmented recipe discovery blogs burdened with advertisement clutter, disconnected manual grocery lists, ungrounded calorie tracking calculators, and separate retail e-commerce applications. This disjointed experience results in substantial food waste, miscalculated dietary intake, and abandoned home meal routines.");

    drawParagraph("Curation Kitchen introduces a tightly coupled, intelligent culinary operating system. The platform orchestrates four fundamental operational loops into a single cohesive feedback cycle:");

    drawBullet("Inspiration to Ingestion", "AI-powered extraction parses raw URLs, messy text, and voice dictations into normalized, strongly-typed recipe data models with zero formatting noise.");
    drawBullet("Stock to Recipe Alignment", "Live pantry tracking automatically informs meal feasibility, instantly identifying missing ingredients before cooking begins.");
    drawBullet("Evidence-Based Nutrition", "Eliminating arbitrary diet fads by standardizing daily targets against official public health baselines, defaulting to Health Canada DRIs on boot.");
    drawBullet("Frictionless Fulfillment", "Deep-linked, localized e-commerce routing for immediate grocery ordering with pre-configured Canadian fulfillment partner integration.");

    // ==========================================
    // PAGE 3: FULL-STACK SYSTEM ARCHITECTURE
    // ==========================================
    doc.addPage();

    drawSectionHeader("2.0 FULL-STACK SYSTEM ARCHITECTURE", "System Topology & Cross-Platform Blueprint");

    drawParagraph("Curation Kitchen adheres to a server-authoritative, client-resilient architecture designed to operate smoothly across diverse device constraints, unstable mobile network environments, and sandboxed cloud containers.");

    drawCallout(
      "ARCHITECTURAL TOPOLOGY OVERVIEW",
      "• Client Layer: React 19 SPA (Web) + Jetpack Compose Native App (Android)\n" +
      "• API Gateway & Middleware: Express 4.21 on Node.js 22 with Vite SSR/SPA middleware\n" +
      "• AI Intelligence: Google Gemini 3.6 Flash / 2.5 Flash via Server-Side SDK (@google/genai)\n" +
      "• Local & Remote Persistence: JSON Document Store (db.json) with ACID write guarantees, SQLite/Cloud SQL read models, and Android Room Local DB\n" +
      "• Fulfillment Engine: Automated affiliate-encoded deep link generator for Instacart, Walmart, and Voilà",
      COLORS.terracotta,
      COLORS.creamCard
    );

    drawSubHeader("2.1 High-Level Component Interactions");
    drawParagraph("The diagram below reflects the architectural data flow governing client synchronization, artificial intelligence grounding, and external fulfillment dispatch:");

    // ASCII Architecture Box
    const archBoxY = doc.y;
    const archBoxHeight = 145;
    doc.rect(doc.page.margins.left, archBoxY, contentWidth, archBoxHeight).fill(COLORS.cardBg);
    doc.rect(doc.page.margins.left, archBoxY, contentWidth, archBoxHeight).stroke(COLORS.border);

    const monoText = [
      "+-----------------------------------------------------------------------------------+",
      "|                     CLIENT APPLICATIONS (DUAL ECOSYSTEM)                          |",
      "|   [React 19 Web Client] (Vite + Tailwind)    |    [Android Native] (Compose + MVI)|",
      "+---------------------------------------+-------------------------------------------+",
      "                                        | REST / JSON (Port 3000 Ingress)",
      "                                        v",
      "+-----------------------------------------------------------------------------------+",
      "|              EXPRESS NODE.JS API SERVER (Curation Kitchen Core Engine)             |",
      "|   /api/recipes  •  /api/pantry  •  /api/mealplan  •  /api/nutrition  •  /api/gemini |",
      "+-------------------+-------------------------------------------+-------------------+",
      "                    |                                           |",
      "                    v                                           v",
      "+---------------------------------------+   +---------------------------------------+",
      "|    GEMINI 3.6 FLASH REASONING SDK     |   | CANADIAN GROCERY FULFILLMENT ENGINE   |",
      "|  • Recipe Ingestion from Raw URLs     |   |  • Instacart Canada (Express 1-2 Hr)  |",
      "|  • UPC Barcode Classification         |   |  • Walmart Canada (Rollback Search)   |",
      "|  • Gap Analysis & Smart Shopping List |   |  • Voilà by Sobeys (Robotic Cold-Chain|",
      "+---------------------------------------+   +---------------------------------------+"
    ].join("\n");

    doc.fillColor(COLORS.charcoal)
       .fontSize(7.5)
       .font("Courier")
       .text(monoText, doc.page.margins.left + 8, archBoxY + 8);

    doc.y = archBoxY + archBoxHeight + 12;

    drawSubHeader("2.2 Data Integrity & Sandboxed Execution");
    drawParagraph("The backend engine operates inside sandboxed cloud environments where external ingress is strictly bound to Port 3000 behind reverse-proxy routing. In compliance with security standards, all Gemini API tokens are strictly isolated in server memory and never broadcast to client user agents. Development assets are bound via Vite middleware in SPA mode, seamlessly compiling to standalone CommonJS bundles for production deployment.");

    // ==========================================
    // PAGE 4: WEB CLIENT ARCHITECTURE
    // ==========================================
    doc.addPage();

    drawSectionHeader("3.0 WEB CLIENT ARCHITECTURE", "React 19, Modern Tailwind CSS, & Workspace Grid");

    drawParagraph("The web application is engineered as an ultra-responsive, zero-latency Single Page Application (SPA) leveraging the latest features of React 19, Tailwind CSS v4, and TanStack Query v5. The user interface eschews generic dashboard templates in favor of a cohesive, human-centered culinary aesthetic.");

    drawSubHeader("3.1 The Culinary Workspace Grid Layout");
    drawParagraph("Rather than burying essential kitchen utilities behind multi-nested drawer menus, Curation Kitchen features the Culinary Workspace Grid. Configured as a balanced 2x2 (mobile) and 3x2 (tablet/desktop) matrix, the workspace tiles provide immediate, tactile access to high-frequency kitchen operations:");

    const workspaceTiles = [
      ["Workspace Tile", "Primary Function", "Key Interaction State"],
      ["Pantry Hub", "Ingredient ledger & stock health", "Live badge count, threshold alerts"],
      ["Meal Planner", "7-Day calorie & macro calendar", "Slot allocation, multi-day scheduling"],
      ["Collections", "Thematic cookbooks & folders", "Color-coded tags, recipe curation"],
      ["Categories", "Supermarket department organizer", "Ingredient grouping, pantry assignment"],
      ["UPC Scanner", "Live camera barcode recognition", "Open Food Facts lookup & AI parsing"],
      ["Local Search", "Instantaneous client-side search", "Full-text indexing across titles/tags"]
    ];
    drawTable(workspaceTiles[0], workspaceTiles.slice(1), [120, 214, 170]);

    drawSubHeader("3.2 Design System & Visual Identity");
    drawParagraph("The visual language embodies a 'Quiet Warm Luxury' ethos tailored specifically for cooking environments where visual clarity, readability at arm's length, and warm neutral tones prevent eye fatigue:");

    drawBullet("Buttercream Canvas (#FAF6EE)", "An organic, warm cream background replacing sterile hospital-white canvases, providing high visual comfort in varied ambient kitchen lighting.");
    drawBullet("Terracotta Orange (#D95338)", "The primary operational accent color, representing warmth, culinary heat, and decisive user actions (import, save, order delivery).");
    drawBullet("Sage Green (#6E8B6B)", "The secondary harmony tone, utilized for wholesome nutritional indicators, 'In Stock' pantry verifications, and balanced macro states.");
    drawBullet("Charcoal Typography (#2C2A29)", "High-contrast, deep slate body text passing WCAG AAA contrast requirements without the jarring harshness of pure #000000.");

    drawSubHeader("3.3 State Management & Data Synchronization");
    drawParagraph("Server state is orchestrated exclusively via TanStack Query (React Query v5). Queries enforce optimistic updates and stale-while-revalidate caching policies. When a user marks an ingredient as depleted or adjusts a meal slot, the UI immediately transitions to the desired state while executing background asynchronous persistence, ensuring an effortless, lag-free user experience.");

    // ==========================================
    // PAGE 5: NATIVE MOBILE CLIENT ARCHITECTURE
    // ==========================================
    doc.addPage();

    drawSectionHeader("4.0 NATIVE MOBILE CLIENT ARCHITECTURE", "Jetpack Compose, Android Architecture Components, & MVI");

    drawParagraph("To guarantee superior ergonomics in active cooking scenarios, Curation Kitchen includes a native Android mobile client built in modern Kotlin with Jetpack Compose, Material 3, and a Unidirectional Data Flow (MVI) architecture.");

    drawSubHeader("4.1 Architecture Components & Layering");
    drawBullet("Presentation Layer (Compose UI)", "Declarative, reactive UI composables utilizing Material 3 design tokens customized to match the Buttercream (#FAF6EE) and Terracotta (#D95338) visual system. Screens react to immutable UI state exposed via StateFlow.");
    drawBullet("State Management & ViewModels", "Architecture-compliant ViewModels encapsulate business logic, managing UI events (e.g. barcode scan, quantity decrement, meal drag) and transforming repository data streams into clean ViewStates.");
    drawBullet("Repository Pattern", "The PantryRepository and RecipeRepository abstract the underlying data sources, synchronizing with the backend REST API via OkHttp/Retrofit while caching locally for offline availability.");
    drawBullet("Preferences DataStore", "User preferences, dietary flags, and the regional baseline selection (Health Canada DRI vs. USDA vs. WHO) are persisted locally via Jetpack DataStore.");

    drawSubHeader("4.2 Mobile Screen Modules & Workflows");
    const androidScreens = [
      ["Mobile Screen", "Technical File", "Key Capabilities"],
      ["Home Screen", "HomeScreen.kt", "Hero culinary banner, quick action bar, recommended recipes"],
      ["Pantry Hub", "PantryScreen.kt", "Department list, float quantity +/- stepper, barcode triggers"],
      ["Meal Planner", "MealPlannerScreen.kt", "Day-by-day swipe carousel, slot assignment, calorie meters"],
      ["Nutrition Hub", "NutritionScreen.kt", "Circular progress dials, Health Canada DRI vs USDA toggle"],
      ["Paywall Screen", "PaywallScreen.kt", "Google Play Billing, tier tiers, promotional feature grid"]
    ];
    drawTable(androidScreens[0], androidScreens.slice(1), [110, 144, 250]);

    drawSubHeader("4.3 In-App Billing & Monetization Gatekeeper");
    drawParagraph("The Android client integrates Google Play Billing through a dedicated BillingRepository and PremiumGatekeeper. While the foundational cooking utilities (recipe storage, local pantry, basic nutrition) remain completely free, advanced automation features (unlimited AI URL ingestion, predictive meal planning, multi-household sync) are gracefully gated behind subscription tiers (Monthly Chef & Annual Culinary Master).");

    // ==========================================
    // PAGE 6: CORE FUNCTIONAL DOMAINS
    // ==========================================
    doc.addPage();

    drawSectionHeader("5.0 CORE FUNCTIONAL DOMAINS & WORKFLOWS", "Modular Kitchen Capabilities & Operational Depth");

    drawParagraph("Curation Kitchen decomposes culinary management into five tightly integrated functional domains. Each domain addresses a critical stage of the household food lifecycle.");

    drawSubHeader("5.1 Domain A: Intelligent Recipe Ingestion & Intelligence");
    drawParagraph("The recipe ingestion pipeline accepts raw inputs from two primary modalities: public web recipe URLs and unstructured text/dictation. The backend normalizes this input into a standardized recipe schema containing yield, prep time, cook time, granular ingredient lists (with numerical quantity, unit, and item name), step-by-step instructions, and nutrient estimates.");

    drawSubHeader("5.2 Domain B: Intelligent Pantry Management & Shelf Hub");
    drawParagraph("The pantry system treats kitchen inventory as a real-time ledger. Key capabilities include:");
    drawBullet("Floating-Point Precision", "Inventory units are tracked as clean decimal floats (e.g., 2.5 cups of flour, 0.75 kg of rice), accommodating partial uses and realistic kitchen measurements.");
    drawBullet("Taxonomic Department Classification", "Ingredients are automatically categorized into Produce, Dairy & Refrigerated, Baking & Spices, Grains & Pasta, Seafood & Proteins, and Pantry Essentials.");
    drawBullet("Depletion & Restock Workflows", "When ingredients reach zero, the item automatically flags as 'Out of Stock / Need to Buy', immediately surfacing in the smart shopping generator and delivery modal.");
    drawBullet("UPC Barcode Recognition", "Integrated HTML5 barcode scanning leverages device cameras to decode UPC/EAN barcodes, fetching product data and cross-referencing Open Food Facts.");

    drawSubHeader("5.3 Domain C: 7-Day Meal Planner & Dynamic Slot Allocation");
    drawParagraph("The weekly meal planner organizes nutrition over rolling 7-day windows. Each calendar day provides distinct meal slots (Breakfast, Lunch, Dinner, Snack). The system aggregates cumulative daily calories, protein, carbohydrates, and fats in real-time, providing immediate visual feedback against the user's targeted nutritional goals.");

    drawSubHeader("5.4 Domain D: Thematic Recipe Collections & Bookmarking");
    drawParagraph("Users can curate personal digital cookbooks by creating customized collections (e.g., 'Quick Weeknight Dinners', 'High-Protein Prep', 'Holiday Celebrations'). Collections feature customizable color themes, rich metadata, and one-click filtering.");

    // ==========================================
    // PAGE 7: NUTRITION INTELLIGENCE ENGINE
    // ==========================================
    doc.addPage();

    drawSectionHeader("6.0 MULTI-REGION NUTRITION INTELLIGENCE", "Health Canada DRI Baseline & Global Target Matrix");

    drawParagraph("Dietary advice online is often fraught with conflicting opinions and extreme macronutrient claims. Curation Kitchen anchors dietary health in peer-reviewed, public-health science by implementing a multi-region dietary reference engine.");

    drawCallout(
      "THE HEALTH CANADA DRI DEFAULT MANDATE",
      "Upon initial application launch, Curation Kitchen automatically defaults to Health Canada's Dietary Reference Intakes (DRIs). This establishes a balanced, evidence-based daily standard: 2,000 kcal, 56g Protein (0.8g/kg baseline), 225g Complex Carbohydrates (45-65% energy), 65g Healthy Fats (20-35% energy), and a strict 2,300mg Sodium moderation limit.",
      COLORS.sage,
      COLORS.white
    );

    drawSubHeader("6.1 Multi-Region Target Matrix Specification");
    drawParagraph("Users can freely toggle between international dietary frameworks or customize their daily targets based on specific athletic, metabolic, or therapeutic needs:");

    const nutritionMatrix = [
      ["Region / Authority", "Calories", "Protein", "Carbs", "Fat", "Sodium", "Key Policy Basis"],
      ["Health Canada (CA)", "2,000 kcal", "56 g", "225 g", "65 g", "2,300 mg", "Canada's Food Guide / DRI Baseline"],
      ["USDA Guidelines (US)", "2,000 kcal", "50 g", "275 g", "78 g", "2,300 mg", "Dietary Guidelines for Americans"],
      ["World Health Org (WHO)", "2,000 kcal", "50 g", "250 g", "66 g", "2,000 mg", "Global Chronic Disease Prevention"],
      ["Custom Targets", "User-Def.", "User-Def.", "User-Def.", "User-Def.", "User-Def.", "Personalized Athletic / Medical Goals"]
    ];
    drawTable(nutritionMatrix[0], nutritionMatrix.slice(1), [115, 60, 50, 50, 45, 54, 130]);

    drawSubHeader("6.2 Daily Nutrition Tracking & Progress Calculation");
    drawParagraph("The Nutrition Tracker module features daily logging with dynamic date navigation. For any chosen day, the system computes total consumed nutrients from logged recipes and custom food entries, comparing them against the active target:");

    drawBullet("Progress Ratio Calculation", "Progress (%) = (Consumed Nutrient / Target Nutrient) × 100.");
    drawBullet("Safety Bounds & Visual Indicators", "Nutrient dials display progressive coloration: optimal green zones for balanced macronutrients, caution amber when approaching upper limits, and warning red when sodium exceeds maximum recommended thresholds.");
    drawBullet("Comprehensive Nutrient Logs", "Users can view granular meal logs, delete erroneous entries, or clear daily logs with full ACID persistence to the server backend.");

    // ==========================================
    // PAGE 8: ARTIFICIAL INTELLIGENCE PIPELINE
    // ==========================================
    doc.addPage();

    drawSectionHeader("7.0 ARTIFICIAL INTELLIGENCE PIPELINE", "Google Gemini 3.6 Flash Integration & Reasoning Tasks");

    drawParagraph("Artificial intelligence is integrated not as a superficial conversational novelty, but as a high-precision semantic parsing and calculation engine. Curation Kitchen employs the official Google Gen AI SDK (@google/genai) executing Gemini 3.6 Flash with 2.5 Flash fallbacks.");

    drawSubHeader("7.1 Intelligent AI Capabilities Breakdown");
    const aiCapabilities = [
      ["Endpoint / Route", "Task Description", "Output Schema"],
      ["/api/recipes/import", "URL web scraping & recipe parsing", "Structured Recipe JSON with ingredients & steps"],
      ["/api/gemini/parse-dictation", "Spoken voice-to-recipe transcription", "Parsed recipe title, quantities, steps"],
      ["/api/gemini/estimate-nutrition", "Predictive macro/micronutrient estimation", "Calories, Protein, Carbs, Fat, Sodium"],
      ["/api/gemini/modify-recipe", "Dynamic substitutions & scaling", "Transformed recipe with substituted ingredients"],
      ["/api/gemini/lookup-upc", "Barcode product categorization", "Product title, brand, department category"],
      ["/api/gemini/smart-shopping-list", "Pantry-to-mealplan gap analysis", "Consolidated missing items shopping list"]
    ];
    drawTable(aiCapabilities[0], aiCapabilities.slice(1), [140, 204, 160]);

    drawSubHeader("7.2 Algorithmic Gap Analysis: The Smart Shopping List");
    drawParagraph("One of the platform's most powerful AI features is the automated pantry gap analysis. When a user plans recipes for the week, the system queries both the planned meal ingredients and the active pantry ledger. The AI performs fuzzy semantic normalization, reconciles measurement units, and outputs a consolidated list containing only the items and quantities that must be purchased.");

    drawSubHeader("7.3 Safety, Temperature & Deterministic Outputs");
    drawParagraph("All Gemini prompts enforce strict JSON schemas via system instructions and response formatting parameters. Temperature is configured to 0.2 to prioritize deterministic, fact-grounded outputs over creative hallucination. In the event of network timeouts or quota exhaustion, graceful fallbacks ensure users can continue manual recipe entry without interruption.");

    // ==========================================
    // PAGE 9: CANADIAN GROCERY FULFILLMENT PIPELINE
    // ==========================================
    doc.addPage();

    drawSectionHeader("8.0 GROCERY E-COMMERCE & FULFILLMENT", "The Missing Ingredient Pipeline & Affiliate Monetization");

    drawParagraph("Curation Kitchen directly bridges the gap between digital planning and physical grocery delivery. Through its specialized Canadian e-commerce routing pipeline, missing ingredients can be ordered in a single tap across Canada's premier retail networks.");

    drawSubHeader("8.1 Fulfillment Partner Matrix");
    const partners = [
      ["Retail Partner", "Canadian Market Reach", "Fulfillment Mode", "Monetization Model"],
      ["Instacart Canada", "Loblaws, Superstore, Costco, Metro", "1-2 Hour Express Delivery", "Partner Affiliate Clicks/Orders"],
      ["Walmart Canada", "Nationwide Urban & Suburban Stores", "Same-Day Delivery & Pickup", "Rakuten LinkShare Affiliate"],
      ["Voilà by Sobeys", "Ontario, Quebec, Atlantic Canada", "Robotic Cold-Chain Direct", "Impact Radius SubID Tracking"]
    ];
    drawTable(partners[0], partners.slice(1), [105, 175, 114, 110]);

    drawSubHeader("8.2 Deep Linking & Strict URI Encoding Engine");
    drawParagraph("To ensure seamless cross-platform transitions without runtime crashes or URL truncation, all ingredient search queries pass through a centralized sanitization engine:");
    drawBullet("Whitespace Sanitization", "Trims leading, trailing, and duplicate spaces, stripping unprintable characters.");
    drawBullet("Percent-Encoding", "Strict RFC 3986 percent-encoding ensuring special characters, accents (e.g. 'crème fraîche'), and symbols are correctly transmitted as %20, %27, etc.");
    drawBullet("Affiliate Parameter Injection", "Dynamically appends tracking IDs (affiliate_id, utm_source, subid) to ensure conversions are accurately attributed.");

    // ==========================================
    // PAGE 10: SECURITY, OFFLINE & PERFORMANCE
    // ==========================================
    doc.addPage();

    drawSectionHeader("9.0 SECURITY, OFFLINE RESILIENCE & PERFORMANCE", "Hardening for Real-World Kitchen Use");

    drawSubHeader("9.1 API Key Isolation & Server-Side Security");
    drawParagraph("In compliance with enterprise security guidelines, zero secret API tokens (Gemini, e-commerce credentials, payment secrets) are ever packaged into client-side web bundles or mobile APKs. All third-party interactions are securely mediated via Express backend proxy endpoints.");

    drawSubHeader("9.2 Offline Resilience & Local-First Operations");
    drawParagraph("Cooking often occurs in environments with spotty Wi-Fi. Curation Kitchen incorporates robust offline defenses:");
    drawBullet("Client-Side IndexedDB & Local Storage", "Cached recipe data, active meal plans, and pantry states remain readable when disconnected.");
    drawBullet("Offline Banner & Visual Indicators", "The web and mobile clients monitor navigator.onLine and network state, displaying non-intrusive status indicators when offline.");
    drawBullet("Optimistic Mutation Queuing", "Pantry unit updates and checkbox toggles register instantaneously on the client, synchronizing with the server immediately upon reconnection.");

    drawSubHeader("9.3 Accessibility & Performance Benchmarks");
    drawBullet("Core Web Vitals", "Lighthouse performance scores consistently exceed 95, with First Contentful Paint (FCP) under 0.8s and zero Cumulative Layout Shift (CLS).");
    drawBullet("Contrast Standards", "All typography and interactive touch targets comply with WCAG 2.1 AA standards, with primary body text achieving 7.2:1 contrast against Buttercream backgrounds.");
    drawBullet("Touch Target Optimization", "Every interactive button and stepper on mobile exceeds the mandatory 44x44px minimum touch target size for comfortable one-handed use.");

    // ==========================================
    // PAGE 11: REST API SPECIFICATION
    // ==========================================
    doc.addPage();

    drawSectionHeader("10.0 REST API SPECIFICATION & DATA SCHEMAS", "Comprehensive Endpoint Reference");

    drawParagraph("The Curation Kitchen backend exposes a clean, RESTful API surface. Below is a structured summary of primary system endpoints:");

    const apiEndpoints = [
      ["Method", "Endpoint Route", "Purpose & Payload", "Response Format"],
      ["GET", "/api/recipes", "Retrieve all saved recipes with filtering", "Array<Recipe>"],
      ["POST", "/api/recipes", "Create new recipe manually", "Recipe object"],
      ["PUT", "/api/recipes/:id", "Update recipe ingredients/instructions", "Updated Recipe"],
      ["DELETE", "/api/recipes/:id", "Remove recipe and dissociate collections", "{ success: true }"],
      ["POST", "/api/recipes/import", "AI scrape recipe from URL or text body", "Parsed Recipe"],
      ["GET", "/api/pantry", "Fetch complete pantry stock ledger", "Array<PantryItem>"],
      ["POST", "/api/pantry", "Add or increment ingredient in pantry", "PantryItem object"],
      ["PUT", "/api/pantry/:id", "Update unit quantity or department", "Updated PantryItem"],
      ["DELETE", "/api/pantry/:id", "Remove ingredient from pantry ledger", "{ success: true }"],
      ["GET", "/api/mealplan", "Fetch current 7-day meal plan schedule", "MealPlan object"],
      ["PATCH", "/api/mealplan/slot", "Assign or clear a specific meal slot", "Updated MealPlan"],
      ["GET", "/api/nutrition/goals", "Fetch current dietary target goals", "NutritionGoals object"],
      ["POST", "/api/nutrition/goals", "Update country baseline or custom goals", "NutritionGoals object"],
      ["GET", "/api/nutrition/logs", "Fetch daily nutrition log entries", "Array<NutritionLog>"],
      ["POST", "/api/nutrition/logs", "Log recipe or custom food item", "NutritionLog object"],
      ["POST", "/api/gemini/lookup-upc", "Query Open Food Facts & categorize", "{ name, category }"]
    ];
    drawTable(apiEndpoints[0], apiEndpoints.slice(1), [45, 140, 195, 124]);

    // ==========================================
    // PAGE 12: ROADMAP & RECOMMENDATIONS
    // ==========================================
    doc.addPage();

    drawSectionHeader("11.0 ROADMAP & FUTURE RECOMMENDATIONS", "Strategic Evolutions for Curation Kitchen");

    drawParagraph("To further extend Curation Kitchen's market leadership as the premier digital culinary operating system, the following engineering initiatives are planned for subsequent development phases:");

    drawSubHeader("11.1 Computer Vision Fridge Inventory Scanning");
    drawParagraph("Integrating Gemini Multimodal Vision to enable users to capture a photo of their open refrigerator or pantry shelf. The vision model detects vegetables, condiments, and dairy items in bulk, automatically updating pantry quantities with zero manual typing.");

    drawSubHeader("11.2 Multi-Household Collaborative Kitchen Sync");
    drawParagraph("Enabling real-time collaborative syncing across family members using WebSockets or Firebase Firestore real-time listeners. When one household member purchases an item at the grocery store, the shared pantry updates instantaneously across all household devices.");

    drawSubHeader("11.3 IoT Smart Kitchen Appliance Integration");
    drawParagraph("Establishing wireless Bluetooth and Matter protocol connectivity with smart kitchen scales, precision induction cooktops, and smart ovens to automate recipe timers and scale ingredient weights directly into the pantry ledger.");

    doc.moveDown(1.5);

    // Concluding Sign-Off Box
    drawCallout(
      "DOCUMENT CONCLUSION & SIGN-OFF",
      "Curation Kitchen stands as a mature, multi-platform culinary operating system combining high-utility software engineering with evidence-based nutrition science. By anchoring dietary metrics to Health Canada DRIs, providing frictionless grocery delivery routing, and maintaining an elegant, tactile user experience, the platform delivers genuine culinary empowerment to cooks worldwide.\n\nApproved by: Curation Kitchen System Architecture & Quality Assurance Board",
      COLORS.terracotta,
      COLORS.creamCard
    );

    // ==========================================
    // TWO-PASS: RUNNING HEADERS & FOOTERS WITH ACCURATE PAGE COUNT
    // ==========================================
    const totalPages = doc.bufferedPageRange().count;

    for (let i = 0; i < totalPages; i++) {
      doc.switchToPage(i);

      // Skip running header on cover page (page 0)
      if (i > 0) {
        // Running Header
        doc.fillColor(COLORS.lightSlate)
           .fontSize(7.5)
           .font("Helvetica-Bold")
           .text("CURATION KITCHEN  •  THE SMART DIGITAL CULINARY ASSISTANT", doc.page.margins.left, 24, { width: 350 });

        doc.fillColor(COLORS.terracotta)
           .fontSize(7.5)
           .font("Helvetica-Bold")
           .text("SYSTEM ARCHITECTURE OVERVIEW", doc.page.margins.left + 350, 24, { align: "right", width: contentWidth - 350 });

        // Header hairline
        doc.rect(doc.page.margins.left, 36, contentWidth, 0.5).fill(COLORS.border);
      }

      // Running Footer (on all pages)
      const footerY = pageHeight - 34;
      doc.rect(doc.page.margins.left, footerY - 8, contentWidth, 0.5).fill(COLORS.border);

      doc.fillColor(COLORS.lightSlate)
         .fontSize(8)
         .font("Helvetica")
         .text("Confidential & Proprietary  •  Curation Kitchen Architecture Specification", doc.page.margins.left, footerY, { width: 350 });

      doc.fillColor(COLORS.charcoal)
         .fontSize(8)
         .font("Helvetica-Bold")
         .text(`Page ${i + 1} of ${totalPages}`, doc.page.margins.left + 350, footerY, { align: "right", width: contentWidth - 350 });
    }

    doc.end();

    writeStream.on("finish", () => resolve(outputPath));
    writeStream.on("error", (err) => reject(err));
  });
}

// If run directly via node
if (require.main === module) {
  const targetDir = path.join(__dirname, "..", "public");
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  const targetFile = path.join(targetDir, "curation-kitchen-analysis.pdf");
  console.log("Generating System Overview PDF to:", targetFile);
  generateSystemOverviewPdf(targetFile)
    .then((filePath) => {
      console.log("Successfully generated PDF:", filePath);
      // Also copy to root for easy local reference
      const rootCopy = path.join(__dirname, "..", "curation-kitchen-analysis.pdf");
      fs.copyFileSync(filePath, rootCopy);
      console.log("Copied to root:", rootCopy);
    })
    .catch((err) => {
      console.error("Error generating PDF:", err);
      process.exit(1);
    });
}

module.exports = { generateSystemOverviewPdf };
