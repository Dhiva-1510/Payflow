import { Navigate, useLocation } from 'react-router-dom';
import { isAuthenticated, getUserRole, isTokenExpired, getToken } from '../utils/tokenManager';

/**
 * ProtectedRoute Component
 * Wrapper component for authentication and role-based route protection
 * Requirements: 7.7
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components to render if authorized
 * @param {string[]} [props.allowedRoles] - Array of roles allowed to access this route
 * @param {string} [props.redirectTo='/login'] - Path to redirect if not authenticated
 */
const ProtectedRoute = ({ 
  children, 
  allowedRoles = [], 
  redirectTo = '/login' 
}) => {
  const location = useLocation();
  const token = getToken();
  
  // Check if user is authenticated
  if (!isAuthenticated()) {
    // Redirect to login, preserving the attempted URL
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }
  
  // Check if token is expired
  if (token && isTokenExpired(token)) {
    return <Navigate to={redirectTo} state={{ from: location, expired: true }} replace />;
  }
  
  // Check role-based access if allowedRoles is specified
  if (allowedRoles.length > 0) {
    const userRole = getUserRole();
    
    if (!userRole || !allowedRoles.includes(userRole)) {
      // User doesn't have required role - redirect to unauthorized page or home
      return <Navigate to="/unauthorized" state={{ from: location }} replace />;
    }
  }
  
  // User is authenticated and authorized
  return children;
};

export default ProtectedRoute;
