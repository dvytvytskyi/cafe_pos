import React from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import MenusView from '@/components/ui/MenusView';

export default function MenuPage() {
  return (
    <DashboardLayout>
      <div className="bg-white rounded-[32px] p-6 shadow-sm flex-1 flex overflow-hidden">
        <MenusView />
      </div>
    </DashboardLayout>
  );
}
