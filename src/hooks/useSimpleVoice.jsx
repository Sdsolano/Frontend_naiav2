// hooks/useSimpleVoice.jsx
import { useState, useEffect, useRef } from 'react';
import { useNotification } from '../components/NotificationContext';

// Variable global para evitar envíos duplicados
let lastProcessedText = '';
let lastProcessedTime = 0;

// Constantes para Always Listening
const WAKE_WORDS = [
  'naia', 'nadia', 'anaya', 'naya', 'naía', 'ñaia',
  'oye naia', 'hey naia', 'hola naia',
  'ok naia', 'vale naia'
];

const MAX_CONSECUTIVE_FAILURES = 3;

export const useSimpleVoice = (options = {}) => {
  const { addNotification } = useNotification();
  
  // Estados principales
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [continuousMode, setContinuousMode] = useState(false);
  const [alwaysListeningMode, setAlwaysListeningMode] = useState(false);
  const [consecutiveFailures, setConsecutiveFailures] = useState(0);
  
  // Referencias
  const recognitionRef = useRef(null);
  const processingRef = useRef(false);
  const transcriptRef = useRef('');
  const continuousModeRef = useRef(false);
  const alwaysListeningRef = useRef(false);
  const consecutiveFailuresRef = useRef(0);
  const isAvatarSpeaking = useRef(false);
  const isAvatarThinking = useRef(false);
  const isUserTurn = useRef(true); // Indica si es el turno del usuario para hablar
  
  // Actualizar referencias cuando cambian los estados
  useEffect(() => {
    continuousModeRef.current = continuousMode;
  }, [continuousMode]);
  
  useEffect(() => {
    alwaysListeningRef.current = alwaysListeningMode;
  }, [alwaysListeningMode]);
  
  useEffect(() => {
    consecutiveFailuresRef.current = consecutiveFailures;
  }, [consecutiveFailures]);
  
  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  // Opciones de configuración
  const { 
    handleSendMessage = null, 
    language = 'es-ES',
    onContinuousModeDisabled = null,
    onContinuousModeEnabled = null,
    onAlwaysListeningEnabled = null,
    onAlwaysListeningDisabled = null
  } = options;

  // Detectar eventos del avatar para pausar/reanudar
  useEffect(() => {
    const handleAvatarStart = () => {
      console.log(`🎭 Avatar empezó a hablar - pausando reconocimiento`);
      isAvatarSpeaking.current = true;
      isUserTurn.current = false;
      if (isListening) {
        stopListening();
      }
    };

    const handleAvatarEnd = () => {
      console.log(`🎭 Avatar terminó de hablar - reanudando reconocimiento`);
      isAvatarSpeaking.current = false;
      isUserTurn.current = true; // Ahora es el turno del usuario
      
      // Solo reanudar si algún modo está activo
      setTimeout(() => {
        if ((continuousModeRef.current || alwaysListeningRef.current) && !isAvatarThinking.current) {
          console.log(`🔄 Reanudando reconocimiento - turno del usuario`);
          startListening();
        }
      }, 500);
    };

    // Eventos para cuando el avatar está pensando/procesando
    const handleAvatarThinking = () => {
      console.log(`🤔 Avatar está pensando - pausando reconocimiento`);
      isAvatarThinking.current = true;
      isUserTurn.current = false;
      if (isListening) {
        stopListening();
      }
    };

    const handleAvatarThinkingEnd = () => {
      console.log(`🤔 Avatar terminó de pensar`);
      isAvatarThinking.current = false;
      // No reanudar aquí - esperar a que termine de hablar
    };

    // Eventos cuando se envía un mensaje (usuario habló)
    const handleUserMessage = () => {
      console.log(`👤 Usuario envió mensaje - pausando reconocimiento temporalmente`);
      isUserTurn.current = false;
      if (isListening) {
        stopListening();
      }
    };

    window.addEventListener('avatar-audio-started', handleAvatarStart);
    window.addEventListener('avatar-audio-ended', handleAvatarEnd);
    window.addEventListener('avatar-thinking-started', handleAvatarThinking);
    window.addEventListener('avatar-thinking-ended', handleAvatarThinkingEnd);
    window.addEventListener('directchat', handleUserMessage);

    return () => {
      window.removeEventListener('avatar-audio-started', handleAvatarStart);
      window.removeEventListener('avatar-audio-ended', handleAvatarEnd);
      window.removeEventListener('avatar-thinking-started', handleAvatarThinking);
      window.removeEventListener('avatar-thinking-ended', handleAvatarThinkingEnd);
      window.removeEventListener('directchat', handleUserMessage);
    };
  }, []);

  // Función para detectar wake words
  const detectWakeWord = (text) => {
    const cleanText = text.toLowerCase().trim();
    return WAKE_WORDS.some(wakeWord => cleanText.includes(wakeWord.toLowerCase()));
  };

  // Función para extraer texto DESPUÉS del wake word (o la wake word si no hay nada después)
  const removeWakeWords = (text) => {
    const lowerText = text.toLowerCase();
    
    // Buscar el wake word que aparece más tarde en el texto
    let lastWakeWordPosition = -1;
    let lastWakeWordLength = 0;
    let foundWakeWord = '';
    
    WAKE_WORDS.forEach(wakeWord => {
      const wakeWordLower = wakeWord.toLowerCase();
      const position = lowerText.lastIndexOf(wakeWordLower);
      
      if (position > lastWakeWordPosition) {
        lastWakeWordPosition = position;
        lastWakeWordLength = wakeWordLower.length;
        foundWakeWord = wakeWord;
      }
    });
    
    // Si encontramos un wake word
    if (lastWakeWordPosition !== -1) {
      const afterWakeWord = text.substring(lastWakeWordPosition + lastWakeWordLength).trim();
      
      console.log(`🧹 Texto original: "${text}"`);
      console.log(`🧹 Wake word encontrado: "${foundWakeWord}" en posición: ${lastWakeWordPosition}`);
      console.log(`🧹 Texto después del wake word: "${afterWakeWord}"`);
      
      // Si no hay nada después del wake word, enviar el wake word
      if (!afterWakeWord || afterWakeWord.length < 3) {
        console.log(`🧹 No hay contenido después del wake word, enviando: "${foundWakeWord}"`);
        return foundWakeWord;
      }
      
      // Si hay contenido después, enviar solo lo que sigue
      console.log(`🧹 Hay contenido después del wake word, enviando: "${afterWakeWord}"`);
      return afterWakeWord;
    }
    
    // Si no hay wake word, devolver texto original limpio
    return text.trim();
  };

  // Función para procesar mensajes según el modo
  const processVoiceMessage = (text) => {
    if (!text || !text.trim()) {
      // 🔧 CORRECCIÓN: Solo incrementar fallos en modo continuo Y cuando es turno del usuario
      // En Always Listening, texto vacío es normal mientras espera wake words
      if (continuousModeRef.current && isUserTurn.current) {
        console.log(`💔 Texto vacío durante turno del usuario en modo continuo - contando fallo`);
        incrementFailureCounter();
      } else if (alwaysListeningRef.current) {
        console.log(`👂 Always Listening: texto vacío, continuando escucha...`);
      } else {
        console.log(`💔 Texto vacío pero no es turno del usuario - ignorando`);
      }
      return;
    }
    
    const trimmedText = text.trim();
    
    // ALWAYS LISTENING MODE - Solo para wake words
    if (alwaysListeningRef.current && !continuousModeRef.current) {
      console.log(`👂 Always Listening: esperando wake word - "${trimmedText}"`);
      
      if (detectWakeWord(trimmedText)) {
        console.log(`🎯 Wake word detectado! Activando modo continuo...`);
        
        // Activar modo continuo
        switchToContinuousMode();
        
        // Si hay mensaje adicional después del wake word, enviarlo
        const cleanMessage = removeWakeWords(trimmedText);
        if (cleanMessage) {
          setTimeout(() => {
            sendMessage(cleanMessage);
          }, 800);
        }
      } else {
        console.log(`👂 Always Listening: no es wake word, continuando escucha...`);
      }
      return;
    }
    
    // CONTINUOUS MODE - Conversación normal
    if (continuousModeRef.current) {
      console.log(`🔄 Modo continuo: procesando mensaje`);
      
      // Resetear contador de fallos
      setConsecutiveFailures(0);
      consecutiveFailuresRef.current = 0;
      
      // Comando de salida
      const lowerText = trimmedText.toLowerCase();
      if (lowerText.includes('adiós') || 
          lowerText.includes('hasta luego') ||
          lowerText.includes('salir')) {
        console.log(`👋 Comando de salida detectado`);
        switchToAlwaysListeningMode();
        return;
      }
      
      // Enviar mensaje normal
      sendMessage(trimmedText);
      return;
    }
    
    // MODO NORMAL - Una sola interacción
    sendMessage(trimmedText);
  };

  // Función unificada para enviar mensaje
  const sendMessage = (text) => {
    const now = Date.now();
    
    if (text === lastProcessedText && (now - lastProcessedTime) < 2000) {
      console.log(`🎤 Ignorando mensaje duplicado: "${text}"`);
      return;
    }
    
    if (processingRef.current) {
      console.log(`🎤 Ya procesando un mensaje, ignorando: "${text}"`);
      return;
    }
    
    lastProcessedText = text;
    lastProcessedTime = now;
    processingRef.current = true;
    
    console.log(`📤 Enviando mensaje: "${text}"`);
    
    // Enviar mediante evento custom
    const chatEvent = new CustomEvent('directchat', { 
      detail: text 
    });
    window.dispatchEvent(chatEvent);
    
    setTimeout(() => {
      processingRef.current = false;
    }, 500);
  };

  // Función para incrementar contador de fallos
  const incrementFailureCounter = () => {
    const newFailures = consecutiveFailuresRef.current + 1;
    console.log(`💔 Fallos consecutivos: ${consecutiveFailuresRef.current} → ${newFailures}`);
    
    setConsecutiveFailures(newFailures);
    consecutiveFailuresRef.current = newFailures;
    
    // Volver a Always Listening después de 3 fallos
    if (newFailures >= MAX_CONSECUTIVE_FAILURES) {
      console.log(`💔 Máximo de fallos alcanzado, volviendo a Always Listening`);
      switchToAlwaysListeningMode();
    }
  };

  // Transición: Always Listening → Continuous Mode
  const switchToContinuousMode = () => {
    console.log(`🔄 Transición: Always Listening → Continuous Mode`);
    
    // Detener reconocimiento actual
    stopListening();
    
    // Actualizar estados y referencias
    setAlwaysListeningMode(false);
    setContinuousMode(true);
    setConsecutiveFailures(0);
    
    alwaysListeningRef.current = false;
    continuousModeRef.current = true;
    consecutiveFailuresRef.current = 0;
    
    // Callbacks
    if (onAlwaysListeningDisabled) onAlwaysListeningDisabled();
    if (onContinuousModeEnabled) onContinuousModeEnabled();
    
    addNotification('Conversación iniciada - Modo continuo activado', 'success');
    
    // Reiniciar reconocimiento en modo continuo
    setTimeout(() => {
      if (isUserTurn.current && !isAvatarSpeaking.current && !isAvatarThinking.current) {
        startListening();
      } else {
        console.log('🔄 Esperando turno del usuario para iniciar reconocimiento continuo');
      }
    }, 500);
  };

  // Transición: Continuous Mode → Always Listening
  const switchToAlwaysListeningMode = () => {
    console.log(`🔄 Transición: Continuous Mode → Always Listening`);
    
    // Detener reconocimiento actual
    stopListening();
    
    // Actualizar estados y referencias
    setContinuousMode(false);
    setAlwaysListeningMode(true);
    setConsecutiveFailures(0);
    
    continuousModeRef.current = false;
    alwaysListeningRef.current = true;
    consecutiveFailuresRef.current = 0;
    
    // Callbacks
    if (onContinuousModeDisabled) onContinuousModeDisabled();
    if (onAlwaysListeningEnabled) onAlwaysListeningEnabled();
    
    addNotification('Regresando a modo escucha - Di "Oye Naia" para reactivar', 'info');
    
    // Iniciar en modo always listening
    setTimeout(() => {
      if (isUserTurn.current && !isAvatarSpeaking.current && !isAvatarThinking.current) {
        startListening();
      } else {
        console.log('🔄 Esperando turno del usuario para iniciar Always Listening');
      }
    }, 500);
  };

  // Función para iniciar reconocimiento
  const startListening = () => {
    const canStart = !isListening && 
                    !recognitionRef.current && 
                    !isAvatarSpeaking.current && 
                    !isAvatarThinking.current &&
                    isUserTurn.current;
    
    if (!canStart) {
      console.log('🎤 No se puede iniciar reconocimiento:', {
        isListening,
        hasRecognition: !!recognitionRef.current,
        avatarSpeaking: isAvatarSpeaking.current,
        avatarThinking: isAvatarThinking.current,
        userTurn: isUserTurn.current
      });
      return;
    }
    
    console.log('🎤 Iniciando reconocimiento de voz...');
    
    // 🔧 LOGGING: Indicar el modo actual
    const currentMode = alwaysListeningRef.current ? 'Always Listening' : 
                       continuousModeRef.current ? 'Continuous' : 'Normal';
    console.log(`🎤 Modo actual: ${currentMode}`);
    
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      addNotification('Tu navegador no soporta reconocimiento de voz', 'error');
      return;
    }
    
    try {
      // Reiniciar transcript
      setTranscript('');
      transcriptRef.current = '';
      processingRef.current = false;
      
      // Crear nueva instancia
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      // Configurar
      recognition.lang = language;
      // 🔧 CORRECCIÓN: Always Listening necesita continuous=true para escuchar constantemente
      recognition.continuous = alwaysListeningRef.current ? true : false;
      recognition.interimResults = true;
      
      // Eventos
      recognition.onstart = () => {
        const mode = alwaysListeningRef.current ? 'Always Listening' : 
                    continuousModeRef.current ? 'Continuous' : 'Normal';
        console.log(`🎤 Reconocimiento iniciado en modo: ${mode}`);
        setIsListening(true);
      };
      
      recognition.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        
        const currentTranscript = finalTranscript || interimTranscript;
        setTranscript(currentTranscript);
        transcriptRef.current = currentTranscript;
        
        if (finalTranscript) {
          console.log(`🎤 Transcript final: "${finalTranscript}"`);
          processVoiceMessage(finalTranscript);
        }
      };
      
      recognition.onerror = (event) => {
        console.error(`🎤 Error: ${event.error}`);
        setIsListening(false);
        recognitionRef.current = null; // 🔧 IMPORTANTE: Limpiar referencia SIEMPRE
        
        if (event.error === 'not-allowed') {
          addNotification('Permiso de micrófono denegado', 'error');
        } else if (event.error === 'no-speech') {
          // 🔧 CORRECCIÓN: Solo contar fallos cuando es el turno del usuario
          if (continuousModeRef.current && isUserTurn.current) {
            console.log(`🔇 No-speech detectado durante turno del usuario - contando fallo`);
            incrementFailureCounter();
          } else {
            console.log(`🔇 No-speech detectado pero no es turno del usuario - ignorando`);
          }
        } else if (event.error === 'network' || event.error === 'service-not-allowed') {
          // 🔧 CORRECCIÓN: Errores de red en Always Listening, reintentar después de un delay
          if (alwaysListeningRef.current) {
            console.log(`🔇 Error de red en Always Listening, reintentando en 3 segundos...`);
            setTimeout(() => {
              if (alwaysListeningRef.current && isUserTurn.current) {
                startListening();
              }
            }, 3000);
          }
        }
      };
      
      recognition.onend = () => {
        console.log('🎤 Reconocimiento finalizado');
        setIsListening(false);
        recognitionRef.current = null; // 🔧 IMPORTANTE: Limpiar referencia SIEMPRE
        
        // ⭐ FUNCIONALIDAD ORIGINAL DEL MODO CONTINUO: Reiniciar automáticamente
        // Pero solo si es el turno del usuario y no hay actividad del avatar
        const shouldRestart = (continuousModeRef.current || alwaysListeningRef.current) && 
                             isUserTurn.current && 
                             !isAvatarSpeaking.current && 
                             !isAvatarThinking.current;
        
        if (shouldRestart) {
          // 🔧 CORRECCIÓN: Delay más largo para Always Listening
          const delay = alwaysListeningRef.current ? 2000 : 1000;
          
          setTimeout(() => {
            // Verificar nuevamente que las condiciones siguen siendo válidas
            if ((continuousModeRef.current || alwaysListeningRef.current) && 
                isUserTurn.current && 
                !isAvatarSpeaking.current && 
                !isAvatarThinking.current) {
              
              const mode = continuousModeRef.current ? 'continuo' : 'always listening';
              console.log(`🔄 Modo ${mode}: reiniciando reconocimiento - turno del usuario`);
              startListening();
            } else {
              console.log('🔄 Condiciones cambiaron, no reiniciando reconocimiento');
            }
          }, delay);
        } else {
          console.log('🔄 No reiniciando reconocimiento - no es turno del usuario o avatar está activo');
        }
      };
      
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
        try {
          recognitionRef.current.abort();
        } catch (e) {}
        recognitionRef.current = null;
        setIsListening(false);
      }
    }
  };

  // Toggle para modo continuo (independiente)
  const toggleContinuousMode = () => {
    const newMode = !continuousMode;
    console.log(`🔄 Toggle Continuous Mode: ${continuousMode} → ${newMode}`);
    
    if (newMode) {
      // Desactivar Always Listening si está activo
      if (alwaysListeningMode) {
        setAlwaysListeningMode(false);
        alwaysListeningRef.current = false;
        if (onAlwaysListeningDisabled) onAlwaysListeningDisabled();
      }
      
      setContinuousMode(true);
      continuousModeRef.current = true;
      setConsecutiveFailures(0);
      consecutiveFailuresRef.current = 0;
      
      if (onContinuousModeEnabled) onContinuousModeEnabled();
      
      if (!isListening && isUserTurn.current && !isAvatarSpeaking.current && !isAvatarThinking.current) {
        startListening();
      }
    } else {
      setContinuousMode(false);
      continuousModeRef.current = false;
      stopListening();
      
      if (onContinuousModeDisabled) onContinuousModeDisabled();
    }
  };

  // Toggle para Always Listening (independiente)
  const toggleAlwaysListeningMode = () => {
    const newMode = !alwaysListeningMode;
    console.log(`🔊 Toggle Always Listening: ${alwaysListeningMode} → ${newMode}`);
    
    if (newMode) {
      // Desactivar modo continuo si está activo
      if (continuousMode) {
        setContinuousMode(false);
        continuousModeRef.current = false;
        if (onContinuousModeDisabled) onContinuousModeDisabled();
      }
      
      setAlwaysListeningMode(true);
      alwaysListeningRef.current = true;
      setConsecutiveFailures(0);
      consecutiveFailuresRef.current = 0;
      
      if (onAlwaysListeningEnabled) onAlwaysListeningEnabled();
      
      if (!isListening && isUserTurn.current && !isAvatarSpeaking.current && !isAvatarThinking.current) {
        startListening();
      }
    } else {
      setAlwaysListeningMode(false);
      alwaysListeningRef.current = false;
      stopListening();
      
      if (onAlwaysListeningDisabled) onAlwaysListeningDisabled();
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
    toggleContinuousMode,
    alwaysListeningMode,
    toggleAlwaysListeningMode,
    consecutiveFailures
  };
};

export default useSimpleVoice;