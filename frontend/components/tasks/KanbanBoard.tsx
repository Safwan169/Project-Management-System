'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, Calendar, ListChecks } from 'lucide-react';
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from '@hello-pangea/dnd';
import type { Task, TaskStatus, TaskPriority, User } from '@/types';
import { updateTask } from '@/lib/tasks-api';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { AvatarStack } from '@/components/ui/Avatar';

const columns: { id: TaskStatus; title: string; border: string; dot: string }[] = [
  { id: 'todo', title: 'To Do', border: 'border-t-slate-400', dot: 'bg-slate-400' },
  { id: 'inprogress', title: 'In Progress', border: 'border-t-blue-500', dot: 'bg-blue-500' },
  { id: 'review', title: 'Review', border: 'border-t-amber-500', dot: 'bg-amber-500' },
  { id: 'done', title: 'Done', border: 'border-t-emerald-500', dot: 'bg-emerald-500' },
];

const priorityDot: Record<TaskPriority, string> = {
  low: 'bg-slate-400',
  medium: 'bg-blue-500',
  high: 'bg-amber-500',
  critical: 'bg-red-500',
};

interface KanbanBoardProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onAddInColumn?: (status: TaskStatus) => void;
  /** If true, dropping into Done is blocked client-side with a toast. */
  blockSelfApprove?: boolean;
}

export function KanbanBoard({
  tasks,
  onTaskClick,
  onAddInColumn,
  blockSelfApprove = false,
}: KanbanBoardProps) {
  const queryClient = useQueryClient();
  // Local copy so we can apply optimistic moves before the server confirms.
  const [optimistic, setOptimistic] = useState<Record<string, TaskStatus>>({});

  const grouped = useMemo(() => {
    const map: Record<TaskStatus, Task[]> = {
      todo: [],
      inprogress: [],
      review: [],
      done: [],
    };
    for (const task of tasks) {
      const status = optimistic[task._id] ?? task.status;
      map[status].push(task);
    }
    return map;
  }, [tasks, optimistic]);

  const mutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TaskStatus }) =>
      updateTask(id, { status }),
    onSuccess: (updated, { id, status }) => {
      // Backend may force review when moving to done; if so, show the toast.
      if (status === 'done' && updated.status === 'review') {
        toast('Sent to review — a manager must approve "done".');
      }
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setOptimistic((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    },
    onError: (_err, { id }) => {
      setOptimistic((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    },
  });

  const handleDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId) return;
    const nextStatus = destination.droppableId as TaskStatus;
    if (blockSelfApprove && nextStatus === 'done') {
      toast.error('A manager must approve "done" — move to Review first.');
      return;
    }
    setOptimistic((prev) => ({ ...prev, [draggableId]: nextStatus }));
    mutation.mutate({ id: draggableId, status: nextStatus });
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {columns.map((col) => (
          <Droppable droppableId={col.id} key={col.id}>
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={cn(
                  'flex min-h-[400px] flex-col rounded-xl border border-t-4 border-surface-border bg-surface-subtle/40 transition-colors',
                  col.border,
                  snapshot.isDraggingOver && 'bg-primary-50/60',
                )}
              >
                <div className="flex items-center justify-between px-3 py-3">
                  <div className="flex items-center gap-2">
                    <span className={cn('h-2 w-2 rounded-full', col.dot)} />
                    <h3 className="text-sm font-semibold text-foreground">{col.title}</h3>
                    <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-muted">
                      {grouped[col.id].length}
                    </span>
                  </div>
                </div>

                <div className="flex-1 space-y-2 px-2 pb-2">
                  {grouped[col.id].map((task, index) => (
                    <Draggable draggableId={task._id} index={index} key={task._id}>
                      {(dragProvided, dragSnapshot) => (
                        <div
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                          {...dragProvided.dragHandleProps}
                          onClick={() => onTaskClick(task)}
                          className={cn(
                            'cursor-pointer rounded-lg border border-surface-border bg-white p-3 text-left shadow-sm transition-shadow hover:shadow-md',
                            dragSnapshot.isDragging && 'shadow-lg ring-2 ring-primary-300',
                          )}
                        >
                          <TaskCardContent task={task} />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>

                {onAddInColumn && (
                  <button
                    onClick={() => onAddInColumn(col.id)}
                    className="mx-2 mb-2 flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-surface-border bg-white/60 px-3 py-2 text-xs font-medium text-muted transition-colors hover:bg-white hover:text-foreground"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add task
                  </button>
                )}
              </div>
            )}
          </Droppable>
        ))}
      </div>
    </DragDropContext>
  );
}

function TaskCardContent({ task }: { task: Task }) {
  const assignees = (task.assignees as User[]).filter((a) => a && typeof a === 'object');
  const overdue = task.dueDate && task.status !== 'done' && new Date(task.dueDate) < new Date();
  const completedSubtasks = task.subtasks?.filter((s) => s.completed).length ?? 0;
  const totalSubtasks = task.subtasks?.length ?? 0;

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-2">
        <span
          className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', priorityDot[task.priority])}
          title={`Priority: ${task.priority}`}
        />
        <p className="line-clamp-2 text-sm font-medium text-foreground">{task.title}</p>
      </div>

      {task.tags && task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {task.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded bg-surface-subtle px-1.5 py-0.5 text-[10px] font-medium text-muted"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 text-xs text-muted">
        <div className="flex items-center gap-3">
          {totalSubtasks > 0 && (
            <span className="inline-flex items-center gap-1">
              <ListChecks className="h-3 w-3" />
              {completedSubtasks}/{totalSubtasks}
            </span>
          )}
          {task.dueDate && (
            <span
              className={cn(
                'inline-flex items-center gap-1',
                overdue && 'font-medium text-red-600',
              )}
            >
              <Calendar className="h-3 w-3" />
              {formatDate(task.dueDate)}
            </span>
          )}
        </div>

        {assignees.length > 0 && (
          <AvatarStack names={assignees.map((a) => a.name)} max={3} size="sm" />
        )}
      </div>
    </div>
  );
}
