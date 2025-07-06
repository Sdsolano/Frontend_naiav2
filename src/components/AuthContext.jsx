// AuthContext.jsx - Versión simplificada sin handleRedirectPromise duplicado
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useMsal, useIsAuthenticated } from '@azure/msal-react';
import { InteractionStatus } from '@azure/msal-browser';
import { loginRequest } from '../authConfig';
import { useNotification } from './NotificationContext';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const { instance, inProgress } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const { addNotification } = useNotification();
  
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  
  // Ref para manejar temporizadores de seguridad
  const safetyTimeoutRef = useRef(null);
  
  // Cerrar el modal si el usuario se autentica
  useEffect(() => {
    if (isAuthenticated && isLoginModalOpen) {
      setIsLoginModalOpen(false);
      
      // Ejecutar acción pendiente si existe
      if (pendingAction && typeof pendingAction === 'function') {
        setTimeout(() => {
          pendingAction();
          setPendingAction(null);
        }, 100);
      }
    }
  }, [isAuthenticated, isLoginModalOpen, pendingAction]);
  
  // Resetear estado de login cuando la interacción termina
  useEffect(() => {
    if (inProgress === InteractionStatus.None && isLoggingIn) {
      setIsLoggingIn(false);
      
      if (safetyTimeoutRef.current) {
        clearTimeout(safetyTimeoutRef.current);
        safetyTimeoutRef.current = null;
      }
    }
  }, [inProgress, isLoggingIn]);
  
  // Limpieza al desmontar
  useEffect(() => {
    return () => {
      if (safetyTimeoutRef.current) {
        clearTimeout(safetyTimeoutRef.current);
        safetyTimeoutRef.current = null;
      }
    };
  }, []);
  
  // Función para abrir el modal con una acción pendiente
  const openLoginModal = (onSuccessAction) => {
    if (onSuccessAction) {
      setPendingAction(() => onSuccessAction);
    }
    setIsLoginModalOpen(true);
  };
  
  // Cerrar el modal
  const closeLoginModal = () => {
    setIsLoginModalOpen(false);
    setPendingAction(null);
  };

  // REMOVIDO: handleRedirectPromise logic (ahora se maneja en main.jsx)
  
  // Función para limpiar datos de autenticación
  const clearAllAuthData = () => {
    console.log("Iniciando limpieza completa de datos de autenticación");
    
    const authTerms = [
      'msal.', 'login.windows', 'microsoft', 'auth', 'token', 
      'MSAL', '.auth', 'bearer', 'id_token', 'client.info',
      'ADAL', 'adal', 'x-ms-', 'msaltoken', 'msft', 'msal.client.info',
      'msal.idtoken', 'x-client-', 'XSRF', 'xsrf', 'ts_c', 'MUID',
      'ESTSAUTHPERSISTENT'
    ];
    
    // Limpiar localStorage
    try {
      if (instance && typeof instance.clearCache === 'function') {
        instance.clearCache();
        console.log("Cache MSAL limpiada mediante API");
      }
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && authTerms.some(term => key.toLowerCase().includes(term.toLowerCase()))) {
          console.log(`Eliminando del localStorage: ${key}`);
          localStorage.removeItem(key);
          i--;
        }
      }
    } catch (e) {
      console.error("Error limpiando localStorage:", e);
    }
    
    // Limpiar sessionStorage
    try {
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && authTerms.some(term => key.toLowerCase().includes(term.toLowerCase()))) {
          console.log(`Eliminando del sessionStorage: ${key}`);
          sessionStorage.removeItem(key);
          i--;
        }
      }
    } catch (e) {
      console.error("Error limpiando sessionStorage:", e);
    }
    
    // Limpiar cookies
    try {
      const cookies = document.cookie.split(';');
      cookies.forEach(function(cookie) {
        const cookieParts = cookie.split('=');
        const cookieName = cookieParts[0].trim();
        
        if (authTerms.some(term => cookieName.toLowerCase().includes(term.toLowerCase()))) {
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`;
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${window.location.hostname};`;
        }
      });
    } catch (e) {
      console.error("Error limpiando cookies MSAL:", e);
    }
    
    console.log("Limpieza de datos de autenticación completada");
    return true;
  };
  
  // Iniciar el proceso de login
  const handleLogin = async () => {
    if (isLoggingIn || inProgress !== InteractionStatus.None) {
      console.log("Login ya en progreso, ignorando solicitud");
      return;
    }
    
    try {
      setLoginAttempts(prev => prev + 1);
      setIsLoggingIn(true);
      
      console.log("🔄 Iniciando proceso de login...");
      
      // Guardar información de pendingAction en localStorage
      if (pendingAction) {
        localStorage.setItem('naia_auth_pending', 'true');
        if (window.location.pathname.includes('/naia')) {
          localStorage.setItem('naia_auth_route', window.location.pathname);
        }
      }
      
      // Mostrar notificación al usuario
      addNotification("Redirigiendo para autenticación...", "info");
      
      // Usar redirect (mejor para SPA timing)
      await instance.loginRedirect({
        ...loginRequest,
        redirectUri: window.location.origin,
        prompt: loginAttempts > 0 ? "select_account" : undefined
      });
      
    } catch (error) {
      console.error("❌ Error en login redirect:", error);
      
      let errorMessage = "Error al iniciar sesión. Por favor inténtalo de nuevo.";
      if (error.message && error.message.includes("AADSTS")) {
        errorMessage = `Error de autenticación: ${error.message}`;
      }
      
      addNotification(errorMessage, "error");
      setIsLoggingIn(false);
    }
  };
  
  // Método para cerrar sesión
  const handleLogout = async () => {
    try {
      console.log("Iniciando proceso de cierre de sesión...");
      
      const currentAccount = instance.getActiveAccount();
      clearAllAuthData();
      
      const logoutOverlay = document.createElement('div');
      logoutOverlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(255,255,255,0.9);display:flex;align-items:center;justify-content:center;z-index:9999;flex-direction:column;font-family:system-ui;';
      logoutOverlay.innerHTML = `
        <div style="background:white;padding:20px;border-radius:10px;box-shadow:0 0 10px rgba(0,0,0,0.1);text-align:center;max-width:400px;">
          <h3 style="margin-top:0;color:#333;">Cerrando sesión...</h3>
          <p style="margin-bottom:20px;">Por favor, espere mientras se cierra la sesión.</p>
          <div style="width:40px;height:40px;border:4px solid #f3f3f3;border-top:4px solid #3498db;border-radius:50%;margin:0 auto;animation:spin 1s linear infinite;"></div>
        </div>
        <style>@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}</style>
      `;
      document.body.appendChild(logoutOverlay);
      
      if (currentAccount) {
        try {
          await instance.logoutRedirect({
            account: currentAccount,
            postLogoutRedirectUri: window.location.origin,
            onRedirectNavigate: () => false
          });
        } catch (logoutError) {
          console.warn("Error en logout de MSAL, continuando con limpieza manual:", logoutError);
        }
      }
      
      setPendingAction(null);
      localStorage.removeItem('naia_auth_pending');
      localStorage.removeItem('naia_auth_route');
      
      const timestamp = Date.now();
      const cleanUrl = window.location.origin + window.location.pathname.split('?')[0];
      const reloadUrl = `${cleanUrl}?reload=${timestamp}`;
      
      setTimeout(() => {
        window.location.href = reloadUrl;
      }, 1500);
      
    } catch (error) {
      console.error("Error general en cierre de sesión:", error);
      addNotification("Error al cerrar sesión. Recargando página...", "error");
      
      const timestamp = Date.now();
      window.location.href = `${window.location.origin}?reload=${timestamp}`;
    }
  };

  // Verificar si estamos cargando después de un cierre de sesión
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isReloading = params.has('reload');
    
    if (isReloading) {
      console.log("Detectada carga después de cierre de sesión - realizando limpieza adicional");
      clearAllAuthData();
      
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
      
      addNotification("Sesión cerrada correctamente", "success");
    }
  }, []);
  
  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      isLoginModalOpen,
      isLoggingIn,
      inProgress,
      openLoginModal,
      closeLoginModal,
      handleLogin,
      handleLogout,
      clearAllAuthData,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);