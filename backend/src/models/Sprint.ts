import { Schema, model, Document, Model, Types } from 'mongoose';

export type SprintStatus = 'upcoming' | 'active' | 'completed';

export interface ISprint extends Document {
  _id: Types.ObjectId;
  title: string;
  sprintNumber: number;
  project: Types.ObjectId;
  startDate: Date;
  endDate: Date;
  status: SprintStatus;
  order: number;
  goal?: string;
  createdAt: Date;
  updatedAt: Date;
}

const sprintSchema = new Schema<ISprint>(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
    },
    // Set automatically by the pre-validate hook; never from user input.
    sprintNumber: { type: Number },
    project: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    startDate: { type: Date, required: [true, 'Start date is required'] },
    endDate: { type: Date, required: [true, 'End date is required'] },
    status: {
      type: String,
      enum: ['upcoming', 'active', 'completed'],
      default: 'upcoming',
    },
    // Drives manual drag-reorder; defaults to sprintNumber on creation.
    order: { type: Number },
    goal: { type: String, trim: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

sprintSchema.index({ project: 1 });
sprintSchema.index({ status: 1 });

// Auto-number new sprints per project; order mirrors sprintNumber unless already set.
sprintSchema.pre('validate', async function () {
  if (!this.isNew) return;

  const SprintModel = this.constructor as Model<ISprint>;
  const existing = await SprintModel.countDocuments({ project: this.project });
  this.sprintNumber = existing + 1;

  if (this.order === undefined || this.order === null) {
    this.order = this.sprintNumber;
  }
});

export const Sprint: Model<ISprint> = model<ISprint>('Sprint', sprintSchema);
