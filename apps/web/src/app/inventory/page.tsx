import React from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import InventoryDashboard from '@/components/inventory/InventoryDashboard';

export default function InventoryPage() {
  return (
    <DashboardLayout>
      <InventoryDashboard />
    </DashboardLayout>
  );
}
