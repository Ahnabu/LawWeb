import mongoose, { Schema, Document } from 'mongoose';

export interface DaySchedule {
  isAvailable: boolean;
  startTime: string; // "09:00"
  endTime: string;   // "17:00"
}

export interface ILawyerAvailability extends Document {
  lawyerId: mongoose.Types.ObjectId;
  isAcceptingNewClients: boolean;
  schedule: {
    monday: DaySchedule;
    tuesday: DaySchedule;
    wednesday: DaySchedule;
    thursday: DaySchedule;
    friday: DaySchedule;
    saturday: DaySchedule;
    sunday: DaySchedule;
  };
  updatedAt: Date;
}

const DayScheduleSchema = new Schema(
  {
    isAvailable: { type: Boolean, default: false },
    startTime: { type: String, default: '09:00' },
    endTime: { type: String, default: '17:00' },
  },
  { _id: false }
);

const defaultWorkday = { isAvailable: true, startTime: '09:00', endTime: '17:00' };
const defaultWeekend = { isAvailable: false, startTime: '09:00', endTime: '17:00' };

const LawyerAvailabilitySchema: Schema = new Schema(
  {
    lawyerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    isAcceptingNewClients: {
      type: Boolean,
      default: true,
    },
    schedule: {
      monday: { type: DayScheduleSchema, default: defaultWorkday },
      tuesday: { type: DayScheduleSchema, default: defaultWorkday },
      wednesday: { type: DayScheduleSchema, default: defaultWorkday },
      thursday: { type: DayScheduleSchema, default: defaultWorkday },
      friday: { type: DayScheduleSchema, default: defaultWorkday },
      saturday: { type: DayScheduleSchema, default: defaultWeekend },
      sunday: { type: DayScheduleSchema, default: defaultWeekend },
    },
  },
  { timestamps: true }
);

export default mongoose.model<ILawyerAvailability>('LawyerAvailability', LawyerAvailabilitySchema);
