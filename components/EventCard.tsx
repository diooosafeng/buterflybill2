import React from 'react';
import { PartyEvent } from '../types';
import { Calendar, ChevronRight, Users } from 'lucide-react';

interface EventCardProps {
  event: PartyEvent;
  onClick: () => void;
  isActive?: boolean;
}

export const EventCard: React.FC<EventCardProps> = ({ event, onClick, isActive }) => {
  const startDateStr = new Date(event.startDate).toLocaleDateString();
  const endDateStr = new Date(event.endDate).toLocaleDateString();
  const totalSpend = event.expenses.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div 
      onClick={onClick}
      className={`relative overflow-hidden mb-4 p-4 rounded-2xl shadow-sm transition-all active:scale-95 cursor-pointer 
      ${isActive 
        ? 'bg-blue-600 text-white shadow-blue-200 shadow-lg' 
        : 'bg-white text-gray-800'}`}
    >
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className={`font-bold text-lg ${isActive ? 'text-white' : 'text-gray-900'}`}>{event.name}</h3>
          <div className={`flex items-center text-xs mt-1 ${isActive ? 'text-blue-100' : 'text-gray-500'}`}>
            <Calendar size={12} className="mr-1" />
            {startDateStr} - {endDateStr}
          </div>
        </div>
        {isActive && (
          <span className="px-2 py-1 bg-white/20 rounded-full text-xs font-medium text-white backdrop-blur-sm">
            进行中
          </span>
        )}
      </div>

      <div className="flex justify-between items-end mt-4">
        <div className="flex -space-x-2">
          {event.members.slice(0, 3).map((m) => (
            <img 
              key={m.id} 
              src={m.avatarUrl} 
              alt={m.name} 
              className="w-8 h-8 rounded-full border-2 border-white object-cover"
            />
          ))}
          {event.members.length > 3 && (
            <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
              +{event.members.length - 3}
            </div>
          )}
        </div>
        
        <div className="text-right">
          <p className={`text-xs ${isActive ? 'text-blue-100' : 'text-gray-400'}`}>总支出</p>
          <p className="font-bold text-xl">¥{Number(totalSpend.toFixed(2))}</p>
        </div>
      </div>
    </div>
  );
};