import { prisma } from '@/lib/db';
import { isBarItem } from '@/lib/orders-board';

export interface KitchenBarAnalyticsFilters {
  locationId: string;
  startDate: Date;
  endDate: Date;
}

function avgMs(samples: number[]) {
  if (samples.length === 0) return 0;
  return Math.round(samples.reduce((a, b) => a + b, 0) / samples.length);
}

export class KitchenBarAnalyticsService {
  async getAnalytics(filters: KitchenBarAnalyticsFilters) {
    const items = await prisma.orderItem.findMany({
      where: {
        acceptedAt: { gte: filters.startDate, lte: filters.endDate },
        order: { locationId: filters.locationId },
      },
      include: { order: { select: { source: true, status: true } } },
    });

    const kitchenTimes: number[] = [];
    const barTimes: number[] = [];
    const byItemKitchen = new Map<string, number[]>();
    const byItemBar = new Map<string, number[]>();

    for (const item of items) {
      if (!item.acceptedAt || !item.readyAt) continue;
      const ms = item.readyAt.getTime() - item.acceptedAt.getTime();
      const bar = isBarItem(item.name);
      if (bar) {
        barTimes.push(ms);
        const arr = byItemBar.get(item.name) ?? [];
        arr.push(ms);
        byItemBar.set(item.name, arr);
      } else {
        kitchenTimes.push(ms);
        const arr = byItemKitchen.get(item.name) ?? [];
        arr.push(ms);
        byItemKitchen.set(item.name, arr);
      }
    }

    const rankItems = (map: Map<string, number[]>) =>
      [...map.entries()]
        .map(([name, samples]) => ({ name, avgMs: avgMs(samples), count: samples.length }))
        .sort((a, b) => b.avgMs - a.avgMs);

    const kitchenRanked = rankItems(byItemKitchen);
    const barRanked = rankItems(byItemBar);

    return {
      period: { start: filters.startDate, end: filters.endDate },
      overall: {
        avgPrepMsKitchen: avgMs(kitchenTimes),
        avgPrepMsBar: avgMs(barTimes),
        sampleCountKitchen: kitchenTimes.length,
        sampleCountBar: barTimes.length,
      },
      kitchen: {
        avgPrepMs: avgMs(kitchenTimes),
        slowest: kitchenRanked.slice(0, 10),
        fastest: [...kitchenRanked].sort((a, b) => a.avgMs - b.avgMs).slice(0, 10),
      },
      bar: {
        avgPrepMs: avgMs(barTimes),
        slowest: barRanked.slice(0, 10),
        fastest: [...barRanked].sort((a, b) => a.avgMs - b.avgMs).slice(0, 10),
      },
    };
  }
}

export const kitchenBarAnalyticsService = new KitchenBarAnalyticsService();
