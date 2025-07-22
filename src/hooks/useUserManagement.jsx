//src/hooks/useUserManagement.jsx - VERSIÓN CON TOKEN INTEGRADO
import { useState, useCallback } from 'react';
import { BACKEND_URL } from "../../config";

const useUserManagement = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Estados de control de reintentos (mantener las protecciones anti-bucle)
  const [failedAttempts, setFailedAttempts] = useState(new Map());
  const [blacklistedEmails, setBlacklistedEmails] = useState(new Set());

  const MAX_RETRIES = 2;
  const RETRY_COOLDOWN = 5 * 60 * 1000; // 5 minutos
  const BLACKLIST_DURATION = 30 * 60 * 1000; // 30 minutos

  const canProcessEmail = useCallback((email) => {
    if (blacklistedEmails.has(email)) {
      console.log(`❌ Email ${email} está en blacklist temporal`);
      return false;
    }

    const attempts = failedAttempts.get(email);
    if (attempts && attempts.count >= MAX_RETRIES) {
      const timeSinceLastAttempt = Date.now() - attempts.lastAttempt;
      if (timeSinceLastAttempt < RETRY_COOLDOWN) {
        console.log(`❌ Email ${email} ha excedido reintentos, cooldown activo`);
        return false;
      } else {
        setFailedAttempts(prev => {
          const newMap = new Map(prev);
          newMap.delete(email);
          return newMap;
        });
      }
    }
    return true;
  }, [blacklistedEmails, failedAttempts]);

  const recordFailedAttempt = useCallback((email, isAuthError = false) => {
    setFailedAttempts(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(email) || { count: 0, lastAttempt: 0 };
      
      newMap.set(email, {
        count: current.count + 1,
        lastAttempt: Date.now()
      });
      
      return newMap;
    });

    if (isAuthError) {
      setBlacklistedEmails(prev => new Set([...prev, email]));
      setTimeout(() => {
        setBlacklistedEmails(prev => {
          const newSet = new Set(prev);
          newSet.delete(email);
          return newSet;
        });
      }, BLACKLIST_DURATION);
    }
  }, []);

  /**
   * 🆕 NUEVA FUNCIÓN: Enviar token del usuario al backend
   */
  const sendUserToken = useCallback(async (userId, token) => {
    if (!userId || !token) {
      throw new Error('User ID y token son requeridos');
    }

    try {
      console.log(`🔐 Enviando token al backend para user ID: ${userId}`);
      
      const response = await fetch(`${BACKEND_URL}/api/v1/users/token/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          token: token
        }),
      });

      if (response.status === 200) {
        const result = await response.json();
        console.log(`✅ Token enviado exitosamente:`, result);
        return result;
      } else if (response.status === 400) {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = `Error 400 enviando token: ${errorData.status || 'Invalid user ID or token'}`;
        console.log(`❌ ${errorMsg}`);
        throw new Error(errorMsg);
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = `Error ${response.status} enviando token: ${errorData.status || 'Error desconocido'}`;
        console.log(`❌ ${errorMsg}`);
        throw new Error(errorMsg);
      }
    } catch (error) {
      console.error('❌ Error en sendUserToken:', error);
      
      if (error.message.includes('Failed to fetch') || error.message.includes('ERR_CONNECTION_REFUSED')) {
        throw new Error('No se puede conectar al servidor para enviar el token. Verifica que el backend esté ejecutándose.');
      }
      
      throw error;
    }
  }, []);

  /**
   * Buscar usuario por email - SIN CAMBIOS (no necesita token)
   */
  const getUserByEmail = useCallback(async (email) => {
    if (!email) {
      throw new Error('Email es requerido');
    }

    if (!canProcessEmail(email)) {
      throw new Error(`Email ${email} temporalmente bloqueado por exceso de reintentos`);
    }

    try {
      console.log(`🔍 Buscando usuario por email: ${email}`);
      
      const response = await fetch(`${BACKEND_URL}/api/v1/users/get/?email=${encodeURIComponent(email)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 200) {
        const userData = await response.json();
        console.log(`✅ Usuario encontrado:`, userData);
        return userData;
      } else if (response.status === 404) {
        console.log(`❌ Usuario no encontrado para email: ${email}`);
        return null;
      } else if (response.status === 500) {
        console.log(`❌ Error 500 - Usuario no encontrado para email: ${email} (backend lanza excepción)`);
        
        try {
          const errorText = await response.text();
          if (errorText.includes('does not exist') || errorText.includes('DoesNotExist')) {
            console.log(`🔄 Error 500 identificado como "usuario no existe", tratando como 404`);
            return null;
          }
        } catch (parseError) {
          console.warn('No se pudo parsear error 500:', parseError);
        }
        
        recordFailedAttempt(email);
        throw new Error(`Error del servidor: ${response.status}`);
      } else {
        const errorData = await response.json().catch(() => ({}));
        recordFailedAttempt(email);
        throw new Error(`Error al buscar usuario: ${response.status} - ${errorData.status || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error('❌ Error en getUserByEmail:', error);
      
      if (error.message.includes('Failed to fetch') || error.message.includes('ERR_CONNECTION_REFUSED')) {
        recordFailedAttempt(email);
        throw new Error('No se puede conectar al servidor. Verifica que el backend esté ejecutándose.');
      }
      
      throw error;
    }
  }, [canProcessEmail, recordFailedAttempt]);

  /**
   * Crear un nuevo usuario - 🚨 NUEVO: INTENTAR SIN TOKEN PRIMERO
   */
  const createUser = useCallback(async (userData, token = null) => {
    if (!userData.name || !userData.family_name || !userData.email) {
      throw new Error('Name, family_name y email son requeridos');
    }

    if (!canProcessEmail(userData.email)) {
      throw new Error(`Email ${userData.email} temporalmente bloqueado por exceso de reintentos`);
    }

    // 🚨 ESTRATEGIA DOBLE: INTENTAR SIN TOKEN PRIMERO, LUEGO CON TOKEN
    const attempts = [
      { useToken: false, description: 'sin token' },
      { useToken: true, description: 'con token Azure AD' }
    ];

    let lastError = null;

    for (const attempt of attempts) {
      // Si no tenemos token, saltar el intento con token
      if (attempt.useToken && !token) {
        console.log('⏭️ Saltando intento con token (no disponible)');
        continue;
      }

      try {
        console.log(`🆕 Creando nuevo usuario ${attempt.description}:`, userData);
        
        const headers = {
          'Content-Type': 'application/json',
        };
        
        // Solo agregar Authorization header si es intento con token
        if (attempt.useToken && token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        
        const response = await fetch(`${BACKEND_URL}/api/v1/users/`, {
          method: 'POST',
          headers,
          body: JSON.stringify(userData),
        });

        if (response.status === 201) {
          const result = await response.json();
          console.log(`✅ Usuario creado exitosamente ${attempt.description}:`, result.user);
          return result.user;
        } else if (response.status === 400) {
          const errorData = await response.json();
          if (errorData.status === "User with this email already exists") {
            console.log(`⚠️ Usuario ya existe, reintentando búsqueda...`);
            return await getUserByEmail(userData.email);
          } else {
            lastError = new Error(`Error de validación: ${JSON.stringify(errorData)}`);
            console.log(`❌ Error 400 ${attempt.description}:`, lastError.message);
            // Continuar con el siguiente intento
            continue;
          }
        } else if (response.status === 401) {
          // Error de autorización - continuar con siguiente intento
          lastError = new Error(`Error 401 ${attempt.description}: Token inválido o insuficiente`);
          console.log(`❌ ${lastError.message}`);
          continue;
          
        } else if (response.status === 403) {
          // 🚨 NUEVO: Error de permisos - Usuario no autorizado
          const errorData = await response.json().catch(() => ({}));
          const forbiddenError = new Error(`PERMISSION_DENIED: ${errorData.Denied || 'No tienes permisos para acceder a NAIA'}`);
          console.log(`❌ Error 403 ${attempt.description}: Usuario sin permisos`);
          recordFailedAttempt(userData.email, true);
          throw forbiddenError;
        }
        else {
          const errorData = await response.json().catch(() => ({}));
          lastError = new Error(`Error ${response.status} ${attempt.description}: ${errorData.status || 'Error desconocido'}`);
          console.log(`❌ ${lastError.message}`);
          continue;
        }
      } catch (error) {
        lastError = error;
        console.error(`❌ Error en createUser ${attempt.description}:`, error);
        continue; // Intentar el siguiente approach
      }
    }

    // Si llegamos aquí, todos los intentos fallaron
    console.error('❌ Todos los intentos de creación de usuario fallaron');
    recordFailedAttempt(userData.email, true);
    
    // Lanzar el último error
    if (lastError) {
      throw lastError;
    } else {
      throw new Error('No se pudo crear el usuario con ningún método');
    }
  }, [getUserByEmail, canProcessEmail, recordFailedAttempt]);

  /**
   * Función principal: Obtener usuario existente o crear uno nuevo
   * 🆕 MODIFICADA: Ahora envía automáticamente el token cuando está disponible
   */
  const getOrCreateUser = useCallback(async (userData, token = null) => {
    if (!canProcessEmail(userData.email)) {
      const error = new Error(`Proceso bloqueado para ${userData.email} por exceso de reintentos`);
      setError(error.message);
      throw error;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log(`🔄 Iniciando proceso de obtener/crear usuario para: ${userData.email}`);
      
      // Paso 1: Intentar buscar usuario existente por email
      let user = await getUserByEmail(userData.email);
      
      // Paso 2: Si no existe, crear nuevo usuario (con estrategia doble)
      if (!user) {
        console.log(`📝 Usuario no existe, procediendo a crear...`);
        user = await createUser(userData, token);
      }

      // 🆕 Paso 3: Si tenemos token válido, enviarlo al backend
      if (token && user && user.id) {
        try {
          console.log(`🔐 Enviando token para usuario ID: ${user.id}`);
          await sendUserToken(user.id, token);
          console.log(`✅ Token enviado exitosamente al backend`);
        } catch (tokenError) {
          console.warn(`⚠️ No se pudo enviar el token al backend: ${tokenError.message}`);
          // No interrumpir el flujo principal - el usuario se creó correctamente
          // Solo loggear el warning
        }
      } else if (token && !user?.id) {
        console.warn(`⚠️ Token disponible pero no se pudo obtener user ID`);
      } else if (!token) {
        console.log(`ℹ️ Sin token disponible, saltando envío de token`);
      }

      console.log(`🎉 Proceso completado. User ID: ${user.id}`);
      return user;

    } catch (error) {
      console.error('❌ Error en getOrCreateUser:', error);
      setError(error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [getUserByEmail, createUser, canProcessEmail, sendUserToken]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const resetCounters = useCallback(() => {
    setFailedAttempts(new Map());
    setBlacklistedEmails(new Set());
    setError(null);
    console.log('🔄 Contadores de reintentos reseteados');
  }, []);

  return {
    getOrCreateUser,
    getUserByEmail,
    createUser,
    sendUserToken, // 🆕 Función disponible para uso manual
    isLoading,
    error,
    clearError,
    resetCounters,
    failedAttempts: failedAttempts.size,
    blacklistedEmails: blacklistedEmails.size,
    canProcessEmail
  };
};

export default useUserManagement;