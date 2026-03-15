import React, { useMemo, useState } from 'react';
import { PartyEvent } from '../types';
import { calculateSettlement } from '../services/settlementService';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ArrowRight, Wallet, CheckCircle2, Users, Receipt } from 'lucide-react';

interface SettlementViewProps {
  event: PartyEvent;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

export const SettlementView: React.FC<SettlementViewProps> = ({ event }) => {
  const [selectedMemberId, setSelectedMemberId] = useState<string>('ALL');
  
  const report = useMemo(() => calculateSettlement(event), [event]);

  // Calculate statistics based on selection (All vs Specific Member)
  const { chartData, statCards } = useMemo(() => {
    const map: Record<string, number> = {};
    let totalShare = 0;
    let totalPaid = 0;

    event.expenses.forEach(exp => {
      // 1. Calculate Share (Expenses involved in)
      let share = 0;
      if (selectedMemberId === 'ALL') {
        share = exp.amount; // For ALL, share is total amount
      } else if (exp.involvedMemberIds.includes(selectedMemberId)) {
        share = exp.amount / exp.involvedMemberIds.length; // Personal share
      }

      if (share > 0) {
        const cat = exp.category;
        map[cat] = (map[cat] || 0) + share;
        totalShare += share;
      }

      // 2. Calculate Paid (Money out of pocket)
      if (exp.payerId === selectedMemberId) {
        totalPaid += exp.amount;
      }
    });

    const breakdown = Object.entries(map)
      .map(([name, value]) => ({ name, value: Number(value.toFixed(2)) }))
      .sort((a, b) => b.value - a.value);

    // Define card data based on mode
    let cards = [];
    if (selectedMemberId === 'ALL') {
      cards = [
        { label: '活动总支出', value: report.totalExpense },
        { label: '人均消费', value: event.members.length > 0 ? report.totalExpense / event.members.length : 0 }
      ];
    } else {
      cards = [
        { label: '个人应付 (花销)', value: totalShare },
        { label: '个人已付 (垫资)', value: totalPaid }
      ];
    }

    return { 
      chartData: breakdown, 
      statCards: cards
    };
  }, [event, selectedMemberId, report]);

  if (event.expenses.length === 0) {
    return (
       <div className="flex flex-col items-center justify-center pt-20 text-gray-400">
          <Receipt size={64} className="mb-4 opacity-20" />
          <p>还没有账单，记一笔吧！</p>
          <p className="text-xs mt-2 text-blue-400 bg-blue-50 px-3 py-1 rounded-full">数据会实时同步给所有成员</p>
       </div>
    );
  }

  return (
    <div className="pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Member Filter */}
      <div className="mb-6 overflow-x-auto scrollbar-hide -mx-4 px-4">
        <div className="flex space-x-4">
          <button
            onClick={() => setSelectedMemberId('ALL')}
            className={`flex flex-col items-center min-w-[60px] transition-opacity ${selectedMemberId === 'ALL' ? 'opacity-100' : 'opacity-50'}`}
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-1 border-2 transition-colors ${selectedMemberId === 'ALL' ? 'bg-gray-900 text-white border-gray-900' : 'bg-gray-100 text-gray-500 border-transparent'}`}>
              <Users size={24} />
            </div>
            <span className={`text-xs font-medium ${selectedMemberId === 'ALL' ? 'text-gray-900' : 'text-gray-500'}`}>
              全员
            </span>
          </button>

          {event.members.map(m => (
            <button
              key={m.id}
              onClick={() => setSelectedMemberId(m.id)}
              className={`flex flex-col items-center min-w-[60px] transition-opacity ${selectedMemberId === m.id ? 'opacity-100' : 'opacity-50'}`}
            >
              <img 
                src={m.avatarUrl} 
                alt={m.name} 
                className={`w-12 h-12 rounded-full object-cover mb-1 border-2 ${selectedMemberId === m.id ? 'border-blue-500' : 'border-transparent'}`} 
              />
              <span className={`text-xs font-medium ${selectedMemberId === m.id ? 'text-blue-600' : 'text-gray-500'}`}>
                {m.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Dynamic Summary Cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {statCards.map((card, idx) => (
          <div key={idx} className="bg-white p-4 rounded-2xl shadow-sm transition-all">
            <p className="text-xs text-gray-500 mb-1">{card.label}</p>
            <p className="text-2xl font-bold text-gray-900">¥{Number(card.value.toFixed(2))}</p>
          </div>
        ))}
      </div>

      {/* Best Transfer Path (Only visible for ALL) */}
      {selectedMemberId === 'ALL' && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-6 animate-in slide-in-from-bottom-2">
          <div className="p-4 border-b border-gray-100 bg-green-50/50">
            <h3 className="font-bold text-green-800 flex items-center">
              <CheckCircle2 size={18} className="mr-2" />
              最佳转账方案
            </h3>
            <p className="text-xs text-green-600 mt-1">
              已为您计算最小转账次数 (全局)
            </p>
          </div>
          
          <div className="divide-y divide-gray-100">
            {report.transfers.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                账目已平，无需转账。
              </div>
            ) : (
              report.transfers.map((t, idx) => (
                <div key={idx} className="p-4 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold text-sm">
                        {t.fromName.charAt(0)}
                      </div>
                      <span className="text-xs text-gray-500 mt-1">{t.fromName}</span>
                    </div>
                    
                    <div className="flex flex-col items-center px-2">
                      <span className="text-xs text-gray-400 mb-1">支付给</span>
                      <ArrowRight size={16} className="text-gray-300" />
                    </div>

                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center font-bold text-sm">
                         {t.toName.charAt(0)}
                      </div>
                      <span className="text-xs text-gray-500 mt-1">{t.toName}</span>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <span className="block font-bold text-lg text-gray-800">¥{t.amount}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="bg-white p-4 rounded-2xl shadow-sm mb-6">
        <h3 className="font-bold text-gray-800 mb-4 text-sm flex justify-between items-center">
          <span>消费分布</span>
          <span className="text-xs font-normal text-gray-400">
            {selectedMemberId === 'ALL' ? '全员统计' : '个人统计'}
          </span>
        </h3>
        
        {chartData.length > 0 ? (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `¥${value}`} />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
           <div className="h-64 flex flex-col items-center justify-center text-gray-400">
             <p className="text-sm">该成员暂无相关消费</p>
           </div>
        )}
      </div>

    </div>
  );
};