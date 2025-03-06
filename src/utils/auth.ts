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