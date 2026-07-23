import React from 'react';
import { ChevronRight } from 'lucide-react';

export function ShiftRoster() {
  const names = ['Emma W.', 'James L.', 'Sophia R.', 'Oliver T.', 'Mia B.', 'Lucas H.', 'Ava C.', 'Ethan M.', 'Isabella P.', 'Mason D.', 'Amelia S.', 'Logan K.', 'Harper J.', 'Alexander F.', 'Evelyn G.', 'Michael H.', 'Abigail L.', 'Daniel Y.', 'Emily W.', 'Henry R.', 'Elizabeth N.', 'Jackson T.', 'Sofia M.', 'Sebastian V.', 'Avery B.', 'Jack C.', 'Ella D.', 'Owen F.', 'Scarlett G.', 'Wyatt H.'];
  const roles = ['Barista', 'Cashier', 'Manager', 'Barista', 'Barista'];
  
  const staff = Array.from({ length: 30 }).map((_, i) => ({
    id: i + 1,
    name: names[i] || `Staff ${i+1}`,
    role: roles[i % roles.length],
    status: i < 8 ? 'active' : i < 11 ? 'break' : 'offline',
    avatar: `https://i.pravatar.cc/150?img=${(i % 70) + 1}`
  }));

  return (
    <div className="bg-white border border-gray-100 rounded-3xl p-6 flex flex-col hover:border-gray-200 transition-colors h-[340px]">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <h3 className="text-lg font-bold text-gray-900">Shift Roster</h3>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
            {new Date().toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })}
          </span>
          <button className="p-1 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <div className="flex flex-col gap-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {staff.map((person) => (
          <div key={person.id} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <img src={person.avatar} alt={person.name} className={`w-10 h-10 rounded-full object-cover ${person.status === 'offline' ? 'grayscale opacity-50' : ''}`} />
                {person.status !== 'offline' && (
                  <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${person.status === 'active' ? 'bg-[#111827]' : 'bg-[#f59e0b]'}`}></div>
                )}
              </div>
              <div>
                <div className={`text-sm font-bold ${person.status === 'offline' ? 'text-gray-400' : 'text-gray-900'}`}>{person.name}</div>
                <div className="text-xs font-medium text-gray-500">{person.role}</div>
              </div>
            </div>
            {person.status === 'active' && <span className="text-xs font-bold text-gray-700 bg-gray-100 px-2.5 py-1 rounded-md">On Duty</span>}
            {person.status === 'break' && <span className="text-xs font-bold text-gray-500 bg-gray-50 px-2.5 py-1 rounded-md border border-gray-100">Break</span>}
            {person.status === 'offline' && <span className="text-xs font-medium text-gray-400">Off</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

export function RecentReviews() {
  const reviews = [
    { id: 1, author: 'Alex M.', rating: 5, time: '10 min ago', text: 'Best corgi latte ever! The art was so cute I almost cried.', platform: 'Google', link: '#' },
    { id: 2, author: 'Sarah K.', rating: 4, time: '1 hr ago', text: 'Great atmosphere, but had to wait 10 mins for my matcha.', platform: 'Yelp', link: '#' },
    { id: 3, author: 'David P.', rating: 5, time: '3 hrs ago', text: 'Amazing pastries as always.', platform: 'TripAdvisor', link: '#' }
  ];

  return (
    <div className="bg-white border border-gray-100 rounded-3xl p-6 flex flex-col hover:border-gray-200 transition-colors h-[340px]">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <h3 className="text-lg font-bold text-gray-900">Fresh Reviews</h3>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-md">Recents</span>
          <button className="p-1 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <div className="flex flex-col gap-5 flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {reviews.map((review) => (
          <div key={review.id} className="flex flex-col gap-1.5 border-b border-gray-50 pb-4 last:border-0 last:pb-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-gray-900">{review.author}</span>
                <span className="text-xs font-medium text-gray-400">{review.time}</span>
              </div>
              <a href={review.link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-1.5 py-0.5 rounded transition-colors group">
                {review.platform}
                <svg className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
              </a>
            </div>
            <div className="flex items-center gap-0.5">
              {[...Array(5)].map((_, i) => (
                <svg key={i} className={`w-3 h-3 ${i < review.rating ? 'text-yellow-400' : 'text-gray-200'}`} fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <p className="text-sm text-gray-600 leading-snug line-clamp-2">{review.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CategoryBreakdown() {
  const categories = [
    { id: 1, name: 'Corgi Signature Latte', revenue: '€3,450', percentage: 45, color: 'bg-[#111827]' },
    { id: 2, name: 'Avocado Toast', revenue: '€1,950', percentage: 25, color: 'bg-[#f59e0b]' },
    { id: 3, name: 'Matcha Croissant', revenue: '€1,150', percentage: 15, color: 'bg-gray-300' },
    { id: 4, name: 'Double Espresso', revenue: '€750', percentage: 10, color: 'bg-gray-200' }
  ];

  return (
    <div className="bg-white border border-gray-100 rounded-3xl p-6 flex flex-col hover:border-gray-200 transition-colors h-[340px]">
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <h3 className="text-lg font-bold text-gray-900">Top Menu Items</h3>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-md">Selected Period</span>
          <button className="p-1 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <div className="flex flex-col gap-6 flex-1 justify-center">
        {categories.map((category) => (
          <div key={category.id} className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-bold text-gray-900">{category.name}</span>
              <div className="flex items-center gap-3">
                <span className="font-medium text-gray-500">{category.revenue}</span>
                <span className="font-bold text-gray-900 w-9 text-right">{category.percentage}%</span>
              </div>
            </div>
            <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full ${category.color}`} 
                style={{ width: `${category.percentage}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
