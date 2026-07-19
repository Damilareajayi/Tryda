# Tryda / AI Reliability, Safety & Drift Monitoring

> **Catch AI drift before your customers do.**
> Tryda is a premium, real-time diagnostic and 24/7 accuracy monitoring platform for production chatbots, virtual assistants, and LLM-driven applications.

### 🌐 Live Platform
The Tryda platform is fully compiled, verified, and live at our primary custom domain:
👉 **[https://tryda.io](https://tryda.io)** *(Backup: [https://tryda-ai.web.app](https://tryda-ai.web.app))*

### 🎯 Why `tryda.io`?
We selected **`tryda.io`** as our primary custom domain for several strategic business reasons:
* **Premium Tech Authority**: The `.io` domain is universally trusted and recognized as the gold standard for developer-facing tech platforms, API tools, and AI SaaS apps (such as `sentry.io` or `socket.io`).
* **High-Conversion Outbound**: Outbound emails sent from our custom domain—specifically **`aireports@tryda.io`**—carry immediate B2B credibility, resulting in significantly higher open and click-through rates.
* **Sleek & Memorable**: It offers a short, crisp, and brand-aligned name that resonates with engineering managers, support leaders, and product heads.

---

## 🚀 Introducing Tryda-Agent
**Tryda-Agent** is our autonomous, outbound growth-marketing and lead-generation agent built to scale Tryda's user acquisition and revenue generation. It operates as a value-first outbound sales co-pilot:

1. **Autonomous Reconnaissance & Probing**: Playwright scans target websites, locates chat widgets (Crisp, Intercom, custom iframes), and opens them.
2. **Intelligent Conversational QA**: Driving a multi-turn chat using **Gemini 2.5 Flash**, the agent probes the target chatbot on policy limits, unallowed discount requests, refund concessions, and flustered brand tone.
3. **Diagnostic Evaluation**: The captured transcript is sent to our evaluation engine, scoring the bot (0-100) and generating highly actionable system prompt suggestions.
4. **0-Friction Signup Flow**:
   - Stores the audit report securely in our Firebase Firestore `leads` collection.
   - Generates an un-gated shareable report URL: `https://tryda.io/audit?id=[leadId]`
   - Prefills the signup form instantly with the lead's business name, email, and description, leaving them only to input a password or sign in with Google!
5. **Programmatic Outreach**: Uses Gemini to draft highly compelling, hyper-personalized emails highlighting the exact chatbot failure found, dispatched via the **Resend API** from our verified custom domain **`aireports@tryda.io`**.

---

## 🧠 AI Architecture
Tryda operates on an advanced LLM orchestration structure powered by Google's generative models:

* **Evaluation & Scoring Layer**: Automatically parses logs, transcripts, and model weights to calculate real-time safety scores, tone compliance, and hallucination metrics.
* **Probing Layer (Tryda-Agent)**: Uses targeted, dynamic system instructions to simulate a human user trying to bend a bot's rules, exposing policy breaches under duress.
* **Recommendation Layer**: Converts quality degradation into plain-English prompt edits and dataset augmentations, helping developers immediately fix quality gaps.

---

## 🏗️ Development & System Architecture
The Tryda codebase is organized as a modular monorepo:

```
Tryda/
├── frontend/        # Next.js (TypeScript) + TailwindCSS client-side SPA
├── backend/         # Express (TypeScript) API on Google Cloud Run
├── agent/           # Tryda-Agent (TypeScript) automation workspace
└── brand-assets/    # Premium brand assets, mascot designs, and SVGs
```

### 1. Frontend Workspace (`/frontend`)
* **Tech Stack**: Next.js 14, TailwindCSS, Lucide icons, Recharts visualization library.
* **Deployment**: Configured as a fully static SPA (`output: 'export'`) hosted on **Firebase Hosting's global CDN** under `tryda.io` (with backup `tryda-ai.web.app`).
* **Security & Auth**: Integrates Firebase Authentication:
  * **Email & Password**: Standard password registration requiring 8+ characters, uppercase, numbers, and special symbols, triggering automatic Firebase email verification links on mount.
  * **Google Sign-In**: Powered by `GoogleAuthProvider` configured with `select_account` prompts to enforce explicit user account choosing.
  * **Dashboard verification banner**: Prompts unverified users to verify their emails and click a live "Refresh Status" button.

### 2. Backend API Workspace (`/backend`)
* **Tech Stack**: Node.js Express, TypeScript, Zod validation, Firebase Admin SDK.
* **Deployment**: Run as a containerized Docker container on **Google Cloud Run** in `us-central1` under the `july-push` Google Cloud project.
* **Monetization**: Integrated with the **Stripe Billing API** to provision billing tiers, subscriptions ($10/mo to $100/mo), and portal sessions.

### 3. Tryda-Agent Workspace (`/agent`)
* **Tech Stack**: Playwright (Lightweight headless Chromium configured in `/tmp` to optimize partition limits), `@google/generative-ai` SDK, `resend` client, `firebase-admin`.
* **Flow**: Autonomously crawls, analyzes, updates Firestore collections, and triggers outbound marketing.

---

## 🛠️ Local Setup & Development

### Prerequisite Environment Variables
Before running services, configure the following `.env` configurations in their respective directories:

#### Frontend (`/frontend/.env`)
```ini
NEXT_PUBLIC_FIREBASE_API_KEY=your_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=tryda-app.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=tryda-app
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=tryda-app.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_API_URL=https://tryda-backend-189488931966.us-central1.run.app
```

#### Backend (`/backend/env.yaml` or `.env`)
```yaml
FIREBASE_PROJECT_ID: "tryda-app"
GOOGLE_CLOUD_PROJECT: "july-push"
FRONTEND_URL: "https://tryda.io"
GEMINI_API_KEY: "your_gemini_key"
STRIPE_SECRET_KEY: "your_stripe_key"
```

#### Tryda-Agent (`/agent/.env`)
```ini
GEMINI_API_KEY=your_gemini_key
RESEND_API_KEY=re_ap4brrfJ_FHjVpx6QpQPxWQu9R6FRtona
```

### Installation & Run Commands

#### Running the Frontend Client
```bash
cd frontend
npm install
npm run dev     # Run local dev server
npm run build   # Build static export files in /out
```

#### Running the Backend API
```bash
cd backend
npm install
npm run dev     # Run ts-node-dev API server
```

#### Running Tryda-Agent
```bash
cd agent
npm install
PLAYWRIGHT_BROWSERS_PATH=/tmp/playwright-browsers npx playwright install chromium
npm start       # Start the autonomous diagnostic sales loop
```
