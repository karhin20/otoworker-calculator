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
 * Clears all authentication data from local storage
 */
export const clearAuthData = (): void => {
  localStorage.removeItem("token");
  localStorage.removeItem("tokenExpiry");
  localStorage.removeItem("user");
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
 * Initializes authentication state by checking for and clearing any expired tokens.
 * This should be called when the application first loads.
 */
export const initializeAuth = (): void => {

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
  
  // Log current auth state
  if (isTokenValid()) {
    console.log("Auth initialized: Valid token found");
  } else {
    console.log("Auth initialized: No valid token");
  }
}; 