import React from 'react';
import Sidebar from '@/components/ui/Sidebar';
import Header from '@/components/ui/Header';


export default function DevComponentsPage() {
  return (
    <div className="h-screen bg-ui-beige flex flex-col overflow-hidden">
      {/* Header Area */}
      <div className="w-full px-4 md:px-6">
        <Header />
      </div>

      {/* Main Content Area (Sidebar + Playground) */}
      <div className="flex-1 flex px-4 md:px-6 pb-4 md:pb-6 gap-4 md:gap-6 w-full overflow-hidden">
        {/* Sidebar Component */}
        <Sidebar />

        {/* Playground Area */}
        <div className="bg-white rounded-3xl p-5 md:p-8 shadow-sm flex-1 overflow-y-auto">
          <h2 className="text-xl font-bold text-black mb-6">Playground Area</h2>
          <p className="text-gray-600 mb-4">
            Look at the components around! The floating sidebar is on the left, and the new horizontal header is on top. 
            Both use the Corgi design system (`ui-beige` background, pill-shaped components, `corgi` orange accents).
          </p>
        </div>
      </div>
    </div>
  );
}
