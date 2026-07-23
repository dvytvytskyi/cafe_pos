'use client';

import React, { useEffect, useState } from 'react';
import { Settings, CheckCheck, Circle } from 'lucide-react';

interface NotificationsPopoverProps {
  isOpen: boolean;
  onClose: () => void;
}

// Store outside component so it persists across opening/closing the popover
let initialNotifs = [
  {
    id: 1,
    unread: true,
    avatarBg: 'bg-orange-100',
    avatarInner: 'w-4 h-4 bg-orange-400 rounded-full',
    content: <><span className="font-medium text-gray-800">You</span> gained 12 points for on Purchase order submission <span className="font-medium text-gray-800">Steve Mathew</span></>,
    time: '4 weeks ago'
  },
  {
    id: 2,
    unread: true,
    avatarBg: 'bg-blue-100',
    avatarInner: 'w-4 h-4 bg-blue-400 rounded-sm',
    content: <><span className="font-medium text-gray-800">Phillip Morris</span> Assigned you in <span className="font-medium text-gray-800">OnePlus 6t (White, 64gb)</span></>,
    time: '18 hours ago'
  },
  {
    id: 3,
    unread: false,
    avatarBg: 'bg-pink-100',
    avatarInner: 'w-4 h-4 bg-pink-400 rounded-tl-full rounded-br-full',
    content: <><span className="font-medium text-gray-800">Riley</span> gained 12 points for on Item creation <span className="font-medium text-gray-800">Steve Mathew</span></>,
    time: '4 weeks ago',
    bg: 'bg-gray-50/50'
  },
  {
    id: 4,
    unread: false,
    avatarBg: 'bg-green-100',
    avatarInner: 'w-4 h-4 bg-green-400 rounded-tr-[8px] rounded-bl-[8px]',
    content: <><span className="font-medium text-gray-800">William Cooper</span> liked your Profile</>,
    time: '22 hours ago'
  },
  {
    id: 5,
    unread: false,
    avatarBg: 'bg-purple-100',
    avatarInner: 'w-4 h-4 bg-purple-400 rounded-full',
    content: <><span className="font-medium text-gray-800">Virginia rose</span> Shared <span className="font-medium text-gray-800">Apple iphone XR (White, 64)</span> with you</>,
    time: '5 days ago'
  }
];

export default function NotificationsPopover({ isOpen, onClose }: NotificationsPopoverProps) {
  const [render, setRender] = useState(isOpen);
  const [visible, setVisible] = useState(isOpen);
  const [notifs, setNotifs] = useState(initialNotifs);

  useEffect(() => {
    let mountTimer: NodeJS.Timeout;
    let unmountTimer: NodeJS.Timeout;

    if (isOpen) {
      setRender(true);
      setNotifs([...initialNotifs]); // Refresh from global state on open
      mountTimer = setTimeout(() => setVisible(true), 10);
    } else {
      setVisible(false);
      unmountTimer = setTimeout(() => setRender(false), 150);
    }

    return () => {
      clearTimeout(mountTimer);
      clearTimeout(unmountTimer);
    };
  }, [isOpen]);

  const markAsRead = (e: React.MouseEvent, id: number) => {
    e.stopPropagation(); // prevent clicking the notification row itself
    const updated = notifs.map(n => n.id === id ? { ...n, unread: false } : n);
    setNotifs(updated);
    initialNotifs = updated;
  };

  const markAllAsRead = () => {
    const updated = notifs.map(n => ({ ...n, unread: false }));
    setNotifs(updated);
    initialNotifs = updated;
  };

  if (!render) return null;

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div 
        className={`absolute top-full right-0 mt-4 w-[420px] bg-white rounded-[20px] shadow-2xl flex flex-col z-50 transition-all duration-150 ease-out transform origin-top-right ${
          visible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-2'
        }`}
      >
        {/* Header Tabs */}
        <div className="flex items-center justify-between px-5 pt-5 border-b border-gray-100">
          <div className="flex items-center gap-5">
            <button className="pb-3 text-[13px] font-semibold text-gray-800 border-b-2 border-black cursor-pointer">Notifications</button>
            <button className="pb-3 text-[13px] font-medium text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">Today's events</button>
            <button className="pb-3 text-[13px] font-medium text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">Open Documents</button>
          </div>
          <div className="flex items-center gap-3 pb-3">
            <button onClick={markAllAsRead} className="text-gray-400 hover:text-black transition-colors cursor-pointer" title="Mark all as read">
              <CheckCheck size={16} />
            </button>
            <button className="text-gray-400 hover:text-black transition-colors cursor-pointer" title="Settings">
              <Settings size={16} />
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex flex-col p-2 max-h-[400px] overflow-y-auto">
          
          {notifs.map((item) => (
            <div key={item.id} className={`relative flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer group ${item.bg || ''}`}>
              
              {/* Unread indicator */}
              {item.unread && (
                <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
              )}
              
              {/* Avatar */}
              <div className={`w-8 h-8 rounded-full ${item.avatarBg} shrink-0 flex items-center justify-center overflow-hidden ml-2.5`}>
                 <div className={item.avatarInner}></div>
              </div>
              
              {/* Content */}
              <div className="flex-1 flex flex-col gap-1 mt-0.5 pr-6">
                <p className="text-[13px] text-gray-500 leading-snug">
                  {item.content}
                </p>
                <span className="text-[11px] font-medium text-gray-400">{item.time}</span>
              </div>
              
              {/* Mark as read button */}
              {item.unread && (
                <button 
                  onClick={(e) => markAsRead(e, item.id)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity group/mark cursor-pointer flex items-center justify-center p-1"
                >
                  <Circle size={16} strokeWidth={2.5} />
                  <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-[#1e293b] text-white text-[12px] font-medium rounded-lg opacity-0 invisible group-hover/mark:opacity-100 group-hover/mark:visible whitespace-nowrap shadow-md">
                    Mark as read
                  </div>
                </button>
              )}
            </div>
          ))}

        </div>

        {/* Footer */}
        <div className="p-3 border-t border-gray-50 flex justify-center mt-2">
          <button className="text-[13px] font-medium text-gray-500 hover:text-black transition-colors py-1 cursor-pointer">
            See all activity
          </button>
        </div>
      </div>
    </>
  );
}
