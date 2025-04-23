// hooks/useUserImage.jsx
import { useState, useRef, useEffect, useCallback } from 'react';
import { useNotification } from '../components/NotificationContext';
import { BACKEND_URL } from '../../config';

const CAPTURE_QUALITY = 0.9;
const MAX_IMAGE_SIZE = 640;
const MIN_CAPTURE_INTERVAL = 2000;
const CAMERA_INIT_DELAY = 3000;

export const useUserImage = (userId = 1) => {
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
      if (streamRef.current) return true; // Ya inicializado
      
      console.log('📸 Iniciando cámara para capturas de imagen...');
      
      // Solicitar acceso a la cámara
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: MAX_IMAGE_SIZE },
            height: { ideal: MAX_IMAGE_SIZE }
          }
        });
        
        streamRef.current = stream;
      } catch (e) {
        console.error('📸 Error al solicitar acceso a la cámara:', e);
        return false;
      }
      
      // Si hay un elemento de video, asignar el stream
      if (videoRef.current) {
        videoRef.current.srcObject = streamRef.current;
        
        // Esperar a que el video esté listo
        await new Promise((resolve) => {
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play().then(() => {
              console.log('📸 Video reproducción iniciada con éxito');
              resolve();
            }).catch(err => {
              console.error('📸 Error al iniciar reproducción:', err);
              resolve(); // Continuamos de todas formas
            });
          };
        });
      }
      
      // Temporizador para asegurar que la cámara esté realmente lista
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
      
      return true;
    } catch (error) {
      console.error('📸 Error al inicializar cámara:', error);
      addNotification('No se pudo acceder a la cámara para las capturas de imagen', 'warning');
      setIsReady(false);
      return false;
    }
  }, [addNotification]);
  
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
  
  // Procesar cola de imágenes
  const processImageQueue = useCallback(async () => {
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
  
  // Capturar y subir
  const captureAndUpload = useCallback(async () => {
    // Si la cámara no está lista, intentar inicializarla
    if (!isReady) {
      console.log('📸 Cámara no lista, intentando inicializar');
      const success = await initCamera();
      
      // Si no podemos inicializar la cámara, usar fallback
      if (!success) {
        console.log('📸 No se pudo inicializar la cámara, usando fallback');
        return uploadDummyImage();
      }
      
      return false;
    }
    
    try {
      // Capturar imagen normal
      const imageBlob = await captureImage();
      
      // Si no tenemos imagen, usar fallback
      if (!imageBlob) {
        console.log('📸 No se pudo capturar imagen, usando fallback');
        return uploadDummyImage();
      }
      
      // Si tenemos imagen, subirla normalmente
      return uploadImage(imageBlob);
    } catch (error) {
      console.error('Error en captureAndUpload:', error);
      // Usar fallback en caso de error
      return uploadDummyImage();
    }
  }, [isReady, initCamera, captureImage, uploadImage, uploadDummyImage]);
  
  // Función para captura inicial única
  const captureInitialImage = useCallback(async () => {
    // Asegurarse de que solo se ejecute una vez
    if (initialCaptureCompletedRef.current) return;
    
    console.log('📸 Programando captura inicial...');
    
    // Marcar como completada
    initialCaptureCompletedRef.current = true;
    
    // Tiempo más largo para inicialización
    setTimeout(async () => {
      try {
        // Verificar que la cámara esté lista
        if (!isReady) {
          console.log('📸 Esperando a que la cámara esté lista para captura inicial');
          
          // Esperar más tiempo
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
    }, 3000);
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
    debugInfo,
    uploadDummyImage
  };
};

export default useUserImage;