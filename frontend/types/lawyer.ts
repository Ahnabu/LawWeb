export interface Lawyer {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  barId: string;
  specializations: string[];
  experience: number;
  hourlyRate: number;
  photo?: string;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LawyerProfile extends Lawyer {
  bio?: string;
  education?: string[];
  cases?: number;
  rating?: number;
  reviews?: number;
}

export interface LawyerListItem {
  id: string;
  name: string;
  specializations: string[];
  experience: number;
  hourlyRate: number;
  photo?: string;
  rating?: number;
}
