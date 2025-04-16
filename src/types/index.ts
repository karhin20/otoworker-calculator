export interface Worker {
  id: string;
  name: string;
  staff_id: string;
  grade: Grade;
  default_area: string;
  transport_required: boolean;
  area?: string;
  created_at?: string;
}

export type Grade = 
  | "Artisan (P/F)"
  | "Asst. Dist. Officer"
  | "Driver"
  | "General Worker - Skilled"
  | "General Worker"
  | "Jnr Artisan (P/F)"
  | "Jnr Driver"
  | "Senior Supervisor"
  | "Snr Artisan"
  | "Snr Driver";

export interface Area {
  name: string;
  rate: number;
}

export const AREAS: Area[] = [
  { name: "Abeka Lapaz", rate: 55.00 },
  { name: "Aburi", rate: 50.00 },
  { name: "Adenta", rate: 45.00 },
  { name: "Alajo", rate: 50.00 },
  { name: "Ashiaman", rate: 60.00 },
  { name: "Bawaleshie", rate: 55.00 },
  { name: "Damfa", rate: 60.00 },
  { name: "Dansoman", rate: 60.00 },
  { name: "Dodowa", rate: 60.00 },
  { name: "Dome", rate: 50.00 },
  { name: "Haatso", rate: 45.00 },
  { name: "Kasoa", rate: 55.00 },
  { name: "Madina UN", rate: 50.00 },
  { name: "Nima", rate: 45.00 },
  { name: "Pokuase", rate: 70.00 },
  { name: "Sakumono Estates", rate: 90.00 },
  { name: "Sowutoum", rate: 60.00 },
  { name: "Teshie", rate: 55.00 },
  { name: "Weija", rate: 50.00 }
];

export interface OvertimeEntry {
  worker_id: string;
  date: Date;
  entry_time: string;
  exit_time: string;
  category: "A" | "C";
  category_a_hours: number;
  category_c_hours: number;
  transportation: boolean;
  transportation_cost?: number;
}

export interface WorkerSummary {
  worker_id: string;
  name: string;
  staff_id: string;
  grade: string;
  category_a_hours: number;
  category_c_hours: number;
  category_a_amount?: number;
  category_c_amount?: number;
  transportation_days: number;
  transportation_cost: number;
  approval_status?: ApprovalStatus;
  approval_statuses?: ApprovalStatus[];
  entries?: Array<{id: string; approval_status: ApprovalStatus}>;
  status_counts?: {
    Pending: number;
    Standard: number;
    Supervisor: number;
    Accountant: number;
    Approved: number;
    Rejected: number;
    [key: string]: number;
  };
}

export interface WorkerDetail {
  id: string;
  worker_id: string;
  date: string;
  entry_time: string;
  exit_time: string;
  category: "A" | "C";
  category_a_hours?: number;
  category_c_hours?: number;
  transportation: boolean;
  transportation_cost?: number;
  workers: {
    name: string;
    staff_id: string;
    grade: string;
    default_area: string;
  };
  remarks?: string;
}

export interface Holiday {
  id: string;
  date: Date;
  name: string;
}

export interface RiskEntry {
  id: string;
  worker_id: string;
  date: string;
  location: string;
  size_depth: string;
  remarks?: string;
  rate: number;
  created_at: string;
  worker: {
    name: string;
    staff_id: string;
    grade: string;
  };
}

export interface RiskSummary {
  worker_id: string;
  name: string;
  staff_id: string;
  grade: string;
  total_entries: number;
  total_amount: number;
}

// Admin roles for hierarchical approval system
export type AdminRole = 
  | "Standard"       // Basic admin - can add entries
  | "Supervisor"     // District Supervisor - first approval
  | "Accountant"     // Regional Accountant - can edit amounts
  | "Director";      // Regional Director - final approval

// Approval status for overtime and transport entries
export type ApprovalStatus = "Pending" | "Standard" | "Supervisor" | "Accountant" | "Approved" | "Rejected";

// Extended worker detail with approval information
export interface WorkerDetailWithApproval extends WorkerDetail {
  approval_status: ApprovalStatus;
  category_a_amount?: number;
  category_c_amount?: number;
  approved_by?: string;
  approved_by_name?: string;
  approved_at?: string;
  last_edited_by?: string;
  last_edited_by_name?: string;
  last_edited_at?: string;
  automatically_generated?: boolean;
  created_by?: string;
  calculated_amount?: {
    category_a: number;
    category_c: number;
    transport: number;
  };
}