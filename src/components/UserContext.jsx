// src/components/UserContext.jsx
import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useMsal } from '@azure/msal-react';
import { useNotification } from './NotificationContext';
import useUserManagement from '../hooks/useUserManagement';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const { instance, accounts } = useMsal();
  const { addNotification } = useNotification();
  const { 
    getOrCreateUser, 
    isLoading: isUserManagementLoading, 
    error: userManagementError,
    resetCounters,
    canProcessEmail 
  } = useUserManagement();

  // Estados existentes
  const [userInfo, setUserInfo] = useState(null);
  const [isLoadingUserInfo, setIsLoadingUserInfo] = useState(false);
  
  // Nuevos estados para user_id dinámico
  const [userId, setUserId] = useState(null);
  const [backendUserData, setBackendUserData] = useState(null);
  const [isLoadingUserId, setIsLoadingUserId] = useState(false);

  // 🚨 ESTADOS MEJORADOS PARA EVITAR BUCLE INFINITO
  const [isInitialized, setIsInitialized] = useState(false);
  const [lastProcessedEmail, setLastProcessedEmail] = useState(null);
  const [isFetching, setIsFetching] = useState(false);
  const [userSetupFailed, setUserSetupFailed] = useState(false); // NUEVO: marcar fallas permanentes
  const [lastFailureReason, setLastFailureReason] = useState(null); // NUEVO: razón del último fallo

  // 🚨 REF PARA PREVENIR MÚLTIPLES EJECUCIONES SIMULTÁNEAS
  const setupInProgressRef = useRef(false);
  const lastSetupAttemptRef = useRef(0);
  
  // 🚨 CONFIGURACIÓN DE COOLDOWNS
  const SETUP_COOLDOWN = 10000; // 10 segundos entre intentos de setup
  const MAX_SETUP_ATTEMPTS = 3; // Máximo 3 intentos totales

  useEffect(() => {
    const fetchUserInfo = async () => {
      // 🛡️ PROTECCIÓN BÁSICA - No hay cuentas autenticadas
      if (accounts.length === 0) {
        console.log('📭 No hay cuentas autenticadas, limpiando estado...');
        setUserInfo(null);
        setUserId(null);
        setBackendUserData(null);
        setIsLoadingUserInfo(false);
        setIsLoadingUserId(false);
        setIsInitialized(true);
        setUserSetupFailed(false);
        setLastFailureReason(null);
        return;
      }

      const currentEmail = accounts[0].username;
      const now = Date.now();

      // 🛡️ PROTECCIÓN - Usuario ya configurado correctamente
      if (isInitialized && 
          currentEmail === lastProcessedEmail && 
          userId !== null && 
          !userSetupFailed) {
        console.log('👤 Usuario ya configurado correctamente, omitiendo...');
        return;
      }

      // 🛡️ PROTECCIÓN - Setup falló anteriormente para este email
      if (userSetupFailed && currentEmail === lastProcessedEmail) {
        console.log(`🚫 Setup falló anteriormente para ${currentEmail}: ${lastFailureReason}`);
        return;
      }

      // 🛡️ PROTECCIÓN - Cooldown entre intentos
      if (now - lastSetupAttemptRef.current < SETUP_COOLDOWN) {
        console.log('⏰ Cooldown activo, omitiendo setup...');
        return;
      }

      // 🛡️ PROTECCIÓN - Setup ya en progreso
      if (setupInProgressRef.current || isFetching) {
        console.log('🔄 Setup ya en progreso, omitiendo...');
        return;
      }

      // 🛡️ PROTECCIÓN - Verificar si email puede ser procesado
      if (!canProcessEmail(currentEmail)) {
        console.log(`❌ Email ${currentEmail} está bloqueado temporalmente`);
        setUserSetupFailed(true);
        setLastFailureReason('Email bloqueado por exceso de reintentos');
        setIsInitialized(true);
        return;
      }

      // 🚨 INICIAR SETUP CON PROTECCIONES
      setupInProgressRef.current = true;
      lastSetupAttemptRef.current = now;
      setIsFetching(true);
      setIsLoadingUserInfo(true);
      setIsLoadingUserId(true);
      setUserSetupFailed(false);
      setLastFailureReason(null);
      
      try {
        console.log(`🚀 Iniciando setup para usuario: ${currentEmail}`);
        
        // Set active account if not already set
        instance.setActiveAccount(accounts[0]);
        
        // Get basic account info from Azure AD
        const azureUserInfo = {
          name: accounts[0].name || accounts[0].username.split('@')[0],
          username: accounts[0].username,
          tenantId: accounts[0].tenantId,
        };
        
        setUserInfo(azureUserInfo);
        console.log('✅ Información de Azure AD obtenida:', azureUserInfo);

        // Preparar datos para el backend
        const userDataForBackend = {
          name: azureUserInfo.name.split(' ')[0] || azureUserInfo.username.split('@')[0],
          family_name: azureUserInfo.name.split(' ').slice(1).join(' ') || 'Usuario',
          email: azureUserInfo.username,
          photo_url: " "
        };

        console.log('📝 Datos preparados para backend:', userDataForBackend);

        // 🚨 OBTENER TOKEN (OPCIONAL) - Si falla, continuar sin token
        let accessToken = null;
        try {
          const tokenResponse = await instance.acquireTokenSilent({
            scopes: ["User.Read"],
            account: accounts[0]
          });
          accessToken = tokenResponse.accessToken;
          console.log('🔑 Token Azure AD obtenido (puede no ser válido para backend)');
        } catch (tokenError) {
          console.log('ℹ️ No se pudo obtener token Azure AD, continuando sin token');
          console.log('   → useUserManagement intentará crear usuario sin autenticación');
          // No es un error crítico - continuar sin token
        }

        // Llamar a nuestro hook para obtener/crear usuario en el backend
        console.log('🔄 Obteniendo/creando usuario en backend...');
        
        try {
          const backendUser = await getOrCreateUser(userDataForBackend, accessToken);
          
          // ✅ ÉXITO - Almacenar datos del backend
          setBackendUserData(backendUser);
          setUserId(backendUser.id);
          setLastProcessedEmail(currentEmail);
          
          console.log('🎉 Usuario configurado correctamente:');
          console.log('- Azure AD:', azureUserInfo);
          console.log('- Backend User ID:', backendUser.id);
          console.log('- Backend User Data:', backendUser);

          addNotification(
            `¡Bienvenido ${backendUser.name}! Usuario configurado correctamente.`,
            'success'
          );

        } catch (userManagementError) {
          // 🚨 ERROR EN GESTIÓN DE USUARIO
          console.error('❌ Error en gestión de usuario:', userManagementError);
          
          let errorMessage = 'Error al configurar el usuario';
          let isPermanentFailure = false;
          
          if (userManagementError.message.includes('No tienes permisos')) {
            errorMessage = 'No tienes permisos para acceder al sistema. Contacta al administrador.';
            isPermanentFailure = true;
          } else if (userManagementError.message.includes('temporalmente bloqueado')) {
            errorMessage = 'Demasiados intentos fallidos. Intenta de nuevo más tarde.';
            isPermanentFailure = true;
          } else if (userManagementError.message.includes('No se puede conectar')) {
            errorMessage = 'No se puede conectar al servidor. Verifica tu conexión.';
            isPermanentFailure = false; // Puede ser temporal
          } else {
            errorMessage = `Error de configuración: ${userManagementError.message}`;
            isPermanentFailure = false;
          }
          
          addNotification(errorMessage, 'error');
          
          // Marcar como fallo si es permanente
          if (isPermanentFailure) {
            setUserSetupFailed(true);
            setLastFailureReason(errorMessage);
            setLastProcessedEmail(currentEmail);
          }
          
          // Limpiar estados en caso de error
          setUserId(null);
          setBackendUserData(null);
          
          // Si no es fallo permanente, permitir reintento en siguiente login
          if (!isPermanentFailure) {
            setLastProcessedEmail(null);
          }
        }

      } catch (error) {
        console.error('❌ Error general en fetchUserInfo:', error);
        
        const errorMessage = `Error inesperado: ${error.message}`;
        addNotification(errorMessage, 'error');
        
        // Limpiar estados
        setUserId(null);
        setBackendUserData(null);
        setLastProcessedEmail(null); // Permitir reintento
        
      } finally {
        setIsLoadingUserInfo(false);
        setIsLoadingUserId(false);
        setIsFetching(false);
        setIsInitialized(true);
        setupInProgressRef.current = false; // 🛡️ LIBERAR LOCK
      }
    };

    fetchUserInfo();
  }, [accounts, instance, addNotification, getOrCreateUser, userManagementError, canProcessEmail]);

  const logout = async () => {
    try {
      console.log('🚪 Cerrando sesión...');
      
      // Limpiar estados locales antes del logout
      setUserInfo(null);
      setUserId(null);
      setBackendUserData(null);
      setUserSetupFailed(false);
      setLastFailureReason(null);
      setLastProcessedEmail(null);
      setIsInitialized(false);
      
      // Resetear contadores del hook de user management
      resetCounters();
      
      await instance.logoutPopup({
        postLogoutRedirectUri: window.location.origin,
      });
    } catch (error) {
      console.error('❌ Error en logout:', error);
      addNotification('Error al cerrar sesión', 'error');
    }
  };

  // 🚨 FUNCIÓN DE REINICIO MANUAL (para debugging o admin)
  const retryUserSetup = useCallback(() => {
    console.log('🔄 Reintentando setup de usuario manualmente...');
    setUserSetupFailed(false);
    setLastFailureReason(null);
    setLastProcessedEmail(null);
    setIsInitialized(false);
    resetCounters();
  }, [resetCounters]);

  // Determinar estado de carga general
  const isLoading = isLoadingUserInfo || isLoadingUserId || isUserManagementLoading;

  // Función helper para componentes que necesiten verificar si el usuario está completamente configurado
  const isUserReady = () => {
    return userInfo && userId && backendUserData && !isLoading && !userSetupFailed;
  };

  const contextValue = {
    // Estados existentes
    userInfo, 
    isLoadingUserInfo, 
    logout,
    
    // Nuevos estados para user_id dinámico
    userId,                    // ID del usuario en nuestro backend
    backendUserData,          // Datos completos del usuario desde nuestro backend
    isLoadingUserId,          // Estado de carga específico para user_id
    isLoading,                // Estado de carga general
    isUserReady,              // Función para verificar si el usuario está completamente configurado
    
    // Estados de error mejorados
    userManagementError,      // Errores del useUserManagement
    userSetupFailed,          // Indica si el setup falló permanentemente
    lastFailureReason,        // Razón del último fallo
    
    // 🚨 NUEVAS UTILIDADES
    retryUserSetup,           // Función para reintentar setup manualmente
  };

  return (
    <UserContext.Provider value={contextValue}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);

export default UserContext;