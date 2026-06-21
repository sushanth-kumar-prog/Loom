import React, { useState, useEffect } from 'react';
import { 
  Brain, Folder, Clock, Settings, Search, Plus, 
  ChevronRight, Play, CheckCircle, HelpCircle, 
  ArrowRight, Shield, RefreshCw, Eye, EyeOff, 
  Volume2, Compass, Trash2, Download, ExternalLink, 
  Mic, Send, BookOpen, Layers, Sparkles, Pin, Lock, Edit3, X, Moon
} from 'lucide-react';

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
  apiKey: '',
  apiProvider: 'openrouter',
  ollamaEndpoint: 'http://localhost:11434/api/chat',
  ollamaModel: 'gemma4',
  settings: {
    hibernationTimeoutMins: 30,
    autoHibernationEnabled: true,
    autoProjectDetection: true,
  }
};

function getDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch (e) {
    return '';
  }
}

export default function App() {
  const [state, setState] = useState<ExtensionState>(DEFAULT_STATE);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeView, setActiveView] = useState<'home' | 'workspaces' | 'timeline' | 'assistant' | 'settings'>('assistant');
  const [activeFilter, setActiveFilter] = useState<'all' | 'ai' | 'custom' | 'pinned' | 'archived'>('all');
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [activeTabList, setActiveTabList] = useState<chrome.tabs.Tab[]>([]);
  const [showKey, setShowKey] = useState(false);
  
  // Expanded Workspace ID for detailed settings
  const [expandedWsId, setExpandedWsId] = useState<string | null>(null);
  
  // Renaming Workspaces
  const [editingWsId, setEditingWsId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  // Assistant Chat Thread
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string; timestamp: number }>>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Sync state from chrome.storage.local
  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get('state', (result) => {
        if (result.state) {
          const savedState = result.state || {};
          setState({
            ...DEFAULT_STATE,
            ...savedState,
            settings: {
              ...DEFAULT_STATE.settings,
              ...(savedState.settings || {})
            }
          });
        }
      });

      const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }) => {
        if (changes.state) {
          setState(changes.state.newValue);
        }
      };
      chrome.storage.onChanged.addListener(handleStorageChange);

      refreshBrowserTabs();

      return () => {
        chrome.storage.onChanged.removeListener(handleStorageChange);
      };
    }
  }, []);

  const refreshBrowserTabs = () => {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.query({}, (tabs) => {
        setActiveTabList(tabs);
      });
    }
  };

  const updateState = async (updatedState: ExtensionState) => {
    setState(updatedState);
    if (typeof chrome !== 'undefined' && chrome.storage) {
      await chrome.storage.local.set({ state: updatedState });
    }
  };

  // Actions
  const handleCreateWorkspace = async () => {
    if (!newWorkspaceName.trim()) return;
    const colors = ['#8b5cf6', '#f59e0b', '#10b981', '#ec4899', '#3b82f6'];
    const randomColor = colors[state.workspaces.length % colors.length];
    const newWs: Workspace = {
      id: 'custom_' + Math.random().toString(36).substr(2, 9),
      name: newWorkspaceName.trim(),
      type: 'custom',
      color: randomColor,
      pinned: false,
      tabIds: []
    };
    await updateState({
      ...state,
      workspaces: [...state.workspaces, newWs]
    });
    setNewWorkspaceName('');
  };

  const handleResumeWorkspace = (workspaceId: string) => {
    const wsTabs = Object.values(state.tabs).filter(t => t.workspaceId === workspaceId);
    if (wsTabs.length > 0 && typeof chrome !== 'undefined' && chrome.tabs) {
      wsTabs.forEach(tab => {
        chrome.tabs.create({ url: tab.url, active: false });
      });
    }
  };

  const handleTogglePinWorkspace = async (id: string) => {
    const updated = {
      ...state,
      workspaces: state.workspaces.map(w => w.id === id ? { ...w, pinned: !w.pinned } : w)
    };
    await updateState(updated);
  };

  const handleConvertAIWorkspace = async (id: string) => {
    const updated = {
      ...state,
      workspaces: state.workspaces.map(w => w.id === id ? { ...w, type: 'custom' as const } : w)
    };
    await updateState(updated);
  };

  const handleDeleteWorkspace = async (id: string) => {
    if (!confirm("Delete this workspace? Associated tabs will be unlinked.")) return;
    const updatedTabs = { ...state.tabs };
    Object.keys(updatedTabs).forEach(key => {
      const numKey = Number(key);
      if (updatedTabs[numKey].workspaceId === id) {
        updatedTabs[numKey].workspaceId = undefined;
      }
    });

    const updated = {
      ...state,
      workspaces: state.workspaces.filter(w => w.id !== id),
      tabs: updatedTabs
    };
    await updateState(updated);
    if (expandedWsId === id) setExpandedWsId(null);
  };

  const handleRenameWorkspace = async (id: string) => {
    if (!editingName.trim()) return;
    const updated = {
      ...state,
      workspaces: state.workspaces.map(w => w.id === id ? { ...w, name: editingName.trim() } : w)
    };
    await updateState(updated);
    setEditingWsId(null);
    setEditingName('');
  };

  const handleRemoveTabFromWorkspace = async (tabId: number) => {
    const updatedTabs = { ...state.tabs };
    if (updatedTabs[tabId]) {
      const oldWsId = updatedTabs[tabId].workspaceId;
      const updatedWorkspaces = state.workspaces.map(w => {
        if (w.id === oldWsId) {
          return { ...w, tabIds: w.tabIds.filter(id => id !== tabId) };
        }
        return w;
      });

      updatedTabs[tabId].workspaceId = undefined;

      await updateState({
        ...state,
        workspaces: updatedWorkspaces,
        tabs: updatedTabs
      });
    }
  };

  const handleHibernateTab = async (tabId: number) => {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      try {
        await chrome.tabs.discard(tabId);
        const tabInfo = state.tabs[tabId];
        const newTimeline = [
          {
            timestamp: Date.now(),
            type: 'hibernate' as const,
            title: tabInfo?.title || 'Active Tab',
            url: tabInfo?.url || ''
          },
          ...state.timeline
        ];

        const updatedTabs = { ...state.tabs };
        if (updatedTabs[tabId]) {
          updatedTabs[tabId].isHibernated = true;
        }

        await updateState({
          ...state,
          tabs: updatedTabs,
          timeline: newTimeline.slice(0, 100)
        });
        refreshBrowserTabs();
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleClearData = async () => {
    if (confirm("Are you sure you want to clear all ContextTab workspace and history data?")) {
      const reset = {
        ...DEFAULT_STATE,
        apiKey: state.apiKey // Keep key
      };
      await updateState(reset);
    }
  };

  // AI Chat Request handler (Second Brain Interface)
  const handleSendChatMessage = async () => {
    if (!chatInput.trim()) return;
    const userText = chatInput.trim();
    const newMsg = { role: 'user' as const, text: userText, timestamp: Date.now() };
    setChatMessages(prev => [...prev, newMsg]);
    setChatInput('');
    setIsChatLoading(true);

    try {
      // Gather active history snapshots to enrich prompt
      const openTabsList = Object.values(state.tabs).map(t => `- "${t.title}" on ${t.domain} (Summary: ${t.summary || 'None'})`).join('\n');
      const workspacesList = state.workspaces.map(w => `- Project "${w.name}" (${w.type})`).join('\n');

      const systemContextPrompt = `You are the user's browser "Second Brain" assistant.
Here is the context of what the user has currently open and saved in ContextTab:

WORKSPACES/PROJECTS:
${workspacesList || "None created yet."}

ACTIVE SESSIONS & SUMMARIES:
${openTabsList || "No active tabs tracked yet."}

Answer the user's question: "${userText}" in a helpful, friendly, plain English response. Keep it under 60 words. Avoid generic developer hype terms. Speak directly to what they are doing.`;

      const response = await callAI(state, systemContextPrompt);
      setChatMessages(prev => [...prev, { role: 'assistant', text: response, timestamp: Date.now() }]);
    } catch (err) {
      console.error(err);
      setChatMessages(prev => [...prev, { role: 'assistant', text: "Sorry, I couldn't reach the AI cloud endpoint. Check your internet connection or settings.", timestamp: Date.now() }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const callAI = async (configState: ExtensionState, prompt: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ type: 'CALL_AI', prompt }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (response && response.error) {
          reject(new Error(response.error));
        } else if (response && response.content !== undefined) {
          resolve(response.content);
        } else {
          reject(new Error("Empty response from AI"));
        }
      });
    });
  };

  // Counting metrics for badges
  const activeTabsCount = activeTabList.length;
  const aiCount = state.workspaces.filter(w => w.type === 'ai').length;
  const customCount = state.workspaces.filter(w => w.type === 'custom').length;
  const pinnedCount = state.workspaces.filter(w => w.pinned).length;
  const hibernatedTabsCount = Object.values(state.tabs).filter(t => t.isHibernated).length;
  const estimatedRAMSavedGB = ((hibernatedTabsCount * 120) / 1024).toFixed(1);

  // Filters workspace lists based on search query
  const filteredWorkspaces = state.workspaces.filter(w => {
    const wsTabs = Object.values(state.tabs).filter(t => t.workspaceId === w.id);
    const matchesSearch = w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      wsTabs.some(t => 
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        t.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.summary && t.summary.toLowerCase().includes(searchQuery.toLowerCase()))
      );

    if (!matchesSearch) return false;
    if (activeFilter === 'ai') return w.type === 'ai';
    if (activeFilter === 'custom') return w.type === 'custom';
    if (activeFilter === 'pinned') return w.pinned;
    return true;
  });

  return (
    <div className="w-full min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between font-sans pb-16 antialiased">
      
      {/* Upper Panel Body */}
      <div className="flex-1 flex flex-col">
        
        {/* Universal Top Bar */}
        <div className="bg-white border-b border-slate-100 p-4 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-white shadow-sm shadow-brand-500/20">
              <Brain className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-xs font-bold text-slate-900 leading-none">ContextTab</h1>
              <span className="text-[10px] text-slate-400">AI Browser Workspace</span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="flex items-center space-x-1 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 text-[9px] text-emerald-600 font-medium">
              <span className="w-1 h-1 rounded-full bg-emerald-500"></span>
              <span>AI Active</span>
            </span>
            <div className="w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center text-xs font-bold text-white shadow-sm">
              U
            </div>
          </div>
        </div>

        {/* View switching panel wrapper */}
        <div className="p-4 flex-1">

          {/* WORKSPACES VIEW */}
          {activeView === 'workspaces' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Folder className="w-4 h-4 text-slate-500" />
                  <div>
                    <h2 className="text-xs font-bold text-slate-900">Workspaces</h2>
                    <p className="text-[10px] text-slate-400 leading-none">Organize your work</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-1.5">
                  <input 
                    type="text"
                    placeholder="New..."
                    value={newWorkspaceName}
                    onChange={(e) => setNewWorkspaceName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateWorkspace()}
                    className="bg-white border border-slate-200 text-[10px] rounded-lg px-2.5 py-1 w-24 focus:outline-none focus:border-brand-500 text-slate-800"
                  />
                  <button 
                    onClick={handleCreateWorkspace}
                    className="bg-brand-600 hover:bg-brand-700 text-white text-[10px] font-semibold px-2.5 py-1 rounded-lg flex items-center space-x-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>New</span>
                  </button>
                </div>
              </div>

              {/* Metrics Counters Row */}
              <div className="grid grid-cols-4 gap-2">
                <div className="bg-white border border-slate-100 p-2 rounded-xl text-center shadow-sm">
                  <span className="text-sm font-bold text-slate-800 block">{activeTabsCount}</span>
                  <span className="text-[9px] text-slate-400">Active</span>
                </div>
                <div className="bg-white border border-slate-100 p-2 rounded-xl text-center shadow-sm">
                  <span className="text-sm font-bold text-slate-800 block">{aiCount}</span>
                  <span className="text-[9px] text-slate-400">AI</span>
                </div>
                <div className="bg-white border border-slate-100 p-2 rounded-xl text-center shadow-sm">
                  <span className="text-sm font-bold text-slate-800 block">{customCount}</span>
                  <span className="text-[9px] text-slate-400">Custom</span>
                </div>
                <div className="bg-white border border-slate-100 p-2 rounded-xl text-center shadow-sm">
                  <span className="text-sm font-bold text-slate-800 block">{pinnedCount}</span>
                  <span className="text-[9px] text-slate-400">Pinned</span>
                </div>
              </div>

              {/* Filter Tabs Sub-row */}
              <div className="flex border-b border-slate-200 pb-1 text-[11px] space-x-1">
                {(['all', 'ai', 'custom', 'pinned', 'archived'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setActiveFilter(filter)}
                    className={`capitalize px-2.5 py-1 font-medium transition-colors ${
                      activeFilter === filter 
                        ? 'text-brand-600 border-b-2 border-brand-500' 
                        : 'text-slate-400 hover:text-slate-700'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>

              {/* Search query input */}
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Search className="h-3 w-3 text-slate-400" />
                </span>
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-200 rounded-lg pl-8 pr-4 py-2 focus:outline-none focus:border-brand-500 text-slate-800 placeholder-slate-400"
                />
              </div>

              {/* Workspace list */}
              <div className="space-y-3">
                {filteredWorkspaces.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-8">No workspaces found</p>
                ) : (
                  filteredWorkspaces.map((ws) => {
                    const wsTabs = Object.values(state.tabs).filter(t => t.workspaceId === ws.id);
                    const firstSummary = wsTabs.map(t => t.summary).filter(Boolean)[0];
                    const description = firstSummary || (wsTabs.length > 0 
                      ? `Tabs: ${wsTabs.map(t => t.title).slice(0, 3).join(', ')}${wsTabs.length > 3 ? '...' : ''}` 
                      : "No active tabs in this workspace yet.");
                    const isExpanded = expandedWsId === ws.id;

                    return (
                      <div 
                        key={ws.id} 
                        className="bg-white border border-slate-100 rounded-xl p-3.5 space-y-2 shadow-sm hover:shadow-md transition-all cursor-pointer"
                        style={{ borderLeft: `3px solid ${ws.color}` }}
                        onClick={() => setExpandedWsId(isExpanded ? null : ws.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Folder className="w-3.5 h-3.5" style={{ color: ws.color }} />
                            {editingWsId === ws.id ? (
                              <input 
                                type="text"
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleRenameWorkspace(ws.id)}
                                onClick={(e) => e.stopPropagation()}
                                className="bg-slate-50 border border-slate-200 text-xs rounded px-1.5 py-0.5 focus:outline-none focus:border-brand-500 text-slate-800"
                              />
                            ) : (
                              <h3 className="text-xs font-bold text-slate-800">{ws.name}</h3>
                            )}
                          </div>
                          <span className="text-[8px] text-slate-400">Active</span>
                        </div>

                        <div className="flex space-x-2 text-[9px]">
                          <span className="px-1.5 py-0.5 rounded bg-brand-500/10 text-brand-700 font-semibold uppercase">{ws.type}</span>
                          <span className="text-slate-400">{wsTabs.length} tabs</span>
                        </div>

                        {wsTabs.length > 0 && !isExpanded && (
                          <div className="flex items-center space-x-1.5 py-1">
                            {wsTabs.slice(0, 4).map((tab, idx) => (
                              tab.favIconUrl ? (
                                <img key={idx} src={tab.favIconUrl} className="w-4 h-4 rounded-sm flex-shrink-0" alt="" />
                              ) : (
                                <div key={idx} className="w-4 h-4 bg-slate-100 rounded flex items-center justify-center text-[9px]">🌐</div>
                              )
                            ))}
                            {wsTabs.length > 4 && (
                              <span className="text-[9px] text-slate-400 pl-1">+{wsTabs.length - 4}</span>
                            )}
                          </div>
                        )}

                        <p className="text-[10px] text-slate-500 leading-normal">{description}</p>

                        {/* Card controls (visible when expanded) */}
                        {isExpanded && (
                          <div className="border-t border-slate-100 pt-3 mt-2 space-y-3" onClick={(e) => e.stopPropagation()}>
                            
                            {/* Management Actions */}
                            <div className="flex items-center space-x-2 text-[10px] text-slate-500">
                              <button 
                                onClick={() => handleTogglePinWorkspace(ws.id)}
                                className={`flex items-center gap-1 px-2 py-1 rounded bg-slate-50 hover:bg-slate-100 transition-colors ${ws.pinned ? 'text-yellow-600 font-semibold' : ''}`}
                              >
                                <Pin className="w-3 h-3" />
                                <span>{ws.pinned ? 'Pinned' : 'Pin'}</span>
                              </button>
                              {ws.type === 'ai' && (
                                <button 
                                  onClick={() => handleConvertAIWorkspace(ws.id)}
                                  className="flex items-center gap-1 px-2 py-1 rounded bg-slate-50 hover:bg-slate-100 transition-colors"
                                >
                                  <Lock className="w-3 h-3" />
                                  <span>Lock (Manual)</span>
                                </button>
                              )}
                              <button 
                                onClick={() => { setEditingWsId(ws.id); setEditingName(ws.name); }}
                                className="flex items-center gap-1 px-2 py-1 rounded bg-slate-50 hover:bg-slate-100 transition-colors"
                              >
                                <Edit3 className="w-3 h-3" />
                                <span>Rename</span>
                              </button>
                              <button 
                                onClick={() => handleDeleteWorkspace(ws.id)}
                                className="flex items-center gap-1 px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100 transition-colors ml-auto"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Delete</span>
                              </button>
                            </div>

                            {/* Workspace specific tab items */}
                            <div className="space-y-2">
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Workspace Sessions</span>
                              {wsTabs.length === 0 ? (
                                <p className="text-[10px] text-slate-400 italic">No tabs grouped here yet.</p>
                              ) : (
                                wsTabs.map((tab) => (
                                  <div key={tab.id} className="flex items-center justify-between bg-slate-50 p-2 rounded-lg border border-slate-100 hover:border-slate-200">
                                    <div className="flex items-center space-x-2 overflow-hidden flex-1">
                                      {tab.favIconUrl ? (
                                        <img src={tab.favIconUrl} className="w-3.5 h-3.5 rounded-sm flex-shrink-0" alt="" />
                                      ) : (
                                        <div className="w-3.5 h-3.5 bg-slate-200 rounded flex-shrink-0 flex items-center justify-center text-[8px]">🌐</div>
                                      )}
                                      <div className="overflow-hidden flex-1 text-left">
                                        <span className="text-[11px] font-semibold text-slate-700 block truncate">{tab.title}</span>
                                        <span className="text-[8px] text-slate-400 block truncate">{tab.domain}</span>
                                        {tab.summary && <p className="text-[9px] text-brand-600 italic mt-0.5">"{tab.summary}"</p>}
                                      </div>
                                    </div>
                                    <div className="flex items-center space-x-1.5 ml-2">
                                      <button 
                                        onClick={() => handleRemoveTabFromWorkspace(tab.id)}
                                        className="text-[9px] text-slate-500 hover:text-red-500 hover:bg-slate-200 px-1.5 py-0.5 rounded transition-colors"
                                      >
                                        Unlink
                                      </button>
                                      {!tab.isHibernated ? (
                                        <button 
                                          onClick={() => handleHibernateTab(tab.id)}
                                          className="p-1 hover:bg-slate-200 text-slate-400 hover:text-brand-600 rounded transition-colors"
                                          title="Hibernate tab"
                                        >
                                          <Moon className="w-3 h-3" />
                                        </button>
                                      ) : (
                                        <span className="text-[9px] font-semibold text-violet-500 bg-violet-50 border border-violet-100 rounded px-1 scale-90">Sleeping</span>
                                      )}
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>

                          </div>
                        )}

                        <div className="flex space-x-1.5 pt-1" onClick={(e) => e.stopPropagation()}>
                          <button 
                            onClick={() => handleResumeWorkspace(ws.id)}
                            className="flex-1 bg-brand-600 hover:bg-brand-700 text-white font-bold text-[10px] py-1.5 rounded-lg flex items-center justify-center space-x-1 shadow-sm"
                          >
                            <Play className="w-2.5 h-2.5 fill-current" />
                            <span>Resume</span>
                          </button>
                          <button 
                            onClick={() => setExpandedWsId(isExpanded ? null : ws.id)}
                            className="bg-slate-100 hover:bg-slate-200 p-1.5 rounded-lg text-slate-600 transition-colors"
                          >
                            <ChevronRight className={`w-3.5 h-3.5 transform transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                          </button>
                        </div>
                      </div>
                    );
                  }))}
              </div>
            </div>
          )}

          {/* ASSISTANT VIEW */}
          {activeView === 'assistant' && (
            <div className="space-y-4">
              
              {/* Bot Info Card */}
              <div className="bg-white border border-slate-100 p-3.5 rounded-xl flex items-center justify-between shadow-sm">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600">
                    <Brain className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-800">ContextTab AI</h3>
                    <div className="flex items-center space-x-1 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      <span className="text-[9px] text-slate-400 font-medium">Online • Proactive mode</span>
                    </div>
                  </div>
                </div>
                <span className="text-[9px] bg-brand-50 text-brand-600 font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-brand-100">
                  <Sparkles className="w-2.5 h-2.5" />
                  <span>AI Active</span>
                </span>
              </div>

              {/* Suggested Actions List */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Suggested actions</span>
                
                <div 
                  onClick={() => {
                    if (state.workspaces.length > 0) {
                      handleResumeWorkspace(state.workspaces[0].id);
                    } else {
                      alert("Create a workspace first!");
                    }
                  }}
                  className="bg-white border border-slate-100 p-3 rounded-xl flex items-center justify-between shadow-sm hover:border-slate-200 cursor-pointer transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-sm">🎨</span>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">Continue Open Workspace</h4>
                      <p className="text-[9px] text-slate-400 mt-0.5">Resume your top workflow project</p>
                    </div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </div>

                <div 
                  onClick={() => {
                    const activeTabs = activeTabList.filter(t => t.id && !t.discarded);
                    if (activeTabs.length > 0) {
                      activeTabs.forEach(t => t.id && handleHibernateTab(t.id));
                      alert(`Hibernated ${activeTabs.length} tabs!`);
                    } else {
                      alert("No active tabs found to hibernate.");
                    }
                  }}
                  className="bg-white border border-slate-100 p-3 rounded-xl flex items-center justify-between shadow-sm hover:border-slate-200 cursor-pointer transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-sm">🧹</span>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">Clean Inactive Tabs</h4>
                      <p className="text-[9px] text-slate-400 mt-0.5">Hibernate tabs immediately</p>
                    </div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </div>

                <div 
                  onClick={async () => {
                    setIsChatLoading(true);
                    try {
                      const timelineSummaryPrompt = `Summarize my recent browsing activities from this timeline in exactly 2 sentences:
${JSON.stringify(state.timeline.slice(0, 10))}`;
                      const res = await callAI(state, timelineSummaryPrompt);
                      setChatMessages(prev => [...prev, { role: 'assistant', text: res, timestamp: Date.now() }]);
                    } catch (err) {
                      console.error(err);
                    } finally {
                      setIsChatLoading(false);
                    }
                  }}
                  className="bg-white border border-slate-100 p-3 rounded-xl flex items-center justify-between shadow-sm hover:border-slate-200 cursor-pointer transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-sm">📊</span>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">Generate Daily Summary</h4>
                      <p className="text-[9px] text-slate-400 mt-0.5">AI report of timeline history</p>
                    </div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </div>
              </div>

              {/* Conversation Bubble */}
              <div className="space-y-2 pt-2 border-t border-slate-100 flex-1 flex flex-col justify-end max-h-[300px] overflow-y-auto">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Conversation</span>

                <div className="space-y-3">
                  {chatMessages.map((msg, idx) => (
                    <div key={idx} className={`flex items-start space-x-2.5 ${msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center mt-1 flex-shrink-0 text-xs font-bold ${
                        msg.role === 'user' ? 'bg-orange-500 text-white' : 'bg-brand-50 border border-brand-100 text-brand-600'
                      }`}>
                        {msg.role === 'user' ? 'U' : <Brain className="w-3.5 h-3.5" />}
                      </div>
                      <div className={`flex-1 p-3 rounded-2xl shadow-sm border border-slate-100 text-left ${
                        msg.role === 'user' ? 'bg-brand-600 text-white border-transparent' : 'bg-white text-slate-600'
                      }`}>
                        <p className="text-[11px] leading-relaxed font-normal">
                          {msg.text}
                        </p>
                      </div>
                    </div>
                  ))}
                  {isChatLoading && (
                    <div className="flex items-start space-x-2.5">
                      <div className="w-6 h-6 rounded-full bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-600 mt-1 flex-shrink-0">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      </div>
                      <div className="bg-white border border-slate-100 p-3 rounded-2xl shadow-sm">
                        <p className="text-[10px] text-slate-400">ContextTab AI is analyzing your tabs history...</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Chat Input Field */}
              <div className="relative mt-2">
                <input
                  type="text"
                  placeholder="Ask anything about your browsing history..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendChatMessage()}
                  className="w-full text-xs bg-white border border-slate-200 rounded-xl pl-4 pr-16 py-3.5 focus:outline-none focus:border-brand-500 text-slate-800 shadow-sm"
                />
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center space-x-1.5">
                  <button className="p-1.5 hover:bg-slate-50 text-slate-400 rounded-lg transition-colors">
                    <Mic className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={handleSendChatMessage}
                    className="p-1.5 bg-brand-50 hover:bg-brand-100 text-brand-600 rounded-lg transition-colors"
                  >
                    <Send className="w-3.5 h-3.5 fill-current" />
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* SETTINGS VIEW */}
          {activeView === 'settings' && (
            <div className="space-y-4">
              
              {/* Appearance Section */}
              <div className="bg-white border border-slate-100 rounded-xl p-3.5 space-y-3.5 shadow-sm">
                <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-5 h-5 rounded bg-blue-50 text-blue-500 flex items-center justify-center text-xs">🎨</span>
                  <span>Appearance</span>
                </h3>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-600 font-medium">Theme</span>
                  <select className="bg-slate-50 border border-slate-200 text-xs rounded-lg p-1.5 text-slate-700 focus:outline-none">
                    <option>System</option>
                    <option>Light</option>
                    <option>Dark</option>
                  </select>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <div className="space-y-0.5">
                    <span className="text-slate-600 font-medium block">Compact View</span>
                    <span className="text-[9px] text-slate-400 block">Tighter spacing and smaller cards</span>
                  </div>
                  <input type="checkbox" className="w-8 h-4 bg-slate-200 rounded-full appearance-none checked:bg-brand-600 cursor-pointer relative after:content-[''] after:absolute after:w-3.5 after:h-3.5 after:bg-white after:rounded-full after:top-0.25 after:left-0.5 checked:after:translate-x-3.5 after:transition-transform duration-200" />
                </div>
              </div>

              {/* AI Section */}
              <div className="bg-white border border-slate-100 rounded-xl p-3.5 space-y-3.5 shadow-sm">
                <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-5 h-5 rounded bg-violet-50 text-violet-500 flex items-center justify-center text-xs">ℹ️</span>
                  <span>AI</span>
                </h3>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-600 font-medium">Provider</span>
                  <select 
                    value={state.apiProvider}
                    onChange={(e) => updateState({ ...state, apiProvider: e.target.value as any })}
                    className="bg-slate-50 border border-slate-200 text-xs rounded-lg p-1.5 text-slate-700 focus:outline-none"
                  >
                    <option value="openrouter">OpenRouter (Cloud)</option>
                    <option value="openai">OpenAI</option>
                    <option value="ollama">Ollama (Local)</option>
                  </select>
                </div>
                <div className="space-y-1 text-xs">
                  <span className="text-slate-600 font-medium block">API KEY</span>
                  <div className="relative">
                    <input 
                      type={showKey ? "text" : "password"}
                      value={state.apiKey}
                      onChange={(e) => updateState({ ...state, apiKey: e.target.value })}
                      className="bg-slate-50 border border-slate-200 text-xs rounded-lg p-2 w-full text-slate-700 focus:outline-none pr-10"
                    />
                    <button 
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="flex items-center space-x-1.5 text-[9px] text-emerald-600 mt-1.5 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span>
                      {state.apiProvider === 'openrouter' 
                        ? 'Connected - OpenRouter Cloud (Llama 3 Free)' 
                        : state.apiProvider === 'openai' 
                        ? 'Connected - OpenAI Cloud (GPT-3.5)' 
                        : 'Local Mode - Ollama Endpoint Active'}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center text-xs border-t border-slate-100 pt-3">
                  <div className="space-y-0.5">
                    <span className="text-slate-600 font-medium block">Auto Project Detection</span>
                    <span className="text-[9px] text-slate-400 block">AI groups open tabs into projects</span>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={state.settings.autoProjectDetection}
                    onChange={(e) => updateState({
                      ...state,
                      settings: { ...state.settings, autoProjectDetection: e.target.checked }
                    })}
                    className="w-8 h-4 bg-slate-200 rounded-full appearance-none checked:bg-brand-600 cursor-pointer relative after:content-[''] after:absolute after:w-3.5 after:h-3.5 after:bg-white after:rounded-full after:top-0.25 after:left-0.5 checked:after:translate-x-3.5 after:transition-transform duration-200" 
                  />
                </div>
              </div>

              {/* Performance Section */}
              <div className="bg-white border border-slate-100 rounded-xl p-3.5 space-y-3.5 shadow-sm">
                <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-5 h-5 rounded bg-yellow-50 text-yellow-500 flex items-center justify-center text-xs">🌙</span>
                  <span>Performance</span>
                </h3>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-600 font-medium">Auto Sleep</span>
                  <select 
                    value={state.settings.hibernationTimeoutMins}
                    onChange={(e) => updateState({
                      ...state,
                      settings: { ...state.settings, hibernationTimeoutMins: Number(e.target.value) }
                    })}
                    className="bg-slate-50 border border-slate-200 text-xs rounded-lg p-1.5 text-slate-700 focus:outline-none"
                  >
                    <option value={15}>15 Minutes</option>
                    <option value={30}>30 Minutes</option>
                    <option value={60}>1 Hour</option>
                  </select>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <div className="space-y-0.5">
                    <span className="text-slate-600 font-medium block">Memory Optimization</span>
                    <span className="text-[9px] text-slate-400 block">Compress inactive tabs automatically</span>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={state.settings.autoHibernationEnabled}
                    onChange={(e) => updateState({
                      ...state,
                      settings: { ...state.settings, autoHibernationEnabled: e.target.checked }
                    })}
                    className="w-8 h-4 bg-slate-200 rounded-full appearance-none checked:bg-brand-600 cursor-pointer relative after:content-[''] after:absolute after:w-3.5 after:h-3.5 after:bg-white after:rounded-full after:top-0.25 after:left-0.5 checked:after:translate-x-3.5 after:transition-transform duration-200" 
                  />
                </div>
                
                {/* Dynamic Saved Banner */}
                <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-3 flex justify-between items-center mt-2">
                  <div className="space-y-0.5">
                    <span className="text-[8px] font-bold text-emerald-600 uppercase block tracking-wider">Saved Today</span>
                    <span className="text-lg font-bold text-emerald-600 block leading-none">{estimatedRAMSavedGB} GB</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] text-slate-700 font-medium block">{hibernatedTabsCount} tabs</span>
                    <span className="text-[9px] text-emerald-600 font-bold block">hibernated • -37%</span>
                  </div>
                </div>
              </div>

              {/* Notifications Section */}
              <div className="bg-white border border-slate-100 rounded-xl p-3.5 space-y-3.5 shadow-sm">
                <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-5 h-5 rounded bg-pink-50 text-pink-500 flex items-center justify-center text-xs">🔔</span>
                  <span>Notifications</span>
                </h3>
                <div className="flex justify-between items-center text-xs">
                  <div className="space-y-0.5">
                    <span className="text-slate-600 font-medium block">AI Insights</span>
                    <span className="text-[9px] text-slate-400 block">Smart observations about your work</span>
                  </div>
                  <input type="checkbox" defaultChecked className="w-8 h-4 bg-slate-200 rounded-full appearance-none checked:bg-brand-600 cursor-pointer relative after:content-[''] after:absolute after:w-3.5 after:h-3.5 after:bg-white after:rounded-full after:top-0.25 after:left-0.5 checked:after:translate-x-3.5 after:transition-transform duration-200" />
                </div>
                <div className="flex justify-between items-center text-xs">
                  <div className="space-y-0.5">
                    <span className="text-slate-600 font-medium block">Workspace Ready</span>
                    <span className="text-[9px] text-slate-400 block">Alert when tabs are grouped</span>
                  </div>
                  <input type="checkbox" defaultChecked className="w-8 h-4 bg-slate-200 rounded-full appearance-none checked:bg-brand-600 cursor-pointer relative after:content-[''] after:absolute after:w-3.5 after:h-3.5 after:bg-white after:rounded-full after:top-0.25 after:left-0.5 checked:after:translate-x-3.5 after:transition-transform duration-200" />
                </div>
              </div>

              {/* Privacy Section */}
              <div className="bg-white border border-slate-100 rounded-xl p-3.5 space-y-3.5 shadow-sm">
                <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-5 h-5 rounded bg-teal-50 text-teal-500 flex items-center justify-center text-xs">🛡️</span>
                  <span>Privacy</span>
                </h3>
                <div className="flex justify-between items-center text-xs">
                  <div className="space-y-0.5">
                    <span className="text-slate-600 font-medium block">Store Data Locally</span>
                    <span className="text-[9px] text-slate-400 block">Everything stays on your device</span>
                  </div>
                  <input type="checkbox" defaultChecked className="w-8 h-4 bg-slate-200 rounded-full appearance-none checked:bg-brand-600 cursor-pointer relative after:content-[''] after:absolute after:w-3.5 after:h-3.5 after:bg-white after:rounded-full after:top-0.25 after:left-0.5 checked:after:translate-x-3.5 after:transition-transform duration-200" />
                </div>
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <button className="w-full bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs py-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors">
                    <Download className="w-4 h-4" />
                    <span>Export Workspace Data</span>
                  </button>
                  <button 
                    onClick={handleClearData}
                    className="w-full bg-red-50 border border-red-200 hover:bg-red-100 text-red-600 font-bold text-xs py-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Clear Local Data</span>
                  </button>
                </div>
              </div>

              {/* About Section */}
              <div className="bg-white border border-slate-100 rounded-xl p-3.5 space-y-3 shadow-sm text-xs text-slate-600">
                <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2 mb-2">
                  <span className="w-5 h-5 rounded bg-slate-50 text-slate-500 flex items-center justify-center text-xs">ℹ️</span>
                  <span>About ContextTab</span>
                </h3>
                
                <a href="#" className="flex justify-between items-center hover:text-slate-900 py-1">
                  <span className="flex items-center gap-2">⚡ Version</span>
                  <span className="text-slate-400 flex items-center gap-1">2.4.1 <ExternalLink className="w-3 h-3" /></span>
                </a>
                <a href="#" className="flex justify-between items-center hover:text-slate-900 py-1 border-t border-slate-100 pt-2">
                  <span className="flex items-center gap-2">⚡ Chrome Extension</span>
                  <span className="text-slate-400 flex items-center gap-1">Manifest v3 <ExternalLink className="w-3 h-3" /></span>
                </a>
                <a href="#" className="flex justify-between items-center hover:text-slate-900 py-1 border-t border-slate-100 pt-2">
                  <span className="flex items-center gap-2">🐱 GitHub Repository</span>
                  <span className="text-slate-400"><ExternalLink className="w-3.5 h-3.5" /></span>
                </a>
                <a href="#" className="flex justify-between items-center hover:text-slate-900 py-1 border-t border-slate-100 pt-2">
                  <span className="flex items-center gap-2">📄 Privacy Policy</span>
                  <span className="text-slate-400"><ExternalLink className="w-3.5 h-3.5" /></span>
                </a>
              </div>

              {/* Footer */}
              <p className="text-center text-[10px] text-slate-400 font-medium py-2">
                Made with ❤️ for productivity • ContextTab v2.4.1
              </p>

            </div>
          )}

          {/* TIMELINE VIEW */}
          {activeView === 'timeline' && (
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-slate-800 flex items-center space-x-1.5">
                <Clock className="w-4 h-4 text-brand-600" />
                <span>Browsing Timeline</span>
              </h2>

              <div className="space-y-3">
                {state.timeline.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-8">No browsing events recorded yet.</p>
                ) : (
                  state.timeline.map((event, idx) => (
                    <div key={idx} className="bg-white border border-slate-100 p-3 rounded-xl flex space-x-3 items-start shadow-sm animate-fade-in">
                      <div className={`w-2 h-2 rounded-full mt-1.5 ${
                        event.type === 'visit' ? 'bg-blue-500' :
                        event.type === 'hibernate' ? 'bg-violet-500' : 'bg-emerald-500'
                      }`} />
                      <div className="flex-1 overflow-hidden">
                        <div className="flex justify-between text-[9px] text-slate-400">
                          <span className="uppercase font-bold tracking-wide">{event.type}</span>
                          <span>{new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <h4 className="text-xs font-semibold text-slate-800 truncate mt-0.5">{event.title}</h4>
                        <span className="text-[9px] text-slate-400 block truncate">{getDomain(event.url)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* HOME VIEW */}
          {activeView === 'home' && (
            <div className="space-y-4 animate-fade-in">
              
              {/* Welcome banner */}
              <div className="bg-brand-600 text-white rounded-2xl p-5 space-y-2.5 shadow-md shadow-brand-500/10 text-left">
                <h2 className="text-sm font-bold leading-tight">Welcome back to ContextTab</h2>
                <p className="text-[11px] opacity-90 leading-relaxed">
                  Your workflow browser companion is running. We are tracking active intention pathways to automate layout recovery.
                </p>
                <div className="pt-1.5">
                  <button 
                    onClick={() => setActiveView('workspaces')}
                    className="bg-white text-brand-700 font-bold text-[10px] px-3.5 py-2 rounded-lg flex items-center space-x-1 hover:bg-slate-50 transition-colors shadow-sm"
                  >
                    <span>View Workspaces</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Status summary widget */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white border border-slate-100 p-3.5 rounded-xl shadow-sm text-left">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Est. RAM Saved</span>
                  <span className="text-lg font-bold text-emerald-600 block mt-1 leading-none">{estimatedRAMSavedGB} GB</span>
                </div>
                <div className="bg-white border border-slate-100 p-3.5 rounded-xl shadow-sm text-left">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Session Health</span>
                  <span className="text-lg font-bold text-brand-600 block mt-1 leading-none">Optimal</span>
                </div>
              </div>

              {/* Tips list */}
              <div className="bg-white border border-slate-100 p-4 rounded-xl space-y-3 shadow-sm text-left">
                <h3 className="text-xs font-bold text-slate-800">Quick Tips</h3>
                <ul className="space-y-2 text-[10px] text-slate-500 leading-normal">
                  <li className="flex items-start gap-2">
                    <span className="text-brand-500 mt-0.5">•</span>
                    <span>Click the 🌙 icon inside any workspace to immediately hibernate all tabs within that category.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-brand-500 mt-0.5">•</span>
                    <span>Lock automatic AI workspaces to freeze them. Locked workspaces will not be edited or grouped by the AI module.</span>
                  </li>
                </ul>
              </div>

            </div>
          )}

        </div>

      </div>

      {/* Persistent Bottom Nav Bar (Matches layout in UI mockups) */}
      <div className="fixed bottom-0 left-0 right-0 h-14 bg-white border-t border-slate-100 grid grid-cols-5 text-center items-center select-none z-50">
        <button 
          onClick={() => setActiveView('home')} 
          className={`flex flex-col items-center justify-center space-y-0.5 ${activeView === 'home' ? 'text-brand-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <Compass className="w-4 h-4" />
          <span className="text-[9px] font-medium">Home</span>
        </button>
        <button 
          onClick={() => setActiveView('workspaces')} 
          className={`flex flex-col items-center justify-center space-y-0.5 ${activeView === 'workspaces' ? 'text-brand-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <Folder className="w-4 h-4" />
          <span className="text-[9px] font-medium">Workspaces</span>
        </button>
        <button 
          onClick={() => setActiveView('timeline')} 
          className={`flex flex-col items-center justify-center space-y-0.5 ${activeView === 'timeline' ? 'text-brand-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <Clock className="w-4 h-4" />
          <span className="text-[9px] font-medium">Timeline</span>
        </button>
        <button 
          onClick={() => setActiveView('assistant')} 
          className={`flex flex-col items-center justify-center space-y-0.5 ${activeView === 'assistant' ? 'text-brand-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <Brain className="w-4 h-4" />
          <span className="text-[9px] font-medium">Assistant</span>
        </button>
        <button 
          onClick={() => setActiveView('settings')} 
          className={`flex flex-col items-center justify-center space-y-0.5 ${activeView === 'settings' ? 'text-brand-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <Settings className="w-4 h-4" />
          <span className="text-[9px] font-medium">Settings</span>
        </button>
      </div>

    </div>
  );
}
