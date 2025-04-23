// hooks/useUserImage.jsx
import { useState, useRef, useEffect, useCallback } from 'react';
import { useNotification } from '../components/NotificationContext';
import { BACKEND_URL } from '../../config';

const CAPTURE_QUALITY = 0.9; // Calidad de compresión JPEG (0-1)
const MAX_IMAGE_SIZE = 640; // Tamaño máximo en píxeles (ancho o alto)
const MIN_CAPTURE_INTERVAL = 2000; // Mínimo intervalo entre capturas (ms)
const CAMERA_INIT_DELAY = 2000; // Tiempo de espera para inicialización de cámara (ms)

export const useUserImage = (userId = 1) => {
  const { addNotification } = useNotification();
  const [isCapturing, setIsCapturing] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [debugInfo, setDebugInfo] = useState({});
  
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
  
  // Exponer lastCaptureTime para que otros componentes puedan verificarlo
  const getLastCaptureTime = useCallback(() => {
    return lastCaptureTimeRef.current;
  }, []);
  
  // Inicializar la cámara
  const initCamera = useCallback(async () => {
    try {
      console.log('streamref.current', streamRef.current);
      if (streamRef.current) return true; // Ya inicializado
      
      console.log('📸 Iniciando cámara para capturas de imagen...');
      
      // Solicitar acceso a la cámara con resolución específica
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: MAX_IMAGE_SIZE },
          height: { ideal: MAX_IMAGE_SIZE }
        }
      });
      
      // Guardar referencia al stream
      streamRef.current = stream;
      
      // Si hay un elemento de video, asignar el stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // Esperar a que el video esté listo realmente
        await new Promise((resolve) => {
          videoRef.current.onloadedmetadata = () => {
            // Iniciar reproducción explícitamente
            videoRef.current.play().then(() => {
              console.log('📸 Video reproducción iniciada con éxito');
              resolve();
            }).catch(err => {
              console.error('📸 Error al iniciar reproducción:', err);
              resolve(); // Continuamos de todas formas
            });
          };
        });
        
        // Damos tiempo adicional para que el video realmente muestre contenido
        if (cameraInitTimerRef.current) {
          clearTimeout(cameraInitTimerRef.current);
        }
        
        cameraInitTimerRef.current = setTimeout(() => {
          setIsReady(true);
          console.log('📸 Cámara inicializada y lista para capturar');
          
          // Actualizar información de debug
          if (videoRef.current) {
            setDebugInfo({
              videoWidth: videoRef.current.videoWidth,
              videoHeight: videoRef.current.videoHeight,
              readyState: videoRef.current.readyState
            });
          }
        }, CAMERA_INIT_DELAY);
      }
      
      return true;
    } catch (error) {
      console.error('📸 Error al inicializar cámara:', error);
      addNotification('No se pudo acceder a la cámara para las capturas de imagen', 'warning');
      setIsReady(false);
      return false;
    }
  }, [addNotification]);
  
  // Detener la cámara
  const stopCamera = useCallback(() => {
    if (cameraInitTimerRef.current) {
      clearTimeout(cameraInitTimerRef.current);
      cameraInitTimerRef.current = null;
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
  
  // Capturar y redimensionar imagen - optimizado para velocidad
  const captureImage = useCallback(async () => {
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
      
      if (isBlack) {
        console.warn('📸 La imagen capturada parece ser completamente negra');
      }
      
      // Convertir a Blob con compresión JPEG
      const blob = await new Promise(resolve => {
        canvas.toBlob(blob => resolve(blob), 'image/jpeg', CAPTURE_QUALITY);
      });
      
      // Verificar que el blob tenga contenido
      if (!blob || blob.size < 1000) {
        console.warn('📸 Blob de imagen demasiado pequeño:', blob?.size || 0, 'bytes');
      } else {
        console.log('📸 Imagen capturada:', blob.size, 'bytes');
      }
      
      // Guardar en cache
      latestImageRef.current = blob;
      
      return blob;
    } catch (error) {
      console.error('📸 Error al capturar imagen:', error);
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
      const sortedQueue = [...imageQueueRef.current].sort((a, b) => b.timestamp - a.timestamp);
      const latestImage = sortedQueue[0];
      
      console.log(`📸 Procesando imagen de cola (descartando ${sortedQueue.length - 1} imágenes antiguas)`);
      
      // Vaciar la cola
      imageQueueRef.current = [];
      
      // Enviar la imagen más reciente
      if (latestImage && latestImage.blob) {
        console.log('📸 Preparando FormData para subir imagen:', {
          blobSize: latestImage.blob.size,
          blobType: latestImage.blob.type,
          userId: userId
        });
        
        const formData = new FormData();
        formData.append('user_id', userId);
        formData.append('image', latestImage.blob, 'user_image.jpg');
        
        const url = `${BACKEND_URL}/api/v1/chat/images/`;
        console.log('📸 URL de subida:', url);
        
        try {
          console.log('📸 Iniciando solicitud fetch...');
          const response = await fetch(url, {
            method: 'POST',
            body: formData,
            // Agregar estos headers para depuración
            headers: {
              // No agregar Content-Type porque el navegador lo establece automáticamente con el boundary
            }
          });
          
          console.log('📸 Respuesta recibida:', {
            status: response.status,
            statusText: response.statusText,
            headers: {
              contentType: response.headers.get('content-type'),
              contentLength: response.headers.get('content-length')
            }
          });
          
          if (response.ok) {
            console.log('✅ Imagen subida correctamente');
            const responseData = await response.json();
            console.log('📸 Datos de respuesta:', responseData);
          } else {
            console.error(`❌ Error al subir imagen: ${response.status}`);
            
            // Intentar leer el cuerpo de la respuesta para más detalles
            try {
              const errorText = await response.text();
              console.error('❌ Detalles del error:', errorText);
            } catch (e) {
              console.error('❌ No se pudo leer el cuerpo de la respuesta:', e);
            }
          }
        } catch (error) {
          console.error('❌ Error en fetch:', error);
        }
      }
    } finally {
      isProcessingQueueRef.current = false;
    }
  }, [userId]);
  
  // Subir imagen al servidor - versión optimizada
  const uploadImage = useCallback(async (imageBlob) => {
    if (!imageBlob) return false;
    console.log('📸 Preparando imagen para cola:', {
      size: imageBlob.size,
      type: imageBlob.type,
      url: BACKEND_URL
    });
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
    // Si la cámara no está lista, intentar inicializarla pero no esperar
    if (!isReady) {
      console.log('📸 Cámara no lista, intentando inicializar');
      initCamera();
      return false;
    }
    
    try {
      // Capturar imagen
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
  }, [isReady, initCamera, captureImage, uploadImage]);
  
  // Función para captura inicial única
  const captureInitialImage = useCallback(async () => {
    // Asegurarse de que solo se ejecute una vez
    if (initialCaptureCompletedRef.current) return;
    
    console.log('📸 Programando captura inicial...');
    
    // Marcar como completada para evitar múltiples capturas iniciales
    initialCaptureCompletedRef.current = true;
    
    // Tiempo más largo para que la cámara se inicialice completamente
    setTimeout(async () => {
      try {
        // Verificar que la cámara esté realmente lista
        if (!isReady) {
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
    }, 3000); // Aumentado a 3 segundos para dar más tiempo a la inicialización
  }, [captureAndUpload, isReady]);
  
  // Limpiar al desmontar
  useEffect(() => {
    return () => {
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
    debugInfo
  };
};

export default useUserImage;