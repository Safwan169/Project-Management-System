import { Schema, model, Document, Model, Types } from 'mongoose';
import bcrypt from 'bcryptjs';
import { UserRole } from '../types';

const BCRYPT_ROUNDS = 12;

export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  department?: string;
  skills?: string[];
  avatar?: string;
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
  // virtuals
  fullName: string;
  // methods
  comparePassword(candidate: string): Promise<boolean>;
  toSafeObject(): SafeUser;
}

// User shape with the password stripped — what we return from the API.
export interface SafeUser {
  _id: Types.ObjectId;
  name: string;
  email: string;
  role: UserRole;
  department?: string;
  skills?: string[];
  avatar?: string;
  isActive: boolean;
  lastLogin?: Date;
  fullName: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    },
    role: {
      type: String,
      enum: ['admin', 'manager', 'member'],
      default: 'member',
    },
    department: { type: String, trim: true },
    skills: { type: [String], default: undefined },
    avatar: { type: String },
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

userSchema.virtual('fullName').get(function (this: IUser): string {
  return this.name;
});

// Hash password before saving, but only when it changed.
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, BCRYPT_ROUNDS);
});

userSchema.methods.comparePassword = function (
  this: IUser,
  candidate: string,
): Promise<boolean> {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toSafeObject = function (this: IUser): SafeUser {
  const { password, ...safe } = this.toObject();
  void password;
  return safe as SafeUser;
};

export const User: Model<IUser> = model<IUser>('User', userSchema);
