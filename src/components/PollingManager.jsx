// PollingManager.jsx
import { useEffect, useRef, useState } from 'react';

/**
 * Hook personalizado para manejar el polling con mejor control y depuración
 * @param {Object} options - Opciones de configuración
 * @param {Function} options.fetchFunction - Función para obtener datos del servidor
 * @param {number} options.interval - Intervalo de polling en ms (default: 2000)
 * @param {number} options.startDelay - Retraso inicial antes de comenzar el polling en ms (default: 5000)
 * @param {boolean} options.enabled - Habilitar/deshabilitar el polling (default: false)
 * @param {boolean} options.debug - Mostrar mensajes de depuración en consola (default: false)
 * @returns {Object} 
 */
export const usePolling = ({
  fetchFunction,
  interval = 2000,
  startDelay = 5000,
  enabled = false,
  debug = false,
}) => {
  const [data, setData] = useState(null);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  
  // Referencias para mantener estado entre renders
  const startTimeRef = useRef(null);
  const pollingIntervalRef = useRef(null);
  const startTimeoutRef = useRef(null);
  const isInitializedRef = useRef(false);
  const lastPollTimeRef = useRef(null);
  const pollCountRef = useRef(0);
  
  // Función de log condicional
  const log = (message, type = 'info') => {
    if (!debug) return;
    
    const prefix = '🔄 [Polling]';
    
    switch (type) {
      case 'error':
        console.error(`${prefix} ❌ ${message}`);
        break;
      case 'warn':
        console.warn(`${prefix} ⚠️ ${message}`);
        break;
      case 'success':
        console.log(`${prefix} ✅ ${message}`);
        break;
      default:
        console.log(`${prefix} ${message}`);
    }
  };
  
  // Limpiar todos los temporizadores
  const cleanupTimers = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    
    if (startTimeoutRef.current) {
      clearTimeout(startTimeoutRef.current);
      startTimeoutRef.current = null;
    }
  };
  
  // Iniciar el polling
  const startPolling = () => {
    cleanupTimers();
    
    // Registrar tiempo de inicio
    startTimeRef.current = Date.now();
    setElapsedTime(0);
    pollCountRef.current = 0;
    
    log(`Programando inicio de polling con retraso de ${startDelay}ms`);
    
    // Programar inicio con retraso
    startTimeoutRef.current = setTimeout(() => {
      if (!enabled) {
        log('Polling cancelado - desactivado durante el retraso inicial', 'warn');
        return;
      }
      
      log(`Iniciando polling con intervalo de ${interval}ms`);
      setIsPolling(true);
      
      // Hacer una consulta inicial inmediata
      executePoll();
      
      // Configurar intervalo para consultas periódicas
      pollingIntervalRef.current = setInterval(() => {
        if (!enabled) {
          log('Polling interrumpido - desactivado durante ejecución', 'warn');
          stopPolling();
          return;
        }
        
        executePoll();
      }, interval);
      
    }, startDelay);
  };
  
  // Ejecutar una consulta individual
  const executePoll = async () => {
    if (!fetchFunction) {
      log('No se proporcionó función de consulta', 'error');
      return;
    }
    
    try {
      // Calcular tiempo transcurrido
      const now = Date.now();
      setElapsedTime(now - (startTimeRef.current || now));
      lastPollTimeRef.current = now;
      pollCountRef.current++;
      
      log(`Ejecutando consulta #${pollCountRef.current}`);
      
      const result = await fetchFunction();
      
      if (result !== null) {
        log(`Datos recibidos: ${JSON.stringify(result).substring(0, 100)}...`, 'success');
        setData(result);
      } else {
        log('La consulta devolvió null', 'warn');
      }
      
      setError(null);
    } catch (err) {
      setError(err);
      log(`Error en consulta: ${err.message}`, 'error');
    }
  };
  
  // Detener el polling
  const stopPolling = () => {
    log('Deteniendo polling');
    cleanupTimers();
    setIsPolling(false);
  };
  
  // Reiniciar el polling
  const restartPolling = () => {
    log('Reiniciando polling');
    stopPolling();
    startPolling();
  };
  
  // Iniciar/detener polling basado en prop enabled
  useEffect(() => {
    if (enabled && !isPolling && !startTimeoutRef.current) {
      log('Polling habilitado - iniciando');
      startPolling();
    } else if (!enabled && (isPolling || startTimeoutRef.current)) {
      log('Polling deshabilitado - deteniendo');
      stopPolling();
    }
    
    // Marcar como inicializado después del primer render
    isInitializedRef.current = true;
    
    // Cleanup al desmontar
    return () => {
      cleanupTimers();
    };
  }, [enabled]);
  
  // Forzar una consulta inmediata
  const forcePoll = () => {
    log('Forzando consulta inmediata');
    executePoll();
  };
  
  return {
    data,
    isPolling,
    error,
    elapsedTime,
    stopPolling,
    startPolling,
    restartPolling,
    forcePoll,
    pollCount: pollCountRef.current,
    lastPollTime: lastPollTimeRef.current,
  };
};

/**
 * Componente que implementa el polling para el estado del servidor
 * Reemplaza la lógica actual de polling en useChat.jsx
 */
const PollingManager = ({ 
  serverStatusUrl,
  onStatusUpdate,
  enabled = false,
  interval = 2000,
  startDelay = 5000,
  debug = false,
  userId = 1,
  roleId = 1,
  sessionId = 0, // Añadimos parámetro para el ID de sesión
}) => {
  // Mantenemos una referencia del estado anterior para comparar
  const [lastStatus, setLastStatus] = useState(null);
  // Añadimos una referencia para el estado habilitado/deshabilitado
  const enabledRef = useRef(enabled);
  // ID de sesión de polling para validar actualizaciones
  const sessionIdRef = useRef(sessionId);
  // Bandera para controlar si debemos procesar actualizaciones
  const [shouldProcessUpdates, setShouldProcessUpdates] = useState(true);
  
  // Actualizar las referencias cuando cambien props
  useEffect(() => {
    const wasEnabled = enabledRef.current;
    const previousSessionId = sessionIdRef.current;
    
    enabledRef.current = enabled;
    sessionIdRef.current = sessionId;
    
    // Si cambió el ID de sesión, reiniciar estado
    if (previousSessionId !== sessionId) {
      if (debug) console.log(`🔄 [Polling] Cambio de sesión: ${previousSessionId} -> ${sessionId}`);
      setLastStatus(null);
      setShouldProcessUpdates(true);
    }
    
    // Si cambió de enabled a disabled, limpiar estado
    if (wasEnabled && !enabled) {
      if (debug) console.log("🔄 [Polling] Desactivado - limpiando estado");
      setLastStatus(null);
      if (onStatusUpdate) {
        // Enviar null y el ID de sesión actual
        onStatusUpdate(null, sessionIdRef.current);
      }
      
      // Desactivar procesamiento brevemente para evitar ciclos
      setShouldProcessUpdates(false);
      setTimeout(() => {
        if (sessionIdRef.current === sessionId) { // Verificar que seguimos en la misma sesión
          setShouldProcessUpdates(true);
        }
      }, 3000);
    }
  }, [enabled, sessionId, onStatusUpdate, debug]);
  
  // Función para obtener el estado del servidor
  const fetchServerStatus = async () => {
    // Si está deshabilitado o no debemos procesar actualizaciones, retornar null
    if (!enabledRef.current || !shouldProcessUpdates) {
      return null;
    }
    
    try {
      // Capturar el ID de sesión actual para validación
      const currentSessionId = sessionIdRef.current;
      
      if (debug) {
        console.log(`🔄 [Polling] Consultando estado (sesión ${currentSessionId})`);
      }
      
      // Añadir timestamp y un número aleatorio para evitar caché
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 15);
      const url = `${serverStatusUrl}?user_id=${userId}&role_id=${roleId}&_t=${timestamp}&_r=${random}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(3000)
      });
    
      // Si la sesión cambió durante la petición, ignorar resultado
      if (currentSessionId !== sessionIdRef.current) {
        if (debug) console.log(`🚫 [Polling] Sesión cambió durante petición, ignorando resultado`);
        return null;
      }
  
      if (!response.ok) {
        if (debug) {
          console.warn(`⚠️ Respuesta no-OK del status API: ${response.status}`);
        }
        return null;
      }
    
      const data = await response.json();
      const status = data.status || null;
      
      if (debug) {
        console.log(`✅ [Polling] Estado recibido (sesión ${currentSessionId}): "${status}"`);
      }
      
      // Solo devolver el estado si el polling sigue habilitado Y estamos en la misma sesión
      if (enabledRef.current && currentSessionId === sessionIdRef.current) {
        return status;
      } else {
        if (debug) console.log(`🚫 [Polling] Condiciones cambiaron, ignorando estado recibido`);
        return null;
      }
    } catch (error) {
      if (debug) {
        console.error(`❌ [Polling] Error consultando estado: ${error.message}`);
      }
      return null;
    }
  };
  
  // Usar nuestro hook de polling personalizado
  const { 
    data: serverStatus,
    isPolling,
  } = usePolling({
    fetchFunction: fetchServerStatus,
    interval,
    startDelay,
    enabled: enabled && shouldProcessUpdates,
    debug,
  });
  
  // Notificar cambios en el estado del servidor
  useEffect(() => {
    // Solo procesar actualizaciones si está permitido y habilitado
    if (!shouldProcessUpdates || !enabledRef.current) {
      if (debug && serverStatus !== null) {
        console.log(`🔄 [Polling] Ignorando estado "${serverStatus}" (actualizaciones deshabilitadas)`);
      }
      return;
    }
    
    // Solo notificar si hay un cambio real en el estado
    if (serverStatus !== lastStatus) {
      // Capturar el ID de sesión actual para validación
      const currentSessionId = sessionIdRef.current;
      
      if (debug) {
        console.log(`🔄 [Polling] Estado cambiado (sesión ${currentSessionId}): "${lastStatus}" -> "${serverStatus}"`);
      }
      
      setLastStatus(serverStatus);
      
      if (onStatusUpdate) {
        if (debug) {
          console.log(`📣 [Polling] Notificando cambio de estado (sesión ${currentSessionId}): "${serverStatus}"`);
        }
        
        // Pasar tanto el estado como el ID de sesión
        onStatusUpdate(serverStatus, currentSessionId);
      }
    }
  }, [serverStatus, lastStatus, onStatusUpdate, debug, shouldProcessUpdates]);
  // Este componente no renderiza nada
  return null;
};

export default PollingManager;