import React, { useState } from 'react';
import { PartyEvent } from '../types';
import { X, Copy, Check, Info } from 'lucide-react';

interface ShareEventModalProps {
  event: PartyEvent;
  onClose: () => void;
}

export const ShareEventModal: React.FC<ShareEventModalProps> = ({ event, onClose }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(event.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl scale-100 animate-in zoom-in-95 duration-200 relative">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors z-10"
        >
          <X size={20} className="text-gray-500" />
        </button>

        <div className="p-8 flex flex-col items-center pt-10">
          
          <h2 className="text-xl font-bold text-gray-900 mb-2">共享口令</h2>
          <p className="text-sm text-gray-400 mb-6">让好友输入下方口令加入活动</p>

          {/* Passcode Display */}
          <div className="bg-blue-50 px-6 py-4 rounded-2xl mb-6 flex flex-col items-center border border-blue-100 w-full">
            <span className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-1">活动口令</span>
            <span className="text-3xl font-black text-blue-600 tracking-[0.2em]">{event.id}</span>
          </div>
          
          {/* Sync Info */}
          <div className="flex items-start space-x-3 text-xs text-gray-500 bg-gray-50 p-4 rounded-xl mb-6 text-left w-full border border-gray-100">
            <Info size={16} className="flex-shrink-0 mt-0.5 text-blue-500" />
            <p>
              多人共同编辑活动，数据将云端同步记录和计算。
            </p>
          </div>

          {/* Copy Link Button */}
          <button
            onClick={handleCopy}
            className={`w-full py-3.5 rounded-xl font-bold flex items-center justify-center transition-all duration-300
              ${copied 
                ? 'bg-green-500 text-white shadow-green-200 shadow-lg' 
                : 'bg-gray-900 text-white shadow-gray-300 shadow-lg active:scale-95'}`}
          >
            {copied ? (
              <>
                <Check size={18} className="mr-2" /> 已复制口令
              </>
            ) : (
              <>
                <Copy size={18} className="mr-2" /> 复制口令
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
