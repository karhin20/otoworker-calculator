/**
 * Authentication utility functions
 */

/**
 * Checks if the authentication token is valid and not expired
 * @returns boolean indicating if the token is valid
 */
export const isTokenValid = (): boolean => {
  const token = localStorage.getItem("token");
  const tokenExpiry = localStorage.getItem("tokenExpiry");
  
  // If token exists but expiry doesn't, assume it's valid
  // This handles tokens from before we added expiry dates
  if (token && !tokenExpiry) {
    // Create a new expiry date for backward compatibility
    const newExpiry = new Date();
    newExpiry.setHours(newExpiry.getHours() + 24);
    localStorage.setItem("tokenExpiry", newExpiry.toISOString());
    return true;
  }
  
  return !!token && !!tokenExpiry && new Date(tokenExpiry) > new Date();
};

/**
 * Checks if the worker authentication token is valid and not expired
 * @returns boolean indicating if the worker token is valid
 */
export const isWorkerTokenValid = (): boolean => {
  const token = localStorage.getItem("workerToken");
  const tokenExpiry = localStorage.getItem("workerTokenExpiry");
  
  // If token exists but expiry doesn't, assume it's valid
  if (token && !tokenExpiry) {
    // Create a new expiry date for backward compatibility
    const newExpiry = new Date();
    newExpiry.setHours(newExpiry.getHours() + 12); // Worker tokens expire in 12 hours
    localStorage.setItem("workerTokenExpiry", newExpiry.toISOString());
    return true;
  }
  
  return !!token && !!tokenExpiry && new Date(tokenExpiry) > new Date();
};

/**
 * Clears all authentication data from local storage
 */
export const clearAuthData = (): void => {
  localStorage.removeItem("token");
  localStorage.removeItem("tokenExpiry");
  localStorage.removeItem("user");
};

/**
 * Clears all worker authentication data from local storage
 */
export const clearWorkerAuthData = (): void => {
  localStorage.removeItem("workerToken");
  localStorage.removeItem("workerTokenExpiry");
  localStorage.removeItem("worker");
};

/**
 * Checks token validity and optionally redirects to login if invalid
 * @param navigate React Router's navigate function (optional)
 * @returns boolean indicating if the token is valid
 */
export const checkTokenAndRedirect = (navigate?: (path: string) => void): boolean => {
  const isValid = isTokenValid();
  
  if (!isValid && navigate) {
    clearAuthData();
    navigate("/");
  }
  
  return isValid;
};

/**
 * Checks worker token validity and optionally redirects to worker login if invalid
 * @param navigate React Router's navigate function (optional)
 * @returns boolean indicating if the worker token is valid
 */
export const checkWorkerTokenAndRedirect = (navigate?: (path: string) => void): boolean => {
  const isValid = isWorkerTokenValid();
  
  if (!isValid && navigate) {
    clearWorkerAuthData();
    navigate("/worker-signin");
  }
  
  return isValid;
};

/**
 * Initializes authentication state by checking for and clearing any expired tokens.
 * This should be called when the application first loads.
 */
export const initializeAuth = (): void => {
  // Check admin tokens
  const token = localStorage.getItem("token");
  const tokenExpiry = localStorage.getItem("tokenExpiry");

  // If we have a token without expiry, set one
  if (token && !tokenExpiry) {
    const newExpiry = new Date();
    newExpiry.setHours(newExpiry.getHours() + 24);
    localStorage.setItem("tokenExpiry", newExpiry.toISOString());
  }
  
  // If we have an expired token, clear auth data
  if (token && tokenExpiry && new Date(tokenExpiry) < new Date()) {
    clearAuthData();
  }
  
  // Check worker tokens
  const workerToken = localStorage.getItem("workerToken");
  const workerTokenExpiry = localStorage.getItem("workerTokenExpiry");

  // If we have a worker token without expiry, set one
  if (workerToken && !workerTokenExpiry) {
    const newExpiry = new Date();
    newExpiry.setHours(newExpiry.getHours() + 12); // Worker tokens expire in 12 hours
    localStorage.setItem("workerTokenExpiry", newExpiry.toISOString());
  }
  
  // If we have an expired worker token, clear worker auth data
  if (workerToken && workerTokenExpiry && new Date(workerTokenExpiry) < new Date()) {
    clearWorkerAuthData();
  }
  
  // Log current auth state
  if (isTokenValid()) {
    console.log("Admin Auth initialized: Valid token found");
  } else {
    console.log("Admin Auth initialized: No valid token");
  }
  
  if (isWorkerTokenValid()) {
    console.log("Worker Auth initialized: Valid token found");
  } else {
    console.log("Worker Auth initialized: No valid token");
  }
}; 