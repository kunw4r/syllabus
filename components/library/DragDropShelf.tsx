'use client';

import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  TouchSensor,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, useSortable, rectSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Clock, Eye, CheckCircle2, Star } from 'lucide-react';

interface DragDropShelfProps {
  items: any[];
  onStatusChange: (id: string, newStatus: string) => Promise<void>;
  onCardClick: (item: any) => void;
}

const STATUS_CONFIG = {
  want: { label: 'Wishlist', icon: Clock, color: 'border-purple-500/30 bg-purple-500/5', accent: 'text-purple-400' },
  watching: { label: 'In Progress', icon: Eye, color: 'border-blue-500/30 bg-blue-500/5', accent: 'text-blue-400' },
  finished: { label: 'Finished', icon: CheckCircle2, color: 'border-green-500/30 bg-green-500/5', accent: 'text-green-400' },
};

function SortableCard({ item, onClick }: { item: any; onClick: () => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="w-[100px] sm:w-[120px] cursor-grab active:cursor-grabbing shrink-0"
    >
      <div className="aspect-[2/3] rounded-lg overflow-hidden ring-1 ring-white/10 hover:ring-accent/50 transition-all">
        {item.poster_url ? (
          <img src={item.poster_url} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full bg-dark-700 flex items-center justify-center text-white/10 text-2xl">
            {item.media_type === 'book' ? '\u{1F4DA}' : '\u{1F3AC}'}
          </div>
        )}
      </div>
      <p className="text-[10px] text-white/50 truncate mt-1">{item.title}</p>
    </div>
  );
}

function CardOverlay({ item }: { item: any }) {
  return (
    <div className="w-[100px] sm:w-[120px] opacity-90 rotate-3 scale-105">
      <div className="aspect-[2/3] rounded-lg overflow-hidden ring-2 ring-accent shadow-2xl shadow-accent/30">
        {item.poster_url ? (
          <img src={item.poster_url} alt={item.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-dark-700 flex items-center justify-center text-white/10 text-2xl">
            {item.media_type === 'book' ? '\u{1F4DA}' : '\u{1F3AC}'}
          </div>
        )}
      </div>
    </div>
  );
}

export default function DragDropShelf({ items, onStatusChange, onCardClick }: DragDropShelfProps) {
  const [activeItem, setActiveItem] = useState<any>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
  );

  const zones = {
    want: items.filter((i) => i.status === 'want'),
    watching: items.filter((i) => i.status === 'watching'),
    finished: items.filter((i) => i.status === 'finished'),
  };

  const handleDragStart = (event: DragStartEvent) => {
    const item = items.find((i) => i.id === event.active.id);
    setActiveItem(item);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveItem(null);

    if (!over) return;

    const draggedItem = items.find((i) => i.id === active.id);
    if (!draggedItem) return;

    // Determine which zone was dropped into
    const overId = String(over.id);
    let targetStatus: string | null = null;

    if (['want', 'watching', 'finished'].includes(overId)) {
      targetStatus = overId;
    } else {
      // Dropped on another card — find its status
      const overItem = items.find((i) => i.id === overId);
      if (overItem) targetStatus = overItem.status;
    }

    if (targetStatus && targetStatus !== draggedItem.status) {
      onStatusChange(draggedItem.id, targetStatus);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(Object.entries(STATUS_CONFIG) as [string, typeof STATUS_CONFIG.want][]).map(([status, config]) => {
          const zoneItems = zones[status as keyof typeof zones];
          return (
            <div
              key={status}
              id={status}
              className={`rounded-2xl border-2 border-dashed p-4 min-h-[200px] transition-colors ${config.color} ${
                activeItem && activeItem.status !== status ? 'border-accent/40 bg-accent/5' : ''
              }`}
            >
              <div className="flex items-center gap-2 mb-3">
                <config.icon size={16} className={config.accent} />
                <h3 className={`text-sm font-semibold ${config.accent}`}>{config.label}</h3>
                <span className="text-xs text-white/20 ml-auto">{zoneItems.length}</span>
              </div>
              <SortableContext items={zoneItems.map((i) => i.id)} strategy={rectSortingStrategy}>
                <div className="flex flex-wrap gap-2">
                  {zoneItems.map((item) => (
                    <SortableCard key={item.id} item={item} onClick={() => onCardClick(item)} />
                  ))}
                  {zoneItems.length === 0 && (
                    <p className="text-xs text-white/20 py-8 w-full text-center">Drop items here</p>
                  )}
                </div>
              </SortableContext>
            </div>
          );
        })}
      </div>

      <DragOverlay>
        {activeItem ? <CardOverlay item={activeItem} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
