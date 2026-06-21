<div align="center">

<img src="./assets/hero-banner.svg" width="100%" alt="ContextTab — Your Browser's Second Brain"/>

<img src="./assets/divider.svg" width="100%" height="4"/>

<p align="center">
  <img src="https://img.shields.io/github/stars/YOUR_USERNAME/ContextTab?color=00F5D4&style=for-the-badge&logo=star&logoColor=white&labelColor=0d1117" alt="stars"/>
  <img src="https://img.shields.io/github/forks/YOUR_USERNAME/ContextTab?color=9B5DE5&style=for-the-badge&logo=git&logoColor=white&labelColor=0d1117" alt="forks"/>
  <img src="https://img.shields.io/github/last-commit/YOUR_USERNAME/ContextTab?color=F15BB5&style=for-the-badge&logo=github&logoColor=white&labelColor=0d1117" alt="last commit"/>
  <img src="https://img.shields.io/badge/License-MIT-00F5D4?style=for-the-badge&logo=opensourceinitiative&logoColor=white&labelColor=0d1117" alt="license"/>
  <img src="https://img.shields.io/badge/Manifest-V3-9B5DE5?style=for-the-badge&logo=googlechrome&logoColor=white&labelColor=0d1117" alt="manifest v3"/>
</p>
<p align="center">
  <img src="https://komarev.com/ghpvc/?username=ContextTab-Elevate2026&style=for-the-badge&color=F15BB5&labelColor=0d1117&label=JUDGES%20VIEWING%20THIS" alt="live views"/>
</p>

<img src="https://readme-typing-svg.herokuapp.com?font=Fira+Code&size=18&duration=2200&pause=400&color=5eead4&center=true&vCenter=true&width=820&lines=%24+npm+run+build;%E2%9C%93+compiled+background.js+%2B+side+panel+bundle;%24+ollama+run+gemma4;%E2%9C%93+local+inference+ready+%E2%80%94+0+API+cost;%E2%9C%93+50+tabs+%E2%86%92+4+intent-grouped+workspaces;%E2%9C%93+312MB+RAM+reclaimed+this+session" alt="fake terminal session" />

</div>

<img src="./assets/divider.svg" width="100%" height="4"/>

## 🎯 The Pitch in One Breath

> Knowledge workers don't hoard tabs out of laziness — they hoard them because **closing a tab feels like losing a thought**. ContextTab is a Manifest V3 Chrome extension that watches your tabs, asks a local LLM *"what is this person actually trying to do?"*, clusters tabs into named workspaces by **intent** instead of domain, and puts idle tabs to sleep — reclaiming RAM without ever touching the cloud.

<table>
<tr>
<td width="50%" align="center">

### 🔥 Before ContextTab
```yaml
Open Tabs:        50-100
RAM Wasted:        ~120MB / idle tab
Grouping Logic:    manual / by URL
Context Recall:    "wait, why did I open this?"
Privacy:           cloud tab-managers see everything
```

</td>
<td width="50%" align="center">

### ✨ After ContextTab
```yaml
Open Tabs:         same, but organized
RAM Reclaimed:     up to 120MB / hibernated tab
Grouping Logic:    AI semantic intent clustering
Context Recall:    1-sentence summary, instantly
Privacy:           100% local Ollama by default
```

</td>
</tr>
</table>

<img src="./assets/divider.svg" width="100%" height="4"/>

## 🏗️ Live Architecture

<div align="center">
<img src="./assets/architecture-flow.svg" width="100%" alt="Animated ContextTab architecture diagram"/>
</div>

<details>
<summary>📐 <strong>Prefer a static technical diagram? Click to expand the Mermaid version</strong></summary>

```mermaid
graph TD
    A[chrome.tabs API] --> B[Service Worker Engine]
    B --> C[Ollama gemma4 :: localhost:11434]
    C -.->|fallback| D[OpenAI / OpenRouter]
    C --> E[Intent Summary + Semantic Grouping]
    E --> F[React Side Panel UI]
    B --> G[chrome.alarms Inactivity Tracker]
    G --> H[Hibernation Worker]
    H --> I[RAM Savings Tracker]
    I --> F
    F -.->|instant restore| A

    style B fill:#00D4AA,stroke:#fff,stroke-width:2px
    style C fill:#8B5CF6,stroke:#fff,stroke-width:2px
    style F fill:#3B82F6,stroke:#fff,stroke-width:2px
    style H fill:#FF6B6B,stroke:#fff,stroke-width:2px
```

</details>

<img src="./assets/divider.svg" width="100%" height="4"/>

## 🚀 Tech Stack

<div align="center">

**Frontend Panel**
<br/>
<img src="https://skillicons.dev/icons?i=react,vite,typescript,tailwind" />

**Engine & Browser APIs**
<br/>
<img src="https://skillicons.dev/icons?i=javascript,nodejs,chrome,webpack" />

**AI Orchestration**
<br/>
<img src="https://skillicons.dev/icons?i=ollama,openai,python" />

</div>

<img src="./assets/divider.svg" width="100%" height="4"/>

## 🎯 Core Capabilities

<table>
<tr>
<td width="33%" valign="top">

### 🧭 Workflow-Aware AI
- 1-sentence **intent summary** per tab
- Groups by **semantic purpose**, not domain
- Auto-names workspaces, e.g. *"OAuth Configuration"*

</td>
<td width="33%" valign="top">

### 🔒 Local-First Privacy
- Default inference via **local Ollama** (`gemma4`)
- Keys stored only in `chrome.storage.local`
- Only page **titles/domains** ever leave the device

</td>
<td width="33%" valign="top">

### 🌙 Adaptive Hibernation
- Auto-sleeps idle tabs after a set timeout
- One-click manual hibernate via 🌙
- Instant wake-and-restore, zero lag

</td>
</tr>
</table>

<img src="./assets/divider.svg" width="100%" height="4"/>

## 📊 Performance Snapshot

<table align="center">
<tr>
<th>Metric</th>
<th>Traditional Tab Management</th>
<th>ContextTab</th>
<th>Result</th>
</tr>
<tr>
<td><strong>Memory per Idle Tab</strong></td>
<td>Full page weight retained</td>
<td>Up to 120MB reclaimed</td>
<td>🚀 Real RAM recovery</td>
</tr>
<tr>
<td><strong>Tab Grouping Logic</strong></td>
<td>Manual or URL-based</td>
<td>AI semantic intent clustering</td>
<td>🧠 Context-aware, not string-matched</td>
</tr>
<tr>
<td><strong>Data Privacy</strong></td>
<td>Often cloud-dependent</td>
<td>Local Ollama by default</td>
<td>🛡️ Local-first, serverless</td>
</tr>
<tr>
<td><strong>Repeat-Visit API Cost</strong></td>
<td>Re-queries every load</td>
<td>Cached by URL</td>
<td>💰 No redundant LLM calls</td>
</tr>
</table>

<img src="./assets/divider.svg" width="100%" height="4"/>

## 🛠️ Setup & Installation

**Prerequisites:** [Node.js](https://nodejs.org/) v18+

```bash
# 1. Install dependencies
npm install

# 2. Compile into the Chrome extension package
npm run build
# Windows fallback if env paths are isolated:
# .\node_modules\.bin\vite.cmd build
```

This produces a production-ready **`dist/`** folder with `manifest.json`, `background.js`, and the compiled side-panel bundle.

**Load it into Chrome:**
1. Go to `chrome://extensions/`
2. Toggle **Developer mode** ON
3. Click **Load unpacked** → select **`dist`**
4. Pin **ContextTab** from the toolbar

<img src="./assets/divider.svg" width="100%" height="4"/>

## 🧪 Testing & Debugging

| Step | Action |
|---|---|
| 1 | `ollama run gemma4` to start local inference |
| 2 | Click the toolbar icon to open the Side Panel |
| 3 | Settings ⚙️ → switch between Ollama / OpenAI / OpenRouter |
| 4 | Open tabs → watch the live timeline feed update |
| 5 | Visit any page → AI generates a 1-sentence intent summary |
| 6 | Open 4–5 related tabs → click **Organize** to auto-cluster |
| 7 | Toggle **Auto Hibernation** ON, or hibernate manually via 🌙 |
| 8 | Right-click icon → **Inspect Side Panel**, or open the **service worker** link in `chrome://extensions/` for logs |

<img src="./assets/divider.svg" width="100%" height="4"/>

## 🐍 Live Contribution Snake

This repo ships with a ready-to-use GitHub Actions workflow (`.github/workflows/snake.yml`) that renders the maintainer's contribution graph as an animated snake, updated daily.

**To activate it:**
1. Push this repo to GitHub with the included `.github/workflows/snake.yml`
2. In **Settings → Actions → General**, set Workflow permissions to **Read and write**
3. Run the workflow once from the **Actions** tab (or wait for the next push/cron tick)
4. It publishes the SVGs to an auto-created `output` branch — then embed it:

```md
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/YOUR_USERNAME/ContextTab/output/github-contribution-grid-snake-dark.svg">
  <img alt="contribution snake" src="https://raw.githubusercontent.com/YOUR_USERNAME/ContextTab/output/github-contribution-grid-snake.svg">
</picture>
```

<div align="center">
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/YOUR_USERNAME/ContextTab/output/github-contribution-grid-snake-dark.svg">
  <img alt="contribution snake" src="https://raw.githubusercontent.com/YOUR_USERNAME/ContextTab/output/github-contribution-grid-snake.svg" width="100%">
</picture>
</div>

> Until the workflow has run at least once, the image above will 404 — that's expected for a brand-new repo. The moment Actions runs, it goes live and starts animating automatically, no further upkeep needed.

<img src="./assets/divider.svg" width="100%" height="4"/>

<details>
<summary>🎤 <strong>5-Minute Demo Pitch Script (click to expand)</strong></summary>

**[0:00–0:30] Introduction**
> "Every knowledge worker knows this screen: 50 open tabs, a melting laptop, total cognitive overload. We keep tabs open because they represent unresolved thoughts — closing them means losing context. That's why we built ContextTab: Your Browser's Second Brain."

**[0:30–1:30] The Core Innovation**
> "Traditional tab managers just save lists. ContextTab understands workflows. Instead of asking 'what is this page about,' our AI asks 'what is the user trying to accomplish.'"

**[1:30–3:00] Live Walkthrough**
> "As I navigate Stack Overflow, GitHub, and the cloud console, ContextTab tracks each page and generates single-sentence intent summaries. Clicking 'Organize' groups them into labeled workspaces like 'AWS Deployment Workflow' and 'OAuth Configuration.'"

**[3:00–4:15] RAM Savings & Hibernation**
> "Our hibernation worker discards background tabs idle for 30+ minutes, prioritizing heavy pages like Figma or Sheets — saving up to 120MB per tab, tracked live on the dashboard. Clicking a hibernated tab restores it instantly."

**[4:15–5:00] Conclusion**
> "Everything runs locally inside Chrome's sandbox, so ContextTab protects privacy while reclaiming memory. We're turning browser chaos into organized intelligence. Thank you!"

</details>

<details>
<summary>💬 <strong>Q&A Preparation (click to expand)</strong></summary>

**Q1: How do you preserve privacy when sending data to AI?**
> ContextTab is serverless. API keys live only in `chrome.storage.local`. Only public page metadata (titles, domains) is sent for classification — never passwords, form entries, or cookies.

**Q2: Isn't Chrome's built-in tab grouping already doing this?**
> Chrome groups manually or by URL structure. ContextTab clusters by semantic intent — linking a design tab, a code tab, and a billing tab under one workspace task — and hibernates them dynamically.

**Q3: What happens if the API key gets rate-limited?**
> Summaries are cached by URL. Repeat or duplicate visits skip the LLM call entirely, conserving tokens and avoiding rate limits.

</details>

<img src="./assets/divider.svg" width="100%" height="4"/>

## 🚀 Roadmap

1. **Offline AI in-browser** — quantized Llama 3 8B / Gemma 2B via WebGPU, zero API keys
2. **Team Workspaces** — encrypted WebRTC session sharing for team-wide context sync
3. **Cross-Browser Sync** — extend timeline history securely to Firefox and Safari

## 🔒 Privacy Policy Summary

ContextTab processes browsing details strictly inside the local extension environment. No analytics or page content is uploaded to secondary servers. Any data sent to a configured OpenAI/OpenRouter endpoint is governed by that provider's own terms.

<img src="./assets/divider.svg" width="100%" height="4"/>

<div align="center">

<img src="https://readme-typing-svg.herokuapp.com?font=JetBrains+Mono&size=16&duration=3000&pause=1000&color=9B5DE5&center=true&vCenter=true&width=700&lines=Status%3A+MVP+%E2%80%94+Open+to+Collaborations;Built+for+Elevate+2026;Star+%E2%AD%90+this+repo+if+ContextTab+saved+your+RAM" alt="status" />

<sub>Made with 🧠 + ☕ for Elevate 2026 — replace <code>YOUR_USERNAME</code> throughout this README before pushing.</sub>

</div>
