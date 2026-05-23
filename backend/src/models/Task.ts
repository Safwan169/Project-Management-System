import { Schema, model, Document, Model, Types } from 'mongoose';

export type TaskStatus = 'todo' | 'inprogress' | 'review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export interface Attachment {
  _id: Types.ObjectId;
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  uploadedBy: Types.ObjectId;
  uploadedAt: Date;
}

export interface Subtask {
  _id: Types.ObjectId;
  title: string;
  completed: boolean;
  createdAt: Date;
}

export interface TimeLog {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  hours: number;
  date: Date;
  note?: string;
}

export interface ActivityEntry {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  action: string;
  field?: string;
  oldValue?: string;
  newValue?: string;
  timestamp: Date;
}

export interface Comment {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  text: string;
  createdAt: Date;
  editedAt?: Date;
  parentComment?: Types.ObjectId;
}

export interface ITask extends Document {
  _id: Types.ObjectId;
  title: string;
  description?: string;
  project: Types.ObjectId;
  sprint: Types.ObjectId;
  assignees: Types.ObjectId[];
  createdBy: Types.ObjectId;
  estimate?: number;
  priority: TaskPriority;
  status: TaskStatus;
  order: number;
  dueDate?: Date;
  attachments: Types.DocumentArray<Attachment & Types.Subdocument>;
  subtasks: Types.DocumentArray<Subtask & Types.Subdocument>;
  timeLogs: Types.DocumentArray<TimeLog & Types.Subdocument>;
  activityLog: Types.DocumentArray<ActivityEntry & Types.Subdocument>;
  comments: Types.DocumentArray<Comment & Types.Subdocument>;
  tags?: string[];
  isBlocked: boolean;
  blockedReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const attachmentSchema = new Schema<Attachment>({
  filename: { type: String, required: true },
  originalName: { type: String, required: true },
  mimetype: { type: String, required: true },
  size: { type: Number, required: true },
  uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  uploadedAt: { type: Date, default: Date.now },
});

const subtaskSchema = new Schema<Subtask>({
  title: { type: String, required: true, trim: true },
  completed: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

const timeLogSchema = new Schema<TimeLog>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  hours: { type: Number, required: true, min: [0.01, 'Hours must be greater than 0'] },
  date: { type: Date, default: Date.now },
  note: { type: String, trim: true },
});

const activitySchema = new Schema<ActivityEntry>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true },
  field: { type: String },
  oldValue: { type: String },
  newValue: { type: String },
  timestamp: { type: Date, default: Date.now },
});

const commentSchema = new Schema<Comment>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true, trim: true },
  createdAt: { type: Date, default: Date.now },
  editedAt: { type: Date },
  parentComment: { type: Schema.Types.ObjectId },
});

const taskSchema = new Schema<ITask>(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
    },
    description: { type: String, trim: true },
    project: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    sprint: {
      type: Schema.Types.ObjectId,
      ref: 'Sprint',
      required: true,
    },
    assignees: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    estimate: { type: Number, min: [0, 'Estimate cannot be negative'] },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: ['todo', 'inprogress', 'review', 'done'],
      default: 'todo',
    },
    // Position within its kanban column. Assigned on create; rewritten on reorder.
    order: { type: Number, default: 0 },
    dueDate: { type: Date },
    attachments: { type: [attachmentSchema], default: [] },
    subtasks: { type: [subtaskSchema], default: [] },
    timeLogs: { type: [timeLogSchema], default: [] },
    activityLog: { type: [activitySchema], default: [] },
    comments: { type: [commentSchema], default: [] },
    tags: { type: [String], default: undefined },
    isBlocked: { type: Boolean, default: false },
    blockedReason: { type: String, trim: true },
  },
  { timestamps: true },
);

taskSchema.index({ project: 1 });
taskSchema.index({ sprint: 1 });
taskSchema.index({ assignees: 1 });
taskSchema.index({ status: 1 });
taskSchema.index({ sprint: 1, status: 1, order: 1 });
taskSchema.index({ priority: 1 });
taskSchema.index({ dueDate: 1 });

export const Task: Model<ITask> = model<ITask>('Task', taskSchema);
