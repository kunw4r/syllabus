'use client';

import ScrollRow from '@/components/ui/ScrollRow';
import MediaCard from '@/components/ui/MediaCard';
import type { RecommendationRow as RecommendationRowType } from '@/lib/services/recommendations';

interface RecommendationRowProps {
  row: RecommendationRowType;
}

export default function RecommendationRow({ row }: RecommendationRowProps) {
  if (!row.items || row.items.length === 0) return null;

  return (
    <ScrollRow
      title={
        <span className="flex items-center gap-2">
          <span>{row.icon}</span>
          <span>{row.title}</span>
        </span>
      }
    >
      {row.items.map((item: any) => (
        <MediaCard
          key={`${item.media_type || 'movie'}-${item.id}`}
          item={item}
          mediaType={item.media_type === 'tv' ? 'tv' : 'movie'}
        />
      ))}
    </ScrollRow>
  );
}
