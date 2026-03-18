import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';

interface JoinEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoin: (code: string) => Promise<void>;
}

export const JoinEventModal: React.FC<JoinEventModalProps> = ({ isOpen, onClose, onJoin }) => {
  const [code, setCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCode('');
      setIsJoining(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length < 4 || isJoining) return;

    setIsJoining(true);
    try {
      await onJoin(code.trim().toUpperCase());
      onClose();
    } catch (error) {
      console.error("Join failed:", error);
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300" 
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative w-full max-w-sm bg-white rounded-[32px] shadow-2xl p-8 animate-in zoom-in-95 duration-200">
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X size={20} />
        </button>

        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">加入活动</h2>
          <p className="text-gray-500 text-sm">请输入朋友分享的 6 位数口令</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="例如: AB12CD"
              maxLength={6}
              autoFocus
              className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl px-6 py-4 text-center text-2xl font-black tracking-[0.5em] text-blue-600 outline-none transition-all placeholder:tracking-normal placeholder:font-medium placeholder:text-gray-300"
            />
          </div>

          <button
            type="submit"
            disabled={code.length < 4 || isJoining}
            className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-[0.98] transition-all disabled:bg-gray-200 disabled:shadow-none flex items-center justify-center"
          >
            {isJoining ? (
              <>
                <Loader2 className="animate-spin mr-2" size={20} />
                正在加入...
              </>
            ) : (
              '确认加入'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
