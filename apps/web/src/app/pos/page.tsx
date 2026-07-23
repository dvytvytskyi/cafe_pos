'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function POSRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/orders?tab=tables');
  }, [router]);

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-ui-beige text-gray-500 font-bold">
      Redirecting to Table Layout...
    </div>
  );
}
