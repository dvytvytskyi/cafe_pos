import React, { useState } from 'react';
import { Star, CheckCircle2, MapPin, ChevronDown, CheckSquare } from 'lucide-react';

const REVIEW_TEXTS = [
  "Absolutely love the new Corgi Cafe! The avocado toast is to die for, and the staff is so friendly.",
  "Great atmosphere and good coffee. Prices are a bit high, but the quality justifies it.",
  "Best matcha latte in the city! The corgi mascot is adorable and the whole place has such a great vibe.",
  "Coffee was good but we had to wait 20 minutes for a table on a Sunday. Once seated, the service was quite fast though.",
  "Loved the croissants and the fresh orange juice. Will come back!",
  "A bit noisy during lunch time, but the food is excellent.",
  "The QR code ordering made everything super fast. Highly recommend.",
  "Nice interior, but the espresso was a little bit burnt.",
  "Friendly baristas, very clean restrooms, and the Wifi is super fast for working.",
  "Perfect place for a weekend brunch with friends. The pancakes were amazing."
];

const AUTHORS = ["Elena Rodriguez", "Mark T.", "Sophie L.", "David Chen", "Anna K.", "John S.", "Maria G.", "Alex P.", "Tom W.", "Jessica R."];

const MOCK_REVIEWS = Array.from({ length: 35 }).map((_, i) => ({
  id: i + 1,
  platform: i % 3 === 0 ? 'TripAdvisor' : 'Google',
  author: AUTHORS[i % AUTHORS.length] + (i >= AUTHORS.length ? ` ${i}` : ''),
  rating: [5, 4, 5, 3, 5, 4, 5, 3, 4, 5][i % 10],
  date: i === 0 ? '2 days ago' : i < 5 ? '1 week ago' : i < 15 ? '2 weeks ago' : '1 month ago',
  text: REVIEW_TEXTS[i % REVIEW_TEXTS.length],
  status: i % 2 === 0 ? 'replied' : 'new'
}));

export default function ReputationView() {
  const [activeTab, setActiveTab] = useState<'all' | 'google' | 'tripadvisor'>('all');
  const [visibleCount, setVisibleCount] = useState(15);
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [activeLocation, setActiveLocation] = useState('All Locations');

  const LOCATIONS = [
    'All Locations',
    'Gothic',
    'Sagrada',
    'Gracia',
    'Arc de Triumph',
    'Eixample',
    'HQ'
  ];

  return (
    <div className="max-w-4xl flex flex-col gap-8 mt-2 animate-in fade-in slide-in-from-right-4 duration-500 pb-10">
      <div className="flex items-center justify-between pb-4 border-b border-gray-100">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Reputation & Reviews</h2>
          <p className="text-sm text-gray-500 font-medium mt-1">Manage customer feedback across all platforms.</p>
        </div>
        
        <div className="relative z-10">
          <button 
            onClick={() => setIsLocationOpen(!isLocationOpen)}
            className="flex items-center gap-1.5 px-3 h-[38px] rounded-xl border text-[13px] font-bold transition-colors cursor-pointer bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
          >
            <MapPin size={14} />
            {activeLocation}
            <ChevronDown size={14} className="text-gray-400" />
          </button>

          {isLocationOpen && (
            <>
              <div 
                className="fixed inset-0 z-10"
                onClick={() => setIsLocationOpen(false)}
              />
              <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl z-50 w-[200px] py-1 animate-in fade-in slide-in-from-top-2 duration-150">
                {LOCATIONS.map(loc => (
                  <button
                    key={loc}
                    onClick={() => {
                      setActiveLocation(loc);
                      setIsLocationOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-[13px] font-bold text-gray-700 hover:bg-gray-50 flex items-center justify-between group cursor-pointer"
                  >
                    {loc}
                    {activeLocation === loc && <CheckSquare size={14} className="text-corgi" />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="p-6 bg-white border border-gray-100 rounded-3xl shadow-sm flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <h3 className="font-bold text-gray-900 text-lg">Google Maps</h3>
              <p className="text-[13px] text-gray-500 font-medium mt-0.5">{activeLocation}</p>
            </div>
          </div>
          <div className="flex items-end gap-3 mt-2">
            <span className="text-4xl font-black text-gray-900">4.8</span>
            <div className="flex flex-col pb-1">
              <div className="flex text-yellow-400">
                {[1, 2, 3, 4, 5].map(i => <Star key={i} size={14} fill="currentColor" />)}
              </div>
              <span className="text-[12px] font-medium text-gray-500 mt-1">Based on 1,248 reviews</span>
            </div>
          </div>
        </div>

        <div className="p-6 bg-white border border-gray-100 rounded-3xl shadow-sm flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <h3 className="font-bold text-gray-900 text-lg">TripAdvisor</h3>
              <p className="text-[13px] text-gray-500 font-medium mt-0.5">{activeLocation}</p>
            </div>
          </div>
          <div className="flex items-end gap-3 mt-2">
            <span className="text-4xl font-black text-gray-900">4.6</span>
            <div className="flex flex-col pb-1">
              <div className="flex text-yellow-400">
                {[1, 2, 3, 4].map(i => <Star key={i} size={14} fill="currentColor" />)}
                <Star size={14} className="text-gray-300" />
              </div>
              <span className="text-[12px] font-medium text-gray-500 mt-1">Based on 342 reviews</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-6 mt-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">Recent Reviews</h3>
          <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-xl border border-gray-100">
            {(['all', 'google', 'tripadvisor'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setVisibleCount(15);
                }}
                className={`px-4 py-1.5 rounded-lg text-[13px] font-bold transition-all cursor-pointer ${
                  activeTab === tab ? 'bg-white text-gray-900 shadow-sm border border-gray-200/50' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab === 'all' ? 'All' : tab === 'google' ? 'Google Maps' : 'TripAdvisor'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {MOCK_REVIEWS
            .filter(r => activeTab === 'all' || r.platform.toLowerCase() === activeTab)
            .slice(0, visibleCount)
            .map(review => (
            <div key={review.id} className="p-5 bg-white border border-gray-100 rounded-2xl shadow-sm flex flex-col gap-3">
              <div className="flex justify-between items-start">
                <div className="flex flex-col">
                  <span className="font-bold text-gray-900 text-[15px]">{review.author}</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[12px] text-gray-500 font-medium">{review.platform}</span>
                    <span className="text-gray-300">•</span>
                    <span className="text-[12px] text-gray-500 font-medium">{review.date}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex text-yellow-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={14} fill={i < review.rating ? "currentColor" : "none"} className={i < review.rating ? "" : "text-gray-300"} />
                    ))}
                  </div>
                </div>
              </div>
              
              <p className="text-[14px] text-gray-700 leading-relaxed font-medium">
                "{review.text}"
              </p>
            </div>
          ))}
        </div>

        {visibleCount < MOCK_REVIEWS.filter(r => activeTab === 'all' || r.platform.toLowerCase() === activeTab).length && (
          <div className="flex justify-center mt-2">
            <button
              onClick={() => setVisibleCount(prev => prev + 15)}
              className="px-6 py-2.5 bg-gray-50 border border-gray-200 text-gray-700 text-[13px] font-bold rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
            >
              Load More
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
