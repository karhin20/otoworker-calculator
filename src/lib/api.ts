import { WorkerDetail, WorkerSummary } from "@/types";

// Get the API URL from environment or use localhost as fallback
const API_BASE_URL = import.meta.env.VITE_API_URL || "https://overtime-transport-backend.vercel.app/api";

interface ApiOptions {
  method?: string;
  body?: any;
  requiresAuth?: boolean;
}

export async function apiCall(endpoint: string, options: ApiOptions = {}) {
  const {
    method = "GET",
    body,
    requiresAuth = true,
  } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (requiresAuth) {
    const token = localStorage.getItem("token");
    if (!token) {
      throw new Error("No authentication token found");
    }
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers,
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Something went wrong");
  }

  return data;
}

// Auth endpoints
export const auth = {
  signUp: (data: { email: string; password: string; secretCode: string }) =>
    apiCall("/admin/signup", { method: "POST", body: data, requiresAuth: false }),
  
  signIn: (data: { email: string; password: string }) =>
    apiCall("/admin/signin", { method: "POST", body: data, requiresAuth: false }),
};

// Worker endpoints
export const workers = {
  getAll: () => apiCall("/workers"),
  create: (data: {
    name: string;
    staff_id: string;
    grade: string;
    default_area: string;
    transport_required: boolean;
  }) => apiCall("/workers", { method: "POST", body: data }),
};


// In src/lib/api.ts

export const overtime = {
  create: (data: { 
    worker_id: string;
    date: string;  // Will be converted from Date to string when sent
    entry_time: string;
    exit_time: string;
    category: 'A' | 'C';
    category_a_hours: number;
    category_c_hours: number;
    transportation: boolean;
    transportation_cost?: number;
  }) => {
    // Send data directly without transforming - backend expects snake_case
    return apiCall("/overtime", { 
      method: "POST", 
      body: data
    });
  },
  
  getByWorker: (workerId: string, month: number, year: number): Promise<WorkerDetail[]> => {
    return apiCall(`/overtime/${workerId}?month=${month}&year=${year}`);
  },
  
  getMonthlySummary: (month: number, year: number): Promise<WorkerSummary[]> =>
    apiCall(`/summary/monthly?month=${month}&year=${year}`),
};

export const holidays = {
  getAll: () => apiCall("/holidays"),
};