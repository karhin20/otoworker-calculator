
export interface Worker {
  id: string;
  name: string;
  staffId: string;
  grade: Grade;
  defaultArea: string;
  transportRequired: boolean;
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
  { name: "Dandoman", rate: 60.00 },
  { name: "Dansoman", rate: 60.00 },
  { name: "Dodowa", rate: 60.00 },
  { name: "Dome", rate: 50.00 },
  { name: "Haatso", rate: 45.00 },
  { name: "Kasoa", rate: 55.00 },
  { name: "Madina UN", rate: 45.00 },
  { name: "Nima", rate: 45.00 },
  { name: "Pokuase", rate: 70.00 },
  { name: "Sakumono Estates", rate: 90.00 },
  { name: "Sowutoum", rate: 60.00 },
  { name: "Teshie", rate: 55.00 },
  { name: "Weija", rate: 50.00 }
];

export interface OvertimeEntry {
  workerId: string;
  date: Date;
  entryTime: string;
  exitTime: string;
  transportation: boolean;
}

export interface WorkerSummary {
  workerId: string;
  name: string;
  staffId: string;
  grade: string;
  overtimeHours: number;
  overtimeAmount: number;
  transportationDays: number;
  transportationCost: number;
}

export interface WorkerDetail {
  date: Date;
  entryTime: string;
  exitTime: string;
  overtimeHours: number;
  transportation: boolean;
  transportationCost: number;
}
