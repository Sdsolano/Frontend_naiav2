// hooks/useConversationalVoice.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNotification } from '../components/NotificationContext';

export const useConversationalVoice = (options = {}) => {
  const { addNotification } = useNotification();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [autoMode, setAutoMode] = useState(false);
  
  // Estado interno para el ciclo de conversación
  const [conversationState, setConversationState] = useState('idle'); // idle, listening, waitingResponse
  
  // Referencia para mantener el transcript actualizado en las callbacks
  const transcriptRef = useRef('');
  
  // Actualizar la referencia cuando cambia el transcript
  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);
  
  const recognitionRef = useRef(null);
  const timeoutRef = useRef(null);
  const speechTimeoutRef = useRef(null);
  const restartTimeoutRef = useRef(null);
  const hasSpokenRef = useRef(false);
  
  // Configuraciones
  const {
    language = 'es-ES',
    pauseThreshold = 2000, // tiempo de silencio para considerar que terminó el habla
    onSendMessage = () => {}, // Callback para enviar el mensaje
    isResponding = false,    // El avatar está generando/reproduciendo respuesta
    hasResponded = false,    // El avatar ha completado una respuesta (para detectar ciclos)
  } = options;
  
  // Limpiar timeouts
  const clearAllTimeouts = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (speechTimeoutRef.current) {
      clearTimeout(speechTimeoutRef.current);
      speechTimeoutRef.current = null;
    }
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
  }, []);
  
  // Detener reconocimiento
  const stopListening = useCallback((sendTranscript = false) => {
    console.log(`[Voice] Deteniendo reconocimiento (enviar=${sendTranscript})`);
    
    clearAllTimeouts();
    
    // Si hay una instancia activa, detenerla
    if (recognitionRef.current) {
      try {
        // Obtener el texto actual de la referencia (más confiable que el closure)
        const currentText = transcriptRef.current || '';
        
        // Log para verificar el texto actual
        console.log(`[Voice] Texto actual: "${currentText}" (${currentText.length} caracteres)`);
        
        // Detener reconocimiento
        recognitionRef.current.abort();
        recognitionRef.current = null;
        
        // Enviar mensaje si se solicita y hay texto
        if (sendTranscript && currentText.trim()) {
          console.log(`[Voice] Enviando mensaje: "${currentText}"`);
          // Timeout mínimo para asegurar que el estado se ha actualizado
          setTimeout(() => {
            onSendMessage(currentText.trim());
            // Cambiar estado a espera de respuesta
            setConversationState('waitingResponse');
          }, 10);
        } else if (sendTranscript) {
          console.log('[Voice] No hay texto para enviar');
        }
      } catch (error) {
        console.error('[Voice] Error al detener reconocimiento:', error);
      }
    }
    
    // Actualizar estado
    setIsListening(false);
  }, [onSendMessage, clearAllTimeouts]);
  
  // Iniciar reconocimiento
  const startListening = useCallback(() => {
    // Si ya está escuchando, no hacer nada
    if (isListening) return;
    
    console.log('[Voice] Iniciando reconocimiento');
    
    // Reiniciar estado
    setTranscript('');
    transcriptRef.current = '';
    hasSpokenRef.current = false;
    clearAllTimeouts();
    
    // Verificar soporte del navegador
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      addNotification('Tu navegador no soporta reconocimiento de voz', 'error');
      return false;
    }
    
    try {
      // Crear instancia
      const recognition = new SpeechRecognition();
      recognition.lang = language;
      recognition.continuous = false;
      recognition.interimResults = true;
      
      // Evento de inicio
      recognition.onstart = () => {
        console.log('[Voice] Reconocimiento iniciado');
        setIsListening(true);
        setConversationState('listening');
        
        // Si no se detecta habla en 5 segundos, reintentar
        speechTimeoutRef.current = setTimeout(() => {
          if (!hasSpokenRef.current && autoMode) {
            console.log('[Voice] No se detectó habla, reiniciando...');
            stopListening(false);
            
            // Pequeña pausa antes de reintentar
            restartTimeoutRef.current = setTimeout(() => {
              if (autoMode) startListening();
            }, 300);
          }
        }, 5000);
      };
      
      // Evento de resultado
      recognition.onresult = (event) => {
        hasSpokenRef.current = true;
        
        // Obtener texto actual
        const lastResultIndex = event.results.length - 1;
        const text = event.results[lastResultIndex][0].transcript;
        
        // Actualizar transcript
        setTranscript(text);
        transcriptRef.current = text; // Actualizar también la referencia
        
        // Si es un resultado final, prepararse para detectar fin de habla
        if (event.results[lastResultIndex].isFinal) {
          console.log(`[Voice] Resultado intermedio: "${text}"`);
          
          // Cancelar timeout anterior si existe
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }
          
          // Configurar nuevo timeout para detectar pausa
          timeoutRef.current = setTimeout(() => {
            console.log(`[Voice] Pausa de ${pauseThreshold}ms detectada, finalizando reconocimiento`);
            stopListening(true); // Detener y enviar mensaje
          }, pauseThreshold);
        }
      };
      
      // Evento de fin
      recognition.onend = () => {
        console.log('[Voice] Reconocimiento finalizado');
        
        // Si no ha cambiado a estado de espera, es porque terminó inesperadamente
        if (conversationState === 'listening') {
          setIsListening(false);
          
          // Si ha hablado y está en modo auto, intentar enviar el texto actual
          if (hasSpokenRef.current && autoMode && transcriptRef.current.trim()) {
            console.log(`[Voice] Enviando mensaje final: "${transcriptRef.current}"`);
            onSendMessage(transcriptRef.current.trim());
            setConversationState('waitingResponse');
          } else {
            setConversationState('idle');
          }
        }
        
        recognitionRef.current = null;
      };
      
      // Evento de error
      recognition.onerror = (event) => {
        console.error(`[Voice] Error: ${event.error}`);
        
        // Solo notificar errores críticos
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
          if (event.error === 'not-allowed') {
            addNotification('Permiso de micrófono denegado', 'error');
            setAutoMode(false);
          } else if (event.error !== 'network') {
            addNotification(`Error: ${event.error}`, 'error');
          }
        }
        
        // Limpiar estado
        setIsListening(false);
        setConversationState('idle');
        
        // Reintentar en algunos casos
        if (autoMode && 
            event.error === 'no-speech' && 
            !isResponding) {
          restartTimeoutRef.current = setTimeout(() => {
            if (autoMode) startListening();
          }, 1000);
        }
      };
      
      // Guardar referencia e iniciar
      recognitionRef.current = recognition;
      recognition.start();
      
      return true;
    } catch (error) {
      console.error('[Voice] Error al iniciar reconocimiento:', error);
      addNotification('Error al iniciar reconocimiento de voz', 'error');
      setIsListening(false);
      setConversationState('idle');
      return false;
    }
  }, [isListening, language, pauseThreshold, autoMode, isResponding, addNotification, stopListening, clearAllTimeouts, conversationState]);
  
  // Alternar reconocimiento manual
  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening(true);
    } else {
      startListening();
    }
  }, [isListening, stopListening, startListening]);
  
  // Alternar modo automático
  const toggleAutoMode = useCallback(() => {
    const newAutoMode = !autoMode;
    console.log(`[Voice] Modo automático: ${newAutoMode}`);
    setAutoMode(newAutoMode);
    
    // Si activamos modo auto y no está escuchando o respondiendo, iniciar
    if (newAutoMode && !isListening && !isResponding) {
      startListening();
    }
    // Si desactivamos modo auto y está escuchando, detener
    else if (!newAutoMode && isListening) {
      stopListening(false);
    }
  }, [autoMode, isListening, isResponding, startListening, stopListening]);
  
  // Efecto para manejar el ciclo automático
  useEffect(() => {
    // Si está en modo auto, gestionar el ciclo
    if (autoMode) {
      // Caso 1: El avatar está respondiendo, asegurarse de no escuchar
      if (isResponding && isListening) {
        console.log('[Voice] Avatar está respondiendo, pausando reconocimiento');
        stopListening(false);
      }
      
      // Caso 2: El avatar terminó de responder, reiniciar escucha si estaba esperando
      else if (!isResponding && conversationState === 'waitingResponse' && hasResponded) {
        console.log('[Voice] Avatar terminó de responder, reiniciando escucha');
        setConversationState('idle');
        
        // Pequeña pausa antes de reiniciar
        clearAllTimeouts();
        restartTimeoutRef.current = setTimeout(() => {
          if (autoMode) startListening();
        }, 1000);
      }
    }
  }, [autoMode, isResponding, isListening, hasResponded, conversationState, stopListening, startListening, clearAllTimeouts]);
  
  // Limpiar recursos al desmontar
  useEffect(() => {
    return () => {
      clearAllTimeouts();
      
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (error) {}
      }
    };
  }, [clearAllTimeouts]);
  
  // Función de reseteo añadiendo log
  const resetTranscript = useCallback(() => {
    console.log('[Voice] Reseteando transcript');
    setTranscript('');
    transcriptRef.current = '';
  }, []);
  
  return {
    isListening,
    transcript,
    autoMode,
    startListening,
    stopListening,
    toggleListening,
    toggleAutoMode,
    resetTranscript
  };
};