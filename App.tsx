import React, { useState, useMemo, useEffect } from 'react';
import { PartyEvent, Expense } from './types';
import { Plus, Receipt, PieChart as PieIcon, ArrowLeft, Settings, Share2, Cloud, History, Loader2, AlertTriangle, Wallet, Users, X, CloudOff, CheckCircle2 } from 'lucide-react';
import { NewEventModal } from './components/NewEventModal';
import { AddExpenseModal } from './components/AddExpenseModal';
import { EventCard } from './components/EventCard';
import { SettlementView } from './components/SettlementView';
import { ShareEventModal } from './components/ShareEventModal';
import { JoinEventModal } from './components/JoinEventModal';
import { saveEventToCloud, subscribeToEvent, deleteEventFromCloud, socket } from './services/eventService';

// History Item stored locally
interface HistoryItem {
  id: string;
  name: string;
  lastVisited: number;
  createdAt: number;      // Added for fixed sorting
  memberCount?: number;     // Added for list preview
  memberAvatars?: string[]; // Added for list preview (limit to 3-4)
}

const App: React.FC = () => {
  // --- STATE ---
  
  // The current active event data (from Cloud)
  const [activeEvent, setActiveEvent] = useState<PartyEvent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Local History (Recent Events)
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('bill-splitter-history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // UI State
  const [joinCode, setJoinCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [currentTab, setCurrentTab] = useState<'expenses' | 'settle'>('expenses');
  const [toast, setToast] = useState<string | null>(null);
  
  // Sync Status
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSocketConnected, setIsSocketConnected] = useState(socket.connected);
  
  // Editing State
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [isEditingEvent, setIsEditingEvent] = useState(false);
  
  // Ref for subscription cleanup
  const unsubscribeRef = React.useRef<(() => void) | null>(null);

  // --- EFFECTS ---

  // 1. URL Handler: Check for ?eventId=xyz
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlEventId = params.get('eventId');

    if (urlEventId) {
      loadEvent(urlEventId);
    }
  }, []);

  // 2. Persist History
  useEffect(() => {
    localStorage.setItem('bill-splitter-history', JSON.stringify(history));
  }, [history]);

  // 3. Network & Socket Status Monitoring
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    const handleConnect = () => setIsSocketConnected(true);
    const handleDisconnect = () => setIsSocketConnected(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    // Initial check
    setIsOnline(navigator.onLine);
    setIsSocketConnected(socket.connected);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
  }, []);

  // 4. Tab reset
  useEffect(() => {
    if (activeEvent) {
      setCurrentTab('expenses');
      addToHistory(activeEvent);
    }
  }, [activeEvent?.id]); // Only reset when ID changes

  // Helper: Add to local history
  const addToHistory = (event: PartyEvent) => {
    setHistory(prev => {
      const filtered = prev.filter(h => h.id !== event.id);
      // Store a snapshot of members for the list view
      const newItem: HistoryItem = { 
        id: event.id, 
        name: event.name, 
        lastVisited: Date.now(),
        createdAt: event.createdAt || Date.now(), // Fallback for legacy events
        memberCount: event.members.length,
        memberAvatars: event.members.slice(0, 4).map(m => m.avatarUrl)
      };
      // Sort by createdAt descending (newest first)
      const newHistory = [newItem, ...filtered].sort((a, b) => b.createdAt - a.createdAt);
      return newHistory.slice(0, 10);
    });
  };

  // Helper: Remove from local history
  const removeFromHistory = (id: string) => {
    setHistory(prev => prev.filter(h => h.id !== id));
  };

  // Helper: Safely update URL history (handles sandbox/blob environments)
  const safeUpdateUrl = (eventId: string | null) => {
    try {
      const url = new URL(window.location.href);
      if (eventId) {
        url.searchParams.set('eventId', eventId);
      } else {
        url.searchParams.delete('eventId');
      }
      window.history.pushState({}, '', url.toString());
    } catch (e) {
      console.warn("Unable to update URL history (likely in a sandbox):", e);
    }
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // --- CORE LOGIC: LOAD EVENT (SUBSCRIBE) ---
  const loadEvent = (id: string) => {
    // Cleanup previous subscription
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    setIsLoading(true);
    setErrorMsg(null);
    
    // Update URL without reload safely
    safeUpdateUrl(id);

    const unsubscribe = subscribeToEvent(id, (event) => {
      setIsLoading(false);
      if (event) {
        setActiveEvent(event);
        // Also update name in history if it changed
        setHistory(prev => prev.map(h => {
          if (h.id === id) {
             return {
               ...h,
               name: event.name,
               memberCount: event.members.length,
               memberAvatars: event.members.slice(0, 4).map(m => m.avatarUrl)
             };
          }
          return h;
        }));
      } else {
        // If we are already on the home screen (activeEvent is null), don't show error
        // This prevents the "Event not found" message when we just deleted it ourselves
        setActiveEvent(prev => {
          if (prev) {
            setErrorMsg("活动已被删除。");
          }
          return null;
        });
        removeFromHistory(id);
      }
    });

    unsubscribeRef.current = unsubscribe;
  };

  // --- HANDLERS ---

  const handleCreateOrUpdateEvent = async (eventData: PartyEvent) => {
    try {
      // Optimistic update for editing
      if (isEditingEvent) {
        setActiveEvent(eventData);
      }
      
      await saveEventToCloud(eventData);
      
      if (!isEditingEvent) {
        // New Event
        loadEvent(eventData.id);
        setToast("活动已创建");
      } else {
        setToast("活动已更新");
      }
      setShowEventModal(false);
      setIsEditingEvent(false);
    } catch (e) {
      console.error("Save event error:", e);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      // Unsubscribe first to prevent the "Event not found" error message
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }

      await deleteEventFromCloud(eventId);
      removeFromHistory(eventId);
      setActiveEvent(null);
      setShowEventModal(false);
      setIsEditingEvent(false);
      setToast("活动已成功删除");
      // Clear URL safely
      safeUpdateUrl(null);
    } catch (e) {
      console.error("Delete event error:", e);
    }
  };

  const handleSaveExpense = async (expense: Expense) => {
    if (!activeEvent) return;

    const newExpenses = editingExpenseId
      ? activeEvent.expenses.map(e => e.id === expense.id ? expense : e)
      : [expense, ...activeEvent.expenses];

    const updatedEvent = { ...activeEvent, expenses: newExpenses };
    
    // Optimistic Update
    setActiveEvent(updatedEvent);
    
    try {
      await saveEventToCloud(updatedEvent);
      setToast("账单已保存");
      setShowExpenseModal(false);
      setEditingExpenseId(null);
    } catch (e) {
      console.error("Save expense error:", e);
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!activeEvent) return;
    
    const updatedEvent = {
      ...activeEvent,
      expenses: activeEvent.expenses.filter(e => e.id !== expenseId)
    };

    // Optimistic Update
    setActiveEvent(updatedEvent);

    try {
      await saveEventToCloud(updatedEvent);
      setToast("账单已删除");
      setShowExpenseModal(false);
      setEditingExpenseId(null);
    } catch (e) {
      console.error("Delete expense error:", e);
    }
  };

  const goHome = () => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    setActiveEvent(null);
    // Clear URL safely
    safeUpdateUrl(null);
  };

  const handleJoinCode = async (code: string) => {
    if (!code.trim()) return;
    
    setIsJoining(true);
    const cleanCode = code.trim().toUpperCase();
    loadEvent(cleanCode);
    setToast("正在加入活动...");
    
    // Reset after a short delay to show loading state
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        setIsJoining(false);
        setJoinCode('');
        resolve();
      }, 800);
    });
  };

  // --- VIEWS ---

  // 1. LOADING VIEW
  if (isLoading && !activeEvent) {
    return (
      <div className="h-[100dvh] bg-gray-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="animate-spin text-blue-600 mb-4" size={48} />
        <p className="text-gray-500 font-medium">正在同步云端数据...</p>
      </div>
    );
  }

  // 2. HOME VIEW (List / History)
  if (!activeEvent) {
    const hasHistory = history.length > 0;

    return (
      <div className="h-[100dvh] bg-[#F2F2F7] flex flex-col max-w-lg mx-auto shadow-2xl relative overflow-hidden">
        {/* Scrollable Content Container */}
        <div className="flex-1 overflow-y-auto p-6 pb-20">
          {/* New Designed Header */}
          <header className="mb-10 pt-2 flex items-center space-x-4">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200 rotate-3 flex-shrink-0">
               <Wallet className="text-white" size={28} />
            </div>
            <div>
               <h1 className="text-3xl font-black text-gray-900 tracking-tight leading-none flex items-center">
                  ButterFly <span className="text-blue-600 ml-2">Bill</span>
               </h1>
               <div className="mt-1 flex items-center">
                  {!isOnline ? (
                    <p className="text-[10px] text-red-500 font-bold flex items-center bg-red-50 px-2 py-0.5 rounded-full">
                      <CloudOff size={10} className="mr-1" /> 网络已断开 (本地模式)
                    </p>
                  ) : !isSocketConnected ? (
                    <p className="text-[10px] text-amber-500 font-bold flex items-center bg-amber-50 px-2 py-0.5 rounded-full">
                      <Loader2 size={10} className="mr-1 animate-spin" /> 正在连接云端...
                    </p>
                  ) : (
                    <p className="text-[10px] text-green-600 font-bold flex items-center bg-green-50 px-2 py-0.5 rounded-full">
                      <CheckCircle2 size={10} className="mr-1" /> 云端已同步
                    </p>
                  )}
               </div>
            </div>
          </header>

          {errorMsg && (
             <div className="mb-6 p-4 rounded-xl bg-red-100 text-red-700 flex items-center shadow-sm animate-in fade-in slide-in-from-top-2">
               <AlertTriangle size={20} className="mr-2"/>
               <span className="font-bold text-sm">{errorMsg}</span>
               <button onClick={() => setErrorMsg(null)} className="ml-auto p-1 hover:bg-red-200 rounded-full">
                 <X size={14} />
               </button>
             </div>
          )}

          {toast && (
            <div className="fixed top-28 left-1/2 -translate-x-1/2 z-50 bg-gray-900/90 backdrop-blur-md text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center space-x-2 animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-sm font-bold">{toast}</span>
            </div>
          )}

          {hasHistory ? (
            <div className="flex flex-col">
               {/* Refined Section Header (Visually distinct from cards) */}
               <div className="mb-3 pl-1">
                  <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                    我参与的活动
                  </h2>
               </div>

               {/* Activity List with Avatars */}
               <div className="space-y-4">
                  {history.map(item => (
                    <div 
                      key={item.id}
                      onClick={() => loadEvent(item.id)}
                      className="group bg-white p-5 rounded-[20px] shadow-sm border border-transparent hover:border-blue-100 hover:shadow-md hover:scale-[1.01] active:scale-95 transition-all duration-200 cursor-pointer"
                    >
                       <div className="flex justify-between items-start">
                          <div className="flex-1">
                             <h3 className="font-bold text-gray-900 text-xl mb-1 truncate">{item.name}</h3>
                             <p className="text-xs text-gray-400 font-medium">
                               {new Date(item.lastVisited).toLocaleDateString()}
                             </p>
                          </div>
                          
                          {/* Avatar Stack */}
                          <div className="flex items-center pl-4">
                             <div className="flex -space-x-2">
                                {item.memberAvatars && item.memberAvatars.length > 0 ? (
                                  item.memberAvatars.slice(0, 3).map((avatar, idx) => (
                                    <img 
                                      key={idx} 
                                      src={avatar} 
                                      alt="member" 
                                      className="w-8 h-8 rounded-full border-2 border-white bg-gray-100 object-cover"
                                    />
                                  ))
                                ) : (
                                  <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center">
                                     <Users size={14} className="text-gray-300"/>
                                  </div>
                                )}
                                
                                {(item.memberCount || 0) > 3 && (
                                  <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500">
                                    +{item.memberCount! - 3}
                                  </div>
                                )}
                             </div>
                             
                             <div className="ml-3 text-gray-300">
                                <ArrowLeft size={18} className="rotate-180" />
                             </div>
                          </div>
                       </div>
                    </div>
                  ))}
                  
                  {/* Redesigned Create Button */}
                  <button 
                    onClick={() => { setIsEditingEvent(false); setShowEventModal(true); }}
                    className="w-full py-5 rounded-[24px] bg-white border-2 border-dashed border-gray-200 text-gray-500 font-bold hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/50 transition-all flex items-center justify-center mt-6 shadow-sm group"
                  >
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center mr-3 group-hover:bg-blue-100 transition-colors">
                      <Plus size={18} className="text-gray-400 group-hover:text-blue-600" />
                    </div>
                    新建其他活动
                  </button>
               </div>
            </div>
          ) : (
            <div className="flex flex-col justify-center pt-10">
               {/* Empty State */}
               <button 
                 onClick={() => { setIsEditingEvent(false); setShowEventModal(true); }}
                 className="w-full py-16 border-2 border-dashed border-blue-200 bg-white/80 rounded-[32px] flex flex-col items-center justify-center text-blue-600 hover:bg-blue-50 hover:border-blue-300 hover:shadow-xl transition-all group relative overflow-hidden"
               >
                 <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full -mr-12 -mt-12 opacity-50 group-hover:scale-150 transition-transform duration-500" />
                 <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-inner">
                   <Plus size={40} className="text-blue-600" />
                 </div>
                 <span className="text-xl font-black text-blue-600 mt-2 tracking-tight">创建你的第一个分账活动</span>
               </button>
            </div>
          )}

          {/* Join with Code Section (Redesigned) */}
          <div className="mt-8 flex flex-col items-center">
            <button 
              onClick={() => setShowJoinModal(true)}
              className="px-8 py-3 rounded-full bg-gray-200/50 text-gray-500 text-sm font-bold hover:bg-gray-200 hover:text-gray-700 transition-all flex items-center"
            >
              <Users size={16} className="mr-2" />
              加入朋友创建的活动
            </button>
          </div>
        </div>

        <div className="py-8 text-center">
          <p className="text-gray-400/60 text-[10px] tracking-widest uppercase font-medium">
            ButterFly Bill · 记录在一起的每次精彩
          </p>
        </div>

        {showEventModal && (
          <NewEventModal 
            onClose={() => setShowEventModal(false)} 
            onSave={handleCreateOrUpdateEvent}
            initialEvent={undefined} 
          />
        )}

        <JoinEventModal 
          isOpen={showJoinModal}
          onClose={() => setShowJoinModal(false)}
          onJoin={handleJoinCode}
        />
      </div>
    );
  }

  // 3. EVENT DETAIL VIEW
  return (
    // CHANGE: Use h-[100dvh] (viewport height) and overflow-hidden on container to ensure fixed positioning works relative to screen
    <div className="h-[100dvh] bg-gray-50 flex flex-col max-w-lg mx-auto shadow-2xl relative overflow-hidden">
      {/* Header */}
      <div className="bg-white px-4 pt-12 pb-4 sticky top-0 z-10 border-b border-gray-100 shadow-sm flex-shrink-0">
        <div className="flex items-center justify-between mb-2 relative min-h-[32px]">
           <button 
            onClick={goHome}
            className="flex items-center text-blue-600 font-medium active:opacity-50 z-10"
          >
            <ArrowLeft size={20} className="mr-1" />
            首页
          </button>
          
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center space-x-1.5 max-w-[45%] z-0">
            <h1 className="text-lg font-bold truncate">{activeEvent.name}</h1>
            <div className="flex-shrink-0">
              {!isOnline ? (
                <CloudOff size={16} className="text-red-500" />
              ) : !isSocketConnected ? (
                <div className="flex items-center text-blue-500">
                  <Cloud size={16} />
                  <span className="text-[10px] font-black ml-0.5 leading-none animate-pulse">...</span>
                </div>
              ) : (
                <Cloud size={16} className="text-green-500" />
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2 z-10">
             <button 
               onClick={() => setShowShareModal(true)}
               className="h-8 px-3 flex items-center justify-center text-white bg-blue-600 hover:bg-blue-700 rounded-full transition-colors text-xs font-bold shadow-md shadow-blue-200"
               title="共享口令"
             >
               <Share2 size={14} className="mr-1" /> 共享口令
             </button>
             <button 
               onClick={() => { setIsEditingEvent(true); setShowEventModal(true); }}
               className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded-full"
             >
               <Settings size={20} />
             </button>
          </div>
        </div>
        
        <div className="flex bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setCurrentTab('expenses')}
            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all flex items-center justify-center
              ${currentTab === 'expenses' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
          >
            <Receipt size={16} className="mr-1" /> 明细
          </button>
          <button
            onClick={() => setCurrentTab('settle')}
            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all flex items-center justify-center
              ${currentTab === 'settle' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
          >
            <PieIcon size={16} className="mr-1" /> 结算
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {currentTab === 'expenses' ? (
          <div className="space-y-3 pb-24">
            {activeEvent.expenses.length === 0 ? (
               <div className="flex flex-col items-center justify-center pt-20 text-gray-400">
                  <Receipt size={64} className="mb-4 opacity-20" />
                  <p>还没有账单，记一笔吧！</p>
                  <p className="text-xs mt-2 text-blue-600 bg-blue-50 px-3 py-1 rounded-full">数据会实时同步给所有成员</p>
               </div>
            ) : (
              [...activeEvent.expenses].reverse().map(expense => {
                const payer = activeEvent.members.find(m => m.id === expense.payerId);
                return (
                  <div 
                    key={expense.id} 
                    onClick={() => { setEditingExpenseId(expense.id); setShowExpenseModal(true); }}
                    className="bg-white p-4 rounded-xl shadow-sm flex items-center justify-between cursor-pointer active:scale-[0.99] transition-transform"
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl bg-blue-50 text-blue-600`}>
                        {expense.category.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{expense.description}</p>
                        <p className="text-xs text-gray-500">
                          {payer?.name} 付 • {expense.category}
                        </p>
                      </div>
                    </div>
                    <span className="font-bold text-lg text-gray-900">¥{expense.amount}</span>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <SettlementView event={activeEvent} />
        )}
      </div>

      {currentTab === 'expenses' && (
        <div className="absolute bottom-20 left-0 right-0 flex justify-center z-20 pointer-events-none">
          <button 
            onClick={() => { setEditingExpenseId(null); setShowExpenseModal(true); }}
            className="pointer-events-auto bg-black text-white px-6 py-3 rounded-full font-bold shadow-xl shadow-gray-400/50 flex items-center hover:scale-105 transition-transform"
          >
            <Plus size={20} className="mr-2" /> 记一笔
          </button>
        </div>
      )}

      {showExpenseModal && activeEvent && (
        <AddExpenseModal 
          members={activeEvent.members}
          onClose={() => setShowExpenseModal(false)}
          onSave={handleSaveExpense}
          onDelete={handleDeleteExpense}
          initialExpense={editingExpenseId ? activeEvent.expenses.find(e => e.id === editingExpenseId) : null}
        />
      )}

      {showEventModal && activeEvent && (
        <NewEventModal 
            onClose={() => setShowEventModal(false)}
            onSave={handleCreateOrUpdateEvent}
            onDelete={handleDeleteEvent}
            initialEvent={isEditingEvent ? activeEvent : undefined}
        />
      )}

      {showShareModal && activeEvent && (
        <ShareEventModal 
          event={activeEvent}
          onClose={() => setShowShareModal(false)}
        />
      )}

      <div className="py-6 text-center">
        <p className="text-gray-400/60 text-[10px] tracking-widest uppercase font-medium">
          ButterFly Bill · 记录在一起的每次精彩
        </p>
      </div>
    </div>
  );
};

export default App;