// hooks/useSimpleVoice.jsx
import { useState, useEffect, useRef } from 'react';
import { useNotification } from '../components/NotificationContext';

// Variable global para evitar envíos duplicados
let lastProcessedText = '';
let lastProcessedTime = 0;

export const useSimpleVoice = (options = {}) => {
  const { addNotification } = useNotification();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [continuousMode, setContinuousMode] = useState(false); // Nuevo estado para el modo continuo
  
  // Referencias para mantener estado
  const recognitionRef = useRef(null);
  const processingRef = useRef(false);
  const transcriptRef = useRef(''); // Referencia al transcript actual
  
  // Actualizar la referencia cuando cambia el transcript
  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);
  
  // Obtener la función de envío desde las opciones
  const { handleSendMessage = null, 
    language = 'es-ES',
    onContinuousModeDisabled = null, // Callback para desactivar el modo continuo
    onContinuousModeEnabled = null
  } = options;
  
  // Función para evitar envíos duplicados
  const processVoiceMessage = (text) => {
    if (!text || !text.trim()) return;
    
    const trimmedText = text.trim();
    const now = Date.now();
    
    // Si es el mismo texto procesado en los últimos 2 segundos, ignorar
    if (trimmedText === lastProcessedText && (now - lastProcessedTime) < 2000) {
      console.log(`🎤 Ignorando mensaje duplicado: "${trimmedText}"`);
      return;
    }
    
    // Actualizar variables globales
    lastProcessedText = trimmedText;
    lastProcessedTime = now;
    
    // Si ya estamos procesando, ignorar
    if (processingRef.current) {
      console.log(`🎤 Ya procesando un mensaje, ignorando: "${trimmedText}"`);
      return;
    }
    
    processingRef.current = true;
    
    console.log(`🎤 Procesando mensaje de voz: "${trimmedText}"`);
    
    // Usar solo un método para enviar (evento custom)
    // Esto evita la duplicación de peticiones
    const chatEvent = new CustomEvent('directchat', { 
      detail: trimmedText 
    });
    window.dispatchEvent(chatEvent);
    
    // Restablecer el estado de procesamiento después de un breve retraso
    setTimeout(() => {
      processingRef.current = false;
    }, 500);
  };
  
    // Función para iniciar reconocimiento
    const startListening = () => {
      // Si ya está escuchando, no hacer nada
      if (isListening || recognitionRef.current) {
        console.log('🎤 Ya está escuchando, ignorando petición');
        return;
      }
      
      console.log('🎤 Iniciando reconocimiento de voz...');
      
      // Verificar soporte del navegador
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        addNotification('Tu navegador no soporta reconocimiento de voz', 'error');
        return;
      }
      
      try {
        // Reiniciar transcript y estado
        setTranscript('');
        transcriptRef.current = ''; // ¡IMPORTANTE! Reiniciar también la referencia
        processingRef.current = false;
        
        // Crear nueva instancia
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        
        // Configurar
        recognition.lang = language;
        recognition.continuous = false;
        recognition.interimResults = true;
        
        // Eventos
        recognition.onstart = () => {
          console.log('🎤 Reconocimiento iniciado');
          setIsListening(true);
        };
        
        recognition.onresult = (event) => {
          const finalTranscript = Array.from(event.results)
            .map(result => result[0].transcript)
            .join(' ');
            
          // Log menos frecuente para no saturar la consola
          if (finalTranscript.length % 10 === 0) {
            console.log(`🎤 Transcribiendo: "${finalTranscript}"`);
          }
          
          // Actualizar estado y referencia
          setTranscript(finalTranscript);
          transcriptRef.current = finalTranscript; // ¡IMPORTANTE! Actualizar la referencia también
        };
        
        recognition.onerror = (event) => {
          console.error(`🎤 Error: ${event.error}`);
          setIsListening(false);
          recognitionRef.current = null;
          
          if (event.error === 'not-allowed') {
            addNotification('Permiso de micrófono denegado', 'error');
          }
        };
        
        recognition.onend = () => {
          console.log('🎤 Reconocimiento finalizado');
          setIsListening(false);
          
          // Capturar el último transcript DESDE LA REFERENCIA
          const finalText = transcriptRef.current; // Use reference instead of state
          console.log(`🎤 Texto final (desde referencia): "${finalText}"`);
          
          // Procesar mensaje solo si hay texto
          if (finalText && finalText.trim()) {
            processVoiceMessage(finalText);
          }
          
          recognitionRef.current = null;
        };
        
        // Guardar referencia y comenzar
        recognitionRef.current = recognition;
        recognition.start();
        
      } catch (error) {
        console.error('❌ Error al iniciar reconocimiento:', error);
        addNotification('Error al iniciar reconocimiento de voz', 'error');
        setIsListening(false);
        recognitionRef.current = null;
      }
    };
  
  // Función para detener reconocimiento
  const stopListening = () => {
    console.log('🎤 Deteniendo reconocimiento...');
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.error('❌ Error al detener reconocimiento:', error);
        
        // Intentar abortar si stop falla
        try {
          recognitionRef.current.abort();
        } catch (e) {}
        
        recognitionRef.current = null;
        setIsListening(false);
      }
    }
  };

  // Función para activar/desactivar el modo continuo
  const toggleContinuousMode = () => {

    const currentMode = continuousMode;
    setContinuousMode(prev => !prev);
    console.log(`🎤 Modo continuo ${!continuousMode ? 'activado' : 'desactivado'}`);
    
    // Si desactivamos el modo continuo llamar al callback
    if (currentMode && onContinuousModeDisabled) {
      console.log("🎤 Llamando al callback de desactivación de modo continuo");
      onContinuousModeDisabled();
    }


    // Si estamos activando el modo continuo, llamamos al nuevo callback
    if (!currentMode && onContinuousModeEnabled) {
      console.log("🎤 Llamando al callback de activación de modo continuo");
      onContinuousModeEnabled();
    }

    // Si activamos el modo continuo y no estamos escuchando, comenzar a escuchar
    if (!continuousMode && !isListening) {
      startListening();
    }
  };
  
  // Limpiar al desmontar
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (error) {}
        recognitionRef.current = null;
      }
    };
  }, []);
  
  return {
    isListening,
    transcript,
    startListening,
    stopListening,
    toggleListening: () => {
      if (isListening) {
        stopListening();
      } else {
        startListening();
      }
    },
    continuousMode,
    toggleContinuousMode
  };
};

export default useSimpleVoice;