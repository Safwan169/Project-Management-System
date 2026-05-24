'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { GripVertical } from 'lucide-react';
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from '@hello-pangea/dnd';
import type { Project, Sprint } from '@/types';
import { reorderSprints } from '@/lib/sprints-api';
import { SprintCard } from './SprintCard';

interface SprintReorderListProps {
  project: Project;
  sprints: Sprint[];
  canManage: boolean;
  onEdit: (sprint: Sprint) => void;
  onDelete: (sprint: Sprint) => void;
}

export function SprintReorderList({
  project,
  sprints,
  canManage,
  onEdit,
  onDelete,
}: SprintReorderListProps) {
  const queryClient = useQueryClient();
  const [ordered, setOrdered] = useState(sprints);

  useEffect(() => {
    setOrdered(sprints);
  }, [sprints]);

  const mutation = useMutation({
    mutationFn: (items: { id: string; order: number }[]) =>
      reorderSprints(project._id, items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sprints', project._id] });
      toast.success('Sprint order updated');
    },
    onError: () => {
      setOrdered(sprints);
      toast.error('Could not reorder sprints');
    },
  });

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const from = result.source.index;
    const to = result.destination.index;
    if (from === to) return;

    const next = [...ordered];
    const [moved] = next.splice(from, 1);
    if (!moved) return;
    next.splice(to, 0, moved);
    setOrdered(next);

    mutation.mutate(next.map((s, i) => ({ id: s._id, order: i + 1 })));
  };

  if (!canManage) {
    return (
      <div className="space-y-2">
        {sprints.map((sprint) => (
          <SprintCard
            key={sprint._id}
            sprint={sprint}
            canManage={false}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    );
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="sprints">
        {(provided) => (
          <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
            {ordered.map((sprint, index) => (
              <Draggable key={sprint._id} draggableId={sprint._id} index={index}>
                {(dragProvided) => (
                  <div
                    ref={dragProvided.innerRef}
                    {...dragProvided.draggableProps}
                    className="flex items-stretch gap-1"
                  >
                    <button
                      type="button"
                      {...dragProvided.dragHandleProps}
                      className="flex shrink-0 items-center rounded-l-lg border border-r-0 border-surface-border bg-surface-subtle px-1 text-muted hover:text-foreground"
                      aria-label="Drag to reorder"
                    >
                      <GripVertical className="h-4 w-4" />
                    </button>
                    <div className="min-w-0 flex-1">
                      <SprintCard
                        sprint={sprint}
                        canManage
                        onEdit={onEdit}
                        onDelete={onDelete}
                      />
                    </div>
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}
