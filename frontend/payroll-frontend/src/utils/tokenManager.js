/**
 * JWT Token Management Utilities
 * Provides centralized token storage, retrieval, and validation
 * Requirements: 7.4, 8.2
 */

const TOKEN_KEY = 'token';
const USER_KEY = 'user';

/**
 * Store JWT token in localStorage
 * @param {string} token - JWT token to store
 */
export const setToken = (token) => {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  }
};

/**
 * Retrieve JWT token from localStorage
 * @returns {string|null} - Stored token or null if not found
 */
export const getToken = () => {
  return localStorage.getItem(TOKEN_KEY);
};

/**
 * Remove JWT token from localStorage
 */
export const removeToken = () => {
  localStorage.removeItem(TOKEN_KEY);
};

/**
 * Store user data in localStorage
 * @param {Object} user - User object to store
 */
export const setUser = (user) => {
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
};

/**
 * Retrieve user data from localStorage
 * @returns {Object|null} - Stored user object or null if not found
 */
export const getUser = () => {
  const userStr = localStorage.getItem(USER_KEY);
  if (userStr) {
    try {
      return JSON.parse(userStr);
    } catch (e) {
      return null;
    }
  }
  return null;
};

/**
 * Remove user data from localStorage
 */
export const removeUser = () => {
  localStorage.removeItem(USER_KEY);
};

/**
 * Check if user is authenticated (has valid token)
 * @returns {boolean} - True if token exists
 */
export const isAuthenticated = () => {
  const token = getToken();
  return !!token;
};

/**
 * Parse JWT token payload without verification
 * @param {string} token - JWT token to parse
 * @returns {Object|null} - Decoded payload or null if invalid
 */
export const parseToken = (token) => {
  if (!token) return null;
  
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch (e) {
    return null;
  }
};

/**
 * Check if token is expired
 * @param {string} token - JWT token to check
 * @returns {boolean} - True if token is expired or invalid
 */
export const isTokenExpired = (token) => {
  const payload = parseToken(token);
  if (!payload || !payload.exp) return true;
  
  // exp is in seconds, Date.now() is in milliseconds
  return Date.now() >= payload.exp * 1000;
};

/**
 * Get user role from stored user data
 * @returns {string|null} - User role or null if not found
 */
export const getUserRole = () => {
  const user = getUser();
  return user?.role || null;
};

/**
 * Clear all authentication data (logout)
 */
export const clearAuth = () => {
  removeToken();
  removeUser();
};

/**
 * Store authentication data (login success)
 * @param {string} token - JWT token
 * @param {Object} user - User object
 */
export const setAuth = (token, user) => {
  setToken(token);
  setUser(user);
};

export default {
  setToken,
  getToken,
  removeToken,
  setUser,
  getUser,
  removeUser,
  isAuthenticated,
  parseToken,
  isTokenExpired,
  getUserRole,
  clearAuth,
  setAuth
};
