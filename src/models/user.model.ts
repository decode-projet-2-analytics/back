import { Schema, model, Document, Types } from 'mongoose';
import bcrypt from 'bcryptjs';
import type { IApp } from './app.model';

export type UserRole = 'admin' | 'webmaster';
export type UserStatus = 'pending' | 'validated' | 'rejected';

export interface IUser extends Document {
    _id: Types.ObjectId;
    email: string;
    password: string;
    role: UserRole;
    companyName?: string;
    kbisDocument?: string;
    contactPhone?: string;
    websiteUrl?: string;
    status: UserStatus;
    createdAt: Date;
    updatedAt: Date;
    comparePassword(candidate: string): Promise<boolean>;
    apps?: IApp[];
}

const SALT_ROUNDS = 10;

const userSchema = new Schema<IUser>(
    {
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^\S+@\S+\.\S+$/, 'Email invalide'],
        },
        password: {
            type: String,
            required: true,
            select: false,
        },
        role: {
            type: String,
            enum: ['admin', 'webmaster'],
            default: 'webmaster',
        },
        companyName: { type: String, trim: true },
        kbisDocument: { type: String },
        contactPhone: { type: String, trim: true },
        websiteUrl: {
            type: String,
            validate: {
                validator: (v: string) => !v || /^https?:\/\/.+/.test(v),
                message: 'URL du site invalide',
            },
        },
        status: {
            type: String,
            enum: ['pending', 'validated', 'rejected'],
            default: 'pending',
        },
    },
    { timestamps: true, collection: 'users' },
);

userSchema.pre('save', async function () {
    if (!this.isModified('password')) return;
    this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
});

userSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
    return bcrypt.compare(candidate, this.password);
};

userSchema.virtual('apps', {
    ref: 'App',
    localField: '_id',
    foreignField: 'ownerId',
});

userSchema.set('toJSON', {
    virtuals: true,
    transform(_doc, ret) {
        const { password: _password, ...safe } = ret as IUser & { password?: string };
        return safe;
    },
});

userSchema.set('toObject', { virtuals: true });

export const User = model<IUser>('User', userSchema);
