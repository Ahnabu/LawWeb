export type CaseStatus = "open" | "in-progress" | "resolved" | "closed";
export type CaseType = "online" | "offline";

export interface Case {
  id: string;
  clientId: string;
  lawyerId: string;
  title: string;
  description: string;
  status: CaseStatus;
  type: CaseType;
  createdAt: string;
  updatedAt: string;
}

export interface CaseWithDetails extends Case {
  client?: {
    name: string;
    email: string;
    phone: string;
  };
  lawyer?: {
    name: string;
    email: string;
    phone: string;
  };
  documents?: CaseDocument[];
  timeline?: CaseUpdate[];
}

export interface CaseDocument {
  id: string;
  caseId: string;
  fileUrl: string;
  fileName: string;
  uploadedAt: string;
}

export interface CaseUpdate {
  id: string;
  caseId: string;
  status: CaseStatus;
  message: string;
  updatedAt: string;
}

export interface CreateCaseData {
  title: string;
  description: string;
  clientEmail: string;
  type: CaseType;
}

export interface OfflineCaseData extends CreateCaseData {
  clientName?: string;
  clientPhone?: string;
}
