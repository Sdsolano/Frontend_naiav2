// hooks/useUserImage.jsx
import { useState, useRef, useEffect, useCallback } from 'react';
import { useNotification } from '../components/NotificationContext';

const CAPTURE_QUALITY = 0.6; // Calidad de compresión JPEG (0-1)
const MAX_IMAGE_SIZE = 640; // Tamaño máximo en píxeles (ancho o alto)
const MIN_CAPTURE_INTERVAL = 2000; // Mínimo intervalo entre capturas (ms)

export const useUserImage = (userId = 1) => {
  const { addNotification } = useNotification();
  const [isCapturing, setIsCapturing] = useState(false);
  const [isReady, setIsReady] = useState(false);
  
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
  
  // Exponer lastCaptureTime para que otros componentes puedan verificarlo
  const getLastCaptureTime = useCallback(() => {
    return lastCaptureTimeRef.current;
  }, []);
  
  // Inicializar la cámara
  const initCamera = useCallback(async () => {
    try {
      if (streamRef.current) return true; // Ya inicializado
      
      console.log('📸 Iniciando cámara para capturas de imagen...');
      
      // Solicitar acceso a la cámara con baja resolución para rendimiento
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
      }
      
      setIsReady(true);
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
    videoRef.current = element;
    
    // Si ya tenemos un stream, asignarlo al nuevo elemento
    if (streamRef.current && element) {
      element.srcObject = streamRef.current;
    }
  }, []);
  
  // Capturar y redimensionar imagen - optimizado para velocidad
  const captureImage = useCallback(async () => {
    if (!isReady || !streamRef.current || isCapturing) return null;
    
    const now = Date.now();
    // Evitar capturas demasiado frecuentes
    if (now - lastCaptureTimeRef.current < MIN_CAPTURE_INTERVAL) {
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
      
      if (!video || !video.videoWidth) {
        throw new Error('Video no disponible o no inicializado completamente');
      }
      
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
      
      // Dibujar y redimensionar en un solo paso
      ctx.drawImage(video, 0, 0, width, height, 0, 0, targetWidth, targetHeight);
      
      // Convertir a Blob con compresión JPEG
      const blob = await new Promise(resolve => {
        canvas.toBlob(blob => resolve(blob), 'image/jpeg', CAPTURE_QUALITY);
      });
      
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
      // Esto evita sobrecarga de red con imágenes obsoletas
      const sortedQueue = [...imageQueueRef.current].sort((a, b) => b.timestamp - a.timestamp);
      const latestImage = sortedQueue[0];
      
      console.log(`📸 Procesando imagen de cola (descartando ${sortedQueue.length - 1} imágenes antiguas)`);
      
      // Vaciar la cola
      imageQueueRef.current = [];
      
      // Enviar la imagen más reciente
      if (latestImage && latestImage.blob) {
        console.log('📸 Subiendo imagen al servidor...');
        
        const formData = new FormData();
        formData.append('user_id', userId);
        formData.append('image', latestImage.blob, 'user_image.jpg');
        
        try {
          const response = await fetch('http://127.0.0.1:8000/api/v1/chat/images/', {
            method: 'POST',
            body: formData,
          });
          
          if (response.ok) {
            console.log('✅ Imagen subida correctamente');
          } else {
            console.error(`Error al subir imagen: ${response.status}`);
          }
        } catch (error) {
          console.error('📸 Error al subir imagen:', error);
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
    // Si la cámara no está lista, intentar inicializarla pero no esperar
    if (!isReady) {
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
    
    console.log('📸 Realizando captura inicial...');
    
    // Marcar como completada para evitar múltiples capturas iniciales
    initialCaptureCompletedRef.current = true;
    
    // Pequeño tiempo para que la cámara se inicialice completamente
    setTimeout(async () => {
      try {
        const success = await captureAndUpload();
        console.log(`📸 Captura inicial: ${success ? 'éxito' : 'falló'}`);
      } catch (e) {
        console.error('Error en captura inicial:', e);
      }
    }, 1000);
  }, [captureAndUpload]);
  
  // Limpiar al desmontar
  useEffect(() => {
    return () => {
      stopCamera();
      imageQueueRef.current = [];
      latestImageRef.current = null;
    };
  }, [stopCamera]);
  
  // IMPORTANTE: Sin intervalo periódico que pueda causar capturas repetidas
  
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
    getLastCaptureTime
  };
};

export default useUserImage;