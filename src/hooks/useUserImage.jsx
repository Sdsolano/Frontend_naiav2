// hooks/useUserImage.jsx
import { useState, useRef, useEffect, useCallback } from 'react';
import { useNotification } from '../components/NotificationContext';
import { BACKEND_URL } from '../../config';
import { useUser } from '../components/UserContext';

const CAPTURE_QUALITY = 0.9;
const MAX_IMAGE_SIZE = 640;
const REALTIME_QUALITY = 0.3; // Menor calidad para realtime
const REALTIME_MAX_SIZE = 320; // Mucho más pequeño para realtime
const MIN_CAPTURE_INTERVAL = 2000;
const CAMERA_INIT_DELAY = 3000;

export const useUserImage = () => {
  const { userId, isUserReady } = useUser(); // Obtener userId dinámico

  const { addNotification } = useNotification();
  const [isCapturing, setIsCapturing] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [debugInfo, setDebugInfo] = useState({});
  
  // Referencias
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(document.createElement('canvas'));
  const lastCaptureTimeRef = useRef(0);
  const pendingUploadRef = useRef(false);
  const imageQueueRef = useRef([]);
  const isProcessingQueueRef = useRef(false);
  const latestImageRef = useRef(null);
  const initialCaptureCompletedRef = useRef(false);
  const cameraInitTimerRef = useRef(null);
  
  // Exponer lastCaptureTime
  const getLastCaptureTime = useCallback(() => {
    return lastCaptureTimeRef.current;
  }, []);
  
  // Función para asignar el elemento de video
  const setVideoElement = useCallback((element) => {
    if (!element) return;
    
    console.log('📸 Elemento de video asignado');
    videoRef.current = element;
    
    // Si ya tenemos un stream, asignarlo al nuevo elemento
    if (streamRef.current && element) {
      element.srcObject = streamRef.current;
      
      // Intentar iniciar reproducción
      element.play().then(() => {
        console.log('📸 Video reproducción iniciada con éxito (desde setVideoElement)');
      }).catch(err => {
        console.error('📸 Error al iniciar reproducción:', err);
      });
    }
  }, []);
  
  // Inicializar cámara
    const initCamera = useCallback(async () => {
      try {
        // Si ya hay un stream activo, consideramos que la cámara está lista
        if (streamRef.current) {
          console.log('📸 Usando stream de cámara existente');
          return true;
        }
        
        console.log('📸 Solicitando permisos de cámara...');
        
        // Verificar si el navegador soporta getUserMedia
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          console.error('📸 getUserMedia no es soportado en este navegador');
          return false;
        }
        
        // Intentar obtener el stream de la cámara
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: 'user',
              width: { ideal: MAX_IMAGE_SIZE },
              height: { ideal: MAX_IMAGE_SIZE }
            }
          });
          
          // Verificar que el stream tenga tracks de video
          if (!stream || !stream.getVideoTracks().length) {
            console.error('📸 No se obtuvieron tracks de video');
            return false;
          }
          
          streamRef.current = stream;
          console.log('📸 Stream de cámara obtenido correctamente');
          
          // Si hay un elemento de video, asignar el stream
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            
            // Esperar a que el video esté listo para reproducir
            await new Promise((resolve) => {
              videoRef.current.onloadedmetadata = () => {
                videoRef.current.play()
                  .then(() => {
                    console.log('📸 Video reproducción iniciada con éxito');
                    resolve();
                  })
                  .catch(err => {
                    console.error('📸 Error al iniciar reproducción:', err);
                    resolve(); // Continuamos de todas formas
                  });
              };
            });
          }
          
          // Establecer un temporizador para marcar la cámara como lista
          if (cameraInitTimerRef.current) {
            clearTimeout(cameraInitTimerRef.current);
          }
          
          cameraInitTimerRef.current = setTimeout(() => {
            // Verificar que realmente se esté obteniendo una imagen válida
            const videoTrack = stream.getVideoTracks()[0];
            if (videoTrack && videoTrack.readyState === 'live' && videoTrack.enabled) {
              setIsReady(true);
              console.log('📸 Cámara inicializada y lista para capturar');
              
              // Actualizar información de debug
              if (videoRef.current) {
                setDebugInfo({
                  videoWidth: videoRef.current.videoWidth || 0,
                  videoHeight: videoRef.current.videoHeight || 0,
                  readyState: videoRef.current.readyState || 0,
                  videoTrackState: videoTrack.readyState
                });
              }
            } else {
              console.error('📸 El video track no está activo o en estado live');
              setIsReady(false);
              return false;
            }
          }, CAMERA_INIT_DELAY);
          
          return true;
        } catch (error) {
          console.error('📸 Error al solicitar acceso a la cámara:', error);
          return false;
        }
      } catch (error) {
        console.error('📸 Error inesperado al inicializar cámara:', error);
        setIsReady(false);
        return false;
      }
    }, []);
  
  // Añadir esta función nueva al hook
  const isCameraActuallyWorking = useCallback(() => {
    // Verificar que tenemos un stream activo
    if (!streamRef.current) return false;
    
    // Verificar que hay tracks de video activos
    const videoTracks = streamRef.current.getVideoTracks();
    if (!videoTracks.length) return false;
    
    // Verificar que el primer track está activo
    const mainTrack = videoTracks[0];
    if (mainTrack.readyState !== 'live' || !mainTrack.enabled) return false;
    
    // Verificar que, si tenemos un elemento video, tiene dimensiones
    if (videoRef.current && 
      (videoRef.current.videoWidth === 0 || 
        videoRef.current.videoHeight === 0 || 
        videoRef.current.readyState < 2)) {
      return false;
    }
    
    // Si pasó todas las verificaciones, la cámara está funcionando
    return true;
  }, []);




  // Detener cámara
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
  
  // Capturar imagen
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
      if (latestImageRef.current) {
        return latestImageRef.current;
      }
      return null;
    }
    
    setIsCapturing(true);
    lastCaptureTimeRef.current = now;
    
    try {
      const video = videoRef.current;
      
      if (!video) {
        throw new Error('Elemento de video no disponible');
      }
      
      // Verificar que el video tenga dimensiones
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
      
      // Configurar canvas
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      
      // Limpiar canvas
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, targetWidth, targetHeight);
      
      // Dibujar y redimensionar
      ctx.drawImage(video, 0, 0, width, height, 0, 0, targetWidth, targetHeight);
      
      // Convertir a Blob
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

  // Capturar imagen específicamente optimizada para realtime
  const captureImageForRealtime = useCallback(async () => {
    if (!isReady || !streamRef.current) {
      console.log('📸 No se puede capturar para realtime: cámara no lista');
      return null;
    }
    
    if (isCapturing) {
      console.log('📸 Ya hay una captura en curso, omitiendo realtime');
      return null;
    }
    
    setIsCapturing(true);
    
    try {
      const video = videoRef.current;
      
      if (!video || !video.videoWidth || !video.videoHeight) {
        throw new Error('Video no inicializado para realtime');
      }
      
      console.log(`📸 Capturando imagen REALTIME optimizada (${video.videoWidth}x${video.videoHeight})`);
      
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      // Dimensiones MUY pequeñas para realtime
      const width = video.videoWidth;
      const height = video.videoHeight;
      
      let targetWidth, targetHeight;
      if (width > height) {
        targetWidth = Math.min(width, REALTIME_MAX_SIZE); // 320px máximo
        targetHeight = (height / width) * targetWidth;
      } else {
        targetHeight = Math.min(height, REALTIME_MAX_SIZE);
        targetWidth = (width / height) * targetHeight;
      }
      
      // Configurar canvas pequeño
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      
      // Limpiar canvas
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, targetWidth, targetHeight);
      
      // Dibujar imagen pequeña
      ctx.drawImage(video, 0, 0, width, height, 0, 0, targetWidth, targetHeight);
      
      // Convertir con calidad MUY baja para realtime
      const blob = await new Promise(resolve => {
        canvas.toBlob(blob => resolve(blob), 'image/jpeg', REALTIME_QUALITY); // 0.3 calidad
      });
      
      if (!blob || blob.size < 500) {
        console.warn('📸 Blob de realtime muy pequeño:', blob?.size || 0, 'bytes');
      } else {
        console.log('📸 Imagen realtime capturada:', blob.size, 'bytes');
      }
      
      return blob;
    } catch (error) {
      console.error('📸 Error capturando imagen para realtime:', error);
      return null;
    } finally {
      setIsCapturing(false);
    }
  }, [isReady, isCapturing]);
  
  // Procesar cola de imágenes
  const processImageQueue = useCallback(async () => {
    if (!userId) {
      console.log('📸 No se puede procesar cola de imágenes: userId no disponible');
      isProcessingQueueRef.current = false;
      return;
    }
    if (isProcessingQueueRef.current || imageQueueRef.current.length === 0) {
      return;
    }
    
    isProcessingQueueRef.current = true;
    
    try {
      // Tomar solo la imagen más reciente
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
          console.log('📸 URL de la solicitud:', `${BACKEND_URL}/api/v1/chat/images/`);
          const response = await fetch(`${BACKEND_URL}/api/v1/chat/images/`, {
            method: 'POST',
            body: formData,
          });
          
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
          console.error('📸 Error al subir imagen:', error);
        }
      }
    } finally {
      isProcessingQueueRef.current = false;
    }
  }, [userId]);
  
  // Subir imagen al servidor
  const uploadImage = useCallback(async (imageBlob) => {
    if (!userId) {
      console.log('📸 No se puede subir imagen dummy: userId no disponible');
      return false;
    }

    if (!imageBlob) return false;
    
    // Añadir a la cola
    imageQueueRef.current.push({
      blob: imageBlob,
      timestamp: Date.now()
    });
    
    // Iniciar el procesamiento de la cola
    if (!isProcessingQueueRef.current) {
      processImageQueue();
    }
    
    return true;
  }, [processImageQueue]);
  
  // Función de fallback para subir imagen dummy
  const uploadDummyImage = useCallback(async () => {
    console.log('📸 Generando imagen dummy como fallback');
    
    try {
      // Crear un canvas con un color sólido
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      canvas.width = 320;
      canvas.height = 240;
      
      // Dibujar un color de fondo claro
      ctx.fillStyle = '#f0f0f0';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Añadir texto indicando que es un fallback
      ctx.fillStyle = '#333333';
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Camera not available', canvas.width/2, canvas.height/2);
      
      // Convertir a blob
      const blob = await new Promise(resolve => {
        canvas.toBlob(blob => resolve(blob), 'image/jpeg', 0.9);
      });
      
      // Subir directamente
      const formData = new FormData();
      formData.append('user_id', userId);
      formData.append('image', blob, 'fallback_image.jpg');
      
      console.log('📸 Subiendo imagen fallback...');
      const response = await fetch(`${BACKEND_URL}/api/v1/chat/images/`, {
        method: 'POST',
        body: formData,
      });
      
      if (response.ok) {
        console.log('✅ Imagen fallback subida correctamente');
        return true;
      } else {
        console.error('❌ Error al subir imagen fallback:', response.status);
        return false;
      }
    } catch (error) {
      console.error('❌ Error en uploadDummyImage:', error);
      return false;
    }
  }, [userId]);
  
  // Capturar y subir (o solo capturar si captureOnly = true)
  const captureAndUpload = useCallback(async (captureOnly = false) => {
    // Para solo capturar (realtime), no necesitamos userId
    if (!captureOnly) {
      if (!isUserReady() || !userId) {
        console.log('📸 Usuario no está listo o userId no disponible, omitiendo captura');
        return false;
      }
    }
    
    if (!isReady || !isCameraActuallyWorking()) {
      console.log('📸 Cámara no disponible, omitiendo captura');
      return captureOnly ? null : false;
    }
    
    try {
      // Intentar captura (usar función optimizada para realtime si es necesario)
      const imageBlob = captureOnly ? await captureImageForRealtime() : await captureImage();
      
      if (imageBlob && imageBlob.size > 1000) { // Reducir umbral para realtime
        if (captureOnly) {
          // Solo retornar el blob para realtime
          console.log('📸 Imagen capturada para realtime:', imageBlob.size, 'bytes');
          return imageBlob;
        } else {
          // Comportamiento normal: subir al backend
          if (imageBlob.size > 5000) {
            return uploadImage(imageBlob);
          } else {
            console.log('📸 Imagen muy pequeña para backend, omitiendo subida');
            return false;
          }
        }
      } else {
        console.log('📸 Imagen no válida, omitiendo');
        return captureOnly ? null : false;
      }
    } catch (error) {
      console.error('Error en captureAndUpload:', error);
      return captureOnly ? null : false;
    }
  }, [isReady, isCameraActuallyWorking, captureImage, uploadImage, isUserReady, userId]);
  
  // Función para captura inicial única
  const captureInitialImage = useCallback(async () => {
    // Asegurarse de que solo se ejecute una vez
    if (initialCaptureCompletedRef.current) return;
    
    if (!isUserReady() || !userId) {
      console.log('📸 Usuario no está listo para captura inicial, omitiendo');
      return false;
    }

    console.log('📸 Programando captura inicial...');
    
    // Marcar como completada
    initialCaptureCompletedRef.current = true;
    
    // Tiempo para inicialización
    setTimeout(async () => {
      // Verificar si realmente tenemos acceso a la cámara
      if (!isReady || !isCameraActuallyWorking()) {
        console.log('📸 Cámara no disponible para captura inicial, omitiendo');
        return false;
      }
      
      // Intentar captura normal
      try {
        const imageBlob = await captureImage();
        
        if (imageBlob && imageBlob.size > 5000) {
          uploadImage(imageBlob);
          console.log('📸 Captura inicial exitosa');
          return true;
        } else {
          console.log('📸 Captura inicial no produjo una imagen válida, omitiendo');
          return false;
        }
      } catch (e) {
        console.error('Error en captura inicial:', e);
        return false;
      }
    }, 3000);
  }, [captureImage, uploadImage, isReady, isCameraActuallyWorking, isUserReady, userId]);
  
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
    captureImageForRealtime, // Nueva función optimizada para realtime
    uploadImage,
    captureAndUpload,
    captureInitialImage,
    getLastCaptureTime,
    debugInfo,
    isCameraActuallyWorking, // Nueva función
    uploadDummyImage, // Mantener para casos donde explícitamente se quiera usar
    userId: userId || "no disponible", // Exponer userId para uso externo
    isUserReady: isUserReady(),
  };
};

export default useUserImage;