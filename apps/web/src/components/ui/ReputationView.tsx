'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Star, CheckCircle2, MapPin, ChevronDown, CheckSquare, MessageSquare, Loader2 } from 'lucide-react';
import {
  getReviewsAsync,
  replyToReviewAsync,
  formatReviewDate,
  sourceLabel,
  type CustomerReview,
  type ReviewSummary,
  ReputationApiError,
} from '@/lib/reputation';
import type { ReviewSource } from '@/lib/reputation-validation';
import { getLocationsCachedAsync, type LocationSummary } from '@/lib/locations';

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex text-yellow-400">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          size={14}
          fill={i < rating ? 'currentColor' : 'none'}
          className={i < rating ? '' : 'text-gray-300'}
        />
      ))}
    </div>
  );
}

function SummaryCard({
  title,
  summary,
  location,
}: {
  title: string;
  summary: ReviewSummary | undefined;
  location: string;
}) {
  const avg = summary?.averageRating ?? 0;
  const total = summary?.totalReviews ?? 0;
  const fullStars = Math.floor(avg);
  const hasHalf = avg - fullStars >= 0.3;

  return (
    <div className="p-6 bg-white border border-gray-100 rounded-3xl shadow-sm flex flex-col gap-4">
      <div className="flex flex-col">
        <h3 className="font-bold text-gray-900 text-lg">{title}</h3>
        <p className="text-[13px] text-gray-500 font-medium mt-0.5">{location}</p>
      </div>
      <div className="flex items-end gap-3 mt-2">
        <span className="text-4xl font-black text-gray-900">{total > 0 ? avg.toFixed(1) : '—'}</span>
        <div className="flex flex-col pb-1">
          <div className="flex text-yellow-400">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star
                key={i}
                size={14}
                fill={i <= fullStars || (i === fullStars + 1 && hasHalf) ? 'currentColor' : 'none'}
                className={i <= fullStars || (i === fullStars + 1 && hasHalf) ? '' : 'text-gray-300'}
              />
            ))}
          </div>
          <span className="text-[12px] font-medium text-gray-500 mt-1">
            {total > 0 ? `Based on ${total} reviews` : 'No reviews yet'}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function ReputationView() {
  const [activeTab, setActiveTab] = useState<'all' | 'google' | 'tripadvisor'>('all');
  const [visibleCount, setVisibleCount] = useState(15);
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [activeLocationId, setActiveLocationId] = useState<string>('all');
  const [locations, setLocations] = useState<LocationSummary[]>([]);
  const [reviews, setReviews] = useState<CustomerReview[]>([]);
  const [summaries, setSummaries] = useState<ReviewSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);

  const sourceFilter: ReviewSource | undefined =
    activeTab === 'google' ? 'GOOGLE' : activeTab === 'tripadvisor' ? 'TRIPADVISOR' : undefined;

  const activeLocationLabel =
    activeLocationId === 'all'
      ? 'All Locations'
      : locations.find((loc) => loc.id === activeLocationId)?.name ?? 'All Locations';

  useEffect(() => {
    getLocationsCachedAsync()
      .then(setLocations)
      .catch(console.error);
  }, []);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const page = await getReviewsAsync({
        source: sourceFilter,
        locationId: activeLocationId === 'all' ? undefined : activeLocationId,
        limit: 100,
      });
      setReviews(page.items);
      setSummaries(page.summaries);
      setTotal(page.total);
    } catch (e) {
      setError(e instanceof ReputationApiError ? e.message : 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  }, [sourceFilter, activeLocationId]);

  useEffect(() => {
    load().catch(console.error);
  }, [load]);

  const googleSummary = summaries.find((s) => s.source === 'GOOGLE');
  const tripSummary = summaries.find((s) => s.source === 'TRIPADVISOR');

  const filtered = reviews.filter((r) => {
    if (activeTab === 'google') return r.source === 'GOOGLE';
    if (activeTab === 'tripadvisor') return r.source === 'TRIPADVISOR';
    return true;
  });

  const visible = filtered.slice(0, visibleCount);

  async function handleReply(reviewId: string) {
    setReplyError(null);
    setSubmitting(true);
    try {
      const updated = await replyToReviewAsync(reviewId, replyText);
      setReviews((prev) => prev.map((r) => (r.id === reviewId ? updated : r)));
      setReplyingId(null);
      setReplyText('');
      await load();
    } catch (e) {
      setReplyError(e instanceof ReputationApiError ? e.message : 'Failed to post reply');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      data-testid="reputation-view"
      className="max-w-4xl flex flex-col gap-8 mt-2 animate-in fade-in slide-in-from-right-4 duration-500 pb-10"
    >
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
            {activeLocationLabel}
            <ChevronDown size={14} className="text-gray-400" />
          </button>

          {isLocationOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setIsLocationOpen(false)} />
              <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl z-50 w-[200px] py-1 animate-in fade-in slide-in-from-top-2 duration-150">
                <button
                  onClick={() => {
                    setActiveLocationId('all');
                    setIsLocationOpen(false);
                    setVisibleCount(15);
                  }}
                  className="w-full text-left px-4 py-2 text-[13px] font-bold text-gray-700 hover:bg-gray-50 flex items-center justify-between group cursor-pointer"
                >
                  All Locations
                  {activeLocationId === 'all' && <CheckSquare size={14} className="text-corgi" />}
                </button>
                {locations.map((loc) => (
                  <button
                    key={loc.id}
                    onClick={() => {
                      setActiveLocationId(loc.id);
                      setIsLocationOpen(false);
                      setVisibleCount(15);
                    }}
                    className="w-full text-left px-4 py-2 text-[13px] font-bold text-gray-700 hover:bg-gray-50 flex items-center justify-between group cursor-pointer"
                  >
                    {loc.name}
                    {activeLocationId === loc.id && <CheckSquare size={14} className="text-corgi" />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700 font-medium">{error}</div>
      )}

      <div className="grid grid-cols-2 gap-6">
        <SummaryCard title="Google Maps" summary={googleSummary} location={activeLocationLabel} />
        <SummaryCard title="TripAdvisor" summary={tripSummary} location={activeLocationLabel} />
      </div>

      <div className="flex flex-col gap-6 mt-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">
            Recent Reviews {total > 0 && <span className="text-gray-400 font-medium text-sm">({total})</span>}
          </h3>
          <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-xl border border-gray-100">
            {(['all', 'google', 'tripadvisor'] as const).map((tab) => (
              <button
                key={tab}
                data-testid={`reputation-tab-${tab}`}
                onClick={() => {
                  setActiveTab(tab);
                  setVisibleCount(15);
                }}
                className={`px-4 py-1.5 rounded-lg text-[13px] font-bold transition-all cursor-pointer ${
                  activeTab === tab
                    ? 'bg-white text-gray-900 shadow-sm border border-gray-200/50'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab === 'all' ? 'All' : tab === 'google' ? 'Google Maps' : 'TripAdvisor'}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-gray-400">
            <Loader2 size={24} className="animate-spin mr-2" />
            Loading reviews…
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {visible.map((review) => (
              <div
                key={review.id}
                data-testid={`review-row-${review.id}`}
                className="p-5 bg-white border border-gray-100 rounded-2xl shadow-sm flex flex-col gap-3"
              >
                <div className="flex justify-between items-start">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900 text-[15px]">{review.authorName}</span>
                      {review.status === 'replied' && (
                        <span
                          data-testid={`review-replied-badge-${review.id}`}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-[11px] font-bold border border-green-100"
                        >
                          <CheckCircle2 size={12} />
                          Replied
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[12px] text-gray-500 font-medium">{sourceLabel(review.source)}</span>
                      <span className="text-gray-300">•</span>
                      <span className="text-[12px] text-gray-500 font-medium">
                        {formatReviewDate(review.reviewDate)}
                      </span>
                    </div>
                  </div>
                  <Stars rating={review.rating} />
                </div>

                {review.comment && (
                  <p className="text-[14px] text-gray-700 leading-relaxed font-medium">&ldquo;{review.comment}&rdquo;</p>
                )}

                {review.replyText && (
                  <div className="pl-4 border-l-2 border-corgi/30 bg-gray-50/80 rounded-r-xl py-2 pr-3">
                    <p className="text-[12px] font-bold text-gray-500 mb-1">Your reply</p>
                    <p className="text-[13px] text-gray-700">{review.replyText}</p>
                  </div>
                )}

                {review.status === 'new' && replyingId !== review.id && (
                  <button
                    data-testid={`review-reply-btn-${review.id}`}
                    onClick={() => {
                      setReplyingId(review.id);
                      setReplyText('');
                      setReplyError(null);
                    }}
                    className="self-start flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-bold text-corgi hover:bg-corgi/5 rounded-lg transition-colors cursor-pointer"
                  >
                    <MessageSquare size={14} />
                    Reply
                  </button>
                )}

                {replyingId === review.id && (
                  <div className="flex flex-col gap-2 mt-1" data-testid={`review-reply-form-${review.id}`}>
                    <textarea
                      data-testid={`review-reply-input-${review.id}`}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Write a professional reply…"
                      rows={3}
                      maxLength={1000}
                      className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-corgi/20"
                    />
                    {replyError && <p className="text-[12px] text-red-600 font-medium">{replyError}</p>}
                    <div className="flex gap-2">
                      <button
                        data-testid={`review-reply-submit-${review.id}`}
                        disabled={submitting || replyText.trim().length === 0}
                        onClick={() => handleReply(review.id)}
                        className="px-4 py-2 bg-corgi text-white text-[13px] font-bold rounded-xl hover:bg-corgi/90 disabled:opacity-50 cursor-pointer"
                      >
                        {submitting ? 'Sending…' : 'Send Reply'}
                      </button>
                      <button
                        onClick={() => {
                          setReplyingId(null);
                          setReplyText('');
                          setReplyError(null);
                        }}
                        className="px-4 py-2 text-[13px] font-bold text-gray-500 hover:bg-gray-50 rounded-xl cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {visible.length === 0 && !loading && (
              <p className="text-center text-gray-400 text-sm py-8">No reviews for this filter.</p>
            )}
          </div>
        )}

        {visibleCount < filtered.length && (
          <div className="flex justify-center mt-2">
            <button
              onClick={() => setVisibleCount((prev) => prev + 15)}
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
