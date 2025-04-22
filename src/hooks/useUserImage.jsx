// hooks/useUserImage.jsx
import { useState, useRef, useEffect, useCallback } from 'react';
import { useNotification } from '../components/NotificationContext';
import { BACKEND_URL } from '../../config';

// Aumentamos los tiempos para entornos virtualizados
const CAPTURE_QUALITY = 0.9; // Calidad de compresión JPEG (0-1)
const MAX_IMAGE_SIZE = 640; // Tamaño máximo en píxeles (ancho o alto)
const MIN_CAPTURE_INTERVAL = 2000; // Mínimo intervalo entre capturas (ms)
const CAMERA_INIT_DELAY = 5000; // ⚠️ Aumentado para VM: tiempo de espera para inicialización (ms)
const MAX_INIT_RETRIES = 3; // Número máximo de intentos de inicialización

export const useUserImage = (userId = 1) => {
  const { addNotification } = useNotification();
  const [isCapturing, setIsCapturing] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [debugInfo, setDebugInfo] = useState({});
  const [initAttempts, setInitAttempts] = useState(0);
  
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
  // Nueva referencia para timeout de reintentos
  const retryTimerRef = useRef(null);
  
  // ⚠️ NUEVO: Detectar si estamos en una VM
  const [isVirtualEnvironment, setIsVirtualEnvironment] = useState(false);
  
  // Función para detectar entorno virtualizado
  useEffect(() => {
    // Estas son algunas heurísticas para detectar entornos virtualizados
    // No son 100% precisas pero pueden ayudar
    const checkVirtualEnvironment = () => {
      // 1. Rendimiento de la animación
      let frameCount = 0;
      let startTime = performance.now();
      
      const countFrames = () => {
        frameCount++;
        if (performance.now() - startTime < 1000) {
          requestAnimationFrame(countFrames);
        } else {
          // Si tenemos menos de 30fps, posiblemente estamos en una VM
          if (frameCount < 30) {
            console.log('📸 Posible entorno virtualizado detectado (bajo FPS)');
            setIsVirtualEnvironment(true);
          }
        }
      };
      
      requestAnimationFrame(countFrames);
      
      // 2. Comprobación del User-Agent (podría contener pistas)
      const ua = navigator.userAgent.toLowerCase();
      if (ua.includes('virtualbox') || ua.includes('vmware') || ua.includes('qemu')) {
        console.log('📸 Entorno virtualizado detectado via User-Agent');
        setIsVirtualEnvironment(true);
      }
      
      // 3. Comprobar si hay artefactos comunes de VM en el navegador
      if (window.navigator.language === 'C' || 
          window.screen.width === 800 && window.screen.height === 600) {
        console.log('📸 Posible entorno virtualizado detectado (resolución/locale)');
        setIsVirtualEnvironment(true);
      }
    };
    
    checkVirtualEnvironment();
  }, []);
  
  // Exponer lastCaptureTime para que otros componentes puedan verificarlo
  const getLastCaptureTime = useCallback(() => {
    return lastCaptureTimeRef.current;
  }, []);
  
  // ⚠️ Función mejorada: Inicializar la cámara con reintentos y manejo mejorado de errores
  const initCamera = useCallback(async () => {
    try {
      // Si ya está inicializado, salir
      if (streamRef.current) return true;
      
      // Incrementar contador de intentos
      setInitAttempts(prev => prev + 1);
      
      // Si superamos el máximo de intentos, notificar pero no mostrar error
      if (initAttempts >= MAX_INIT_RETRIES) {
        console.warn(`📸 Máximo de intentos (${MAX_INIT_RETRIES}) alcanzado para inicializar la cámara`);
        
        // En entorno virtual, mostramos un mensaje más específico
        if (isVirtualEnvironment) {
          console.warn('📸 Detectado entorno virtualizado, se continuará sin cámara');
          addNotification('La cámara no está disponible en este entorno virtualizado. La aplicación funcionará con funcionalidad limitada.', 'info');
        }
        
        return false;
      }
      
      console.log(`📸 Iniciando cámara para capturas de imagen (intento ${initAttempts+1}/${MAX_INIT_RETRIES})...`);
      
      // Opciones para entornos virtualizados vs normales
      const videoConstraints = isVirtualEnvironment 
        ? { 
            facingMode: 'user',
            width: { ideal: 320 }, // Menor resolución para VM
            height: { ideal: 240 },
            frameRate: { ideal: 15 } // Menor framerate
          } 
        : {
            facingMode: 'user',
            width: { ideal: MAX_IMAGE_SIZE },
            height: { ideal: MAX_IMAGE_SIZE }
          };
      
      // Solicitar acceso a la cámara con un timeout
      const streamPromise = navigator.mediaDevices.getUserMedia({ video: videoConstraints });
      
      // Crear un timeout para la promesa getUserMedia
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout al acceder a la cámara')), 10000);
      });
      
      // Competir entre obtener el stream y el timeout
      const stream = await Promise.race([streamPromise, timeoutPromise]);
      
      // Guardar referencia al stream
      streamRef.current = stream;
      
      // Si hay un elemento de video, asignar el stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // Esperar a que el video esté listo realmente
        await new Promise((resolve) => {
          const onLoadedMetadata = () => {
            console.log('📸 Video metadata cargada');
            videoRef.current.removeEventListener('loadedmetadata', onLoadedMetadata);
            resolve();
          };
          
          // Si ya tenemos metadata, resolver inmediatamente
          if (videoRef.current.readyState >= 2) {
            console.log('📸 Video ya tiene metadata');
            resolve();
          } else {
            videoRef.current.addEventListener('loadedmetadata', onLoadedMetadata);
          }
        });
        
        // Iniciar reproducción explícitamente
        try {
          await videoRef.current.play();
          console.log('📸 Video reproducción iniciada con éxito');
        } catch (err) {
          console.error('📸 Error al iniciar reproducción:', err);
          // No lanzamos el error, continuamos el flujo
        }
        
        // Damos tiempo adicional para que el video realmente muestre contenido
        // Más tiempo en entornos virtualizados
        if (cameraInitTimerRef.current) {
          clearTimeout(cameraInitTimerRef.current);
        }
        
        const delayTime = isVirtualEnvironment ? CAMERA_INIT_DELAY * 2 : CAMERA_INIT_DELAY;
        console.log(`📸 Esperando ${delayTime}ms para inicialización completa...`);
        
        cameraInitTimerRef.current = setTimeout(() => {
          // Verificar que el video tenga dimensiones válidas
          if (videoRef.current && 
              videoRef.current.videoWidth > 0 && 
              videoRef.current.videoHeight > 0) {
            
            setIsReady(true);
            console.log('📸 Cámara inicializada y lista para capturar');
            
            // Actualizar información de debug
            setDebugInfo({
              videoWidth: videoRef.current.videoWidth,
              videoHeight: videoRef.current.videoHeight,
              readyState: videoRef.current.readyState,
              isVirtualEnvironment
            });
          } else {
            console.warn('📸 Video inicializado pero sin dimensiones válidas, reintentando...');
            
            // Programar un nuevo intento
            if (retryTimerRef.current) {
              clearTimeout(retryTimerRef.current);
            }
            
            retryTimerRef.current = setTimeout(() => {
              // Detener la cámara actual y reintentar
              stopCamera();
              initCamera();
            }, 2000);
            
            return false;
          }
        }, delayTime);
      }
      
      return true;
    } catch (error) {
      console.error('📸 Error al inicializar cámara:', error);
      
      // Mensajes específicos para diferentes tipos de errores
      if (error.name === 'NotAllowedError') {
        addNotification('Permiso denegado para acceder a la cámara. Comprueba la configuración de tu navegador.', 'warning');
      } else if (error.name === 'NotFoundError') {
        addNotification('No se encontró ninguna cámara disponible en tu dispositivo.', 'warning');
      } else if (error.name === 'NotReadableError') {
        addNotification('La cámara está siendo utilizada por otra aplicación o no se puede acceder a ella.', 'warning');
      } else if (error.message === 'Timeout al acceder a la cámara') {
        console.warn('📸 Timeout al acceder a la cámara, reintentando...');
        
        // Programar otro intento después de un tiempo
        if (retryTimerRef.current) {
          clearTimeout(retryTimerRef.current);
        }
        
        retryTimerRef.current = setTimeout(() => {
          initCamera();
        }, 3000);
        
        return false;
      } else {
        addNotification('No se pudo acceder a la cámara: ' + (error.message || 'Error desconocido'), 'warning');
      }
      
      setIsReady(false);
      
      // Verificar si debemos reintentar
      if (initAttempts < MAX_INIT_RETRIES) {
        console.log(`📸 Reintentando inicialización (${initAttempts+1}/${MAX_INIT_RETRIES})...`);
        
        // Programar otro intento después de un tiempo
        if (retryTimerRef.current) {
          clearTimeout(retryTimerRef.current);
        }
        
        retryTimerRef.current = setTimeout(() => {
          initCamera();
        }, 3000);
      } else if (isVirtualEnvironment) {
        console.warn('📸 Fallo en entorno virtualizado, continuando sin cámara');
        // En VM, consideramos que la app puede funcionar sin cámara
        return false;
      }
      
      return false;
    }
  }, [addNotification, stopCamera, initAttempts, isVirtualEnvironment]);
  
  // Detener la cámara
  const stopCamera = useCallback(() => {
    if (cameraInitTimerRef.current) {
      clearTimeout(cameraInitTimerRef.current);
      cameraInitTimerRef.current = null;
    }
    
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    
    if (streamRef.current) {
      const tracks = streamRef.current.getTracks();
      tracks.forEach(track => track.stop());
      streamRef.current = null;
      
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      
      setIsReady(false);
      console.log('📸 Cámara detenida');
    }
  }, []);
  
  // Asignar elemento de video
  const setVideoElement = useCallback((element) => {
    if (!element) return;
    
    console.log('📸 Elemento de video asignado');
    videoRef.current = element;
    
    // Si ya tenemos un stream, asignarlo al nuevo elemento
    if (streamRef.current && element) {
      element.srcObject = streamRef.current;
      
      // Intentar iniciar reproducción explícitamente
      element.play().then(() => {
        console.log('📸 Video reproducción iniciada con éxito (desde setVideoElement)');
      }).catch(err => {
        console.error('📸 Error al iniciar reproducción:', err);
      });
    }
  }, []);
  
  // ⚠️ Versión mejorada: Capturar y redimensionar imagen
  const captureImage = useCallback(async () => {
    // ⚠️ NUEVO: Si estamos en un entorno virtualizado y la cámara no está lista,
    // devolvemos un placeholder en vez de fallar silenciosamente
    if (isVirtualEnvironment && (!isReady || !streamRef.current)) {
      console.log('📸 Entorno virtualizado detectado, generando imagen placeholder');
      return Promise.resolve(generatePlaceholderImage());
    }
    
    if (!isReady || !streamRef.current) {
      console.log('📸 No se puede capturar: cámara no lista', { isReady, hasStream: !!streamRef.current });
      return null;
    }
    
    if (isCapturing) {
      console.log('📸 Ya hay una captura en curso, omitiendo');
      return null;
    }
    
    const now = Date.now();
    // Evitar capturas demasiado frecuentes
    if (now - lastCaptureTimeRef.current < MIN_CAPTURE_INTERVAL) {
      console.log('📸 Captura demasiado frecuente, usando cache');
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
      
      // Verificar que el video tenga dimensiones y esté reproduciendo
      if (!video.videoWidth || !video.videoHeight || video.videoWidth === 0 || video.videoHeight === 0) {
        console.error('📸 Video no tiene dimensiones válidas', { 
          width: video.videoWidth, 
          height: video.videoHeight,
          readyState: video.readyState,
          paused: video.paused
        });
        
        // Intentar reproducir de nuevo
        try {
          await video.play();
        } catch (e) {
          console.log('📸 Error al reproducir video:', e);
        }
        
        // ⚠️ NUEVO: En entorno VM, generamos placeholder en vez de fallar
        if (isVirtualEnvironment) {
          console.log('📸 Generando placeholder por error de dimensiones en VM');
          const placeholderBlob = generatePlaceholderImage();
          latestImageRef.current = placeholderBlob;
          return Promise.resolve(placeholderBlob);
        }
        
        throw new Error('Video no inicializado completamente');
      }
      
      console.log(`📸 Capturando imagen (${video.videoWidth}x${video.videoHeight})`);
      
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
      
      // Limpiar canvas para asegurar que no queden residuos
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, targetWidth, targetHeight);
      
      // Dibujar y redimensionar en un solo paso
      ctx.drawImage(video, 0, 0, width, height, 0, 0, targetWidth, targetHeight);
      
      // Obtener los datos de imagen para verificar que no sea negra
      const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
      let isBlack = true;
      
      // Comprobar si la imagen es completamente negra (muestreo rápido)
      for (let i = 0; i < imageData.data.length; i += 40) {
        if (imageData.data[i] > 10 || imageData.data[i+1] > 10 || imageData.data[i+2] > 10) {
          isBlack = false;
          break;
        }
      }
      
      // Si la imagen es negra y estamos en VM, generamos un placeholder
      if (isBlack) {
        console.warn('📸 La imagen capturada parece ser completamente negra');
        
        if (isVirtualEnvironment) {
          console.log('📸 Generando placeholder por imagen negra en VM');
          const placeholderBlob = generatePlaceholderImage();
          latestImageRef.current = placeholderBlob;
          return Promise.resolve(placeholderBlob);
        }
      }
      
      // Convertir a Blob con compresión JPEG
      const blob = await new Promise(resolve => {
        canvas.toBlob(blob => resolve(blob), 'image/jpeg', CAPTURE_QUALITY);
      });
      
      // Verificar que el blob tenga contenido
      if (!blob || blob.size < 1000) {
        console.warn('📸 Blob de imagen demasiado pequeño:', blob?.size || 0, 'bytes');
        
        // ⚠️ NUEVO: En VM, generamos placeholder si el blob es inválido
        if (isVirtualEnvironment) {
          console.log('📸 Generando placeholder por blob inválido en VM');
          const placeholderBlob = generatePlaceholderImage();
          latestImageRef.current = placeholderBlob;
          return Promise.resolve(placeholderBlob);
        }
      } else {
        console.log('📸 Imagen capturada:', blob.size, 'bytes');
      }
      
      // Guardar en cache
      latestImageRef.current = blob;
      
      return blob;
    } catch (error) {
      console.error('📸 Error al capturar imagen:', error);
      
      // ⚠️ NUEVO: En VM, generamos placeholder si hay un error
      if (isVirtualEnvironment) {
        console.log('📸 Generando placeholder por error en VM:', error.message);
        const placeholderBlob = generatePlaceholderImage();
        latestImageRef.current = placeholderBlob;
        return Promise.resolve(placeholderBlob);
      }
      
      return null;
    } finally {
      setIsCapturing(false);
    }
  }, [isReady, isCapturing, isVirtualEnvironment]);
  
  // ⚠️ NUEVA FUNCIÓN: Generar imagen de placeholder para entornos virtualizados
  const generatePlaceholderImage = () => {
    console.log('📸 Generando imagen placeholder');
    
    // Crear un canvas para el placeholder
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 240;
    
    const ctx = canvas.getContext('2d');
    
    // Dibujar un fondo gris claro
    ctx.fillStyle = '#F0F0F0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Dibujar un icono simple de usuario
    ctx.beginPath();
    ctx.arc(canvas.width / 2, 90, 40, 0, Math.PI * 2);
    ctx.fillStyle = '#B0B0B0';
    ctx.fill();
    
    // Dibujar el cuerpo
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 140);
    ctx.bezierCurveTo(
      canvas.width / 2 - 70, 140,
      canvas.width / 2 - 70, 220,
      canvas.width / 2, 220
    );
    ctx.bezierCurveTo(
      canvas.width / 2 + 70, 220,
      canvas.width / 2 + 70, 140,
      canvas.width / 2, 140
    );
    ctx.fillStyle = '#B0B0B0';
    ctx.fill();
    
    // Añadir texto
    ctx.font = '14px Arial';
    ctx.fillStyle = '#606060';
    ctx.textAlign = 'center';
    ctx.fillText('Cámara no disponible en VM', canvas.width / 2, 180);
    
    // Convertir el canvas a un blob de manera sincrónica
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    const byteString = atob(dataUrl.split(',')[1]);
    const mimeString = dataUrl.split(',')[0].split(':')[1].split(';')[0];
    
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    
    return new Blob([ab], {type: mimeString});
  };
  
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
      
      console.log(`📸 Procesando imagen de cola (descartando ${sortedQueue.length - 1} imágenes antiguas)`);
      
      // Vaciar la cola
      imageQueueRef.current = [];
      
      // Enviar la imagen más reciente
      if (latestImage && latestImage.blob) {
        console.log('📸 Subiendo imagen al servidor...', latestImage.blob.size, 'bytes');
        
        const formData = new FormData();
        formData.append('user_id', userId);
        formData.append('image', latestImage.blob, 'user_image.jpg');
        
        try {
          // ⚠️ NUEVO: Añadir timeout para evitar bloqueos prolongados
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000);
          
          const response = await fetch(`${BACKEND_URL}/api/v1/chat/images/`, {
            method: 'POST',
            body: formData,
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          if (response.ok) {
            console.log('✅ Imagen subida correctamente');
          } else {
            console.error(`Error al subir imagen: ${response.status}`);
            
            // Intentar leer el cuerpo de la respuesta para más detalles
            try {
              const errorText = await response.text();
              console.error('Detalles del error:', errorText);
            } catch (e) {}
          }
        } catch (error) {
          if (error.name === 'AbortError') {
            console.error('📸 Timeout al subir imagen');
          } else {
            console.error('📸 Error al subir imagen:', error);
          }
        }
      }
    } finally {
      isProcessingQueueRef.current = false;
    }
  }, [userId]);
  
  // Subir imagen al servidor - versión optimizada
  const uploadImage = useCallback(async (imageBlob) => {
    if (!imageBlob) return false;
    
    // Añadir a la cola en lugar de subir inmediatamente
    imageQueueRef.current.push({
      blob: imageBlob,
      timestamp: Date.now()
    });
    
    // Iniciar el procesamiento de la cola si no está en marcha
    if (!isProcessingQueueRef.current) {
      processImageQueue();
    }
    
    return true; // Devolver true inmediatamente para no bloquear
  }, [processImageQueue]);
  
  // Función combinada para capturar y subir - no bloqueante
  const captureAndUpload = useCallback(async () => {
    // ⚠️ MODIFICADO: Si estamos en VM, permitir flujo con placeholder
    if (!isReady && !isVirtualEnvironment) {
      console.log('📸 Cámara no lista, intentando inicializar');
      initCamera();
      return false;
    }
    
    try {
      // Capturar imagen (generará placeholder en VM si es necesario)
      const imageBlob = await captureImage();
      
      // Si tenemos una imagen, añadirla a la cola de envío
      if (imageBlob) {
        return uploadImage(imageBlob);
      }
      
      return false;
    } catch (error) {
      console.error('Error en captureAndUpload:', error);
      return false;
    }
  }, [isReady, isVirtualEnvironment, initCamera, captureImage, uploadImage]);
  
  // ⚠️ Función mejorada: Captura inicial única con mejor manejo para VM
  const captureInitialImage = useCallback(async () => {
    // Asegurarse de que solo se ejecute una vez
    if (initialCaptureCompletedRef.current) return;
    
    console.log('📸 Programando captura inicial...');
    
    // Marcar como completada para evitar múltiples capturas iniciales
    initialCaptureCompletedRef.current = true;
    
    // Ajustar tiempo según el entorno (más largo para VM)
    const initialDelay = isVirtualEnvironment ? 5000 : 3000;
    
    setTimeout(async () => {
      try {
        // Verificar que la cámara esté realmente lista o si estamos en VM
        if (!isReady && !isVirtualEnvironment) {
          console.log('📸 Esperando a que la cámara esté lista para captura inicial');
          
          // Esperar más tiempo si la cámara aún no está lista
          setTimeout(async () => {
            const success = await captureAndUpload();
            console.log(`📸 Captura inicial (segundo intento): ${success ? 'éxito' : 'falló'}`);
          }, 2000);
          
          return;
        }
        
        const success = await captureAndUpload();
        console.log(`📸 Captura inicial: ${success ? 'éxito' : 'falló'}`);
      } catch (e) {
        console.error('Error en captura inicial:', e);
      }
    }, initialDelay); 
  }, [captureAndUpload, isReady, isVirtualEnvironment]);
  
  // Limpiar al desmontar
  useEffect(() => {
    return () => {
      stopCamera();
      imageQueueRef.current = [];
      latestImageRef.current = null;
      
      if (cameraInitTimerRef.current) {
        clearTimeout(cameraInitTimerRef.current);
      }
      
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
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
    isVirtualEnvironment
  };
};

export default useUserImage;