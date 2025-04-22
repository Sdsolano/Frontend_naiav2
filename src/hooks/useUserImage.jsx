// hooks/useUserImage.jsx
import { useState, useRef, useEffect, useCallback } from 'react';
import { useNotification } from '../components/NotificationContext';
import { BACKEND_URL } from '../../config';

// Configuración para la depuración
const DEBUG = {
  LEVEL: 'verbose', // 'none', 'basic', 'verbose'
  TRACE_ERRORS: true,
  LOG_TIMESTAMPS: true,
  ENABLE_PERFORMANCE_LOGS: true
};

// Constantes de configuración
const CAPTURE_QUALITY = 0.9; // Calidad de compresión JPEG (0-1)
const MAX_IMAGE_SIZE = 640; // Tamaño máximo en píxeles (ancho o alto)
const MIN_CAPTURE_INTERVAL = 2000; // Mínimo intervalo entre capturas (ms)
const CAMERA_INIT_DELAY = 2000; // Tiempo de espera para inicialización de cámara (ms)

// Función mejorada de registro para depuración
const debugLog = (level, message, data = null) => {
  if (DEBUG.LEVEL === 'none') return;
  if (DEBUG.LEVEL === 'basic' && level === 'verbose') return;
  
  const timestamp = DEBUG.LOG_TIMESTAMPS ? `[${new Date().toISOString()}] ` : '';
  const prefix = `${timestamp}📸 [${level.toUpperCase()}]: `;
  
  if (data) {
    console.log(prefix + message, data);
  } else {
    console.log(prefix + message);
  }
  
  // Registrar en localStorage para persistencia de logs
  try {
    const logs = JSON.parse(localStorage.getItem('camera_debug_logs') || '[]');
    logs.push({
      timestamp: new Date().toISOString(),
      level,
      message,
      data: data ? JSON.stringify(data) : null
    });
    // Mantener solo los últimos 100 logs
    if (logs.length > 100) logs.shift();
    localStorage.setItem('camera_debug_logs', JSON.stringify(logs));
  } catch (e) {
    // Ignorar errores de localStorage
  }
};

// Función para registrar errores con stack trace
const logError = (context, error, extraData = null) => {
  if (!DEBUG.TRACE_ERRORS) {
    debugLog('error', `${context}: ${error.message}`, extraData);
    return;
  }
  
  // Log detallado con stack trace
  console.error(`📸 ERROR en ${context}:`, error);
  
  // Intentar extraer información útil del error
  const errorInfo = {
    message: error.message,
    name: error.name,
    stack: error.stack,
    extraData
  };
  
  // Guardar error en localStorage para diagnóstico posterior
  try {
    const errors = JSON.parse(localStorage.getItem('camera_errors') || '[]');
    errors.push({
      timestamp: new Date().toISOString(),
      context,
      error: errorInfo
    });
    // Mantener solo los últimos 20 errores
    if (errors.length > 20) errors.shift();
    localStorage.setItem('camera_errors', JSON.stringify(errors));
  } catch (e) {
    // Ignorar errores de localStorage
  }
};

// Función para registrar tiempos de rendimiento
const performanceTimer = () => {
  if (!DEBUG.ENABLE_PERFORMANCE_LOGS) return { stop: () => {} };
  
  const start = performance.now();
  const operation = new Error().stack.split('\n')[2].trim();
  
  return {
    stop: (label) => {
      const duration = performance.now() - start;
      debugLog('performance', `${label || operation} completado en ${duration.toFixed(2)}ms`);
    }
  };
};

// Función para registrar información del entorno (browser/device)
const logEnvironmentInfo = () => {
  try {
    const env = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      vendor: navigator.vendor,
      language: navigator.language,
      deviceMemory: navigator.deviceMemory,
      hardwareConcurrency: navigator.hardwareConcurrency,
      connection: navigator.connection ? {
        effectiveType: navigator.connection.effectiveType,
        downlink: navigator.connection.downlink,
        rtt: navigator.connection.rtt,
        saveData: navigator.connection.saveData
      } : 'no disponible',
      screen: {
        width: window.screen.width,
        height: window.screen.height,
        colorDepth: window.screen.colorDepth,
        pixelDepth: window.screen.pixelDepth,
        orientation: window.screen.orientation ? window.screen.orientation.type : 'no disponible'
      },
      mediaDevices: 'pendiente de comprobar'
    };
    
    debugLog('info', 'Información del entorno:', env);
    
    // También guardar en localStorage para referencia
    localStorage.setItem('camera_environment_info', JSON.stringify(env));
    
    // Verificar y registrar las capacidades de MediaDevices
    if (navigator.mediaDevices && navigator.mediaDevices.getSupportedConstraints) {
      const constraints = navigator.mediaDevices.getSupportedConstraints();
      debugLog('info', 'Restricciones de MediaDevices soportadas:', constraints);
    } else {
      debugLog('warning', 'MediaDevices.getSupportedConstraints no disponible');
    }
    
    // Intentar enumerar dispositivos para depuración
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices()
        .then(devices => {
          const mediaDevices = devices.map(device => ({
            kind: device.kind,
            label: device.label || 'Sin etiqueta (requiere permisos)',
            deviceId: device.deviceId ? 'disponible' : 'no disponible',
            groupId: device.groupId ? 'disponible' : 'no disponible'
          }));
          
          debugLog('info', 'Dispositivos multimedia disponibles:', mediaDevices);
          
          // Actualizar la información del entorno
          env.mediaDevices = mediaDevices;
          localStorage.setItem('camera_environment_info', JSON.stringify(env));
        })
        .catch(err => {
          logError('enumerateDevices', err);
        });
    }
    
  } catch (error) {
    logError('logEnvironmentInfo', error);
  }
};

export const useUserImage = (userId = 1) => {
  const { addNotification } = useNotification();
  const [isCapturing, setIsCapturing] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [debugInfo, setDebugInfo] = useState({});
  const [errorState, setErrorState] = useState(null); // Estado para tracking de errores
  
  // Referencias para mantener estado
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(document.createElement('canvas'));
  const lastCaptureTimeRef = useRef(0);
  const pendingUploadRef = useRef(false);
  
  // Cola para imágenes pendientes
  const imageQueueRef = useRef([]);
  const isProcessingQueueRef = useRef(false);
  
  // Cache para la última imagen
  const latestImageRef = useRef(null);
  
  // Flag para evitar múltiples capturas iniciales
  const initialCaptureCompletedRef = useRef(false);
  // Timer para la inicialización de la cámara
  const cameraInitTimerRef = useRef(null);
  
  // Registrar información del entorno al inicio
  useEffect(() => {
    debugLog('info', '🚀 Hook useUserImage inicializado para el usuario ' + userId);
    logEnvironmentInfo();
  }, [userId]);
  
  // Exponer lastCaptureTime para que otros componentes puedan verificarlo
  const getLastCaptureTime = useCallback(() => {
    return lastCaptureTimeRef.current;
  }, []);
  
  // Función para comprobar permisos de cámara de forma explícita
  const checkCameraPermissions = useCallback(async () => {
    try {
      debugLog('info', 'Verificando permisos de cámara...');
      
      // Intentar consultar los permisos
      const permissionStatus = await navigator.permissions.query({ name: 'camera' });
      
      debugLog('info', `Estado de permiso de cámara: ${permissionStatus.state}`);
      
      return {
        state: permissionStatus.state,
        denied: permissionStatus.state === 'denied',
        granted: permissionStatus.state === 'granted',
        prompt: permissionStatus.state === 'prompt'
      };
    } catch (error) {
      logError('checkCameraPermissions', error);
      
      // Devolver un estado desconocido si falla la consulta
      return {
        state: 'unknown',
        denied: false,
        granted: false,
        prompt: true, // Asumimos que se mostrará un prompt
        error: error.message
      };
    }
  }, []);
  
  // Inicializar la cámara - con mejor depuración
  const initCamera = useCallback(async () => {
    const timer = performanceTimer();
    
    try {
      if (streamRef.current) {
        debugLog('info', 'Cámara ya inicializada, reutilizando stream existente');
        return true;
      }
      
      debugLog('info', 'Iniciando cámara para capturas de imagen...');
      
      // Verificar permisos primero
      const permissions = await checkCameraPermissions();
      debugLog('info', 'Resultado de verificación de permisos:', permissions);
      
      if (permissions.denied) {
        debugLog('error', 'Permisos de cámara denegados por el usuario');
        setErrorState({
          code: 'PERMISSION_DENIED',
          message: 'El usuario ha denegado los permisos de cámara'
        });
        throw new Error('Permisos de cámara denegados');
      }
      
      // Log detallado de las restricciones que vamos a solicitar
      const requestConstraints = {
        video: {
          facingMode: 'user',
          width: { ideal: MAX_IMAGE_SIZE },
          height: { ideal: MAX_IMAGE_SIZE }
        }
      };
      
      debugLog('verbose', 'Solicitando stream de cámara con restricciones:', requestConstraints);
      
      // Solicitar acceso a la cámara con restricciones detalladas
      const stream = await navigator.mediaDevices.getUserMedia(requestConstraints);
      
      // Verificar que realmente obtuvimos una pista de video
      const videoTracks = stream.getVideoTracks();
      if (videoTracks.length === 0) {
        debugLog('error', 'Se obtuvo un stream pero sin pistas de video');
        throw new Error('No se encontraron pistas de video en el stream');
      }
      
      // Log detallado de la pista de video obtenida
      const videoTrackSettings = videoTracks[0].getSettings();
      debugLog('info', 'Pista de video obtenida:', {
        trackId: videoTracks[0].id,
        label: videoTracks[0].label,
        settings: videoTrackSettings,
        constraints: videoTracks[0].getConstraints()
      });
      
      // Guardar referencia al stream
      streamRef.current = stream;
      
      // Si hay un elemento de video, asignar el stream
      if (videoRef.current) {
        debugLog('info', 'Asignando stream a elemento de video');
        videoRef.current.srcObject = stream;
        
        // Esperar a que el video esté listo realmente
        await new Promise((resolve) => {
          const timeoutId = setTimeout(() => {
            debugLog('warning', 'Timeout esperando que el video cargue metadatos');
            resolve(false);
          }, 5000); // 5 segundos de timeout
          
          videoRef.current.onloadedmetadata = () => {
            clearTimeout(timeoutId);
            debugLog('info', 'Video cargó metadatos correctamente');
            
            // Iniciar reproducción explícitamente
            videoRef.current.play().then(() => {
              debugLog('info', 'Video reproducción iniciada con éxito');
              resolve(true);
            }).catch(err => {
              logError('video.play', err);
              resolve(false);
            });
          };
          
          // También detectar errores
          videoRef.current.onerror = (e) => {
            clearTimeout(timeoutId);
            logError('video.onerror', new Error(`Error de video: ${e.target.error ? e.target.error.message : 'desconocido'}`));
            resolve(false);
          };
        });
        
        // Verificar que el video realmente tiene dimensiones después de cargar
        if (videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0) {
          debugLog('warning', 'Video inició pero con dimensiones inválidas', {
            width: videoRef.current.videoWidth,
            height: videoRef.current.videoHeight,
            readyState: videoRef.current.readyState,
            paused: videoRef.current.paused,
            networkState: videoRef.current.networkState
          });
        } else {
          debugLog('info', 'Video iniciado con dimensiones correctas', {
            width: videoRef.current.videoWidth, 
            height: videoRef.current.videoHeight
          });
        }
        
        // Damos tiempo adicional para que el video realmente muestre contenido
        if (cameraInitTimerRef.current) {
          clearTimeout(cameraInitTimerRef.current);
        }
        
        debugLog('info', `Esperando ${CAMERA_INIT_DELAY}ms para estabilización...`);
        
        cameraInitTimerRef.current = setTimeout(() => {
          // Verificar estado del video antes de considerar listo
          const videoStatus = {
            width: videoRef.current?.videoWidth || 0,
            height: videoRef.current?.videoHeight || 0,
            readyState: videoRef.current?.readyState || 0,
            paused: videoRef.current?.paused || true,
            networkState: videoRef.current?.networkState || 0,
            error: videoRef.current?.error ? videoRef.current.error.message : null
          };
          
          debugLog('info', 'Estado final del video tras estabilización:', videoStatus);
          
          if (videoStatus.width === 0 || videoStatus.height === 0) {
            debugLog('error', 'Dimensiones de video inválidas tras estabilización');
            setErrorState({
              code: 'VIDEO_INVALID_DIMENSIONS',
              message: 'El video no tiene dimensiones válidas tras estabilización',
              details: videoStatus
            });
            setIsReady(false);
          } else {
            debugLog('info', '✅ Cámara inicializada y lista para capturar');
            setIsReady(true);
            setErrorState(null);
          }
          
          // Actualizar información de debug
          if (videoRef.current) {
            const debugData = {
              videoWidth: videoRef.current.videoWidth,
              videoHeight: videoRef.current.videoHeight,
              readyState: videoRef.current.readyState,
              networkState: videoRef.current.networkState,
              autoplay: videoRef.current.autoplay,
              controls: videoRef.current.controls,
              loop: videoRef.current.loop,
              muted: videoRef.current.muted,
              played: videoRef.current.played.length > 0,
              defaultMuted: videoRef.current.defaultMuted,
              crossOrigin: videoRef.current.crossOrigin,
              currentSrc: videoRef.current.currentSrc ? true : false
            };
            
            setDebugInfo(debugData);
            debugLog('verbose', 'Información detallada del elemento video:', debugData);
          }
          
        }, CAMERA_INIT_DELAY);
      } else {
        debugLog('error', 'No hay elemento de video disponible para asignar el stream');
        throw new Error('Elemento de video no disponible');
      }
      
      timer.stop('Inicialización de cámara');
      return true;
    } catch (error) {
      timer.stop('Inicialización de cámara (error)');
      
      // Capturar y categorizar errores comunes de MediaDevices
      let errorCode = 'CAMERA_UNKNOWN_ERROR';
      
      if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        errorCode = 'CAMERA_NOT_FOUND';
      } else if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorCode = 'CAMERA_PERMISSION_DENIED';
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        errorCode = 'CAMERA_IN_USE';
      } else if (error.name === 'OverconstrainedError') {
        errorCode = 'CAMERA_OVERCONSTRAINED';
      } else if (error.name === 'SecurityError') {
        errorCode = 'CAMERA_SECURITY_ERROR';
      } else if (error.name === 'TypeError') {
        errorCode = 'CAMERA_TYPE_ERROR';
      }
      
      // Actualizar el estado de error para UI
      setErrorState({
        code: errorCode,
        message: error.message,
        name: error.name
      });
      
      logError('initCamera', error, { errorCode });
      
      addNotification(`No se pudo acceder a la cámara: ${error.message}`, 'warning');
      setIsReady(false);
      return false;
    }
  }, [addNotification, checkCameraPermissions]);
  
  // Detener la cámara
  const stopCamera = useCallback(() => {
    if (cameraInitTimerRef.current) {
      clearTimeout(cameraInitTimerRef.current);
      cameraInitTimerRef.current = null;
    }
    
    if (streamRef.current) {
      debugLog('info', 'Deteniendo cámara...');
      
      try {
        const tracks = streamRef.current.getTracks();
        
        // Log detallado de las pistas antes de detenerlas
        debugLog('verbose', 'Deteniendo pistas:', tracks.map(track => ({
          id: track.id,
          kind: track.kind,
          label: track.label,
          enabled: track.enabled,
          muted: track.muted,
          readyState: track.readyState
        })));
        
        tracks.forEach(track => {
          track.stop();
          debugLog('verbose', `Pista ${track.id} (${track.kind}) detenida`);
        });
        
        streamRef.current = null;
        
        if (videoRef.current) {
          videoRef.current.srcObject = null;
          debugLog('verbose', 'Video.srcObject establecido a null');
        }
        
        setIsReady(false);
        debugLog('info', '✓ Cámara detenida exitosamente');
      } catch (error) {
        logError('stopCamera', error);
      }
    } else {
      debugLog('info', 'No hay stream activo para detener');
    }
  }, []);
  
  // Asignar elemento de video
  const setVideoElement = useCallback((element) => {
    if (!element) {
      debugLog('warning', 'Intento de asignar un elemento de video nulo');
      return;
    }
    
    debugLog('info', 'Elemento de video asignado', {
      id: element.id || 'sin-id',
      className: element.className || 'sin-clase',
      width: element.width || 'auto',
      height: element.height || 'auto',
      autoplay: element.autoplay,
      playsInline: element.playsInline,
      muted: element.muted
    });
    
    videoRef.current = element;
    
    // Si ya tenemos un stream, asignarlo al nuevo elemento
    if (streamRef.current && element) {
      debugLog('info', 'Stream existente detectado, asignándolo al nuevo elemento de video');
      element.srcObject = streamRef.current;
      
      // Intentar iniciar reproducción explícitamente
      element.play().then(() => {
        debugLog('info', '✓ Video reproducción iniciada con éxito (desde setVideoElement)');
      }).catch(err => {
        logError('setVideoElement.play', err);
      });
    } else {
      debugLog('info', 'No hay stream activo para asignar al elemento de video');
    }
  }, []);
  
  // Capturar y redimensionar imagen - optimizado para velocidad y con mejor depuración
  const captureImage = useCallback(async () => {
    const timer = performanceTimer();
    
    if (!isReady || !streamRef.current) {
      debugLog('warning', 'No se puede capturar: cámara no lista', { 
        isReady, 
        hasStream: !!streamRef.current,
        hasVideo: !!videoRef.current,
        videoElementReady: videoRef.current ? !!videoRef.current.videoWidth : false
      });
      return null;
    }
    
    if (isCapturing) {
      debugLog('warning', 'Ya hay una captura en curso, omitiendo');
      return null;
    }
    
    const now = Date.now();
    // Evitar capturas demasiado frecuentes
    if (now - lastCaptureTimeRef.current < MIN_CAPTURE_INTERVAL) {
      debugLog('info', `Captura demasiado frecuente (última hace ${now - lastCaptureTimeRef.current}ms), usando cache`);
      // Retornar la última imagen capturada si existe
      if (latestImageRef.current) {
        return latestImageRef.current;
      }
      return null;
    }
    
    setIsCapturing(true);
    lastCaptureTimeRef.current = now;
    
    try {
      // Si no hay video ref, usar el stream directamente
      const video = videoRef.current;
      
      if (!video) {
        throw new Error('Elemento de video no disponible');
      }
      
      // Verificar estado del video detalladamente
      const videoStatus = {
        width: video.videoWidth || 0,
        height: video.videoHeight || 0,
        readyState: video.readyState || 0,
        paused: video.paused || true,
        error: video.error ? video.error.message : null,
        srcObject: !!video.srcObject,
        playbackRate: video.playbackRate,
        networkState: video.networkState
      };
      
      // Verificar que el video tenga dimensiones y esté reproduciendo
      if (!video.videoWidth || !video.videoHeight || video.videoWidth === 0 || video.videoHeight === 0) {
        debugLog('error', 'Video no tiene dimensiones válidas', videoStatus);
        
        // Intentar reproducir de nuevo
        try {
          debugLog('info', 'Intentando reproducir video de nuevo...');
          await video.play();
          debugLog('info', 'Video reiniciado exitosamente');
          
          // Verificar nuevamente las dimensiones
          if (!video.videoWidth || !video.videoHeight || video.videoWidth === 0 || video.videoHeight === 0) {
            throw new Error('Video sin dimensiones válidas después de reintentar reproducción');
          }
        } catch (e) {
          logError('captureImage.play', e);
          throw new Error('Video no inicializado completamente y no se pudo reiniciar');
        }
      }
      
      debugLog('info', `Capturando imagen (${video.videoWidth}x${video.videoHeight})`);
      
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      // Tomar dimensiones del video
      const width = video.videoWidth;
      const height = video.videoHeight;
      
      // Calcular dimensiones optimizadas
      let targetWidth, targetHeight;
      
      if (width > height) {
        targetWidth = Math.min(width, MAX_IMAGE_SIZE);
        targetHeight = (height / width) * targetWidth;
      } else {
        targetHeight = Math.min(height, MAX_IMAGE_SIZE);
        targetWidth = (width / height) * targetHeight;
      }
      
      // Configurar canvas directamente al tamaño objetivo
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      
      debugLog('verbose', `Canvas configurado a ${targetWidth}x${targetHeight}`);
      
      // Limpiar canvas para asegurar que no queden residuos
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, targetWidth, targetHeight);
      
      // Dibujar y redimensionar en un solo paso
      ctx.drawImage(video, 0, 0, width, height, 0, 0, targetWidth, targetHeight);
      
      // Obtener los datos de imagen para verificar que no sea negra
      const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
      let isBlack = true;
      let brightness = 0;
      let pixelsSampled = 0;
      
      // Comprobar si la imagen es completamente negra (muestreo rápido)
      // También calcular brillo promedio para mejor diagnóstico
      for (let i = 0; i < imageData.data.length; i += 40) {
        const r = imageData.data[i];
        const g = imageData.data[i+1];
        const b = imageData.data[i+2];
        
        // Fórmula simple de brillo (promedio de RGB)
        const pixelBrightness = (r + g + b) / 3;
        brightness += pixelBrightness;
        pixelsSampled++;
        
        if (r > 10 || g > 10 || b > 10) {
          isBlack = false;
        }
      }
      
      brightness = brightness / pixelsSampled;
      
      if (isBlack) {
        debugLog('warning', 'La imagen capturada parece ser completamente negra', { brightness });
      } else {
        debugLog('verbose', `Imagen capturada con brillo promedio: ${brightness.toFixed(2)}`);
      }
      
      // Convertir a Blob con compresión JPEG
      const blob = await new Promise(resolve => {
        canvas.toBlob(blob => resolve(blob), 'image/jpeg', CAPTURE_QUALITY);
      });
      
      // Verificar que el blob tenga contenido
      if (!blob || blob.size < 1000) {
        debugLog('warning', 'Blob de imagen demasiado pequeño:', blob?.size || 0, 'bytes');
      } else {
        debugLog('info', `✓ Imagen capturada: ${blob.size} bytes, brillo: ${brightness.toFixed(2)}`);
      }
      
      // Guardar en cache
      latestImageRef.current = blob;
      
      timer.stop('Captura de imagen');
      return blob;
    } catch (error) {
      timer.stop('Captura de imagen (error)');
      logError('captureImage', error);
      
      // Actualizar estado de error para UI
      setErrorState({
        code: 'CAPTURE_ERROR',
        message: `Error al capturar imagen: ${error.message}`
      });
      
      return null;
    } finally {
      setIsCapturing(false);
    }
  }, [isReady, isCapturing]);
  
  // Procesar cola de imágenes
  const processImageQueue = useCallback(async () => {
    if (isProcessingQueueRef.current || imageQueueRef.current.length === 0) {
      return;
    }
    
    isProcessingQueueRef.current = true;
    
    try {
      // Tomar solo la imagen más reciente, descartar las demás
      // Esto evita sobrecarga de red con imágenes obsoletas
      const sortedQueue = [...imageQueueRef.current].sort((a, b) => b.timestamp - a.timestamp);
      const latestImage = sortedQueue[0];
      
      debugLog('info', `Procesando imagen de cola (descartando ${sortedQueue.length - 1} imágenes antiguas)`);
      
      // Vaciar la cola
      imageQueueRef.current = [];
      
      // Enviar la imagen más reciente
      if (latestImage && latestImage.blob) {
        debugLog('info', `Subiendo imagen al servidor: ${latestImage.blob.size} bytes`);
        
        const formData = new FormData();
        formData.append('user_id', userId);
        formData.append('image', latestImage.blob, 'user_image.jpg');
        
        // Validar la URL del backend
        if (!BACKEND_URL) {
          debugLog('error', 'BACKEND_URL no está definida');
          throw new Error('BACKEND_URL no está definida');
        }
        
        const url = `${BACKEND_URL}/api/v1/chat/images/`;
        debugLog('verbose', `URL destino: ${url}`);
        
        try {
          const startTime = Date.now();
          
          const response = await fetch(url, {
            method: 'POST',
            body: formData,
          });
          
          const endTime = Date.now();
          debugLog('info', `Tiempo de respuesta del servidor: ${endTime - startTime}ms`);
          
          // Log detallado de la respuesta
          const responseInfo = {
            status: response.status,
            statusText: response.statusText,
            ok: response.ok,
            headers: {},
            timeMs: endTime - startTime
          };
          
          // Extraer headers para depuración
          response.headers.forEach((value, key) => {
            responseInfo.headers[key] = value;
          });
          
          if (response.ok) {
            debugLog('info', '✅ Imagen subida correctamente', responseInfo);
          } else {
            debugLog('error', `Error al subir imagen: ${response.status}`, responseInfo);
            
            // Intentar leer el cuerpo de la respuesta para más detalles
            try {
              const errorText = await response.text();
              debugLog('error', 'Detalles del error de subida:', errorText);
            } catch (e) {
              logError('processImageQueue.responseText', e);
            }
          }
        } catch (error) {
          logError('processImageQueue.fetch', error, { 
            url,
            userId, 
            blobSize: latestImage.blob.size
          });
        }
      }
    } catch (error) {
      logError('processImageQueue', error);
    } finally {
      isProcessingQueueRef.current = false;
    }
  }, [userId]);
  
  // Subir imagen al servidor - versión optimizada
  const uploadImage = useCallback(async (imageBlob) => {
    if (!imageBlob) {
      debugLog('warning', 'uploadImage: No hay blob de imagen para subir');
      return false;
    }
    
    // Añadir a la cola en lugar de subir inmediatamente
    imageQueueRef.current.push({
      blob: imageBlob,
      timestamp: Date.now()
    });
    
    debugLog('info', `Imagen añadida a la cola (${imageBlob.size} bytes), elementos en cola: ${imageQueueRef.current.length}`);
    
    // Iniciar el procesamiento de la cola si no está en marcha
    if (!isProcessingQueueRef.current) {
      processImageQueue();
    }
    
    return true; // Devolver true inmediatamente para no bloquear
  }, [processImageQueue]);
  
  // Función combinada para capturar y subir - no bloqueante
  const captureAndUpload = useCallback(async () => {
    const timer = performanceTimer();
    
    // Si la cámara no está lista, intentar inicializarla pero no esperar
    if (!isReady) {
      debugLog('warning', 'Cámara no lista, intentando inicializar');
      initCamera();
      return false;
    }
    
    try {
      // Capturar imagen
      debugLog('info', 'Capturando imagen para subir...');
      const imageBlob = await captureImage();
      
      // Si tenemos una imagen, añadirla a la cola de envío
      if (imageBlob) {
        debugLog('info', `Imagen capturada correctamente, procediendo a subir (${imageBlob.size} bytes)`);
        const result = await uploadImage(imageBlob);
        timer.stop('Captura y preparación para subida');
        return result;
      } else {
        debugLog('warning', 'captureAndUpload: No se pudo capturar imagen');
        return false;
      }
    } catch (error) {
      logError('captureAndUpload', error);
      return false;
    }
  }, [isReady, initCamera, captureImage, uploadImage]);
  
  // Función para captura inicial única
  const captureInitialImage = useCallback(async () => {
    // Asegurarse de que solo se ejecute una vez
    if (initialCaptureCompletedRef.current) {
      debugLog('info', 'captureInitialImage: Ya se realizó la captura inicial, ignorando');
      return;
    }
    
    debugLog('info', 'Programando captura inicial...');
    
    // Marcar como completada para evitar múltiples capturas iniciales
    initialCaptureCompletedRef.current = true;
    
    // Tiempo más largo para que la cámara se inicialice completamente
    setTimeout(async () => {
      try {
        // Verificar que la cámara esté realmente lista
        if (!isReady) {
          debugLog('warning', 'Esperando a que la cámara esté lista para captura inicial');
          
          // Diagnóstico del estado de la cámara/video
          if (videoRef.current) {
            debugLog('verbose', 'Estado actual del elemento video:', {
              videoWidth: videoRef.current.videoWidth,
              videoHeight: videoRef.current.videoHeight,
              readyState: videoRef.current.readyState,
              paused: videoRef.current.paused,
              currentTime: videoRef.current.currentTime,
              error: videoRef.current.error ? videoRef.current.error.message : null
            });
          }
          
          if (!streamRef.current) {
            debugLog('warning', 'No hay stream disponible para captura inicial');
          }
          
          // Esperar más tiempo si la cámara aún no está lista
          setTimeout(async () => {
            debugLog('info', 'Segundo intento de captura inicial');
            const success = await captureAndUpload();
            debugLog('info', `Captura inicial (segundo intento): ${success ? 'éxito' : 'falló'}`);
            
            // Si falló, registrar más información de diagnóstico
            if (!success) {
              debugLog('error', 'Diagnóstico después de fallo de captura inicial:', {
                isReady,
                hasVideo: !!videoRef.current,
                hasStream: !!streamRef.current,
                videoProperties: videoRef.current ? {
                  width: videoRef.current.videoWidth,
                  height: videoRef.current.videoHeight,
                  readyState: videoRef.current.readyState,
                  networkState: videoRef.current.networkState,
                  paused: videoRef.current.paused,
                  error: videoRef.current.error ? videoRef.current.error.message : null
                } : 'no disponible',
                errorState
              });
            }
          }, 2000);
          
          return;
        }
        
        const success = await captureAndUpload();
        debugLog('info', `Captura inicial: ${success ? 'éxito' : 'falló'}`);
      } catch (e) {
        logError('captureInitialImage', e);
      }
    }, 3000); // Aumentado a 3 segundos para dar más tiempo a la inicialización
  }, [captureAndUpload, isReady, errorState]);
  
  // Función para exportar logs de depuración
  const exportDebugLogs = useCallback(() => {
    try {
      // Recopilar toda la información para exportar
      const debugData = {
        timestamp: new Date().toISOString(),
        environment: JSON.parse(localStorage.getItem('camera_environment_info') || '{}'),
        logs: JSON.parse(localStorage.getItem('camera_debug_logs') || '[]'),
        errors: JSON.parse(localStorage.getItem('camera_errors') || '[]'),
        state: {
          isReady,
          isCapturing,
          errorState,
          debugInfo,
          hasVideo: !!videoRef.current,
          hasStream: !!streamRef.current,
          lastCaptureTime: lastCaptureTimeRef.current,
          queueLength: imageQueueRef.current.length,
          isProcessingQueue: isProcessingQueueRef.current,
          initialCaptureCompleted: initialCaptureCompletedRef.current
        }
      };
      
      // Crear blob para descargar
      const blob = new Blob([JSON.stringify(debugData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      // Crear elemento para descarga
      const a = document.createElement('a');
      a.href = url;
      a.download = `camera-debug-${new Date().toISOString()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      return debugData;
    } catch (e) {
      logError('exportDebugLogs', e);
      return null;
    }
  }, [isReady, isCapturing, errorState, debugInfo]);
  
  // Limpiar al desmontar
  useEffect(() => {
    debugLog('info', 'Hook useUserImage montado');
    
    return () => {
      debugLog('info', 'Hook useUserImage desmontando, limpiando recursos');
      stopCamera();
      imageQueueRef.current = [];
      latestImageRef.current = null;
      
      if (cameraInitTimerRef.current) {
        clearTimeout(cameraInitTimerRef.current);
      }
    };
  }, [stopCamera]);
  
  return {
    isReady,
    isCapturing,
    initCamera,
    stopCamera,
    setVideoElement,
    captureImage,
    uploadImage,
    captureAndUpload,
    captureInitialImage,
    getLastCaptureTime,
    debugInfo,
    errorState,
    // Nuevas funciones para depuración
    exportDebugLogs,
    checkCameraPermissions
  };
};

export default useUserImage;