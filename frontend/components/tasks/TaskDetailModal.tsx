'use client';

import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Paperclip,
  Clock,
  MessageSquare,
  Activity,
  Pencil,
  Trash2,
  Upload,
  CheckSquare,
  Reply,
} from 'lucide-react';
import type { TaskComment, TaskStatus, User } from '@/types';
import {
  fetchTask,
  updateTask,
  uploadTaskAttachment,
  deleteTaskAttachment,
  addTaskComment,
  editTaskComment,
  deleteTaskComment,
  logTaskTime,
  updateSubtasks,
  patchTaskInCaches,
  invalidateTaskCaches,
} from '@/lib/tasks-api';
import { attachmentUrl } from '@/lib/media';
import { formatDate, formatHours } from '@/lib/format';
import { useAuth } from '@/store/authStore';
import { cn } from '@/lib/utils';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Spinner } from '@/components/ui/Spinner';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Avatar } from '@/components/ui/Avatar';
import { TaskFormModal } from './TaskFormModal';
import {
  statusOptionsForRole,
  resolveStatusUpdate,
  wasBlockedDoneAttempt,
} from '@/lib/task-status';

const statusLabel: Record<TaskStatus, string> = {
  todo: 'To Do',
  inprogress: 'In Progress',
  review: 'Review',
  done: 'Done',
};

interface TaskDetailModalProps {
  taskId: string | null;
  open: boolean;
  onClose: () => void;
}

export function TaskDetailModal({ taskId, open, onClose }: TaskDetailModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState('');
  const [timeHours, setTimeHours] = useState('');
  const [timeNote, setTimeNote] = useState('');
  const [newSubtask, setNewSubtask] = useState('');

  const canApprove = user?.role === 'admin' || user?.role === 'manager';
  const selectableStatuses = statusOptionsForRole(user?.role);

  const { data: task, isLoading, isError } = useQuery({
    queryKey: ['task', taskId],
    queryFn: () => fetchTask(taskId!),
    enabled: open && Boolean(taskId),
  });

  const invalidate = () => invalidateTaskCaches(queryClient, taskId ?? undefined);

  const statusMutation = useMutation({
    mutationFn: (requested: TaskStatus) => {
      const status = resolveStatusUpdate(requested, user?.role);
      return updateTask(taskId!, { status }).then((updated) => ({ updated, requested, status }));
    },
    onSuccess: ({ updated, requested, status }) => {
      patchTaskInCaches(queryClient, updated);
      if (wasBlockedDoneAttempt(requested, status, user?.role)) {
        toast('Sent to review — a manager must approve "done".');
      } else if (requested === 'done' && updated.status === 'review') {
        toast('Sent to review — a manager must approve "done".');
      } else {
        toast.success('Status updated');
      }
      invalidate();
    },
  });

  const handleStatusChange = (requested: TaskStatus) => {
    statusMutation.mutate(requested);
  };

  const commentMutation = useMutation({
    mutationFn: () => addTaskComment(taskId!, commentText.trim(), replyTo ?? undefined),
    onSuccess: () => {
      setCommentText('');
      setReplyTo(null);
      toast.success('Comment added');
      invalidate();
    },
  });

  const editCommentMutation = useMutation({
    mutationFn: () => editTaskComment(taskId!, editingCommentId!, editCommentText.trim()),
    onSuccess: () => {
      setEditingCommentId(null);
      setEditCommentText('');
      toast.success('Comment updated');
      invalidate();
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: string) => deleteTaskComment(taskId!, commentId),
    onSuccess: () => {
      toast.success('Comment deleted');
      invalidate();
    },
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadTaskAttachment(taskId!, file),
    onSuccess: () => {
      toast.success('File uploaded');
      invalidate();
    },
  });

  const deleteAttachmentMutation = useMutation({
    mutationFn: (attachmentId: string) => deleteTaskAttachment(taskId!, attachmentId),
    onSuccess: () => {
      toast.success('Attachment removed');
      invalidate();
    },
  });

  const timeMutation = useMutation({
    mutationFn: () =>
      logTaskTime(taskId!, {
        hours: Number(timeHours),
        note: timeNote.trim() || undefined,
      }),
    onSuccess: () => {
      setTimeHours('');
      setTimeNote('');
      toast.success('Time logged');
      invalidate();
    },
  });

  const subtaskMutation = useMutation({
    mutationFn: (batch: Parameters<typeof updateSubtasks>[1]) =>
      updateSubtasks(taskId!, batch),
    onSuccess: () => invalidate(),
  });

  const subtasksDone = task?.subtasks?.filter((s) => s.completed).length ?? 0;
  const subtasksTotal = task?.subtasks?.length ?? 0;
  const totalHours =
    task?.timeLogs?.reduce((sum, log) => sum + (log.hours ?? 0), 0) ?? 0;

  const projectTitle =
    task && typeof task.project === 'object' ? task.project.title : undefined;
  const sprintLabel =
    task && typeof task.sprint === 'object'
      ? `Sprint #${task.sprint.sprintNumber}`
      : undefined;

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={task?.title ?? 'Task details'}
        size="3xl"
      >
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner size="lg" className="text-primary-600" />
          </div>
        ) : isError || !task ? (
          <p className="py-8 text-center text-sm text-muted">Could not load this task.</p>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge status={task.status}>{statusLabel[task.status]}</Badge>
                <Badge color="blue">{task.priority}</Badge>
                {projectTitle && (
                  <span className="text-xs text-muted">
                    {projectTitle}
                    {sprintLabel ? ` · ${sprintLabel}` : ''}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {!canApprove && task.status === 'done' ? (
                  <Badge status="done">{statusLabel.done}</Badge>
                ) : (
                  <select
                    value={task.status}
                    onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}
                    disabled={statusMutation.isPending}
                    className="h-9 rounded-lg border border-surface-border bg-white px-3 text-sm"
                  >
                    {selectableStatuses.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                )}
                <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </Button>
              </div>
            </div>

            {!canApprove && task.status === 'review' && (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Waiting for a manager to approve moving this task to Done.
              </p>
            )}

            {task.description && (
              <p className="whitespace-pre-wrap text-sm text-foreground">{task.description}</p>
            )}

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Meta label="Due date" value={formatDate(task.dueDate)} />
              <Meta
                label="Estimate"
                value={task.estimate ? `${task.estimate}h` : '—'}
              />
              <Meta label="Time logged" value={formatHours(totalHours)} />
              <Meta
                label="Assignees"
                value={
                  (task.assignees as User[])
                    .filter((a) => typeof a === 'object')
                    .map((a) => a.name)
                    .join(', ') || 'Unassigned'
                }
              />
            </div>

            <section>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <CheckSquare className="h-4 w-4" />
                  Subtasks
                  {subtasksTotal > 0 && (
                    <span className="text-xs font-normal text-muted">
                      ({subtasksDone}/{subtasksTotal})
                    </span>
                  )}
                </h3>
              </div>
              {subtasksTotal > 0 && (
                <ProgressBar
                  value={Math.round((subtasksDone / subtasksTotal) * 100)}
                  className="mb-3"
                />
              )}
              <ul className="space-y-2">
                {task.subtasks.map((sub) => (
                  <li key={sub._id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={sub.completed}
                      onChange={() =>
                        subtaskMutation.mutate({
                          toggle: [{ id: sub._id, completed: !sub.completed }],
                        })
                      }
                      className="h-4 w-4 rounded border-surface-border text-primary-600"
                    />
                    <span
                      className={cn(
                        'flex-1 text-sm',
                        sub.completed && 'text-muted line-through',
                      )}
                    >
                      {sub.title}
                    </span>
                    <button
                      type="button"
                      onClick={() => subtaskMutation.mutate({ remove: [sub._id] })}
                      className="rounded p-1 text-muted hover:bg-red-50 hover:text-red-600"
                      aria-label="Remove subtask"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
              <div className="mt-2 flex gap-2">
                <Input
                  placeholder="Add a subtask…"
                  value={newSubtask}
                  onChange={(e) => setNewSubtask(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newSubtask.trim()) {
                      subtaskMutation.mutate(
                        { add: [{ title: newSubtask.trim() }] },
                        {
                          onSuccess: () => {
                            setNewSubtask('');
                            toast.success('Subtask added');
                          },
                        },
                      );
                    }
                  }}
                />
                <Button
                  size="sm"
                  disabled={!newSubtask.trim() || subtaskMutation.isPending}
                  onClick={() =>
                    subtaskMutation.mutate(
                      { add: [{ title: newSubtask.trim() }] },
                      {
                        onSuccess: () => {
                          setNewSubtask('');
                          toast.success('Subtask added');
                        },
                      },
                    )
                  }
                >
                  Add
                </Button>
              </div>
            </section>

            <section>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                <Paperclip className="h-4 w-4" />
                Attachments
              </h3>
              {task.attachments.length === 0 ? (
                <p className="text-xs text-muted">No files attached yet.</p>
              ) : (
                <ul className="space-y-2">
                  {task.attachments.map((att) => (
                    <li
                      key={att._id}
                      className="flex items-center justify-between rounded-lg border border-surface-border px-3 py-2"
                    >
                      <a
                        href={attachmentUrl(task._id, att.filename)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate text-sm font-medium text-primary-600 hover:underline"
                      >
                        {att.originalName}
                      </a>
                      <button
                        type="button"
                        onClick={() => deleteAttachmentMutation.mutate(att._id)}
                        className="rounded p-1 text-muted hover:text-red-600"
                        aria-label="Delete attachment"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadMutation.mutate(file);
                  e.target.value = '';
                }}
              />
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => fileInputRef.current?.click()}
                isLoading={uploadMutation.isPending}
              >
                <Upload className="h-3.5 w-3.5" />
                Upload file
              </Button>
            </section>

            <section>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                <Clock className="h-4 w-4" />
                Time log
              </h3>
              {task.timeLogs.length > 0 && (
                <ul className="mb-3 max-h-32 space-y-1 overflow-y-auto">
                  {[...task.timeLogs]
                    .sort(
                      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
                    )
                    .map((log) => {
                      const who =
                        typeof log.user === 'object' ? log.user.name : 'User';
                      return (
                        <li
                          key={log._id}
                          className="flex justify-between text-xs text-muted"
                        >
                          <span>
                            {who} · {formatDate(log.date)}
                            {log.note ? ` — ${log.note}` : ''}
                          </span>
                          <span className="font-medium text-foreground">
                            {formatHours(log.hours)}
                          </span>
                        </li>
                      );
                    })}
                </ul>
              )}
              <div className="flex flex-wrap gap-2">
                <Input
                  type="number"
                  min="0.25"
                  step="0.25"
                  placeholder="Hours"
                  value={timeHours}
                  onChange={(e) => setTimeHours(e.target.value)}
                  className="w-24"
                />
                <Input
                  placeholder="Note (optional)"
                  value={timeNote}
                  onChange={(e) => setTimeNote(e.target.value)}
                  className="min-w-[140px] flex-1"
                />
                <Button
                  size="sm"
                  disabled={!timeHours || Number(timeHours) <= 0}
                  isLoading={timeMutation.isPending}
                  onClick={() => timeMutation.mutate()}
                >
                  Log time
                </Button>
              </div>
            </section>

            <section>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                <MessageSquare className="h-4 w-4" />
                Comments
              </h3>
              <div className="space-y-4">
                {task.comments.length === 0 ? (
                  <p className="text-xs text-muted">No comments yet.</p>
                ) : (
                  task.comments.map((c) => (
                    <CommentThread
                      key={c._id}
                      comment={c}
                      currentUserId={user?._id}
                      onReply={(id) => {
                        setReplyTo(id);
                        setCommentText('');
                      }}
                      onEdit={(id, text) => {
                        setEditingCommentId(id);
                        setEditCommentText(text);
                      }}
                      onDelete={(id) => deleteCommentMutation.mutate(id)}
                      editingId={editingCommentId}
                      editText={editCommentText}
                      onEditTextChange={setEditCommentText}
                      onSaveEdit={() => editCommentMutation.mutate()}
                      onCancelEdit={() => setEditingCommentId(null)}
                    />
                  ))
                )}
              </div>
              {replyTo && (
                <p className="mt-2 text-xs text-primary-600">
                  Replying to a comment{' '}
                  <button
                    type="button"
                    className="underline"
                    onClick={() => setReplyTo(null)}
                  >
                    cancel
                  </button>
                </p>
              )}
              <div className="mt-3 flex gap-2">
                <Textarea
                  rows={2}
                  placeholder="Write a comment…"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                />
                <Button
                  className="self-end"
                  disabled={!commentText.trim()}
                  isLoading={commentMutation.isPending}
                  onClick={() => commentMutation.mutate()}
                >
                  Post
                </Button>
              </div>
            </section>

            <section>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                <Activity className="h-4 w-4" />
                Activity
              </h3>
              {task.activityLog.length === 0 ? (
                <p className="text-xs text-muted">No activity recorded.</p>
              ) : (
                <ul className="max-h-48 space-y-2 overflow-y-auto border-l-2 border-surface-border pl-3">
                  {[...task.activityLog]
                    .sort(
                      (a, b) =>
                        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
                    )
                    .map((entry) => {
                      const who =
                        typeof entry.user === 'object' ? entry.user.name : 'Someone';
                      const detail =
                        entry.field && entry.oldValue !== undefined
                          ? `${entry.field}: ${entry.oldValue} → ${entry.newValue}`
                          : entry.newValue ?? '';
                      return (
                        <li key={entry._id} className="text-xs text-muted">
                          <span className="font-medium text-foreground">{who}</span>{' '}
                          {entry.action}
                          {detail ? ` (${detail})` : ''}
                          <span className="ml-1 opacity-70">
                            · {formatDate(entry.timestamp)}
                          </span>
                        </li>
                      );
                    })}
                </ul>
              )}
            </section>
          </div>
        )}
      </Modal>

      {task && (
        <TaskFormModal
          open={editOpen}
          onClose={() => setEditOpen(false)}
          task={task}
        />
      )}
    </>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-surface-subtle px-3 py-2">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-0.5 truncate text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

interface CommentThreadProps {
  comment: TaskComment;
  currentUserId?: string;
  onReply: (id: string) => void;
  onEdit: (id: string, text: string) => void;
  onDelete: (id: string) => void;
  editingId: string | null;
  editText: string;
  onEditTextChange: (v: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
}

function CommentThread({
  comment,
  currentUserId,
  onReply,
  onEdit,
  onDelete,
  editingId,
  editText,
  onEditTextChange,
  onSaveEdit,
  onCancelEdit,
}: CommentThreadProps) {
  const author = typeof comment.user === 'object' ? comment.user : null;
  const isAuthor = author?._id === currentUserId;

  return (
    <div className="space-y-2">
      <CommentItem
        comment={comment}
        author={author}
        isAuthor={isAuthor}
        editingId={editingId}
        editText={editText}
        onEditTextChange={onEditTextChange}
        onSaveEdit={onSaveEdit}
        onCancelEdit={onCancelEdit}
        onReply={onReply}
        onEdit={onEdit}
        onDelete={onDelete}
      />
      {comment.replies?.map((reply) => {
        const replyAuthor = typeof reply.user === 'object' ? reply.user : null;
        return (
          <div key={reply._id} className="ml-6 border-l-2 border-surface-border pl-3">
            <CommentItem
              comment={reply}
              author={replyAuthor}
              isAuthor={replyAuthor?._id === currentUserId}
              editingId={editingId}
              editText={editText}
              onEditTextChange={onEditTextChange}
              onSaveEdit={onSaveEdit}
              onCancelEdit={onCancelEdit}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          </div>
        );
      })}
    </div>
  );
}

function CommentItem({
  comment,
  author,
  isAuthor,
  editingId,
  editText,
  onEditTextChange,
  onSaveEdit,
  onCancelEdit,
  onReply,
  onEdit,
  onDelete,
}: {
  comment: TaskComment;
  author: User | null;
  isAuthor: boolean;
  editingId: string | null;
  editText: string;
  onEditTextChange: (v: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onReply: (id: string) => void;
  onEdit: (id: string, text: string) => void;
  onDelete: (id: string) => void;
}) {
  const isEditing = editingId === comment._id;

  return (
    <div className="flex gap-2">
      <Avatar name={author?.name ?? '?'} src={author?.avatar} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">{author?.name ?? 'User'}</span>
          <span className="text-[10px] text-muted">{formatDate(comment.createdAt)}</span>
          {comment.editedAt && (
            <span className="text-[10px] text-muted">(edited)</span>
          )}
        </div>
        {isEditing ? (
          <div className="mt-1 space-y-2">
            <Textarea rows={2} value={editText} onChange={(e) => onEditTextChange(e.target.value)} />
            <div className="flex gap-2">
              <Button size="sm" onClick={onSaveEdit}>
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={onCancelEdit}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            <p className="mt-0.5 text-sm text-foreground">{comment.text}</p>
            <div className="mt-1 flex gap-2">
              <button
                type="button"
                onClick={() => onReply(comment._id)}
                className="inline-flex items-center gap-1 text-xs text-primary-600 hover:underline"
              >
                <Reply className="h-3 w-3" />
                Reply
              </button>
              {isAuthor && (
                <>
                  <button
                    type="button"
                    onClick={() => onEdit(comment._id, comment.text)}
                    className="text-xs text-muted hover:text-foreground"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(comment._id)}
                    className="text-xs text-muted hover:text-red-600"
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
