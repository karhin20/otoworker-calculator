// Get the API URL from environment or use localhost as fallback
import { WorkerDetail, WorkerSummary } from "@/types";

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

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method,
      headers,
      credentials: 'include',
      body: body ? JSON.stringify(body) : undefined,
    });

    // For 204 No Content responses
    if (response.status === 204) {
      return null;
    }

    let data;
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
    } else {
      throw new Error("Invalid response format");
    }

    if (!response.ok) {
      if (response.status === 409) {
        throw new Error("An entry already exists for this worker on the selected date");
      }
      throw new Error(data.error || "Something went wrong");
    }

    return data;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to make API request");
  }
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
  create: async (data: { 
    worker_id: string;
    date: string;
    entry_time: string;
    exit_time: string;
    category: 'A' | 'C';
    category_a_hours: number;
    category_c_hours: number;
    transportation: boolean;
    transportation_cost?: number;
  }) => {
    try {
      return await apiCall("/overtime", { 
        method: "POST", 
        body: data
      });
    } catch (error) {
      if (error instanceof Error && error.message === "An entry already exists for this worker on the selected date") {
        throw error;
      }
      throw new Error("Failed to create overtime entry");
    }
  },
  
  getByWorker: (workerId: string, month: number, year: number): Promise<WorkerDetail[]> => {
    return apiCall(`/overtime/${workerId}?month=${month}&year=${year}`);
  },
  
  getMonthlySummary: (month: number, year: number): Promise<WorkerSummary[]> =>
    apiCall(`/summary/monthly?month=${month}&year=${year}`),

  checkDuplicateEntry: async (workerId: string, date: string): Promise<boolean> => {
    if (!workerId || !date) {
      throw new Error("Worker ID and date are required");
    }

    try {
      const response = await apiCall(`/overtime/check-duplicate?worker_id=${workerId}&date=${date}`);
      if (response === null || response === undefined) {
        return false;
      }
      return response.exists === true;
    } catch (error) {
      console.error('Error checking duplicate entry:', error);
      throw new Error("Failed to check for duplicate entry");
    }
  },
};

export const holidays = {
  getAll: () => apiCall("/holidays"),
};