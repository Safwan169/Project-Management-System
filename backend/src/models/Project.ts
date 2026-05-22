import { Schema, model, Document, Model, Types } from 'mongoose';

export type ProjectStatus = 'planned' | 'active' | 'completed' | 'archived';
export type ProjectMemberRole = 'manager' | 'member';

export interface ProjectMember {
  user: Types.ObjectId;
  role: ProjectMemberRole;
}

export interface IProject extends Document {
  _id: Types.ObjectId;
  title: string;
  client: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  budget?: number;
  status: ProjectStatus;
  thumbnail?: string;
  createdBy: Types.ObjectId;
  members: Types.DocumentArray<ProjectMember & Types.Subdocument>;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
  // virtuals
  isOverdue: boolean;
}

const memberSchema = new Schema<ProjectMember>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['manager', 'member'], default: 'member' },
  },
  { _id: false },
);

const projectSchema = new Schema<IProject>(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
    },
    client: {
      type: String,
      required: [true, 'Client is required'],
      trim: true,
    },
    description: { type: String, trim: true },
    startDate: { type: Date, required: [true, 'Start date is required'] },
    endDate: { type: Date, required: [true, 'End date is required'] },
    budget: { type: Number, min: [0, 'Budget cannot be negative'] },
    status: {
      type: String,
      enum: ['planned', 'active', 'completed', 'archived'],
      default: 'planned',
    },
    thumbnail: { type: String },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    members: { type: [memberSchema], default: [] },
    tags: { type: [String], default: undefined },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Common access patterns: filter by status, list a user's own projects.
projectSchema.index({ status: 1 });
projectSchema.index({ createdBy: 1 });

// Past its end date and not yet finished.
projectSchema.virtual('isOverdue').get(function (this: IProject): boolean {
  return this.endDate < new Date() && this.status !== 'completed';
});

export const Project: Model<IProject> = model<IProject>('Project', projectSchema);
