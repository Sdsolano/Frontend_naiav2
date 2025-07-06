// AuthGuard.jsx
import React, { useEffect } from 'react';
import { useAuth } from './AuthContext';

const AuthGuard = ({ children }) => {
  const { isAuthenticated, openLoginModal } = useAuth();
  
  useEffect(() => {
    if (!isAuthenticated) {
      // En lugar de redirigir, abrimos el modal
      openLoginModal();
    }
  }, [isAuthenticated, openLoginModal]);

  return isAuthenticated ? children : null;
};

export default AuthGuard;