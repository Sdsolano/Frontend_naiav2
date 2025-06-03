import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { useNotification } from "../components/NotificationContext";
import defaultLipsync from "../utils/defaultLipsync";
import { OPENAI_API_KEY } from "../../config";
import SubtitlesContext from '../components/subtitles';
import { BACKEND_URL } from "../../config";
import PollingManager from "../components/PollingManager";
import { getCurrentRoleId } from "../utils/roleUtils"; // ← IMPORTAR UTILIDAD

// Constantes para configuración del chat
const VOICE_TYPE = getCurrentRoleId() == 1? "nova": "echo";
const POLLING_INTERVAL = 2000; // 2 segundos
const POLLING_START_DELAY = 5000; // 5 segundos

// Transiciones y muletillas para hacer el habla más natural
const SPEECH_TRANSITIONS = [" "];

// Opciones para animaciones y expresiones
const availableAnimations = ["Talking_1","Talking_2", "Crying", "Laughing", "Rumba", "Idle", "Terrified", "Angry", "standing_greeting", "raising_two_arms_talking", "put_hand_on_chin", "one_arm_up_talking", "happy_expressions"];
const availableFacialExpressions = ["smile", "sad", "angry", "surprised", "funnyFace", "crazy", "default"];

// Helper function
const getRandomItem = (array) => array[Math.floor(Math.random() * array.length)];

// Create the context
const ChatContext = createContext();

// CRITICAL: Single global audio object to prevent duplicates
let currentAudio = null;

/**
 * OpenAI API Service - Clase para manejar llamadas a la API
 */
class OpenAIAPI {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.abortController = null;
  }
  
  reset() {
    if (this.abortController) {
      this.abortController.abort();
    }
    this.abortController = new AbortController();
    return this.abortController.signal;
  }

  async getResponse(message) {
    const signal = this.reset();
    
    try {
      // Usar la API local en lugar de OpenAI
      const currentRoleId = getCurrentRoleId();

      const response = await fetch(`${BACKEND_URL}/api/v1/chat/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_input: message,
          user_id: 1,
          role_id: currentRoleId,
        }),
        signal
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'API error');
      }

      // Obtener la respuesta en formato JSON
      const data = await response.json();
      
      // Guardar respuesta completa para referencia
      this.lastFullResponse = data;
      
      // Procesar los mensajes para el avatar
      let messages = [];
      
      if (data.response) {
        // Si la API devuelve en formato {response: [...]}
        if (Array.isArray(data.response)) {
          messages = data.response;
        } else {
          messages = [data.response];
        }
      } else if (Array.isArray(data)) {
        // Si la API devuelve un array directamente [...]
        messages = data;
      } else {
        // Si la API devuelve un objeto simple {...}
        messages = [data];
      }
      
      // Limpiar y validar cada mensaje
      const formattedMessages = messages.map(msg => ({
        text: cleanText(msg.text) || "No se pudo obtener una respuesta clara.",
        facialExpression: msg.facialExpression || "default",
        animation: msg.animation || "Talking_1",
        tts_prompt: msg.tts_prompt || "default"
      }));
      
      // Devolver un objeto que contiene tanto los mensajes formateados como la respuesta completa
      return {
        messages: formattedMessages,
        warning: data.warning || null,
        num_tokens: data.num_tokens || 0,
        response_time: data.response_time || 0,
        function_results: data.function_results || null
      };
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Request cancelled');
        return null;
      }
      console.error('Error en getResponse:', error);
      throw error;
    }
  }

  async getAudio(text, tts_prompt=null) {
    const signal = this.abortController ? this.abortController.signal : null;
    
    try {

      let instructions = "Utiliza un acento colombiano costeño pero de la alta sociedad y educada, con un tono alegre, aspiración de la <s> al final de sílabas. Ignora los signos que no conozcas.";
    
      // Si el mensaje tiene un tts_prompt específico, usarlo
      if (tts_prompt) {
        instructions = `Utiliza un acento colombiano costeño pero de la alta sociedad y educada, con un tono alegre, aspiración de la <s> al final de sílabas. Ignora los signos que no conozcas, para este caso habla de esta manera: ${tts_prompt}`;
      }

      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini-tts',
          input: text,
          voice: VOICE_TYPE,
          instructions: instructions,
          speed: 1.0
        }),
        signal
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'TTS API error');
      }

      return await response.arrayBuffer();
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Audio request cancelled');
        return null;
      }
      throw error;
    }
  }
}

// Función para limpiar texto con problemas de codificación
function cleanText(text) {
  if (!text) return "";
  
  // Reemplazar caracteres comunes con problemas de codificación
  return text
    .replace(/Â¡/g, '¡')
    .replace(/Â¿/g, '¿')
    .replace(/Ã³/g, 'ó')
    .replace(/Ã­/g, 'í')
    .replace(/Ã¡/g, 'á')
    .replace(/Ã©/g, 'é')
    .replace(/Ãº/g, 'ú')
    .replace(/Ã±/g, 'ñ')
    .replace(/Ã/g, 'Á')
    .replace(/Ã‰/g, 'É')
    .replace(/Ã/g, 'Í')
    .replace(/Ã"/g, 'Ó')
    .replace(/Ãš/g, 'Ú')
    .replace(/Ã'/g, 'Ñ');
}

// Helper to convert ArrayBuffer to base64
function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  
  return window.btoa(binary);
}

// Provider component
export const ChatProvider = ({ children }) => {
  // Estado principal
  const [pendingMessages, setPendingMessages] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cameraZoomed, setCameraZoomed] = useState(true);
  const [displayResponses, setDisplayResponses] = useState([]);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [message, setMessage] = useState(null);
  const [messageFinished, setMessageFinished] = useState(false);
  const [functionResults, setFunctionResults] = useState(null);
  const [pollingSessionId, setPollingSessionId] = useState(0);
  
  // Estado del polling
  const [pollingEnabled, setPollingEnabled] = useState(false);
  const [processingStatus, setProcessingStatus] = useState(null);
  
  // Referencias importantes
  const { addNotification } = useNotification();
  const subtitlesContext = useContext(SubtitlesContext);
  const apiRef = useRef(new OpenAIAPI(OPENAI_API_KEY));
  
  // Referencias para manejo del flujo
  const messageQueueRef = useRef([]);
  const preloadedAudiosRef = useRef([]);
  const isPlayingRef = useRef(false);
  const sessionIdRef = useRef(Date.now());
  const preloadTimerRef = useRef(null);
  const preloadingStatusRef = useRef({});
  
  // Función para manejar la actualización de estado del servidor
  const handleStatusUpdate = (status, sessionId) => {
    console.log(`🔄 Estado del servidor actualizado (sesión ${sessionId}): ${status}`);
    
    // Solo procesar si coincide con la sesión actual
    if (sessionId === pollingSessionId) {
      setProcessingStatus(status);
      
      // Actualizar subtítulos si existe el contexto
      if (subtitlesContext && subtitlesContext.setSubtitles) {
        subtitlesContext.setSubtitles(status);
      }
    } else {
      console.log(`🚫 Ignorando actualización de sesión antigua ${sessionId} (actual: ${pollingSessionId})`);
    }
  };
  
  // Manejo de advertencias de tokens
  const handleTokenWarning = async () => {
    console.log("🔄 Detectado warning de tokens, solicitando resumen automático");
    const currentRoleId = getCurrentRoleId();

    try {
      const response = await fetch(`${BACKEND_URL}/api/v1/chat/messages/resume/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          role_id: currentRoleId
        })
      });
  
      if (!response.ok) {
        throw new Error('Error al solicitar resumen');
      }
      
      const data = await response.json();
      console.log("✅ Resumen aplicado exitosamente:", data);
      
    } catch (error) {
      console.error("❌ Error al aplicar resumen:", error);
    }
  };
  
  // Función para guardar la conversación en el backend
  const saveConversation = async () => {
    console.log("💾 Guardando conversación en el backend...");
    const currentRoleId = getCurrentRoleId();

    try {
      const response = await fetch(`${BACKEND_URL}/api/v1/chat/messages/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: 1, 
          role_id: currentRoleId
        })
      });
  
      if (!response.ok) {
        throw new Error('Error al guardar la conversación');
      }
      
      const data = await response.json();
      console.log("✅ Conversación guardada exitosamente:", data);
      
    } catch (error) {
      console.error("❌ Error al guardar la conversación:", error);
    }
  };

  // Función para cargar una conversación previa
  const loadConversation = async () => {
    console.log("📂 Cargando conversación previa...");
    
    // Limpiar subtítulos antes de cargar la conversación
    clearSubtitles();
    const currentRoleId = getCurrentRoleId();

    try {
      const response = await fetch(`${BACKEND_URL}/api/v1/chat/messages/?user_id=1&role_id=${currentRoleId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
  
      if (!response.ok) {
        throw new Error('Error al cargar la conversación');
      }
      
      const data = await response.json();
      
      // Verificar si hay datos de conversación
      if (data && Array.isArray(data) && data.length > 0) {
        setConversationHistory(data);
        console.log("📂 Historial de conversación restaurado con éxito");
      } else {
        console.log("📂 No hay conversación previa para cargar");
      }
      
    } catch (error) {
      console.error("❌ Error al cargar la conversación:", error);
    }
  };

  // Función para limpiar los subtítulos
  const clearSubtitles = () => {
    // Resetear cualquier mensaje actual
    setMessage(null);
    
    // Limpiar los subtítulos usando el contexto
    if (subtitlesContext && subtitlesContext.setSubtitles) {
      subtitlesContext.setSubtitles('');
      console.log("🧹 Subtítulos limpiados exitosamente");
    } else {
      console.warn("⚠️ No se pudo acceder a setSubtitles");
    }
  };

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      stopAnyPlayingAudio();
      
      if (apiRef.current) {
        apiRef.current.reset();
      }
      
      // Limpiar cola y referencias
      messageQueueRef.current = [];
      preloadedAudiosRef.current = [];
      isPlayingRef.current = false;
      preloadingStatusRef.current = {};
      
      if (preloadTimerRef.current) {
        clearTimeout(preloadTimerRef.current);
      }
    };
  }, []);
  
  // Función para detener cualquier audio reproduciéndose
  const stopAnyPlayingAudio = () => {
    if (currentAudio) {
      try {
        currentAudio.pause();
        currentAudio.onended = null;
        currentAudio.src = '';
        currentAudio = null;
      } catch (e) {
        console.error('Error stopping audio', e);
      }
    }
  };
  
  // Función para precargar el audio de un mensaje específico
  const preloadMessageAudio = async (messageData, index, addTransition = false) => {
    const currentSession = sessionIdRef.current;
    
    // Si ya está precargado o precargándose, salir
    if (preloadingStatusRef.current[index] === 'loading' || 
        preloadingStatusRef.current[index] === 'loaded') {
      return null;
    }
    
    // Marcar como en proceso de precarga
    preloadingStatusRef.current[index] = 'loading';
    
    try {
      // Determinar si añadir transición
      const textToPreload = addTransition && index > 0
        ? `${getRandomItem(SPEECH_TRANSITIONS)}${messageData.text}`
        : messageData.text;
      
      console.log(`🔄 Precargando audio para mensaje ${index+1}: "${textToPreload.substring(0, 20)}..."`);
      
      const audioData = await apiRef.current.getAudio(textToPreload, messageData.tts_prompt);
      
      // Verificar si la sesión cambió durante la precarga
      if (currentSession !== sessionIdRef.current) {
        console.log("⚠️ Sesión cambiada, descartando audio precargado");
        preloadingStatusRef.current[index] = null;
        return null;
      }
      
      if (audioData) {
        // Marcar como precargado
        preloadingStatusRef.current[index] = 'loaded';
        
        return {
          text: textToPreload,
          audioData,
          facialExpression: messageData.facialExpression,
          animation: messageData.animation,
          tts_prompt: messageData.tts_prompt,
          originalIndex: index
        };
      }
    } catch (error) {
      console.error(`Error precargando mensaje ${index+1}:`, error);
      preloadingStatusRef.current[index] = 'error';
    }
    
    return null;
  };
  
  // Función para precargar mensajes en segundo plano
  const preloadRemainingMessages = async () => {
    if (messageQueueRef.current.length <= 1) return;
    
    // Comenzando desde el segundo mensaje
    for (let i = 1; i < messageQueueRef.current.length; i++) {
      // Verificar si ya está precargado
      if (preloadingStatusRef.current[i] === 'loaded') {
        continue;
      }
      
      // Precargar con transiciones
      const preloadedMessage = await preloadMessageAudio(messageQueueRef.current[i], i, true);
      
      if (preloadedMessage) {
        // Añadir a la cola de precargados
        preloadedAudiosRef.current.push(preloadedMessage);
        console.log(`✅ Mensaje ${i+1} precargado y añadido a la cola`);
      }
    }
  };
  
  // Función para reproducir un mensaje de audio
  const playMessageAudio = (audioMessage) => {
    return new Promise((resolve) => {
      // Detener cualquier reproducción actual
      stopAnyPlayingAudio();
      
      try {
        // Mostrar en la UI primero
        setDisplayResponses(prev => [...prev, audioMessage.text]);
        
        // Añadir a la historia
        setConversationHistory(prev => 
          [...prev, { role: 'assistant', content: audioMessage.text }]);
        
        // Convertir a base64
        const base64Audio = arrayBufferToBase64(audioMessage.audioData);
        
        // Crear mensaje completo
        const completeMessage = {
          text: audioMessage.text,
          facialExpression: audioMessage.facialExpression,
          animation: audioMessage.animation,
          lipsync: defaultLipsync,
          audio: base64Audio,
          tts_prompt: audioMessage.tts_prompt,
        };
        
        console.log(`▶️ Reproduciendo mensaje: "${audioMessage.text.substring(0, 30)}..."`);
        
        // Marcar como reproduciendo
        isPlayingRef.current = true;
        
        // Establecer el mensaje para Avatar
        setMessage(completeMessage);
        
        // Timeout de seguridad
        const timeoutId = setTimeout(() => {
          console.log("⚠️ Timeout de seguridad activado");
          isPlayingRef.current = false;
          resolve();
        }, Math.max(6000, audioMessage.text.length * 80));
        
        // Función para cuando termine el mensaje
        const handleMessageEnd = () => {
          clearTimeout(timeoutId);
          window.removeEventListener('message-ended', handleMessageEnd);
          window.removeEventListener('avatar-audio-ended', handleMessageEnd);
          
          isPlayingRef.current = false;
          console.log("✅ Mensaje reproducido completamente");
          
          // Pequeña pausa para garantizar que todo esté limpio
          setTimeout(() => {
            resolve();
          }, 10);
        };
        
        // Escuchar eventos de finalización
        window.addEventListener('message-ended', handleMessageEnd, { once: true });
        window.addEventListener('avatar-audio-ended', handleMessageEnd, { once: true });
        
      } catch (error) {
        console.error("Error reproduciendo mensaje:", error);
        isPlayingRef.current = false;
        resolve();
      }
    });
  };
  
  // Función para procesar mensajes rápidamente
  const processMessagesQuickly = async () => {
    const currentSession = sessionIdRef.current;
    
    if (messageQueueRef.current.length === 0) {
      setLoading(false);
      setPollingEnabled(false); // Desactivar polling cuando se completa
      return;
    }
    
    try {
      // Establecer que hay mensajes pendientes al inicio del procesamiento
      setPendingMessages(true);
      console.log(`🔄 Procesando ${messageQueueRef.current.length} mensajes en cola`);
      
      // Generar el audio del primer mensaje INMEDIATAMENTE (prioridad máxima)
      console.log("🚀 Generando audio del primer mensaje para respuesta instantánea");
      const firstMessage = messageQueueRef.current[0];
      const firstAudio = await preloadMessageAudio(firstMessage, 0, false);
      
      // Mientras tanto, iniciar la precarga de los demás mensajes en segundo plano
      preloadTimerRef.current = setTimeout(() => {
        console.log("🔄 Iniciando precarga de mensajes restantes en segundo plano");
        preloadRemainingMessages();
      }, 100);
      
      // Si ya no estamos en la misma sesión, salir
      if (currentSession !== sessionIdRef.current) return;
      
      // Desactivar el polling una vez que tenemos la respuesta
      setPollingEnabled(false);
      
      // Reproducir el primer mensaje inmediatamente
      if (firstAudio) {
        await playMessageAudio(firstAudio);
      }
      
      // Procesar el resto de mensajes secuencialmente
      for (let i = 1; i < messageQueueRef.current.length; i++) {
        // Verificar si ya no estamos en la misma sesión
        if (currentSession !== sessionIdRef.current) {
          console.log("⚠️ Sesión cambiada, deteniendo procesamiento");
          break;
        }
        
        // Buscar si ya tenemos el audio precargado
        const preloadedIndex = preloadedAudiosRef.current.findIndex(
          audio => audio.originalIndex === i
        );
        
        let nextAudio;
        
        if (preloadedIndex >= 0) {
          // Usar audio ya precargado
          nextAudio = preloadedAudiosRef.current.splice(preloadedIndex, 1)[0];
          console.log(`✅ Usando audio ya precargado para mensaje ${i+1}/${messageQueueRef.current.length}`);
        } else {
          // Si no está precargado, generarlo ahora (con transición)
          console.log(`🔄 Generando audio para mensaje ${i+1}/${messageQueueRef.current.length} (no estaba precargado)`);
          nextAudio = await preloadMessageAudio(messageQueueRef.current[i], i, true);
        }
        
        // Reproducir el mensaje
        if (nextAudio) {
          await playMessageAudio(nextAudio);
        }
      }
    } catch (error) {
      console.error("Error procesando mensajes:", error);
      setPollingEnabled(false); // Desactivar polling incluso en caso de error
    } finally {
      // Limpiar y marcar que ya no hay mensajes pendientes
      if (currentSession === sessionIdRef.current) {
        setLoading(false);
        setMessageFinished(true);
        setPendingMessages(false); // Indicar que no hay más mensajes pendientes
        console.log("✅ Todos los mensajes procesados, no hay mensajes pendientes");
        
        setTimeout(() => {
          setMessageFinished(false);
        }, 500);
      }
    }
  };
  
  // Callback para cuando termina un mensaje
  const onMessagePlayed = () => {
    console.log("🔄 Avatar: onMessagePlayed llamado desde Avatar.jsx");
    
    // Emitir eventos para notificar fin del mensaje
    window.dispatchEvent(new CustomEvent('message-ended'));
    window.dispatchEvent(new CustomEvent('avatar-audio-ended'));
    
    // Resetear mensaje
    setMessage(null);
  };
  const resetPollingState = () => {
    // Desactivar polling
    setPollingEnabled(false);
    
    // Reiniciar el estado de procesamiento explícitamente 
    setProcessingStatus(null);
    
    // Incrementar el ID de sesión para invalidar estados anteriores
    setPollingSessionId(prev => prev + 1);
  };

  // Función principal de chat
  const chat = async (userMessage) => {
    if (!userMessage?.trim()) {
      addNotification("Por favor, introduce un mensaje", "warning");
      return;
    }
    
    // Detener cualquier audio activo
    stopAnyPlayingAudio();
    
    // IMPORTANTE: Reiniciar completamente el estado de polling
    resetPollingState();
    
    // Cancelar cualquier temporizador de precarga
    if (preloadTimerRef.current) {
      clearTimeout(preloadTimerRef.current);
    }
    
    // Resetear el estado
    setLoading(true);
    setIsThinking(true); // Activar estado de pensando
    setDisplayResponses([]);
    setMessage(null);
    setMessageFinished(false);
    setFunctionResults(null);
    
    // Esperar un momento para que la limpieza se aplique completamente
    // y luego establecer el estado inicial
    setTimeout(() => {
      // Solo establecer el estado si seguimos en la misma sesión
      setProcessingStatus("Pensando");
    }, 20);
    
    // Nueva sesión
    sessionIdRef.current = Date.now();
    
    // Limpiar referencias
    messageQueueRef.current = [];
    preloadedAudiosRef.current = [];
    isPlayingRef.current = false;
    preloadingStatusRef.current = {};
    
    try {
      // Actualizar historia
      setConversationHistory(prev => [...prev, { role: 'user', content: userMessage }]);
      
      // Esperar un poco antes de activar el polling para que se vea "pensando..." unos segundos
      setTimeout(() => {
        // Activar polling con retraso específico para esta sesión
        setPollingEnabled(true);
      }, 3000);
      
      // Obtener respuesta de la API
      console.log("🔄 Enviando mensaje a la API y esperando respuesta...");
      const apiResponse = await apiRef.current.getResponse(userMessage);
      
      // Desactivar polling una vez que tenemos la respuesta
      setPollingEnabled(false);
      
      // Desactivar estado de pensando
      setIsThinking(false);
      
      // Limpiar el estado de procesamiento con un pequeño retraso
      setTimeout(() => {
        setProcessingStatus(null);
      }, 100);
      
      if (!apiResponse) {
        console.log("⚠️ Respuesta cancelada o null");
        setLoading(false);
        return;
      }
      
      console.log("✅ Respuesta recibida de la API");
      
      // Procesar advertencia de tokens si existe
      if (apiResponse.warning) {
        console.log("⚠️ Advertencia recibida de la API:", apiResponse.warning);
        
        if (apiResponse.warning === "token_limit") {
          handleTokenWarning(1, 1);
        }
      }
      
      // Procesar resultados de funciones si existen
      if (apiResponse.function_results) {
        console.log("🧩 Resultados de funciones recibidos:", apiResponse.function_results);
        setFunctionResults(apiResponse.function_results);
      }
      
      // Guardar los mensajes en la cola
      messageQueueRef.current = apiResponse.messages || [];
      
      // Si no hay mensajes, terminar
      if (!messageQueueRef.current.length) {
        console.log("⚠️ No hay mensajes para procesar");
        setLoading(false);
        return;
      }
      
      // Procesar los mensajes
      await processMessagesQuickly();
      
    } catch (error) {
      console.error('Chat error:', error);
      addNotification(`Error: ${error.message}`, 'error');
      setLoading(false);
      setIsThinking(false);
      setPollingEnabled(false);
    }
  };
  
  return (
    <ChatContext.Provider
      value={{
        chat,
        message,
        onMessagePlayed,
        loading,
        isThinking,
        cameraZoomed,
        setCameraZoomed,
        displayResponses,
        conversationHistory,
        messageFinished,
        saveConversation,
        loadConversation,
        pendingMessages,
        functionResults,
        setFunctionResults,
        processingStatus,
        pollingSessionId,
        pollingEnabled, // Exportamos este estado para que esté disponible
        // Para compatibilidad
        messages: message ? [message] : []
      }}
    >
      {/* Componente de polling mejorado y desacoplado */}
      <PollingManager 
        serverStatusUrl={`${BACKEND_URL}/api/v1/status/`}
        onStatusUpdate={handleStatusUpdate}
        enabled={pollingEnabled}
        interval={POLLING_INTERVAL}
        startDelay={POLLING_START_DELAY}
        debug={true} // Activar logs para depuración
        userId={1}
        roleId={1}
        sessionId={pollingSessionId}
      />
      
      {children}
    </ChatContext.Provider>
  );
}

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat debe usarse dentro de un ChatProvider");
  }
  return context;
};

export const ChatEventListener = () => {
  const { chat } = useContext(ChatContext);

  useEffect(() => {
    const handleChatEvent = (event) => {
      chat(event.detail);
    };

    window.addEventListener('chat', handleChatEvent);
    return () => window.removeEventListener('chat', handleChatEvent);
  }, [chat]);

  return null;
};