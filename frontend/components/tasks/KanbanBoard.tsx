'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, Calendar, MessageSquare, Paperclip, CheckSquare } from 'lucide-react';
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from '@hello-pangea/dnd';
import type { Task, TaskStatus, TaskPriority, User } from '@/types';
import { reorderTasks } from '@/lib/tasks-api';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { AvatarStack } from '@/components/ui/Avatar';

const columns: { id: TaskStatus; title: string; accent: string }[] = [
  { id: 'todo', title: 'To do', accent: 'bg-slate-500' },
  { id: 'inprogress', title: 'In progress', accent: 'bg-blue-500' },
  { id: 'review', title: 'Review', accent: 'bg-amber-500' },
  { id: 'done', title: 'Done', accent: 'bg-emerald-500' },
];

const priorityStrip: Record<TaskPriority, string> = {
  low: 'bg-slate-300',
  medium: 'bg-blue-400',
  high: 'bg-amber-500',
  critical: 'bg-red-500',
};

type BoardState = Record<TaskStatus, Task[]>;

function buildBoard(tasks: Task[]): BoardState {
  const map: BoardState = { todo: [], inprogress: [], review: [], done: [] };
  for (const t of tasks) map[t.status].push(t);
  // Sort each column by order so the server's ordering wins on first paint.
  (Object.keys(map) as TaskStatus[]).forEach((k) =>
    map[k].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
  );
  return map;
}

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
  // Local board state so DnD updates feel instant; resynced from props.
  const [board, setBoard] = useState<BoardState>(() => buildBoard(tasks));

  useEffect(() => {
    setBoard(buildBoard(tasks));
  }, [tasks]);

  const mutation = useMutation({
    mutationFn: reorderTasks,
    onSuccess: () => {
      // Refetch so any server-side adjustments (e.g. review-guard) show through.
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
    },
    onError: () => {
      // Roll back to the server's view on failure.
      setBoard(buildBoard(tasks));
      toast.error('Could not save the new order. Try again.');
    },
  });

  const handleDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    const from = source.droppableId as TaskStatus;
    const to = destination.droppableId as TaskStatus;

    if (blockSelfApprove && to === 'done') {
      toast.error('A manager must approve "done" — move to Review first.');
      return;
    }

    // Compute the new board synchronously so we can derive items + toast once.
    const next: BoardState = {
      todo: [...board.todo],
      inprogress: [...board.inprogress],
      review: [...board.review],
      done: [...board.done],
    };
    const [moved] = next[from].splice(source.index, 1);
    if (!moved) return;
    next[to].splice(destination.index, 0, { ...moved, status: to });

    const items: { id: string; status: TaskStatus; order: number }[] = [];
    const cols: TaskStatus[] = from === to ? [to] : [from, to];
    for (const col of cols) {
      next[col] = next[col].map((t, i) => ({ ...t, order: i, status: col }));
      next[col].forEach((t, i) => items.push({ id: t._id, status: col, order: i }));
    }

    setBoard(next);
    mutation.mutate(items);

    if (from !== to && to === 'done') {
      toast.success(blockSelfApprove ? 'Sent to review' : 'Marked as done');
    }
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0 lg:grid lg:grid-cols-2 lg:overflow-visible xl:grid-cols-4">
        {columns.map((col) => (
          <Droppable droppableId={col.id} key={col.id}>
            {(provided, snapshot) => (
              <div
                className={cn(
                  'flex w-[280px] shrink-0 snap-start flex-col rounded-xl bg-slate-100/80 transition-colors lg:w-auto lg:shrink',
                  snapshot.isDraggingOver && 'bg-primary-50',
                )}
              >
                {/* Column header — Trello-style: title + count, nothing fancy. */}
                <div className="flex items-center justify-between gap-2 px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className={cn('h-2 w-2 rounded-full', col.accent)} />
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                      {col.title}
                    </h3>
                    <span className="text-xs font-medium text-slate-400">
                      {board[col.id].length}
                    </span>
                  </div>
                </div>

                {/* Cards container */}
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="flex flex-1 flex-col gap-2 px-2 pb-2"
                >
                  {board[col.id].length === 0 && !snapshot.isDraggingOver && (
                    <div className="rounded-lg border border-dashed border-slate-200 px-3 py-6 text-center text-[11px] text-slate-400">
                      Drop tasks here
                    </div>
                  )}

                  {board[col.id].map((task, index) => (
                    <Draggable draggableId={task._id} index={index} key={task._id}>
                      {(dragProvided, dragSnapshot) => (
                        <div
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                          {...dragProvided.dragHandleProps}
                          onClick={() => onTaskClick(task)}
                          className={cn(
                            'group relative cursor-pointer overflow-hidden rounded-md bg-white text-left shadow-sm ring-1 ring-slate-200/80 transition-shadow hover:shadow-md',
                            dragSnapshot.isDragging && 'shadow-lg ring-primary-300',
                          )}
                        >
                          {/* Priority strip on the left edge, Trello-card-cover style. */}
                          <span
                            className={cn(
                              'absolute inset-y-0 left-0 w-1',
                              priorityStrip[task.priority],
                            )}
                          />
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
                    className="mx-2 mb-2 flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-200/60 hover:text-slate-700"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add a card
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
  const subtasksDone = task.subtasks?.filter((s) => s.completed).length ?? 0;
  const subtasksTotal = task.subtasks?.length ?? 0;
  const commentCount = task.comments?.length ?? 0;
  const attachmentCount = task.attachments?.length ?? 0;

  return (
    <div className="pl-3 pr-2.5 py-2">
      {task.tags && task.tags.length > 0 && (
        <div className="mb-1.5 flex flex-wrap gap-1">
          {task.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded-sm bg-slate-100 px-1.5 py-px text-[10px] font-medium text-slate-600"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <p className="text-[13px] font-medium leading-snug text-slate-800">{task.title}</p>

      {(task.dueDate ||
        subtasksTotal > 0 ||
        commentCount > 0 ||
        attachmentCount > 0 ||
        assignees.length > 0) && (
        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            {task.dueDate && (
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded px-1.5 py-0.5',
                  overdue ? 'bg-red-50 text-red-600' : 'bg-slate-100',
                )}
              >
                <Calendar className="h-3 w-3" />
                {formatDate(task.dueDate)}
              </span>
            )}
            {subtasksTotal > 0 && (
              <span className="inline-flex items-center gap-1">
                <CheckSquare className="h-3 w-3" />
                {subtasksDone}/{subtasksTotal}
              </span>
            )}
            {commentCount > 0 && (
              <span className="inline-flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                {commentCount}
              </span>
            )}
            {attachmentCount > 0 && (
              <span className="inline-flex items-center gap-1">
                <Paperclip className="h-3 w-3" />
                {attachmentCount}
              </span>
            )}
          </div>
          {assignees.length > 0 && (
            <AvatarStack names={assignees.map((a) => a.name)} max={3} size="sm" />
          )}
        </div>
      )}
    </div>
  );
}
