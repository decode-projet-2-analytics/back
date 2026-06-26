import { Schema, model, Document, Types } from 'mongoose';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';

export interface IApp extends Document {
    _id: Types.ObjectId;
    appId: string;
    appSecretHash?: string;
    allowedUrls: string[];
    ownerId: Types.ObjectId;
    name?: string;
    createdAt: Date;
    updatedAt: Date;
    compareSecret(candidate: string): Promise<boolean>;
}

const appSchema = new Schema<IApp>(
    {
        appId: {
            type: String,
            required: true,
            unique: true,
            default: () => randomUUID(),
        },
        appSecretHash: {
            type: String,
            select: false,
        },
        allowedUrls: {
            type: [String],
            default: [],
        },
        ownerId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        name: { type: String, trim: true },
    },
    { timestamps: true, collection: 'apps' },
);

appSchema.pre('save', async function () {
    const plain = (this as IApp & { _plainSecret?: string })._plainSecret;
    if (plain) {
        this.appSecretHash = await bcrypt.hash(plain, 10);
        delete (this as IApp & { _plainSecret?: string })._plainSecret;
    }
});

appSchema.methods.compareSecret = async function (candidate: string): Promise<boolean> {
    if (!this.appSecretHash) return false;
    return bcrypt.compare(candidate, this.appSecretHash);
};

appSchema.set('toJSON', {
    transform(_doc, ret) {
        const { appSecretHash: _secret, ...safe } = ret as IApp & { appSecretHash?: string };
        return safe;
    },
});

export const App = model<IApp>('App', appSchema);
