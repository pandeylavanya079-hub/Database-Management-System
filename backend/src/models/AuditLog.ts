import { Schema, model, Document } from 'mongoose';

export interface IAuditLog extends Document {
  user: string;
  action: string;
  oldValue: any;
  newValue: any;
  timestamp: Date;
}

const auditLogSchema = new Schema<IAuditLog>({
  user: {
    type: String,
    required: [true, 'User is required'],
  },
  action: {
    type: String,
    required: [true, 'Action is required'],
  },
  oldValue: {
    type: Schema.Types.Mixed,
    required: true,
  },
  newValue: {
    type: Schema.Types.Mixed,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ user: 1 });

export const AuditLog = model<IAuditLog>('AuditLog', auditLogSchema);
export default AuditLog;
