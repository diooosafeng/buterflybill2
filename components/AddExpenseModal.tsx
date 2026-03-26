import React, { useState, useEffect } from 'react';
import { Expense, ExpenseCategory, Member, PaymentMethod } from '../types';
import { categorizeExpense } from '../services/geminiService';
import { X, Sparkles, Loader2, Trash2, Save, AlertCircle } from 'lucide-react';
import { generateUUID } from '../utils/uuid';

interface AddExpenseModalProps {
  members: Member[];
  onClose: () => void;
  onSave: (expense: Expense) => void;
  onDelete?: (expenseId: string) => void;
  initialExpense?: Expense | null;
}

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({ members, onClose, onSave, onDelete, initialExpense }) => {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>(ExpenseCategory.Other);
  const [payerId, setPayerId] = useState<string>(members[0]?.id || '');
  const [involvedIds, setInvolvedIds] = useState<string[]>(members.map(m => m.id));
  const [isCategorizing, setIsCategorizing] = useState(false);
  const [payMethod, setPayMethod] = useState<PaymentMethod>(PaymentMethod.WeChat);
  
  // UI State for Delete Confirmation
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  
  // AI Toggle State: Default to true for new expenses, false for editing
  const [useAI, setUseAI] = useState(!initialExpense);

  // Initialize data if editing
  useEffect(() => {
    if (initialExpense) {
      setDescription(initialExpense.description);
      setAmount(initialExpense.amount.toString());
      setCategory(initialExpense.category);
      setPayerId(initialExpense.payerId);
      setInvolvedIds(initialExpense.involvedMemberIds);
      setPayMethod(initialExpense.paymentMethod);
    }
  }, [initialExpense]);

  // Reset confirmation state if user interacts with other things or waits too long
  useEffect(() => {
    if (isConfirmingDelete) {
      const timer = setTimeout(() => setIsConfirmingDelete(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isConfirmingDelete]);

  // Debounce description input for AI classification
  useEffect(() => {
    if (!useAI) return;
    if (initialExpense && !useAI) return; 

    const timer = setTimeout(async () => {
      if (description.trim().length >= 2) {
        console.log(`[AI] Triggering categorization for: "${description}"`);
        setIsCategorizing(true);
        try {
          const aiCategory = await categorizeExpense(description);
          console.log(`[AI] Suggested category: ${aiCategory}`);
          if (aiCategory) {
            setCategory(aiCategory);
          }
        } catch (err) {
          console.error("[AI] Error in categorization:", err);
        } finally {
          setIsCategorizing(false);
        }
      } else {
        console.log(`[AI] Description too short (${description.trim().length}), skipping.`);
      }
    }, 1000); 

    return () => clearTimeout(timer);
  }, [description, initialExpense, useAI]);

  const toggleInvolved = (id: string) => {
    if (involvedIds.includes(id)) {
      if (involvedIds.length > 1) { 
        setInvolvedIds(involvedIds.filter(mid => mid !== id));
      }
    } else {
      setInvolvedIds([...involvedIds, id]);
    }
  };

  const handleSave = () => {
    if (!description || !amount) {
      alert("请填写描述和金额");
      return;
    }
    
    onSave({
      id: initialExpense ? initialExpense.id : generateUUID(),
      description,
      amount: parseFloat(amount),
      category,
      payerId,
      involvedMemberIds: involvedIds,
      date: initialExpense ? initialExpense.date : Date.now(),
      paymentMethod: payMethod
    });
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!initialExpense || !onDelete) return;

    if (isConfirmingDelete) {
      onDelete(initialExpense.id);
    } else {
      setIsConfirmingDelete(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-md rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95">
        <div className="flex justify-between items-center p-4 border-b border-gray-100">
          <h2 className="text-lg font-bold">{initialExpense ? '编辑账单' : '记一笔'}</h2>
          <button onClick={onClose} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 max-h-[75vh] overflow-y-auto">
          {/* Description & AI Category (Moved to top) */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">消费内容</label>
            <div className="relative">
              <input 
                type="text" 
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="例如：周五晚上海底捞"
                autoFocus={!initialExpense}
                className="w-full p-3 pr-10 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
              <div className="absolute right-3 top-3">
                {isCategorizing ? (
                  <Loader2 className="animate-spin text-gray-400" size={20}/> 
                ) : (
                  <button 
                    onClick={() => setUseAI(!useAI)}
                    className="focus:outline-none"
                    title={useAI ? "关闭AI自动归类" : "开启AI自动归类"}
                  >
                    <Sparkles 
                      size={20} 
                      className={`transition-colors ${useAI ? "text-purple-500 fill-purple-100" : "text-gray-300"}`} 
                    />
                  </button>
                )}
              </div>
            </div>
            
            {!useAI && (
              <div className="flex flex-wrap gap-2 mt-3 animate-in fade-in slide-in-from-top-2 duration-300">
                {Object.values(ExpenseCategory).map(cat => (
                  <button 
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors
                      ${category === cat 
                        ? 'bg-blue-100 text-blue-700 border-blue-200' 
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
            
            {useAI && (
              <p className="text-[10px] text-gray-400 mt-2 flex items-center">
                <Sparkles size={10} className="mr-1" /> AI 将自动识别消费类目
              </p>
            )}
          </div>

          {/* Amount */}
          <div className="mb-6">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">金额</label>
            <div className="flex items-center text-4xl font-bold text-gray-900 border-b-2 border-blue-500 pb-2">
              <span className="mr-2 text-2xl">¥</span>
              <input 
                type="number" 
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-transparent outline-none placeholder-gray-300"
              />
            </div>
          </div>

          {/* Payment Method */}
          <div className="mb-6">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">支付方式</label>
            <div className="flex flex-wrap gap-2">
              {Object.values(PaymentMethod).map(method => (
                <button
                  key={method}
                  onClick={() => setPayMethod(method)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all
                    ${payMethod === method
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-100'
                      : 'bg-white text-gray-500 border-gray-100 hover:bg-gray-50'}`}
                >
                  {method}
                </button>
              ))}
            </div>
          </div>

          {/* Payer */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">谁付的钱?</label>
            <div className="flex space-x-3 overflow-x-auto pb-2 scrollbar-hide">
              {members.map(m => (
                <div 
                  key={m.id}
                  onClick={() => setPayerId(m.id)}
                  className={`flex-shrink-0 flex flex-col items-center cursor-pointer transition-opacity ${payerId === m.id ? 'opacity-100' : 'opacity-50'}`}
                >
                  <div className={`p-0.5 rounded-full ${payerId === m.id ? 'bg-blue-500' : 'bg-transparent'}`}>
                    <img src={m.avatarUrl} alt={m.name} className="w-12 h-12 rounded-full border-2 border-white" />
                  </div>
                  <span className="text-xs mt-1 font-medium">{m.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Involved */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">给谁付的?</label>
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={() => setInvolvedIds(members.map(m => m.id))}
                className="px-3 py-1 rounded-full text-xs bg-gray-100 text-gray-600 hover:bg-gray-200"
              >
                全员
              </button>
              {members.map(m => (
                <button
                  key={m.id}
                  onClick={() => toggleInvolved(m.id)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors
                    ${involvedIds.includes(m.id)
                      ? 'bg-green-100 text-green-700 border-green-200' 
                      : 'bg-white text-gray-400 border-gray-200'}`}
                >
                  {m.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-100 bg-gray-50 flex gap-3">
          {initialExpense && (
            <button 
              type="button"
              onClick={handleDelete}
              className={`flex-1 py-3 font-bold rounded-xl transition-all flex items-center justify-center
                ${isConfirmingDelete 
                  ? 'bg-red-600 text-white shadow-red-200 hover:bg-red-700' 
                  : 'bg-red-50 text-red-600 hover:bg-red-100'}`}
            >
              {isConfirmingDelete ? (
                <>
                  <AlertCircle size={18} className="mr-2" /> 确认删除?
                </>
              ) : (
                <>
                  <Trash2 size={18} className="mr-2" /> 删除
                </>
              )}
            </button>
          )}
          <button 
            type="button"
            onClick={handleSave}
            className={`flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-200 active:scale-95 transition-transform flex items-center justify-center ${initialExpense ? '' : 'w-full'}`}
          >
            <Save size={18} className="mr-2" /> {initialExpense ? '保存修改' : '保存记录'}
          </button>
        </div>
      </div>
    </div>
  );
};