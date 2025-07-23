// UserContext.jsx - Versión corregida
import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useMsal } from '@azure/msal-react';
import { useNotification } from './NotificationContext';
import useUserManagement from '../hooks/useUserManagement';
import PermissionDeniedModal from './PermissionDeniedModal';

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

  const [showPermissionDeniedModal, setShowPermissionDeniedModal] = useState(false);

  // Estados existentes
  const [userInfo, setUserInfo] = useState(null);
  const [isLoadingUserInfo, setIsLoadingUserInfo] = useState(false);
  
  // Nuevos estados para user_id dinámico
  const [userId, setUserId] = useState(null);
  const [backendUserData, setBackendUserData] = useState(null);
  const [isLoadingUserId, setIsLoadingUserId] = useState(false);

  // Estados mejorados para evitar bucle infinito
  const [isInitialized, setIsInitialized] = useState(false);
  const [lastProcessedEmail, setLastProcessedEmail] = useState(null);
  const [isFetching, setIsFetching] = useState(false);
  const [userSetupFailed, setUserSetupFailed] = useState(false);
  const [lastFailureReason, setLastFailureReason] = useState(null);

  // Ref para prevenir múltiples ejecuciones simultáneas
  const setupInProgressRef = useRef(false);
  const lastSetupAttemptRef = useRef(0);
  
  // Configuración de cooldowns
  const SETUP_COOLDOWN = 10000; // 10 segundos entre intentos de setup
  const MAX_SETUP_ATTEMPTS = 3; // Máximo 3 intentos totales

  useEffect(() => {
    const fetchUserInfo = async () => {
      // Protección básica - No hay cuentas autenticadas
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

      // Protección - Usuario ya configurado correctamente
      if (isInitialized && 
          currentEmail === lastProcessedEmail && 
          userId !== null && 
          !userSetupFailed) {
        console.log('👤 Usuario ya configurado correctamente, omitiendo...');
        return;
      }

      // Protección - Setup falló anteriormente para este email
      if (userSetupFailed && currentEmail === lastProcessedEmail) {
        console.log(`🚫 Setup falló anteriormente para ${currentEmail}: ${lastFailureReason}`);
        return;
      }

      // Protección - Cooldown entre intentos
      if (now - lastSetupAttemptRef.current < SETUP_COOLDOWN) {
        console.log('⏰ Cooldown activo, omitiendo setup...');
        return;
      }

      // Protección - Setup ya en progreso
      if (setupInProgressRef.current) {
        console.log('🔄 Setup ya en progreso, omitiendo...');
        return;
      }

      try {
        setupInProgressRef.current = true;
        lastSetupAttemptRef.current = now;
        
        console.log(`🚀 Iniciando setup para usuario: ${currentEmail}`);
        setIsLoadingUserInfo(true);
        setIsLoadingUserId(true);
        setUserSetupFailed(false);
        setLastFailureReason(null);

        // Obtener información de Azure AD
        const azureUserInfo = {
          name: accounts[0].name,
          username: accounts[0].username,
          tenantId: accounts[0].tenantId,
        };

        console.log('✅ Información de Azure AD obtenida:', azureUserInfo);
        setUserInfo(azureUserInfo);

        // Preparar datos para el backend
        const nameParts = azureUserInfo.name.split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ');

        const userDataForBackend = {
          name: firstName,
          family_name: lastName,
          email: azureUserInfo.username,
          photo_url: " "
        };

        console.log('📝 Datos preparados para backend:', userDataForBackend);

        // Obtener token (opcional)
        let accessToken = null;
        try {
          const tokenResponse = await instance.acquireTokenSilent({
            scopes: ["User.Read"],
            account: accounts[0]
          });
          accessToken = tokenResponse.accessToken;
          console.log('🔑 Token Azure AD obtenido');
        } catch (tokenError) {
          console.log('ℹ️ No se pudo obtener token Azure AD, continuando sin token');
        }

        console.log('🔄 Obteniendo/creando usuario en backend...');
        
        try {
          const backendUser = await getOrCreateUser(userDataForBackend, accessToken);
          
          // Éxito - Almacenar datos del backend
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
          // Error en gestión de usuario
          console.error('❌ Error en gestión de usuario:', userManagementError);
          
          let errorMessage = 'Error al configurar el usuario';
          let isPermanentFailure = false;
          let isPermissionDenied = false;

          if (userManagementError.message.includes('PERMISSION_DENIED')) {
            console.log('🚫 Error de permisos detectado');
            isPermissionDenied = true;
            isPermanentFailure = true;
            try {
              await instance.clearCache();
              console.log('🧹 Cache de MSAL limpiado por falta de permisos');
            } catch (clearError) {
              console.warn('⚠️ Error al limpiar cache de MSAL:', clearError);
            }
            setShowPermissionDeniedModal(true);
            setUserSetupFailed(true);
            setLastFailureReason('Sin permisos para acceder a NAIA');
            setLastProcessedEmail(currentEmail);
            
          } else if (userManagementError.message.includes('No tienes permisos')) {
            errorMessage = 'No tienes permisos para acceder al sistema. Contacta al administrador.';
            isPermanentFailure = true;
          } else if (userManagementError.message.includes('temporalmente bloqueado')) {
            errorMessage = 'Demasiados intentos fallidos. Intenta de nuevo más tarde.';
            isPermanentFailure = true;
          } else if (userManagementError.message.includes('No se puede conectar')) {
            errorMessage = 'No se puede conectar al servidor. Verifica tu conexión.';
          }

          if (isPermanentFailure && !isPermissionDenied) {
            setUserSetupFailed(true);
            setLastFailureReason(errorMessage);
            setLastProcessedEmail(currentEmail);
          }

          if (!isPermissionDenied) {
            addNotification(errorMessage, 'error');
          }
          
          throw userManagementError;
        }

      } catch (error) {
        console.error('❌ Error general en setup:', error);
      } finally {
        setIsLoadingUserInfo(false);
        setIsLoadingUserId(false);
        setIsInitialized(true);
        setupInProgressRef.current = false;
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

  // Función de reinicio manual
  const retryUserSetup = useCallback(() => {
    console.log('🔄 Reintentando setup de usuario manualmente...');
    setUserSetupFailed(false);
    setLastFailureReason(null);
    setLastProcessedEmail(null);
    setIsInitialized(false);
    resetCounters();
  }, [resetCounters]);

  const closePermissionDeniedModal = () => {
    setShowPermissionDeniedModal(false);
  };

  // Determinar estado de carga general
  const isLoading = isLoadingUserInfo || isLoadingUserId || isUserManagementLoading;

  // Función helper para verificar si el usuario está completamente configurado
  const isUserReady = () => {
    return userInfo && userId && backendUserData && !isLoading && !userSetupFailed;
  };

  // ✅ ESTRUCTURA CORRECTA: Incluir TODOS los valores directamente en el value
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
    
    // Nuevas utilidades
    retryUserSetup,           // Función para reintentar setup manualmente
    
    // 🚨 AÑADIR LOS ESTADOS DEL MODAL DIRECTAMENTE AQUÍ
    showPermissionDeniedModal,
    closePermissionDeniedModal,
    
    // Para compatibilidad con ProtectedRouteWrapper
    isAuthenticated: accounts.length > 0
  };

  return (
    <UserContext.Provider value={contextValue}>
      {children}
      
      <PermissionDeniedModal 
        isOpen={showPermissionDeniedModal}
        onClose={closePermissionDeniedModal}
      />
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);

export default UserContext;