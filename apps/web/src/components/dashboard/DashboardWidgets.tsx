import React from 'react';
import { ChevronRight } from 'lucide-react';
import type { DashboardReport } from '@/lib/dashboard';
import { formatTimeAgo } from '@/lib/dashboard';
import type { DishAbcRow } from '@/lib/reports-financial';

type ShiftRosterProps = {
  roster?: DashboardReport['shiftRoster'];
};

export function ShiftRoster({ roster = [] }: ShiftRosterProps) {
  const display = roster.length > 0 ? roster : [];

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
        {display.length === 0 ? (
          <p className="text-sm text-gray-400">No shifts scheduled for today.</p>
        ) : (
          display.map((person) => (
            <div key={person.userId} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                      person.status === 'offline' ? 'bg-gray-100 text-gray-400' : 'bg-gray-900 text-white'
                    }`}
                  >
                    {person.avatarInitials ?? person.userName.slice(0, 2).toUpperCase()}
                  </div>
                  {person.status === 'active' && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white bg-[#111827]"></div>
                  )}
                </div>
                <div>
                  <div
                    className={`text-sm font-bold ${person.status === 'offline' ? 'text-gray-400' : 'text-gray-900'}`}
                  >
                    {person.userName}
                  </div>
                  <div className="text-xs font-medium text-gray-500">
                    {person.position ?? 'Staff'} · {person.startTime}–{person.endTime}
                  </div>
                </div>
              </div>
              {person.status === 'active' ? (
                <span className="text-xs font-bold text-gray-700 bg-gray-100 px-2.5 py-1 rounded-md">On Duty</span>
              ) : (
                <span className="text-xs font-medium text-gray-400">Scheduled</span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

type RecentReviewsProps = {
  reviews?: DashboardReport['recentReviews'];
};

function formatSource(source: string): string {
  if (source === 'GOOGLE') return 'Google';
  if (source === 'TRIPADVISOR') return 'TripAdvisor';
  if (source === 'YELP') return 'Yelp';
  return source.charAt(0) + source.slice(1).toLowerCase();
}

export function RecentReviews({ reviews = [] }: RecentReviewsProps) {
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
        {reviews.length === 0 ? (
          <p className="text-sm text-gray-400">No reviews yet.</p>
        ) : (
          reviews.map((review) => (
            <div
              key={review.id}
              className="flex flex-col gap-1.5 border-b border-gray-50 pb-4 last:border-0 last:pb-0"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-900">{review.authorName}</span>
                  <span className="text-xs font-medium text-gray-400">
                    {formatTimeAgo(new Date(review.reviewDate))}
                  </span>
                </div>
                <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">
                  {formatSource(review.source)}
                </span>
              </div>
              <div className="flex items-center gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <svg
                    key={i}
                    className={`w-3 h-3 ${i < review.rating ? 'text-yellow-400' : 'text-gray-200'}`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              {review.comment && (
                <p className="text-sm text-gray-600 leading-snug line-clamp-2">{review.comment}</p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const BAR_COLORS = ['bg-[#EE635E]', 'bg-[#FC8C86]', 'bg-gray-300', 'bg-gray-200', 'bg-gray-100'];

type CategoryBreakdownProps = {
  dishes?: DishAbcRow[];
};

export function CategoryBreakdown({ dishes = [] }: CategoryBreakdownProps) {
  const totalRevenue = dishes.reduce((s, d) => s + d.revenue, 0);
  const top = dishes.slice(0, 4).map((d) => ({
    id: d.name,
    name: d.name,
    revenue: d.revenue,
    percentage: totalRevenue > 0 ? Math.round((d.revenue / totalRevenue) * 100) : 0,
  }));

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
        {top.length === 0 ? (
          <p className="text-sm text-gray-400">No sales in this period.</p>
        ) : (
          top.map((category, index) => (
            <div key={category.id} className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-bold text-gray-900 truncate pr-2">{category.name}</span>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="font-medium text-gray-500">
                    €{category.revenue.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </span>
                  <span className="font-bold text-gray-900 w-9 text-right">{category.percentage}%</span>
                </div>
              </div>
              <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${BAR_COLORS[index % BAR_COLORS.length]}`}
                  style={{ width: `${category.percentage}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
