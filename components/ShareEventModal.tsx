import React, { useState } from 'react';
import { PartyEvent } from '../types';
import { X, Copy, Check, Info } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface ShareEventModalProps {
  event: PartyEvent;
  onClose: () => void;
}

export const ShareEventModal: React.FC<ShareEventModalProps> = ({ event, onClose }) => {
  const [copied, setCopied] = useState(false);

  // Safely construct share URL (handles standard and some sandbox envs)
  const getShareUrl = () => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('eventId', event.id);
      return url.toString();
    } catch (e) {
      // Fallback for extreme environments where URL parsing might fail
      return `${window.location.href.split('?')[0]}?eventId=${event.id}`;
    }
  };

  const shareUrl = getShareUrl();

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
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
          
          <h2 className="text-xl font-bold text-gray-900 mb-6">扫码加入活动</h2>

          {/* QR Code Area - Clean, no icon */}
          <div className="bg-white p-2 rounded-xl border border-gray-100 mb-6 shadow-sm">
            <QRCodeSVG 
              value={shareUrl} 
              size={180} 
              level={"L"} // Low error correction is sufficient for clean QR
              includeMargin={true}
            />
          </div>
          
          {/* Sync Info */}
          <div className="flex items-start space-x-3 text-xs text-gray-500 bg-gray-50 p-4 rounded-xl mb-6 text-left w-full border border-gray-100">
            <Info size={16} className="flex-shrink-0 mt-0.5 text-blue-500" />
            <p>
              <span className="font-bold text-gray-900">云端实时同步：</span>
              转发此码或链接给好友，大家可同时记账，数据自动汇总。
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
                <Check size={18} className="mr-2" /> 已复制链接
              </>
            ) : (
              <>
                <Copy size={18} className="mr-2" /> 复制邀请链接
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};