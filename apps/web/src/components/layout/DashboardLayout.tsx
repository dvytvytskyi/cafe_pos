import React from 'react';
import Sidebar from '@/components/ui/Sidebar';
import Header from '@/components/ui/Header';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen bg-ui-beige flex flex-col overflow-hidden">
      {/* Header Area */}
      <div className="w-full px-4 md:px-6">
        <Header />
      </div>

      {/* Main Content Area (Sidebar + Children) */}
      <div className="flex-1 flex px-4 md:px-6 pb-4 md:pb-6 gap-4 md:gap-6 w-full overflow-hidden">
        {/* Sidebar Component */}
        <Sidebar />

        {/* Dynamic Page Content */}
        {children}
      </div>
    </div>
  );
}
