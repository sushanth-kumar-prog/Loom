<div align="center">

<img src="./assets/hero-banner.svg" width="100%" alt="TabLoom: Your Browser's Second Brain"/>

<img src="./assets/divider.svg" width="100%" height="4"/>

<p align="center">
  <img src="https://img.shields.io/github/stars/sushanth-kumar-prog/Loom?color=00F5D4&style=for-the-badge&logo=star&logoColor=white&labelColor=0d1117" alt="stars"/>
  <img src="https://img.shields.io/github/forks/sushanth-kumar-prog/Loom?color=9B5DE5&style=for-the-badge&logo=git&logoColor=white&labelColor=0d1117" alt="forks"/>
  <img src="https://img.shields.io/github/last-commit/sushanth-kumar-prog/Loom?color=F15BB5&style=for-the-badge&logo=github&logoColor=white&labelColor=0d1117" alt="last commit"/>
  <img src="https://img.shields.io/badge/License-MIT-00F5D4?style=for-the-badge&logo=opensourceinitiative&logoColor=white&labelColor=0d1117" alt="license"/>
  <img src="https://img.shields.io/badge/Manifest-V3-9B5DE5?style=for-the-badge&logo=googlechrome&logoColor=white&labelColor=0d1117" alt="manifest v3"/>
</p>
<p align="center">
  <img src="https://komarev.com/ghpvc/?username=TabLoom-Elevate2026&style=for-the-badge&color=F15BB5&labelColor=0d1117&label=VIEWING%20THIS" alt="live views"/>
</p>

<img src="https://readme-typing-svg.herokuapp.com?font=Fira+Code&size=18&duration=2200&pause=400&color=5eead4&center=true&vCenter=true&width=820&lines=%24+npm+run+build;%E2%9C%93+compiled+background.js+%2B+side+panel+bundle;%24+connecting+to+OpenRouter...;%E2%9C%93+cloud+inference+ready%2C+pay+per+token;%E2%9C%93+50+tabs+%E2%86%92+4+intent-grouped+workspaces;%E2%9C%93+312MB+RAM+reclaimed+this+session" alt="fake terminal session" />

</div>

<img src="./assets/divider.svg" width="100%" height="4"/>

<img src="https://readme-typing-svg.herokuapp.com?font=Orbitron&size=22&duration=4000&pause=1500&color=F15BB5&center=true&vCenter=true&multiline=true&width=800&height=70&lines=Elevate+2026;Organized+by+Ideakode" alt="event banner" />

<p align="center">
  <img src="https://img.shields.io/badge/Event-Elevate%202026-F15BB5?style=for-the-badge&logo=googlechrome&logoColor=white&labelColor=0d1117" alt="event"/>
  <img src="https://img.shields.io/badge/Organizer-Ideakode-9B5DE5?style=for-the-badge&logo=hackthebox&logoColor=white&labelColor=0d1117" alt="organizer"/>
  <img src="https://img.shields.io/badge/Team-sushramesh5-00F5D4?style=for-the-badge&logo=github&logoColor=white&labelColor=0d1117" alt="team"/>
</p>

<img src="./assets/divider.svg" width="100%" height="4"/>

<div align="center">
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/sushanth-kumar-prog/Loom/output/github-contribution-grid-snake-dark.svg">
  <img alt="contribution snake" src="https://raw.githubusercontent.com/sushanth-kumar-prog/Loom/output/github-contribution-grid-snake.svg" width="100%">
</picture>
</div>

<img src="./assets/divider.svg" width="100%" height="4"/>

## Our Vision

> TabLoom is a smart Chrome extension designed to solve "tab hoarding." Instead of keeping dozens of tabs open out of fear of losing your thoughts, it uses AI to organize them by what you are actually doing, and puts unused tabs to sleep to speed up your computer.
<table>
<tr>
<td width="50%" align="center">

### Before TabLoom
```yaml
Open Tabs:        50-100
RAM Wasted:        ~120MB / idle tab
Grouping Logic:    manual / by URL
Context Recall:    "wait, why did I open this?"
Privacy:           cloud tab-managers see everything
```

</td>
<td width="50%" align="center">

### After TabLoom
```yaml
Open Tabs:         same, but organized
RAM Reclaimed:     up to 120MB / hibernated tab
Grouping Logic:    AI semantic intent clustering
Context Recall:    1-sentence summary, instantly
Privacy:           routed through OpenRouter, keys local
```

</td>
</tr>
</table>

<img src="./assets/divider.svg" width="100%" height="4"/>

## Live Architecture

<div align="center">
<img src="./assets/architecture-flow.svg" width="100%" alt="Animated TabLoom architecture diagram"/>
</div>

<div align="center">
<details>
<summary><img src="https://img.shields.io/badge/VIEW%20MERMAID%20DIAGRAM-00F5D4?style=for-the-badge&logoColor=0d1117&labelColor=9B5DE5"/></summary>

```mermaid
graph TD
    A[chrome.tabs API] --> B[Service Worker Engine]
    B --> C[OpenRouter API :: cloud inference]
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
</div>

<img src="./assets/divider.svg" width="100%" height="4"/>

## Tech Stack

<table align="center">
<tr>
<td width="33%" align="center">

**Frontend Panel**

<img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB&labelColor=0d1117"/>
<img src="https://img.shields.io/badge/Vite-FFD62E?style=for-the-badge&logo=vite&logoColor=646CFF&labelColor=0d1117"/>
<br/>
<img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white&labelColor=0d1117"/>
<img src="https://img.shields.io/badge/Tailwind-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white&labelColor=0d1117"/>

</td>
<td width="33%" align="center">

**Engine & Browser APIs**

<img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black&labelColor=0d1117"/>
<img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white&labelColor=0d1117"/>
<br/>
<img src="https://img.shields.io/badge/Chrome-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white&labelColor=0d1117"/>
<img src="https://img.shields.io/badge/Webpack-8DD6F9?style=for-the-badge&logo=webpack&logoColor=black&labelColor=0d1117"/>

</td>
<td width="33%" align="center">

**AI Orchestration**

<img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white&labelColor=0d1117"/>
<br/>
<img src="https://img.shields.io/badge/OpenRouter-6B5CE6?style=for-the-badge&logoColor=white&labelColor=0d1117"/>

</td>
</tr>
</table>

<img src="./assets/divider.svg" width="100%" height="4"/>


## Core Capabilities

<table>
<tr>
<td width="33%" valign="top">

### Workflow-Aware AI
* 1-sentence **intent summary** per tab
* Groups by **semantic purpose**, not domain
* Auto-names workspaces, e.g. *"OAuth Configuration"*

</td>
<td width="33%" valign="top">

### Cloud-Powered Privacy
* Inference routed through **OpenRouter**
* Keys stored only in `chrome.storage.local`
* Only page **titles/domains** ever leave the device

</td>
<td width="33%" valign="top">

### Adaptive Hibernation
* Auto-sleeps idle tabs after a set timeout
* One-click manual hibernate
* Instant wake-and-restore, zero lag

</td>
</tr>
</table>

<img src="./assets/divider.svg" width="100%" height="4"/>

## Comparison

<table align="center">
<tr>
<th>Metric</th>
<th>Traditional Tab Management</th>
<th>TabLoom</th>
<th>Result</th>
</tr>
<tr>
<td><strong>Memory per Idle Tab</strong></td>
<td>Full page weight retained</td>
<td>Up to 120MB reclaimed</td>
<td>Real RAM recovery</td>
</tr>
<tr>
<td><strong>Tab Grouping Logic</strong></td>
<td>Manual or URL-based</td>
<td>AI semantic intent clustering</td>
<td>Context-aware, not string-matched</td>
</tr>
<tr>
<td><strong>Data Privacy</strong></td>
<td>Often opaque, mixed providers</td>
<td>Routed through OpenRouter, keys stay local</td>
<td>Transparent, single-provider routing</td>
</tr>
<tr>
<td><strong>Repeat-Visit API Cost</strong></td>
<td>Re-queries every load</td>
<td>Cached by URL</td>
<td>No redundant LLM calls</td>
</tr>
</table>

<img src="./assets/divider.svg" width="100%" height="4"/>

## Setup & Installation

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
4. Pin **TabLoom** from the toolbar

<img src="./assets/divider.svg" width="100%" height="4"/>

## Testing & Debugging

| Step | Action |
|---|---|
| 1 | Add your **OpenRouter API key** in Settings to start inference |
| 2 | Click the toolbar icon to open the Side Panel |
| 3 | Settings → confirm the active OpenRouter model |
| 4 | Open tabs → watch the live timeline feed update |
| 5 | Visit any page → AI generates a 1-sentence intent summary |
| 6 | Open 4 to 5 related tabs → click **Organize** to auto-cluster |
| 7 | Toggle **Auto Hibernation** ON, or hibernate manually |
| 8 | Right-click icon → **Inspect Side Panel**, or open the **service worker** link in `chrome://extensions/` for logs |

<img src="./assets/divider.svg" width="100%" height="4"/>

<details>
<summary><sub>Snake graphic not animating yet?</sub></summary>

This repo's `.github/workflows/snake.yml` auto-generates it from this account's contribution history.
1. **Settings → Actions → General** → set Workflow permissions to **Read and write**
2. **Actions** tab → run the **generate-snake** workflow once
3. It publishes to an auto-created `output` branch, then goes live above automatically. No further upkeep needed.

</details>

<img src="./assets/divider.svg" width="100%" height="4"/>

<details>
<summary><strong>Q&A Preparation (click to expand)</strong></summary>

**Q1: How do you preserve privacy when sending data to AI?**
> TabLoom is serverless. API keys live only in `chrome.storage.local`. Only public page metadata (titles, domains) is sent to OpenRouter for classification, never passwords, form entries, or cookies.

**Q2: Isn't Chrome's built-in tab grouping already doing this?**
> Chrome groups manually or by URL structure. TabLoom clusters by semantic intent, linking a design tab, a code tab, and a billing tab under one workspace task, and hibernates them dynamically.

**Q3: What happens if the API key gets rate-limited?**
> Summaries are cached by URL. Repeat or duplicate visits skip the LLM call entirely, conserving tokens and avoiding rate limits.

</details>

<img src="./assets/divider.svg" width="100%" height="4"/>

## Roadmap

1. **Offline AI in-browser:** quantized Llama 3 8B / Gemma 2B via WebGPU, zero API keys
2. **Team Workspaces:** encrypted WebRTC session sharing for team-wide context sync
3. **Cross-Browser Sync:** extend timeline history securely to Firefox and Safari

## Privacy Policy Summary

TabLoom processes browsing details strictly inside the local extension environment. No analytics or page content is uploaded to secondary servers beyond the configured OpenRouter endpoint, which is governed by OpenRouter's own terms.

<img src="./assets/divider.svg" width="100%" height="4"/>

<div align="center">

<img src="https://readme-typing-svg.herokuapp.com?font=JetBrains+Mono&size=16&duration=3000&pause=1000&color=9B5DE5&center=true&vCenter=true&width=700&lines=Status%3A+MVP%2C+Open+to+Collaborations;Built+for+Elevate+2026+by+Ideakode;Star+this+repo+if+TabLoom+saved+your+RAM" alt="status" />

<sub><strong>Event:</strong> Elevate 2026 &nbsp;|&nbsp; <strong>Organizer:</strong> Ideakode &nbsp;|&nbsp; <strong>Team:</strong> sushramesh5</sub>
<br/>
<sub> Repo: sushanth-kumar-prog/Loom</sub>

</div>
