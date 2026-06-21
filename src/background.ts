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
}

const DEFAULT_STATE: ExtensionState = {
  workspaces: [],
  tabs: {},
  timeline: [],
  apiKey: 'sk-or-v1-YOUR_OPENROUTER_KEY_FOR_JUDGES',
  apiProvider: 'openrouter',
  ollamaEndpoint: 'http://localhost:11434/api/chat',
  ollamaModel: 'gemma4',
  settings: {
    hibernationTimeoutMins: 30,
    autoHibernationEnabled: true,
    autoProjectDetection: true,
  }
};

let activeTabId: number | null = null;
let lastActiveTime = Date.now();
let debounceTimer: any = null;

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
    }
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
  let updated = false;
  const now = Date.now();
  for (const tab of tabs) {
    if (tab.id && tab.url && !tab.url.startsWith('chrome://')) {
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
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(async () => {
    try {
      const state = await getState();
      const targetTab = tab || await chrome.tabs.get(tabId);
      
      if (!targetTab.url || targetTab.url.startsWith('chrome://')) return;

      const domain = getDomain(targetTab.url);
      const now = Date.now();
      
      const existingTab = state.tabs[tabId];
      const isNewVisit = !existingTab || existingTab.url !== targetTab.url;

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
            // Run asynchronously
            setTimeout(() => {
              triggerWorkflowGrouping();
            }, 1000);
          }
        }
      }

      await saveState(state);
    } catch (e) {
      console.error('Error tracking tab activity:', e);
    }
  }, 500);
}

// Tabs Listeners
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
  if (debounceTimer) clearTimeout(debounceTimer);
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
  if (!state.apiKey && state.apiProvider !== 'ollama') return;

  // Search if summary is already cached in another tab with same URL
  const existingSummary = Object.values(state.tabs).find(t => t.url === url && t.summary)?.summary;
  if (existingSummary) {
    state.tabs[tabId].summary = existingSummary;
    await saveState(state);
    return;
  }

  try {
    const prompt = `Summarize this web page title: "${title}" (URL: ${url}) in exactly one short sentence. Explain what the user is trying to accomplish or learn. Keep it under 15 words. Direct answer only.`;
    const summary = await callAI(state, prompt);
    
    // Fetch state again to avoid overwriting newer updates
    const currentState = await getState();
    if (currentState.tabs[tabId]) {
      currentState.tabs[tabId].summary = summary;
      await saveState(currentState);
    }
  } catch (e) {
    console.error('AI Summary Error:', e);
  }
}

// Perform workflow-based workspace grouping
async function triggerWorkflowGrouping() {
  const state = await getState();
  if (!state.apiKey && state.apiProvider !== 'ollama') return;

  const tabsArray = Object.values(state.tabs).filter(t => !t.workspaceId);
  if (tabsArray.length === 0) return;

  try {
    const inputPayload = tabsArray.map(t => ({
      url: t.url,
      title: t.title,
      description: t.metaDescription || ''
    }));

    const prompt = `You are the intelligence engine for "ContextTab", an advanced browser tab organizer. Your objective is to solve a workflow problem ("What project is the user trying to accomplish?") rather than a classification problem ("What is this page about?").

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
    
    // Attempt to extract JSON block if there is extra text wrap
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

      for (const groupedTab of groupedTabs) {
        // Find matching active tab by URL
        const tab = Object.values(currentState.tabs).find(t => t.url === groupedTab.url && !t.workspaceId);
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
  }
}

// Listen to runtime messages for triggering workflow grouping manually
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'TRIGGER_GROUPING') {
    triggerWorkflowGrouping().then(() => sendResponse({ success: true }));
    return true; 
  }
});

// General AI call function
async function callAI(state: ExtensionState, prompt: string, jsonMode = false): Promise<string> {
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
      throw new Error(`Ollama API failed: ${res.statusText}`);
    }

    const data = await res.json();
    let content = data.message?.content?.trim() || '';

    if (jsonMode) {
      const match = content.match(/\[\s*\{.*\}\s*\]/s);
      if (match) {
        content = match[0];
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
    headers['HTTP-Referer'] = 'https://contexttab.ai';
    headers['X-Title'] = 'ContextTab';
  }

  const model = state.apiProvider === 'openai' ? 'gpt-3.5-turbo' : 'meta-llama/llama-3-8b-instruct:free';

  const body = {
    model,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.2,
    ...(jsonMode && state.apiProvider === 'openai' ? { response_format: { type: 'json_object' } } : {})
  };

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    throw new Error(`AI API failed: ${res.statusText}`);
  }

  const data = await res.json();
  let content = data.choices[0].message.content.trim();
  
  if (jsonMode) {
    const match = content.match(/\[\s*\{.*\}\s*\]/s);
    if (match) {
      content = match[0];
    }
  }

  return content;
}

function getRandomColor(): string {
  const colors = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#14b8a6', '#6366f1'];
  return colors[Math.floor(Math.random() * colors.length)];
}

// Adaptive Inactivity Hibernation logic
chrome.alarms.create('checkHibernation', { periodInMinutes: 5 });
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'checkHibernation') {
    const state = await getState();
    if (!state.settings.autoHibernationEnabled) return;

    const timeoutMs = state.settings.hibernationTimeoutMins * 60 * 1000;
    const now = Date.now();

    // Query all current tabs
    const allTabs = await chrome.tabs.query({ active: false, discarded: false });
    
    // Sort tabs by dynamic weight (estimated memory footprint)
    // Categories: Design/Docs > Media/Video > General search/blogs
    const weightedTabs = allTabs.map(t => {
      let weight = 1; // Base memory weight
      const urlStr = t.url || '';
      
      if (urlStr.includes('figma.com') || urlStr.includes('docs.google.com') || urlStr.includes('sheets.google.com')) {
        weight = 5; // Heavy workspace tool
      } else if (urlStr.includes('youtube.com') || urlStr.includes('netflix.com') || urlStr.includes('vimeo.com')) {
        weight = 4; // Media
      } else if (urlStr.includes('github.com') || urlStr.includes('gitlab.com') || urlStr.includes('aws.amazon.com')) {
        weight = 3; // Developer tool
      }

      // Find tracking details for last visited timestamp
      const tracking = state.tabs[t.id || -1];
      const inactiveDuration = tracking ? (now - tracking.lastActiveAt) : 0;

      return {
        tabId: t.id,
        url: urlStr,
        title: t.title || '',
        weight,
        inactiveDuration
      };
    });

    // Filter tabs that exceeded the inactivity threshold
    const candidates = weightedTabs.filter(t => t.tabId && t.inactiveDuration > timeoutMs);

    // Sort: highest impact (weight) and longest inactive first
    candidates.sort((a, b) => b.weight * b.inactiveDuration - a.weight * a.inactiveDuration);

    for (const candidate of candidates) {
      if (candidate.tabId) {
        try {
          await chrome.tabs.discard(candidate.tabId);
          
          // Log to timeline
          state.timeline.unshift({
            timestamp: Date.now(),
            type: 'hibernate',
            title: candidate.title,
            url: candidate.url
          });

          if (state.tabs[candidate.tabId]) {
            state.tabs[candidate.tabId].isHibernated = true;
          }

          console.log(`Hibernated tab: ${candidate.title}`);
        } catch (err) {
          console.error(`Failed to hibernate tab ${candidate.tabId}:`, err);
        }
      }
    }

    await saveState(state);
  }
});
