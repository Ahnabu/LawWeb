import mongoose, { Schema, Document } from 'mongoose';

// A delegation: one staff member may act for one lawyer with these permissions
// (docs/rbac/phase-3-lawyer-assistants.md §1.1). Keys are lawyer-scoped only and
// stored as chosen (not expanded); loadAccess expands them on every request.
// Removing access deletes the document; the history is in the audit log.
export interface IStaffAssignment extends Document<mongoose.Types.ObjectId> {
  staffId: mongoose.Types.ObjectId;
  lawyerId: mongoose.Types.ObjectId;
  permissions: string[];
  grantedBy: mongoose.Types.ObjectId;
  grantedByRole: 'admin' | 'lawyer';
  createdAt: Date;
  updatedAt: Date;
}

const StaffAssignmentSchema: Schema = new Schema(
  {
    staffId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    lawyerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    permissions: [{ type: String }],
    grantedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    grantedByRole: { type: String, enum: ['admin', 'lawyer'], required: true },
  },
  { timestamps: true }
);

StaffAssignmentSchema.index({ staffId: 1, lawyerId: 1 }, { unique: true });

export default mongoose.model<IStaffAssignment>('StaffAssignment', StaffAssignmentSchema);
