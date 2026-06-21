# ContextTab: Your Browser's Second Brain 🧠
**An AI-Powered Browser Memory System for Elevate 2026**

ContextTab is a Manifest V3 Google Chrome Extension that tracks active tab workflows, builds semantic AI workspace summaries, dynamically organizes contexts, and automatically hibernates inactive sessions to optimize local RAM footprint.

---

## 🛠️ Architecture & Technology Stack

ContextTab is built with a serverless, local-first design paradigm, keeping user data secure on their own device:
- **Frontend Panel**: React 18, Vite, TypeScript, and Tailwind CSS.
- **Engine (Service Worker)**: Chrome Extension APIs (`chrome.tabs`, `chrome.storage.local`, `chrome.sidePanel`, `chrome.alarms`).
- **AI Orchestration**: Direct API integration with local **Ollama** endpoints (Default: `gemma4` on `http://localhost:11434/api/chat`), with option to switch to OpenAI / OpenRouter endpoints. Having `"host_permissions": ["<all_urls>"]` allowed in the Manifest allows the service worker to query local endpoints directly bypassing CORS!

---

## 🚀 Setup & Installation Guide (Local Chrome Setup)

Follow these exact steps to load ContextTab into your browser:

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed (v18 or higher recommended).

### 1. Build the Extension
Open your terminal (PowerShell, Command Prompt, or Bash) in the project root directory and run:
```bash
# Install all React, TypeScript, and Vite dependencies
npm install

# Compile the source files into the Chrome extension package
npm run build
# (Alternatively on Windows if environment paths are isolated, run):
.\node_modules\.bin\vite.cmd build
```
This will compile all code and generate a production-ready folder called **`dist`** containing:
- `manifest.json` (Extension configuration)
- `background.js` (Tab monitor and AI Engine service worker)
- `src/index.html` & compiled assets (Vibrant CSS & React panel bundle)

### 2. Load into Google Chrome
1. Open Google Chrome.
2. Navigate to: `chrome://extensions/`
3. In the top-right corner, toggle **Developer mode** to **ON**.
4. In the top-left, click the **Load unpacked** button.
5. Select the **`dist`** folder generated in your project root directory.
6. ContextTab is now active! Click the extensions puzzle icon in your toolbar, find **ContextTab**, and pin it.

---

## 🧪 Testing & Debugging Guide

1. **Start Ollama Locally**: Make sure Ollama is installed and running on your local machine. Start the model you want to use by running:
   ```bash
   ollama run gemma4
   ```
2. **Opening the UI**: Click the **ContextTab** icon in your browser toolbar. The Chrome Side Panel will open on the right side.
3. **Configure Provider**: By default, ContextTab points to **Ollama** at `http://localhost:11434/api/chat` with model `gemma4`. If you want to use OpenAI or OpenRouter, click the Settings gear icon, switch providers, and supply an API key.
4. **Tab Tracking Test**: Open new browser tabs, search for topics, and navigate. You will see the timeline feed update in real-time.
5. **AI Summary Verification**: Visit any webpage (e.g. documentation or articles). ContextTab will call Ollama to generate a precise 1-sentence intention summary (e.g. *"OAuth login workflow for Google APIs"*).
6. **AI Grouping Test**: Open 4-5 tabs related to a specific topic (e.g., AWS console, Stripe Billing Docs, GitHub issues). Click the **Organize** button in the AI Workspace Organizer card. The extension will automatically call Ollama to classify and group them.
7. **Inactivity Hibernation Test**: Click the Settings gear icon, toggle "Auto Tab Hibernation" ON, and slide the timeout slider. You can manually hibernate a tab by clicking the Moon 🌙 icon next to it.
8. **Viewing logs**:
   - Right-click the extension icon -> click **Inspect Pop-up** or **Inspect Side Panel** to view frontend errors.
   - Go to `chrome://extensions/`, click the **service worker** link under ContextTab to inspect the background script network requests and triggers.

---

## 📦 Packaging for Submission

When submitting your extension to the Chrome Web Store or presenting it to the judges:
1. Run `npm run build` (or `.\node_modules\.bin\vite.cmd build`) to compile the newest version of the source code.
2. Compress the **`dist`** directory into a `.zip` file (e.g., `ContextTab_Submission.zip`).
3. This ZIP file can be directly uploaded to the Chrome Web Developer Dashboard or attached to your Devpost submission.

---

## 🐈 GitHub & Git Setup Guide

To share the code on GitHub:
1. Initialize the git repository:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: ContextTab v1.0.0 for Elevate 2026"
   ```
2. Create a new repository on GitHub (name it `ContextTab`).
3. Add the remote URL and push:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/ContextTab.git
   git branch -M main
   git push -u origin main
   ```

---

## 📝 Devpost Submission Guide (Elevate 2026 Submission)

### Project Copy Details:
- **Project Title**: ContextTab
- **Tagline**: Your Browser's Second Brain 🧠
- **The Problem**: Knowledge workers keep 30-100 tabs open because they fear losing workflow context. This consumes gigabytes of RAM, causes cognitive overload, and slows down browsers.
- **The Solution**: ContextTab is an AI-powered Browser Memory System. It monitors active browsing sessions, summarizes pages, automatically groups tabs into workspace intent containers, and hibernates inactive pages to save memory.
- **How we built it**: Manifest V3 extension, React, Vite, Tailwind CSS, Local Storage, and OpenAI/OpenRouter APIs.
- **Challenges we ran into**: Implementing responsive, millisecond-accurate tracking of tabs without hitting rate limits, and grouping workflows dynamically by user intent rather than simple string matching.
- **Accomplishments we are proud of**: Building a beautiful, interactive Side Panel dashboard that estimates saved RAM in real-time and enables context-aware tab group conversion.
- **What's next for ContextTab**: Collaborative multi-user workspaces, cross-device sync, and local model execution using WebGPU.

---

## 🎯 5-Minute Demo Pitch Script

### Slide & Voiceover Sequence

* **[0:00 - 0:30] Introduction**
  * *Speaker*: "Hello judges! Every knowledge worker is familiar with this screen: 50 open tabs, a melting laptop, and total cognitive overload. We keep tabs open because they represent *unresolved thoughts*. Closing them means losing context. That's why we built **ContextTab** — Your Browser's Second Brain."
* **[0:30 - 1:30] The Core Innovation**
  * *Speaker*: "Traditional tab managers just save lists. ContextTab understands *workflows*. Instead of asking 'What is this page about?', our AI system asks, 'What is the user trying to accomplish?'. Let's open our extension panel."
* **[1:30 - 3:00] Live Walkthrough**
  * *Speaker*: "As I navigate stackoverflow, github, and cloud console tabs, the ContextTab engine tracks visited pages and automatically generates single-sentence intent summaries. When I click 'Organize', ContextTab uses LLMs to group these tabs into context-aware workspaces. Watch how it labels them: *'AWS Deployment Workflow'* and *'OAuth Configuration'*. I can lock these AI workspaces, pin them, or rearrange them at will."
* **[3:00 - 4:15] RAM Savings & Hibernation**
  * *Speaker*: "To save resource footprint, our adaptive hibernation worker discards background tabs that haven't been visited in 30 minutes, prioritizing heavier pages like Figma or sheets. This saves up to 120MB per tab, tracked in real-time on our dashboard. Clicking a tab wakes it up instantly, restoring context."
* **[4:15 - 5:00] Conclusion & Scalability**
  * *Speaker*: "By storing everything locally in Chrome's sandbox, ContextTab ensures user privacy while optimizing memory. We're launching ContextTab to convert browser chaos into organized intelligence. Thank you!"

---

## 💬 3-Minute Q&A Preparation & Objection Handling

#### Q1: "How do you preserve user privacy when sending data to AI?"
* **Answer**: "ContextTab is serverless. API keys are stored locally on the user's browser sandbox via `chrome.storage.local`. Furthermore, only public page metadata (page titles, domains) are sent for classification—we never scrape passwords, form entries, or cookies."

#### Q2: "Isn't chrome group tabs already doing this?"
* **Answer**: "Chrome groups tabs manually or by simple URL structure. ContextTab is workflow-aware. It clusters tabs by *semantic intent* (e.g. linking a Figma design, GitHub code, and Stripe billing page under the same workspace task) and automatically hibernates them dynamically."

#### Q3: "What happens if the API key is rate-limited?"
* **Answer**: "ContextTab caches all summaries by URL. If a URL is visited twice or duplicated across tabs, it skips LLM queries entirely, conserving tokens and preventing rate limits."

---

## 🚀 Scalability & Future Roadmap

1. **Offline AI**: Run local, smaller models (e.g., Llama 3 8B or Gemma 2B) directly in the browser via WebGPU to remove API key requirements.
2. **Team Workspaces**: Share workspace sessions via encrypted WebRTC connections for team-wide context sync.
3. **Cross-Browser Sync**: Sync timeline histories to Firefox and Safari securely.

---

## 🔒 Privacy Policy Summary

ContextTab processes browsing details strictly inside the user's local extension environment. No analytical telemetry or page content is uploaded to secondary servers. Data queries transmitted to the user's configured OpenAI/OpenRouter APIs are governed by the respective AI platform's privacy agreements.
