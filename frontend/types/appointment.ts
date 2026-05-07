export type AppointmentStatus = "scheduled" | "completed" | "cancelled";

export interface Appointment {
  id: string;
  clientId: string;
  lawyerId: string;
  date: string;
  time: string;
  message?: string;
  status: AppointmentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AppointmentWithDetails extends Appointment {
  client?: {
    name: string;
    email: string;
    phone: string;
  };
  lawyer?: {
    name: string;
    email: string;
    phone: string;
    specializations: string[];
  };
}

export interface BookAppointmentData {
  lawyerId: string;
  date: string;
  time: string;
  message?: string;
  clientEmail: string;
}
