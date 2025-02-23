
export interface Worker {
  id: string;
  name: string;
  defaultArea: string;
}

export interface OvertimeEntry {
  workerId: string;
  date: Date;
  categoryA: number; // weekday overtime hours
  categoryC: number; // weekend overtime hours
  transportation: boolean;
}

export interface Area {
  id: string;
  name: string;
  rate: number;
}

export interface WorkerSummary {
  workerId: string;
  name: string;
  totalCategoryA: number;
  totalCategoryC: number;
  transportationDays: number;
  transportationCost: number;
  totalAmount: number;
}
