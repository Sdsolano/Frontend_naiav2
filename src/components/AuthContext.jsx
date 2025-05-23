// AuthContext.jsx - Versión corregida
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useMsal, useIsAuthenticated } from '@azure/msal-react';
import { InteractionStatus } from '@azure/msal-browser';
import { loginRequest } from '../authConfig';
import { useNotification } from './NotificationContext';
import { msalConfig } from '../authConfig';

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
      
      // También limpiar el timeout por si acaso
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

useEffect(() => {
  // Verificar si venimos de una redirección MSAL
  const isRedirectCallback = window.location.hash.includes("id_token") || 
                            window.location.hash.includes("access_token") ||
                            window.location.hash.includes("code=");
                            
  // Si no es una redirección, resetear la bandera para permitir futuras redirecciones
  if (!isRedirectCallback) {
    redirectHandledRef.current = false;
  }
}, []);

  // Añadir este useEffect al AuthProvider
const redirectHandledRef = useRef(false);

useEffect(() => {
  const handleRedirectResult = async () => {
    // Solo procesar una vez por sesión
    if (redirectHandledRef.current) {
      return;
    }
    
    // Solo procesar cuando no hay ninguna interacción en curso
    if (inProgress !== InteractionStatus.None) {
      return;
    }
    
    try {
      // Marcar como procesado antes de hacer nada más
      redirectHandledRef.current = true;
      
      console.log("🔄 Procesando resultado de redirección...");
      
      // Intentar procesar el resultado de la redirección
      const result = await instance.handleRedirectPromise();
      
      console.log("📋 Resultado de handleRedirectPromise:", result);
      
      if (result) {
        console.log("✅ Login exitoso mediante redirect", result);
        
        // Si hay una cuenta, establecerla como activa
        if (result.account) {
          instance.setActiveAccount(result.account);
          console.log("👤 Cuenta activa establecida:", result.account.name);
          
          // Cerrar modal de login si está abierto
          setIsLoginModalOpen(false);
          
          // Verificar si hay una acción pendiente guardada en localStorage
          const hasPendingAction = localStorage.getItem('naia_auth_pending');
          
          if (hasPendingAction) {
            console.log("📦 Acción pendiente encontrada en localStorage");
            localStorage.removeItem('naia_auth_pending');
            
            // Verificar si hay una ruta guardada
            const savedRoute = localStorage.getItem('naia_auth_route');
            if (savedRoute) {
              console.log("🚀 Navegando a ruta guardada:", savedRoute);
              localStorage.removeItem('naia_auth_route');
              
              // Navegar a la ruta guardada sin recargar
              window.history.replaceState({}, '', savedRoute);
            } else if (pendingAction && typeof pendingAction === 'function') {
              // Ejecutar la función pendiente si existe
              console.log("🎯 Ejecutando acción pendiente");
              setTimeout(() => {
                pendingAction();
                setPendingAction(null);
              }, 100);
            }
          }
          
          addNotification("Sesión iniciada correctamente", "success");
          
          // Limpiar la URL de parámetros de autenticación
          const cleanUrl = window.location.origin + window.location.pathname;
          window.history.replaceState({}, document.title, cleanUrl);
        }
      } else {
        console.log("ℹ️ No hay resultado de redirect - primera carga normal");
      }
    } catch (error) {
      console.error("❌ Error al manejar redirección:", error);
      
      // Solo mostrar error si realmente parece ser un problema de autenticación
      if (error.message && (
          error.message.includes("AADSTS") || 
          error.message.includes("authentication") ||
          error.message.includes("login"))) {
        addNotification("Error al procesar la autenticación: " + error.message, "error");
      } else {
        console.log("ℹ️ Error menor en redirect handling, ignorando:", error.message);
      }
    }
  };
  
  // Solo ejecutar si estamos en el navegador
  if (typeof window !== 'undefined') {
    // Pequeño delay para asegurar que MSAL esté completamente inicializado
    const timeoutId = setTimeout(handleRedirectResult, 100);
    
    return () => {
      clearTimeout(timeoutId);
    };
  }
}, [inProgress, pendingAction, addNotification]); 
  
const checkAndEstablishSession = async () => {
  const accounts = instance.getAllAccounts();
  if (accounts.length > 0) {
    try {
      console.log("Encontrada sesión existente, configurando...");
      instance.setActiveAccount(accounts[0]);
      // Verificar si podemos obtener token silenciosamente
      await instance.acquireTokenSilent({
        ...loginRequest,
        account: accounts[0]
      });
      
      // Si llegamos aquí sin error, la sesión está activa
      addNotification("Sesión recuperada", "success");
    } catch (error) {
      console.warn("Error verificando sesión existente:", error);
    }
  }
};

// Usar en useEffect
useEffect(() => {
  checkAndEstablishSession();
}, []);
  // Función para limpiar datos de autenticación
// Función mejorada para limpiar datos de autenticación
const clearAllAuthData = () => {
  console.log("Iniciando limpieza completa de datos de autenticación");
  
  // Lista ampliada de términos específicos de MSAL para buscar en cookies
  const authTerms = [
    'msal.', 'login.windows', 'microsoft', 'auth', 'token', 
    'MSAL', '.auth', 'bearer', 'id_token', 'client.info',
    'ADAL', 'adal', 'x-ms-', 'msaltoken', 'msft', 'msal.client.info',
    'msal.idtoken', 'x-client-', 'XSRF', 'xsrf', 'ts_c', 'MUID',
    'ESTSAUTHPERSISTENT'
  ];
  
  // Función específica para limpiar cookies de forma más agresiva
  const clearMsalCookies = () => {
    try {
      // Primera pasada: limpieza agresiva de todas las cookies por nombre
      const cookies = document.cookie.split(';');
      
      cookies.forEach(function(cookie) {
        const cookieParts = cookie.split('=');
        const cookieName = cookieParts[0].trim();
        
        // Limpiar cookies MSAL por nombre
        if (authTerms.some(term => cookieName.toLowerCase().includes(term.toLowerCase()))) {
          console.log(`Eliminando cookie MSAL: ${cookieName}`);
          
          // Eliminar con todas las combinaciones posibles de path y domain
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`;
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${window.location.hostname};`;
        }
      });
      
      // Segunda pasada: limpieza forzada de cookies de Microsoft/MSAL conocidas
      const knownMsalCookies = [
        'ESTSAUTHPERSISTENT', 'ESTSAUTH', 'ESTSAUTHLIGHT', 'ESTSSC', 'ESTSSSO',
        'ESTSSESSION', 'ESTSINFLOW', 'ESTSCTX', 'ESTSREFRESH', 'x-ms-gateway-slice',
        'stsservicecookie', 'x-ms-cpim-rc', 'x-ms-cpim-trans', 'x-ms-cpim-csrf'
      ];
      
      knownMsalCookies.forEach(cookieName => {
        // Eliminar con todas las combinaciones posibles
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`;
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${window.location.hostname};`;
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=login.microsoftonline.com;`;
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.login.microsoftonline.com;`;
      });
    } catch (e) {
      console.error("Error limpiando cookies MSAL:", e);
    }
  };
  
  // Limpiar localStorage
  try {
    // Primero intentamos limpiar con MSAL API directamente
    try {
      if (instance && typeof instance.clearCache === 'function') {
        instance.clearCache();
        console.log("Cache MSAL limpiada mediante API");
      }
    } catch (e) {
      console.error("Error al limpiar cache con API MSAL:", e);
    }
    
    // Limpieza manual de localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        if (authTerms.some(term => key.toLowerCase().includes(term.toLowerCase()))) {
          console.log(`Eliminando del localStorage: ${key}`);
          localStorage.removeItem(key);
          i--; // Ajustar índice
        }
      }
    }
  } catch (e) {
    console.error("Error limpiando localStorage:", e);
  }
  
  // Limpiar sessionStorage
  try {
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key) {
        if (authTerms.some(term => key.toLowerCase().includes(term.toLowerCase()))) {
          console.log(`Eliminando del sessionStorage: ${key}`);
          sessionStorage.removeItem(key);
          i--;
        }
      }
    }
  } catch (e) {
    console.error("Error limpiando sessionStorage:", e);
  }
  
  // Limpiar cookies MSAL
  clearMsalCookies();
  
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
    
    console.log("🔄 Usando redirect para autenticación...");
    
    // Guardar información de pendingAction en localStorage
    if (pendingAction) {
      localStorage.setItem('naia_auth_pending', 'true');
      if (window.location.pathname.includes('/naia')) {
        localStorage.setItem('naia_auth_route', window.location.pathname);
      }
    }
    
    // Mostrar notificación al usuario
    addNotification("Redirigiendo para autenticación...", "info");
    
    // Usar redirect siempre (funciona tanto con aplicaciones SPA como Web)
    await instance.loginRedirect({
      ...loginRequest,
      redirectUri: window.location.origin,
      prompt: loginAttempts > 0 ? "select_account" : undefined
    });
    
    // El código después de loginRedirect no se ejecutará
    
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
  
  // Método mejorado para cerrar sesión y limpiar datos
const handleLogout = async () => {
  try {
    // Marcar como manejado para evitar bucles de redirección
    redirectHandledRef.current = true;
    
    console.log("Iniciando proceso de cierre de sesión...");
    
    // Guardar referencia al account actual antes de logout
    const currentAccount = instance.getActiveAccount();
    
    // Realizar una limpieza completa antes del logout oficial
    clearAllAuthData();
    
    // Mostrar el overlay actual para feedback visual
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
    
    // Solo intentar el logout de MSAL si hay una cuenta activa
    if (currentAccount) {
      try {
        // Usar logoutRedirect en lugar de logout para consistencia con el enfoque de redirección
        await instance.logoutRedirect({
          account: currentAccount,
          postLogoutRedirectUri: window.location.origin,
          onRedirectNavigate: () => {
            // Prevenir la navegación automática del SDK para manejarla nosotros
            // Esto nos permite hacer limpieza y mostrar feedback
            return false;
          }
        });
      } catch (logoutError) {
        console.warn("Error en logout de MSAL, continuando con limpieza manual:", logoutError);
      }
    } else {
      console.log("No hay cuenta activa, realizando solo limpieza local");
    }
    
    // Asegurarnos de que cualquier estado pendiente se limpie
    setPendingAction(null);
    localStorage.removeItem('naia_auth_pending');
    localStorage.removeItem('naia_auth_route');
    
    // SOLUCIÓN CLAVE: Reinicio completo forzado - genera una URL única para evitar caché
    const timestamp = Date.now();
    const cleanUrl = window.location.origin + window.location.pathname.split('?')[0]; // URL sin parámetros
    const reloadUrl = `${cleanUrl}?reload=${timestamp}`; // Añadir parámetro único
    
    console.log(`Redirigiendo a: ${reloadUrl} para reinicio completo`);
    
    // Esperar un momento para que el usuario vea el overlay
    setTimeout(() => {
      window.location.href = reloadUrl;
    }, 1500);
    
  } catch (error) {
    console.error("Error general en cierre de sesión:", error);
    addNotification("Error al cerrar sesión. Recargando página...", "error");
    
    // Recargar de todas formas con timestamp para forzar recarga
    const timestamp = Date.now();
    window.location.href = `${window.location.origin}?reload=${timestamp}`;
  }
};

  useEffect(() => {
    // Verificar si estamos cargando después de un cierre de sesión (parámetro reload)
    const params = new URLSearchParams(window.location.search);
    const isReloading = params.has('reload');
    
    if (isReloading) {
      console.log("Detectada carga después de cierre de sesión - realizando limpieza adicional");
      
      // Limpiar cualquier estado residual
      clearAllAuthData();
      
      // Limpiar la URL (eliminar parámetro reload)
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
      
      // Mostrar notificación al usuario
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