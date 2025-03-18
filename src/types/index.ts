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
  transportation_days: number;
  transportation_cost: number;
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