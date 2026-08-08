'use client';

import { useEffect, useState } from 'react';

interface ClientDateTimeProps {
  date: Date;
  className?: string;
}

/** Renders locale date/time only after mount to avoid SSR hydration mismatches. */
export default function ClientDateTime({ date, className }: ClientDateTimeProps) {
  const [label, setLabel] = useState('');

  useEffect(() => {
    setLabel(
      `${date.toLocaleDateString()} ${date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })}`
    );
  }, [date]);

  return (
    <span suppressHydrationWarning className={className}>
      {label || '—'}
    </span>
  );
}
