import React, { useState, useEffect } from 'react';
import { Member, PartyEvent } from '../types';
import { X, Plus, Trash2, Save, AlertCircle, Calendar } from 'lucide-react';
import { getRandomAvatar } from '../utils/avatarUtils';
import { generateUUID } from '../utils/uuid';

interface NewEventModalProps {
  onClose: () => void;
  onSave: (event: PartyEvent) => void;
  onDelete?: (eventId: string) => void;
  initialEvent?: PartyEvent;
}

export const NewEventModal: React.FC<NewEventModalProps> = ({ onClose, onSave, onDelete, initialEvent }) => {
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Local state for delete confirmation UI
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  
  // For members, we need to track if they are new or existing to preserve IDs
  const [members, setMembers] = useState<Member[]>([
    { id: generateUUID(), name: '', avatarUrl: getRandomAvatar() },
    { id: generateUUID(), name: '', avatarUrl: getRandomAvatar() }
  ]);

  useEffect(() => {
    if (initialEvent) {
      setName(initialEvent.name);
      setStartDate(new Date(initialEvent.startDate).toISOString().split('T')[0]);
      setEndDate(new Date(initialEvent.endDate).toISOString().split('T')[0]);
      setMembers(initialEvent.members);
    }
  }, [initialEvent]);

  // Reset confirmation state if user interacts with other things
  useEffect(() => {
    if (isConfirmingDelete) {
      const timer = setTimeout(() => setIsConfirmingDelete(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isConfirmingDelete]);

  const handleAddMember = () => {
    setMembers([...members, { 
      id: generateUUID(), 
      name: '', 
      avatarUrl: getRandomAvatar()
    }]);
  };

  const handleMemberNameChange = (index: number, val: string) => {
    const newMembers = [...members];
    newMembers[index] = { ...newMembers[index], name: val };
    setMembers(newMembers);
  };

  const removeMember = (index: number) => {
    if (members.length <= 1) return;
    const newMembers = [...members];
    newMembers.splice(index, 1);
    setMembers(newMembers);
  };

  const handleSave = () => {
    if (!name || members.some(m => !m.name)) {
      alert("请填写活动名称及所有成员姓名");
      return;
    }

    const eventToSave: PartyEvent = {
      id: initialEvent ? initialEvent.id : generateUUID(),
      name,
      startDate: new Date(startDate).getTime(),
      endDate: new Date(endDate).getTime(),
      members: members,
      expenses: initialEvent ? initialEvent.expenses : [], // Preserve expenses if editing
      isSettled: initialEvent ? initialEvent.isSettled : false
    };

    onSave(eventToSave);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!initialEvent || !onDelete) return;

    if (isConfirmingDelete) {
      // Second click: Perform delete
      onDelete(initialEvent.id);
    } else {
      // First click: Show confirmation state
      setIsConfirmingDelete(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      {/* CSS to hide the native calendar picker indicator so only our custom icon shows */}
      <style>{`
        .custom-date-input::-webkit-calendar-picker-indicator {
          background: transparent;
          bottom: 0;
          color: transparent;
          cursor: pointer;
          height: auto;
          left: 0;
          position: absolute;
          right: 0;
          top: 0;
          width: auto;
          display: none;
        }
      `}</style>

      <div className="bg-white w-full max-w-md rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95">
        <div className="flex justify-between items-center p-4 border-b border-gray-100">
          <h2 className="text-lg font-bold">{initialEvent ? '编辑活动' : '新建活动'}</h2>
          <button onClick={onClose} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 max-h-[70vh] overflow-y-auto">
          {/* Name */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">活动名称</label>
            <input 
              type="text" 
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="例如：周末崇礼滑雪" 
              className="w-full p-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">开始日</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                <input 
                  type="date" 
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="custom-date-input w-full p-3 pl-10 bg-gray-50 rounded-xl outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">结算日</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                <input 
                  type="date" 
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="custom-date-input w-full p-3 pl-10 bg-gray-50 rounded-xl outline-none"
                />
              </div>
            </div>
          </div>

          {/* Members */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">参与成员</label>
            <div className="space-y-3">
              {members.map((m, idx) => (
                <div key={idx} className="flex items-center space-x-3">
                  <img src={m.avatarUrl} className="w-10 h-10 rounded-full bg-gray-100" alt="avatar" />
                  <input 
                    type="text" 
                    value={m.name}
                    onChange={(e) => handleMemberNameChange(idx, e.target.value)}
                    placeholder={`成员 ${idx + 1}`}
                    className="flex-1 p-2 bg-gray-50 border-b-2 border-transparent focus:border-blue-500 outline-none transition-colors"
                  />
                  {members.length > 1 && (
                    <button onClick={() => removeMember(idx)} className="text-gray-400 hover:text-red-500">
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button 
              onClick={handleAddMember}
              className="mt-4 flex items-center justify-center w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-blue-500 hover:text-blue-500 transition-all font-medium"
            >
              <Plus size={18} className="mr-2" /> 添加成员
            </button>
          </div>
        </div>

        <div className="p-4 border-t border-gray-100 bg-gray-50 flex gap-3">
           {initialEvent && (
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
            className={`flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-200 active:scale-95 transition-transform flex items-center justify-center ${initialEvent ? '' : 'w-full'}`}
          >
            <Save size={18} className="mr-2" /> {initialEvent ? '保存修改' : '创建活动'}
          </button>
        </div>
      </div>
    </div>
  );
};