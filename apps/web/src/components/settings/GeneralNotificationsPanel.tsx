'use client';

import React, { useEffect, useRef, useState } from 'react';
import { CheckSquare } from 'lucide-react';
import {
  getNotificationSettingsAsync,
  saveNotificationSettingsAsync,
  type NotificationSettings,
} from '@/lib/notification-settings';

export default function GeneralNotificationsPanel() {
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getNotificationSettingsAsync();
        if (!cancelled) setSettings(data);
      } catch (err) {
        console.error(err);
        if (!cancelled) setSaveError('Failed to load notification preferences');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = (next: NotificationSettings) => {
    setSettings(next);
    setSaveError(null);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveNotificationSettingsAsync(next).catch((err) => {
        console.error(err);
        setSaveError('Failed to save notification preferences');
      });
    }, 400);
  };

  if (loading) {
    return <p className="text-sm text-gray-500">Loading notification preferences…</p>;
  }

  if (!settings) {
    return (
      <p className="text-sm text-red-500" role="alert">
        {saveError ?? 'Unable to load notification preferences'}
      </p>
    );
  }

  const toggleCheck = (key: 'productivity' | 'newEvent' | 'newTeam') => {
    persist({ ...settings, [key]: !settings[key] });
  };

  const toggleSwitch = (key: 'mobilePush' | 'desktopPush' | 'email') => {
    persist({ ...settings, [key]: !settings[key] });
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-8 pb-4 border-b border-gray-100">My Notifications</h2>

      {saveError && (
        <p className="text-sm text-red-500 mb-4" role="alert">
          {saveError}
        </p>
      )}

      <div className="flex flex-col gap-8">
        <div className="flex justify-between items-start">
          <div className="flex flex-col gap-3">
            <span className="text-[15px] font-medium text-gray-800">Notify me when...</span>

            {(
              [
                ['productivity', 'Daily productivity update'],
                ['newEvent', 'New event created'],
                ['newTeam', 'When added on new team'],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex items-center gap-3 cursor-pointer group">
                <div
                  onClick={() => toggleCheck(key)}
                  className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${
                    settings[key] ? 'bg-corgi' : 'bg-gray-200 group-hover:bg-gray-300'
                  }`}
                >
                  {settings[key] && <CheckSquare size={14} className="text-white" strokeWidth={3} />}
                </div>
                <span className="text-[14px] text-gray-500 group-hover:text-gray-800 transition-colors">
                  {label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {(
          [
            ['mobilePush', 'Mobile push notifications', 'Receive push notification whenever your organisation requires your attention'],
            ['desktopPush', 'Desktop Notification', 'Receive desktop notification whenever your organisation requires your attention'],
            ['email', 'Email Notification', 'Receive email whenever your organisation requires your attention'],
          ] as const
        ).map(([key, title, subtitle]) => (
          <div key={key} className="flex justify-between items-center py-1">
            <div className="flex flex-col gap-1">
              <span className="text-[15px] font-medium text-gray-800">{title}</span>
              <span className="text-[13px] text-gray-400">{subtitle}</span>
            </div>
            <button
              type="button"
              onClick={() => toggleSwitch(key)}
              className={`w-11 h-6 rounded-full p-1 transition-colors cursor-pointer relative flex items-center ${
                settings[key] ? 'bg-corgi' : 'bg-gray-200'
              }`}
            >
              <div
                className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300 ${
                  settings[key] ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
