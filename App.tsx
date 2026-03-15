import React, { useState, useMemo, useEffect } from 'react';
import { PartyEvent, Expense } from './types';
import { Plus, Receipt, PieChart as PieIcon, ArrowLeft, Settings, Share2, Cloud, History, Loader2, AlertTriangle, Wallet, Users } from 'lucide-react';
import { NewEventModal } from './components/NewEventModal';
import { AddExpenseModal } from './components/AddExpenseModal';
import { EventCard } from './components/EventCard';
import { SettlementView } from './components/SettlementView';
import { ShareEventModal } from './components/ShareEventModal';
import { saveEventToCloud, subscribeToEvent, deleteEventFromCloud } from './services/eventService';

// History Item stored locally
interface HistoryItem {
  id: string;
  name: string;
  lastVisited: number;
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
  const [showEventModal, setShowEventModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [currentTab, setCurrentTab] = useState<'expenses' | 'settle'>('expenses');
  
  // Editing State
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [isEditingEvent, setIsEditingEvent] = useState(false);

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

  // 3. Tab reset
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
        memberCount: event.members.length,
        memberAvatars: event.members.slice(0, 4).map(m => m.avatarUrl)
      };
      return [newItem, ...filtered].slice(0, 10);
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

  // --- CORE LOGIC: LOAD EVENT (SUBSCRIBE) ---
  const loadEvent = (id: string) => {
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
        setErrorMsg("未找到该活动，可能已被删除。");
        setActiveEvent(null);
        removeFromHistory(id);
      }
    });

    return unsubscribe;
  };

  // --- HANDLERS ---

  const handleCreateOrUpdateEvent = async (eventData: PartyEvent) => {
    try {
      await saveEventToCloud(eventData);
      
      if (!isEditingEvent) {
        // New Event
        loadEvent(eventData.id);
      }
      setShowEventModal(false);
      setIsEditingEvent(false);
    } catch (e) {
      alert("保存失败，请检查网络");
      console.error(e);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (confirm("确定要删除这个活动吗？删除后无法恢复。")) {
      try {
        await deleteEventFromCloud(eventId);
        removeFromHistory(eventId);
        setActiveEvent(null);
        setShowEventModal(false);
        setIsEditingEvent(false);
        // Clear URL safely
        safeUpdateUrl(null);
      } catch (e) {
        alert("删除失败");
      }
    }
  };

  const handleSaveExpense = async (expense: Expense) => {
    if (!activeEvent) return;

    const newExpenses = editingExpenseId
      ? activeEvent.expenses.map(e => e.id === expense.id ? expense : e)
      : [expense, ...activeEvent.expenses];

    const updatedEvent = { ...activeEvent, expenses: newExpenses };
    
    try {
      await saveEventToCloud(updatedEvent);
      setShowExpenseModal(false);
      setEditingExpenseId(null);
    } catch (e) {
      alert("保存失败");
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!activeEvent) return;
    
    const updatedEvent = {
      ...activeEvent,
      expenses: activeEvent.expenses.filter(e => e.id !== expenseId)
    };

    try {
      await saveEventToCloud(updatedEvent);
      setShowExpenseModal(false);
      setEditingExpenseId(null);
    } catch (e) {
      alert("删除失败");
    }
  };

  const goHome = () => {
    setActiveEvent(null);
    // Clear URL safely
    safeUpdateUrl(null);
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
               <p className="text-xs text-gray-400 font-medium mt-1 flex items-center">
                  <Cloud size={10} className="mr-1" /> 云端同步中
               </p>
            </div>
          </header>

          {errorMsg && (
             <div className="mb-6 p-4 rounded-xl bg-red-100 text-red-700 flex items-center shadow-sm">
               <AlertTriangle size={20} className="mr-2"/>
               <span className="font-bold text-sm">{errorMsg}</span>
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
                  
                  {/* Weakened Create Button */}
                  <button 
                    onClick={() => { setIsEditingEvent(false); setShowEventModal(true); }}
                    className="w-full py-4 rounded-2xl border-2 border-dashed border-gray-200 text-gray-400 font-medium hover:border-blue-300 hover:text-blue-500 hover:bg-blue-50/50 transition-all flex items-center justify-center mt-4 text-sm"
                  >
                    <Plus size={16} className="mr-2" />
                    新建其他活动
                  </button>
               </div>
            </div>
          ) : (
            <div className="flex flex-col justify-center pt-10">
               {/* Empty State */}
               <button 
                 onClick={() => { setIsEditingEvent(false); setShowEventModal(true); }}
                 className="w-full py-12 border-2 border-dashed border-blue-200 bg-white/60 rounded-3xl flex flex-col items-center justify-center text-blue-600 hover:bg-blue-50 hover:border-blue-300 hover:shadow-lg transition-all group"
               >
                 <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                   <Plus size={32} className="text-blue-600" />
                 </div>
                 <span className="text-lg font-bold text-blue-600 mt-2">创建你的第一个分账活动</span>
               </button>
               
               <div className="mt-8 text-center">
                  <p className="text-gray-300 text-sm">暂无活动记录</p>
               </div>
            </div>
          )}
        </div>

        {showEventModal && (
          <NewEventModal 
            onClose={() => setShowEventModal(false)} 
            onSave={handleCreateOrUpdateEvent}
            initialEvent={undefined} 
          />
        )}
      </div>
    );
  }

  // 3. EVENT DETAIL VIEW
  return (
    // CHANGE: Use h-[100dvh] (viewport height) and overflow-hidden on container to ensure fixed positioning works relative to screen
    <div className="h-[100dvh] bg-gray-50 flex flex-col max-w-lg mx-auto shadow-2xl relative overflow-hidden">
      {/* Header */}
      <div className="bg-white px-4 pt-12 pb-4 sticky top-0 z-10 border-b border-gray-100 shadow-sm flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
           <button 
            onClick={goHome}
            className="flex items-center text-blue-600 font-medium active:opacity-50"
          >
            <ArrowLeft size={20} className="mr-1" />
            首页
          </button>
          <h1 className="text-lg font-bold truncate max-w-[140px]">{activeEvent.name}</h1>
          
          <div className="flex space-x-2">
             <button 
               onClick={() => setShowShareModal(true)}
               className="h-8 px-3 flex items-center justify-center text-white bg-blue-600 hover:bg-blue-700 rounded-full transition-colors text-xs font-bold shadow-md shadow-blue-200"
               title="邀请协作"
             >
               <Share2 size={14} className="mr-1" /> 邀请
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
                  <p className="text-xs mt-2 text-blue-400 bg-blue-50 px-3 py-1 rounded-full">数据会实时同步给所有成员</p>
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
        <div className="absolute bottom-8 left-0 right-0 flex justify-center z-20 pointer-events-none">
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
    </div>
  );
};

export default App;