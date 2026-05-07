import { Appointment } from "./appointment";
import { Case } from "./case";

export interface DashboardStats {
  totalAppointments: number;
  pendingAppointments: number;
  completedAppointments: number;
  activeCases: number;
  resolvedCases: number;
}

export interface UserDashboardData {
  stats: DashboardStats;
  upcomingAppointments: Appointment[];
  activeCases: Case[];
  recentActivity: ActivityItem[];
}

export interface LawyerDashboardData {
  stats: DashboardStats;
  upcomingAppointments: Appointment[];
  assignedCases: Case[];
  pendingClients: number;
}

export interface AdminDashboardData {
  stats: {
    totalUsers: number;
    totalLawyers: number;
    totalAppointments: number;
    totalCases: number;
  };
  recentAppointments: Appointment[];
  recentCases: Case[];
  pendingLawyerVerifications: number;
}

export interface ActivityItem {
  id: string;
  type: "appointment_booked" | "case_updated" | "appointment_completed";
  title: string;
  description: string;
  timestamp: string;
}

export interface SidebarItem {
  href: string;
  label: string;
  icon?: React.ReactNode;
}

export interface DashboardLayoutProps {
  children: React.ReactNode;
  role: "client" | "lawyer" | "admin";
}
