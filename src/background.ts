interface TabActivity {
  id: number;
  url: string;
  title: string;
  domain: string;
  favIconUrl: string;
  openedAt: number;
  lastActiveAt: number;
  timeSpentMs: number;
  summary?: string;
  workspaceId?: string;
  isHibernated?: boolean;
  metaDescription?: string;
}

interface Workspace {
  id: string;
  name: string;
  type: 'ai' | 'custom';
  color: string;
  pinned: boolean;
  tabIds: number[];
}

interface TimelineEvent {
  timestamp: number;
  type: 'visit' | 'hibernate' | 'restore';
  title: string;
  url: string;
}

interface ExtensionState {
  workspaces: Workspace[];
  tabs: Record<number, TabActivity>;
  timeline: TimelineEvent[];
  apiKey: string;
  apiProvider: 'openai' | 'openrouter' | 'ollama';
  ollamaEndpoint: string;
  ollamaModel: string;
  settings: {
    hibernationTimeoutMins: number;
    autoHibernationEnabled: boolean;
    autoProjectDetection: boolean;
  };
  summaryCache?: Record<string, string>;
}

const DEFAULT_STATE: ExtensionState = {
  workspaces: [],
  tabs: {},
  timeline: [],
  apiKey: '',
  apiProvider: 'openrouter',
  ollamaEndpoint: 'http://localhost:11434/api/chat',
  ollamaModel: 'gemma4',
  settings: {
    hibernationTimeoutMins: 30,
    autoHibernationEnabled: true,
    autoProjectDetection: true,
  },
  summaryCache: {}
};

// Set to true to test 30-second hibernation threshold. Switch to false before finishing.
const IS_TESTING_HIBERNATION = false;

let activeTabId: number | null = null;
let lastActiveTime = Date.now();
const debounceTimers = new Map<number, any>();

// Initialize state
chrome.runtime.onInstalled.addListener(async () => {
  const result = await chrome.storage.local.get('state');
  if (!result.state) {
    await chrome.storage.local.set({ state: DEFAULT_STATE });
  }
  
  // Set up side panel click action
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

  // Pre-populate open tabs
  await initializeOpenTabs();
});

chrome.runtime.onStartup.addListener(async () => {
  await initializeOpenTabs();
});

// Helper: Get state from storage
async function getState(): Promise<ExtensionState> {
  const result = await chrome.storage.local.get('state');
  const savedState = result.state || {};
  return {
    ...DEFAULT_STATE,
    ...savedState,
    settings: {
      ...DEFAULT_STATE.settings,
      ...(savedState.settings || {})
    },
    summaryCache: savedState.summaryCache || {}
  };
}

// Helper: Save state to storage
async function saveState(state: ExtensionState): Promise<void> {
  await chrome.storage.local.set({ state });
}

// Helper: Populate already open tabs on startup/install
async function initializeOpenTabs() {
  const state = await getState();
  const tabs = await chrome.tabs.query({});
  const now = Date.now();
  const currentTabIds = new Set<number>();
  
  let updated = false;

  for (const tab of tabs) {
    if (tab.id && tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
      currentTabIds.add(tab.id);
      if (!state.tabs[tab.id]) {
        state.tabs[tab.id] = {
          id: tab.id,
          url: tab.url,
          title: tab.title || 'Untitled',
          domain: getDomain(tab.url),
          favIconUrl: tab.favIconUrl || '',
          openedAt: now,
          lastActiveAt: now,
          timeSpentMs: 0,
          isHibernated: tab.discarded || false
        };
        updated = true;
      }
    }
  }

  // Remove stale tracked tabs that are no longer open in Chrome
  for (const key of Object.keys(state.tabs)) {
    const tabId = Number(key);
    if (!currentTabIds.has(tabId)) {
      delete state.tabs[tabId];
      updated = true;
    }
  }

  if (updated) {
    await saveState(state);
  }
}

// Helper: Extract domain from URL
function getDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch (e) {
    return '';
  }
}

// Track tab switch time spent
async function updateTimeSpent() {
  if (activeTabId !== null) {
    const state = await getState();
    const tabInfo = state.tabs[activeTabId];
    if (tabInfo) {
      const now = Date.now();
      const elapsed = now - lastActiveTime;
      tabInfo.timeSpentMs = (tabInfo.timeSpentMs || 0) + elapsed;
      tabInfo.lastActiveAt = now;
      state.tabs[activeTabId] = tabInfo;
      await saveState(state);
    }
  }
  lastActiveTime = Date.now();
}

// Debounced tab activity handler
function handleTabActivity(tabId: number, changeInfo?: chrome.tabs.TabChangeInfo, tab?: chrome.tabs.Tab) {
  if (debounceTimers.has(tabId)) {
    clearTimeout(debounceTimers.get(tabId));
  }
  
  const timer = setTimeout(async () => {
    debounceTimers.delete(tabId);
    try {
      const state = await getState();
      const targetTab = tab || await chrome.tabs.get(tabId);
      
      if (!targetTab.url || targetTab.url.startsWith('chrome://')) return;

      const domain = getDomain(targetTab.url);
      const now = Date.now();
      
      const existingTab = state.tabs[tabId];
      const isNewVisit = !existingTab || existingTab.url !== targetTab.url;
      
      // Feature [8] Project Replay: Track and add 'restore' events to timeline
      let isRestoreEvent = false;
      if (existingTab && existingTab.isHibernated && !targetTab.discarded) {
        isRestoreEvent = true;
      }

      let metaDescription = existingTab?.metaDescription || '';
      if (isNewVisit && targetTab.id) {
        try {
          const scriptResults = await chrome.scripting.executeScript({
            target: { tabId: targetTab.id },
            func: () => {
              const meta = document.querySelector('meta[name="description"]');
              return meta ? meta.getAttribute('content') : '';
            }
          });
          metaDescription = scriptResults[0]?.result || '';
        } catch (err) {
          console.log('Could not scrape meta-description:', err);
        }
      }

      state.tabs[tabId] = {
        id: tabId,
        url: targetTab.url,
        title: targetTab.title || 'Untitled',
        domain,
        favIconUrl: targetTab.favIconUrl || '',
        openedAt: existingTab?.openedAt || now,
        lastActiveAt: now,
        timeSpentMs: existingTab?.timeSpentMs || 0,
        summary: existingTab?.summary || undefined,
        workspaceId: existingTab?.workspaceId || undefined,
        isHibernated: targetTab.discarded || false,
        metaDescription
      };

      if (isNewVisit) {
        state.timeline.unshift({
          timestamp: now,
          type: 'visit',
          title: targetTab.title || 'Untitled',
          url: targetTab.url
        });
        
        // Keep timeline at max 100 entries
        if (state.timeline.length > 100) {
          state.timeline.pop();
        }

        // Trigger AI summarization asynchronously
        triggerAISummarization(tabId, targetTab.url, targetTab.title || '');

        // Automatically trigger grouping if threshold is met and autoProjectDetection is enabled
        if (state.settings.autoProjectDetection) {
          const ungroupedTabs = Object.values(state.tabs).filter(t => !t.workspaceId);
          if (ungroupedTabs.length >= 2) {
            setTimeout(() => {
              triggerWorkflowGrouping();
            }, 1000);
          }
        }
      } else if (isRestoreEvent) {
        state.timeline.unshift({
          timestamp: now,
          type: 'restore',
          title: targetTab.title || 'Untitled',
          url: targetTab.url
        });
        if (state.timeline.length > 100) {
          state.timeline.pop();
        }
      }

      await saveState(state);
    } catch (e) {
      console.error('Error tracking tab activity:', e);
    }
  }, 500);
  
  debounceTimers.set(tabId, timer);
}

// Tabs Listeners
chrome.tabs.onCreated.addListener((tab) => {
  if (tab.id) {
    handleTabActivity(tab.id, undefined, tab);
  }
});

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  await updateTimeSpent();
  activeTabId = activeInfo.tabId;
  handleTabActivity(activeInfo.tabId);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    handleTabActivity(tabId, changeInfo, tab);
  }
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  if (debounceTimers.has(tabId)) {
    clearTimeout(debounceTimers.get(tabId));
    debounceTimers.delete(tabId);
  }
  const state = await getState();
  if (state.tabs[tabId]) {
    delete state.tabs[tabId];
    // Remove tab from workspaces
    state.workspaces = state.workspaces.map(w => ({
      ...w,
      tabIds: w.tabIds.filter(id => id !== tabId)
    }));
    await saveState(state);
  }
  if (activeTabId === tabId) {
    activeTabId = null;
  }
});

// AI summarize call
async function triggerAISummarization(tabId: number, url: string, title: string) {
  const state = await getState();

  // 1. Check persistent summaryCache first
  if (state.summaryCache && state.summaryCache[url]) {
    state.tabs[tabId].summary = state.summaryCache[url];
    await saveState(state);
    return;
  }

  // 2. Check other active tabs with same URL
  const existingSummary = Object.values(state.tabs).find(t => t.url === url && t.summary)?.summary;
  if (existingSummary) {
    state.tabs[tabId].summary = existingSummary;
    state.summaryCache = state.summaryCache || {};
    state.summaryCache[url] = existingSummary;
    await saveState(state);
    return;
  }

  // 3. Heuristic / Rule-based Fallback if no API key is present
  if (!state.apiKey && state.apiProvider !== 'ollama') {
    const domainName = getDomain(url).replace('www.', '').split('.')[0];
    const capitalizedDomain = domainName.charAt(0).toUpperCase() + domainName.slice(1);
    const fallbackSummary = `Browsing ${capitalizedDomain} to read or work on "${title.slice(0, 30)}...".`;
    
    const currentState = await getState();
    if (currentState.tabs[tabId]) {
      currentState.tabs[tabId].summary = fallbackSummary;
      currentState.summaryCache = currentState.summaryCache || {};
      currentState.summaryCache[url] = fallbackSummary;
      await saveState(currentState);
    }
    return;
  }

  try {
    const prompt = `Summarize this web page title: "${title}" (URL: ${url}) in exactly one short sentence. Explain what the user is trying to accomplish or learn. Keep it under 15 words. Direct answer only.`;
    const summary = await callAI(state, prompt);
    
    const currentState = await getState();
    if (currentState.tabs[tabId]) {
      currentState.tabs[tabId].summary = summary;
      currentState.summaryCache = currentState.summaryCache || {};
      currentState.summaryCache[url] = summary;
      await saveState(currentState);
    }
  } catch (e) {
    console.error('AI Summary Error:', e);
  }
}

// Heuristic rule-based fallback grouping if AI key is missing
async function runHeuristicGrouping(currentState: ExtensionState, tabsArray: TabActivity[]) {
  const groups: Record<string, TabActivity[]> = {};
  
  for (const tab of tabsArray) {
    let groupName = "Web Research";
    const urlLower = tab.url.toLowerCase();
    
    if (urlLower.includes('github.com') || urlLower.includes('gitlab.com') || urlLower.includes('stackoverflow.com') || urlLower.includes('aws.amazon.com') || urlLower.includes('stripe.com/docs')) {
      groupName = "Software Development";
    } else if (urlLower.includes('docs.google.com') || urlLower.includes('sheets.google.com') || urlLower.includes('notion.so') || urlLower.includes('figma.com')) {
      groupName = "Product & Design Work";
    } else if (urlLower.includes('youtube.com') || urlLower.includes('netflix.com') || urlLower.includes('spotify.com')) {
      groupName = "Media & Entertainment";
    } else {
      const domain = tab.domain.replace('www.', '');
      if (domain) {
        groupName = `${domain.split('.')[0].toUpperCase()} Workspace`;
      }
    }
    
    if (!groups[groupName]) {
      groups[groupName] = [];
    }
    groups[groupName].push(tab);
  }
  
  let updated = false;
  for (const [projectName, gTabs] of Object.entries(groups)) {
    if (gTabs.length === 0) continue;
    
    // Find or create AI workspace
    let workspace = currentState.workspaces.find(w => w.name.toLowerCase() === projectName.toLowerCase() && w.type === 'ai');
    if (!workspace) {
      workspace = {
        id: 'ai_' + Math.random().toString(36).substr(2, 9),
        name: projectName,
        type: 'ai',
        color: getRandomColor(),
        pinned: false,
        tabIds: []
      };
      currentState.workspaces.push(workspace);
    }
    
    for (const gTab of gTabs) {
      const tab = currentState.tabs[gTab.id];
      if (tab && !tab.workspaceId) {
        tab.workspaceId = workspace.id;
        if (!tab.summary) {
          tab.summary = `Viewing ${tab.title} for ${projectName}`;
        }
        workspace.tabIds.push(tab.id);
        updated = true;
      }
    }
  }
  
  if (updated) {
    await saveState(currentState);
  }
}

// Perform workflow-based workspace grouping
async function triggerWorkflowGrouping() {
  const state = await getState();
  const tabsArray = Object.values(state.tabs).filter(t => !t.workspaceId);
  if (tabsArray.length === 0) return;

  // Heuristic fallback if API keys are missing
  if (!state.apiKey && state.apiProvider !== 'ollama') {
    await runHeuristicGrouping(state, tabsArray);
    return;
  }

  try {
    const inputPayload = tabsArray.map(t => ({
      url: t.url,
      title: t.title,
      description: t.metaDescription || ''
    }));

    const prompt = `You are the intelligence engine for "Tab Loom", an advanced browser tab organizer. Your objective is to solve a workflow problem ("What project is the user trying to accomplish?") rather than a classification problem ("What is this page about?").

INPUT:
${JSON.stringify(inputPayload, null, 2)}

INSTRUCTIONS:
1. Identify the Project Workflow: Analyze the batch of tabs to infer the specific project, task, or goal the user is working on. 
2. AVOID Content-Similarity Grouping: Do NOT group tabs by generic topics or software types. For example, if you see a Figma mockup, a banking portal, and a Google Doc, do NOT split them into "Design," "Finance," and "Writing." Group them together under a specific project name like "Client Website Launch" or "Q3 Marketing Campaign".
3. Summarize: Generate a punchy, one-sentence summary for each tab that explains WHY the user is looking at this page in the context of their project.

OUTPUT FORMAT:
Return a strict JSON object where the keys are the inferred "Project Names" (e.g., "Software Deployment", "Academic Research: Tab Management", "Vacation Planning") and the values are arrays of tabs belonging to that project. Each tab object must include its original URL and your generated "one_sentence_summary".

Output ONLY valid JSON. Output format example:
{
  "Project Name": [
    { "url": "https://example.com", "one_sentence_summary": "Detailed context summary" }
  ]
}`;

    const responseText = await callAI(state, prompt, true);
    
    let jsonText = responseText;
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonText = jsonMatch[0];
    }

    const groups: Record<string, Array<{ url: string; one_sentence_summary: string }>> = JSON.parse(jsonText);

    const currentState = await getState();
    let updated = false;

    for (const [projectName, groupedTabs] of Object.entries(groups)) {
      if (!projectName || !Array.isArray(groupedTabs) || groupedTabs.length === 0) continue;

      let workspace = currentState.workspaces.find(w => w.name.toLowerCase() === projectName.toLowerCase() && w.type === 'ai');
      if (!workspace) {
        workspace = {
          id: 'ai_' + Math.random().toString(36).substr(2, 9),
          name: projectName,
          type: 'ai',
          color: getRandomColor(),
          pinned: false,
          tabIds: []
        };
        currentState.workspaces.push(workspace);
      }

      for (const groupedTab of groupedTabs) {
        const tab = Object.values(currentState.tabs).find(t => {
          if (t.workspaceId) return false;
          const u1 = t.url.toLowerCase().replace(/\/$/, '');
          const u2 = groupedTab.url.toLowerCase().replace(/\/$/, '');
          return u1 === u2 || u1.includes(u2) || u2.includes(u1);
        });
        if (tab) {
          tab.workspaceId = workspace.id;
          tab.summary = groupedTab.one_sentence_summary;
          workspace.tabIds.push(tab.id);
          updated = true;
        }
      }
    }

    if (updated) {
      await saveState(currentState);
    }
  } catch (e) {
    console.error('Workflow grouping error:', e);
    // Trigger Heuristic grouping as secondary fallback on API error
    await runHeuristicGrouping(state, tabsArray);
  }
}

// Listen to runtime messages for triggering workflow grouping manually or requesting AI completions
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'TRIGGER_GROUPING') {
    triggerWorkflowGrouping().then(() => sendResponse({ success: true }));
    return true; 
  }
  if (message.type === 'CALL_AI') {
    getState().then(state => {
      callAI(state, message.prompt)
        .then(content => sendResponse({ content }))
        .catch(err => sendResponse({ error: err.message || String(err) }));
    });
    return true;
  }
});

// General AI call function
async function callAI(state: ExtensionState, prompt: string, jsonMode = false): Promise<string> {
  const model = state.apiProvider === 'openai' 
    ? 'gpt-3.5-turbo' 
    : 'google/gemini-2.5-flash';

  if (state.apiProvider === 'ollama') {
    const url = state.ollamaEndpoint || 'http://localhost:11434/api/chat';
    const body = {
      model: state.ollamaModel || 'gemma4',
      messages: [{ role: 'user', content: prompt }],
      stream: false
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`AI API failed: ${res.status} ${errorText}`);
    }

    const data = await res.json();
    let content = data.message?.content?.trim() || '';

    if (jsonMode) {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        content = jsonMatch[0];
      }
    }

    return content;
  }

  const url = state.apiProvider === 'openai' 
    ? 'https://api.openai.com/v1/chat/completions'
    : 'https://openrouter.ai/api/v1/chat/completions';

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${state.apiKey}`
  };

  if (state.apiProvider === 'openrouter') {
    headers['HTTP-Referer'] = 'https://tabloom.ai';
    headers['X-Title'] = 'Tab Loom';
  }

  const body = {
    model,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.2,
    max_tokens: 1500,
    ...(jsonMode && state.apiProvider === 'openai' ? { response_format: { type: 'json_object' } } : {})
  };

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`AI API failed: ${res.status} ${errorText}`);
  }

  const data = await res.json();
  let content = data.choices[0].message.content.trim();
  
  if (jsonMode) {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      content = jsonMatch[0];
    }
  }

  return content;
}

function getRandomColor(): string {
  const colors = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#14b8a6', '#6366f1'];
  return colors[Math.floor(Math.random() * colors.length)];
}

// Adaptive Inactivity Hibernation logic
chrome.alarms.create('checkHibernation', { periodInMinutes: 1 }); // Run check every minute to be more responsive
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'checkHibernation') {
    const state = await getState();
    if (!state.settings.autoHibernationEnabled) return;

    // Use 30 seconds if testing, otherwise settings timeout
    const timeoutMs = IS_TESTING_HIBERNATION 
      ? 30 * 1000 
      : state.settings.hibernationTimeoutMins * 60 * 1000;
      
    const now = Date.now();

    // Query all current tabs (except active or discarded ones)
    const allTabs = await chrome.tabs.query({ active: false, discarded: false });
    
    // Sort tabs by dynamic weight using actual DOM and media metrics
    const weightedTabs: Array<{ tabId: number; url: string; title: string; weight: number; inactiveDuration: number }> = [];
    
    for (const t of allTabs) {
      if (!t.id) continue;
      
      let domSize = 0;
      let imgCount = 0;
      let videoCount = 0;
      
      try {
        const results = await chrome.scripting.executeScript({
          target: { tabId: t.id },
          func: () => {
            return {
              domSize: document.getElementsByTagName('*').length,
              imgCount: document.getElementsByTagName('img').length,
              videoCount: document.getElementsByTagName('video').length + document.getElementsByTagName('audio').length
            };
          }
        });
        if (results && results[0]?.result) {
          domSize = results[0].result.domSize || 0;
          imgCount = results[0].result.imgCount || 0;
          videoCount = results[0].result.videoCount || 0;
        }
      } catch (e) {
        console.log(`Could not scrape page metrics for tab ${t.id}:`, e);
      }
      
      const urlStr = t.url || '';
      let weight = 1.0;
      
      if (domSize > 0) {
        weight += (domSize / 1000) * 0.5;
        weight += (imgCount / 10) * 0.2;
        weight += videoCount * 1.0;
      } else {
        if (urlStr.includes('figma.com') || urlStr.includes('docs.google.com') || urlStr.includes('sheets.google.com')) {
          weight = 5.0;
        } else if (urlStr.includes('youtube.com') || urlStr.includes('netflix.com') || urlStr.includes('vimeo.com')) {
          weight = 4.0;
        } else if (urlStr.includes('github.com') || urlStr.includes('gitlab.com') || urlStr.includes('aws.amazon.com')) {
          weight = 3.0;
        }
      }

      const tracking = state.tabs[t.id];
      const inactiveDuration = tracking ? (now - tracking.lastActiveAt) : 0;

      weightedTabs.push({
        tabId: t.id,
        url: urlStr,
        title: t.title || '',
        weight,
        inactiveDuration
      });
    }

    // Filter tabs that exceeded inactivity threshold
    const candidates = weightedTabs.filter(t => t.inactiveDuration > timeoutMs);

    // Sort: highest impact weight * inactiveDuration first
    candidates.sort((a, b) => (b.weight * b.inactiveDuration) - (a.weight * a.inactiveDuration));

    for (const candidate of candidates) {
      try {
        await chrome.tabs.discard(candidate.tabId);
        
        state.timeline.unshift({
          timestamp: Date.now(),
          type: 'hibernate',
          title: candidate.title,
          url: candidate.url
        });
        if (state.timeline.length > 100) {
          state.timeline.pop();
        }

        if (state.tabs[candidate.tabId]) {
          state.tabs[candidate.tabId].isHibernated = true;
        }

        console.log(`Hibernated tab: ${candidate.title} (Weight: ${candidate.weight.toFixed(2)})`);
      } catch (err) {
        console.error(`Failed to hibernate tab ${candidate.tabId}:`, err);
      }
    }

    await saveState(state);
  }
});
