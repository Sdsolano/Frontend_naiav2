import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { useNotification } from "../components/NotificationContext";
import defaultLipsync from "../utils/defaultLipsync";
import { OPENAI_API_KEY } from "../../config";
import SubtitlesContext from '../components/subtitles';
import { BACKEND_URL } from "../../config";
import PollingManager from "../components/PollingManager";
import { getCurrentRoleId, REVERSE_ROLE_MAPPING } from "../utils/roleUtils";
import { useUser } from '../components/UserContext';
import { getRoleGender } from "../utils/animationUtils"; 
import { getVoiceForRole, getVoiceInstructions } from "../utils/voiceUtils";
import { useLocalChat } from "./useLocalChat";

// Constantes para configuración del chat
const getVoiceTypeForRole = () => {
  const currentRoleId = localStorage.getItem('naia_selected_role') || 'researcher';
  const voice = getVoiceForRole(currentRoleId);
  
  console.log(`🎤 Voz única seleccionada para rol ${currentRoleId}: ${voice}`);
  return voice;
};

const POLLING_INTERVAL = 2000;
const POLLING_START_DELAY = 5000;
const ROLE_ID = getCurrentRoleId();
const SPEECH_TRANSITIONS = [" "];

// Opciones para animaciones y expresiones
const availableAnimations = ["Talking_1","Talking_2", "Crying", "Laughing", "Rumba", "Idle", "Terrified", "Angry", "standing_greeting", "raising_two_arms_talking", "put_hand_on_chin", "one_arm_up_talking", "happy_expressions"];
const availableFacialExpressions = ["smile", "sad", "angry", "surprised", "funnyFace", "crazy", "default"];

const getRandomItem = (array) => array[Math.floor(Math.random() * array.length)];

// Create the context
const HybridChatContext = createContext();

// CRITICAL: Single global audio object to prevent duplicates
let currentAudio = null;

/**
 * Backend API Service - Para funciones que requieren backend
 */
class BackendAPI {
  constructor() {
    this.abortController = null;
  }
  
  reset() {
    if (this.abortController) {
      this.abortController.abort();
    }
    this.abortController = new AbortController();
    return this.abortController.signal;
  }

  async getResponse(message, userId) {
    const signal = this.reset();
    
    try {
      if (!userId) {
        throw new Error('Usuario no identificado. Por favor, inicie sesión nuevamente.');
      }
      const currentRoleId = getCurrentRoleId();

      const response = await fetch(`${BACKEND_URL}/api/v1/chat/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_input: message,
          user_id: userId,
          role_id: currentRoleId,
        }),
        signal
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'API error');
      }

      const data = await response.json();
      this.lastFullResponse = data;
      
      let messages = [];
      
      if (data.response) {
        if (Array.isArray(data.response)) {
          messages = data.response;
        } else {
          messages = [data.response];
        }
      } else if (Array.isArray(data)) {
        messages = data;
      } else {
        messages = [data];
      }
      
      const formattedMessages = messages.map(msg => ({
        text: cleanText(msg.text) || "No se pudo obtener una respuesta clara.",
        facialExpression: msg.facialExpression || "default",
        animation: msg.animation || "Talking_1",
        tts_prompt: (msg.tts_prompt + ' be aware of the language it can be either spanish or english but for now just answer IN ENGLISH') || "default"
      }));
      
      return {
        messages: formattedMessages,
        warning: data.warning || null,
        num_tokens: data.num_tokens || 0,
        response_time: data.response_time || 0,
        function_results: data.function_results || null
      };
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Backend request cancelled');
        return null;
      }
      console.error('Error en backend getResponse:', error);
      throw error;
    }
  }

  async getAudio(text, tts_prompt = null) {
    const signal = this.abortController ? this.abortController.signal : null;
    
    try {
      const currentRoleId = localStorage.getItem('naia_selected_role') || 'researcher';
      const VOICE_TYPE = getVoiceForRole(currentRoleId);
      const instructions = getVoiceInstructions(currentRoleId, tts_prompt);

      console.log(`🎭 Generando audio para rol: ${currentRoleId}`);
      console.log(`🎤 Usando voz: ${VOICE_TYPE}`);
      console.log(`📝 Instrucciones: ${instructions}`);

      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey || OPENAI_API_KEY}`
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
export const HybridChatProvider = ({ children }) => {
  // Estado principal
  const { userId, isUserReady } = useUser();
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
  const backendApiRef = useRef(new BackendAPI());
  const localChat = useLocalChat();
  
  // Referencias para manejo del flujo
  const messageQueueRef = useRef([]);
  const preloadedAudiosRef = useRef([]);
  const isPlayingRef = useRef(false);
  const sessionIdRef = useRef(Date.now());
  const preloadTimerRef = useRef(null);
  const preloadingStatusRef = useRef({});
  const localConversationHistoryRef = useRef([]);

  // Estado para tracking de modo (local vs backend)
  const [isUsingLocalMode, setIsUsingLocalMode] = useState(false);

  // Función para manejar la actualización de estado del servidor (solo para backend)
  const handleStatusUpdate = (status, sessionId) => {
    if (!isUsingLocalMode) {
      console.log(`🔄 Estado del servidor actualizado (sesión ${sessionId}): ${status}`);
      
      if (sessionId === pollingSessionId) {
        setProcessingStatus(status);
        
        if (subtitlesContext && subtitlesContext.setSubtitles) {
          subtitlesContext.setSubtitles(status);
        }
      } else {
        console.log(`🚫 Ignorando actualización de sesión antigua ${sessionId} (actual: ${pollingSessionId})`);
      }
    }
  };
  
  // Manejo de advertencias de tokens (solo para backend)
  const handleTokenWarning = async () => {
    if (!isUsingLocalMode) {
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
    }
  };
  
  // Función para guardar la conversación en el backend (solo para backend)
  const saveConversation = async () => {
    if (isUsingLocalMode) {
      console.log("🔒 Modo local: no guardando conversación en backend");
      return;
    }

    if (!userId) {
      console.log("⚠️ No se puede guardar conversación: userId no disponible");
      addNotification("Error: Usuario no identificado", "error");
      return;
    }
    console.log("💾 Guardando conversación en el backend...");
    const currentRoleId = getCurrentRoleId();

    try {
      const response = await fetch(`${BACKEND_URL}/api/v1/chat/messages/`, {
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
        throw new Error('Error al guardar la conversación');
      }
      
      const data = await response.json();
      console.log("✅ Conversación guardada exitosamente:", data);
      
    } catch (error) {
      console.error("❌ Error al guardar la conversación:", error);
    }
  };

  // Función para cargar una conversación previa (solo para backend)
  const loadConversation = async () => {
    if (!userId) {
      console.log("⚠️ No se puede cargar conversación: userId no disponible");
      addNotification("Error: Usuario no identificado", "error");
      return;
    }
    console.log("📂 Cargando conversación previa...");
    
    clearSubtitles();
    const currentRoleId = getCurrentRoleId();

    try {
      const response = await fetch(`${BACKEND_URL}/api/v1/chat/messages/?user_id=${userId}&role_id=${currentRoleId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Error al cargar la conversación');
      }
      
      const data = await response.json();
      
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
    setMessage(null);
    
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
      
      if (backendApiRef.current) {
        backendApiRef.current.reset();
      }
      
      if (localChat.cancelRequest) {
        localChat.cancelRequest();
      }
      
      messageQueueRef.current = [];
      preloadedAudiosRef.current = [];
      isPlayingRef.current = false;
      preloadingStatusRef.current = {};
      
      if (preloadTimerRef.current) {
        clearTimeout(preloadTimerRef.current);
      }
    };
  }, []); // ← FIX: Solo ejecutar al montar/desmontar

  useEffect(() => {
    const currentRole = localStorage.getItem('naia_selected_role') || 'researcher';
    const gender = getRoleGender(currentRole);
    const voice = getVoiceTypeForRole();
    
    console.log(`🎭 Hybrid Chat Provider: Rol actual ${currentRole}`);
    console.log(`👤 Hybrid Chat Provider: Género ${gender}`);
    console.log(`🎤 Hybrid Chat Provider: Voz ${voice}`);
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
  
  // Función para precargar el audio de un mensaje específico (híbrido)
  const preloadMessageAudio = async (messageData, index, addTransition = false, useLocal = false) => {
    const currentSession = sessionIdRef.current;
    
    if (preloadingStatusRef.current[index] === 'loading' || 
        preloadingStatusRef.current[index] === 'loaded') {
      return null;
    }
    
    preloadingStatusRef.current[index] = 'loading';
    
    try {
      const textToPreload = addTransition && index > 0
        ? `${getRandomItem(SPEECH_TRANSITIONS)}${messageData.text}`
        : messageData.text;
      
      console.log(`🔄 Precargando audio para mensaje ${index+1}: "${textToPreload.substring(0, 20)}..."`);
      
      let audioData;
      if (useLocal) {
        audioData = await localChat.generateAudioFromText(textToPreload, messageData.tts_prompt);
      } else {
        audioData = await backendApiRef.current.getAudio(textToPreload, messageData.tts_prompt);
      }
      
      if (currentSession !== sessionIdRef.current) {
        console.log("⚠️ Sesión cambiada, descartando audio precargado");
        preloadingStatusRef.current[index] = null;
        return null;
      }
      
      if (audioData) {
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
  const preloadRemainingMessages = async (useLocal = false) => {
    if (messageQueueRef.current.length <= 1) return;
    
    for (let i = 1; i < messageQueueRef.current.length; i++) {
      if (preloadingStatusRef.current[i] === 'loaded') {
        continue;
      }
      
      const preloadedMessage = await preloadMessageAudio(messageQueueRef.current[i], i, true, useLocal);
      
      if (preloadedMessage) {
        preloadedAudiosRef.current.push(preloadedMessage);
        console.log(`✅ Mensaje ${i+1} precargado y añadido a la cola`);
      }
    }
  };
  
  // Función para reproducir un mensaje de audio
  const playMessageAudio = (audioMessage) => {
    return new Promise((resolve) => {
      stopAnyPlayingAudio();
      
      try {
        setDisplayResponses(prev => [...prev, audioMessage.text]);
        
        setConversationHistory(prev => 
          [...prev, { role: 'assistant', content: audioMessage.text }]);
        
        const base64Audio = arrayBufferToBase64(audioMessage.audioData);
        
        const completeMessage = {
          text: audioMessage.text,
          facialExpression: audioMessage.facialExpression,
          animation: audioMessage.animation,
          lipsync: defaultLipsync,
          audio: base64Audio,
          tts_prompt: audioMessage.tts_prompt,
        };
        
        console.log(`▶️ Reproduciendo mensaje: "${audioMessage.text.substring(0, 30)}..."`);
        
        isPlayingRef.current = true;
        setMessage(completeMessage);
        
        const timeoutId = setTimeout(() => {
          console.log("⚠️ Timeout de seguridad activado");
          isPlayingRef.current = false;
          resolve();
        }, Math.max(6000, audioMessage.text.length * 80));
        
        const handleMessageEnd = () => {
          clearTimeout(timeoutId);
          window.removeEventListener('message-ended', handleMessageEnd);
          window.removeEventListener('avatar-audio-ended', handleMessageEnd);
          
          isPlayingRef.current = false;
          console.log("✅ Mensaje reproducido completamente");
          
          setTimeout(() => {
            resolve();
          }, 10);
        };
        
        window.addEventListener('message-ended', handleMessageEnd, { once: true });
        window.addEventListener('avatar-audio-ended', handleMessageEnd, { once: true });
        
      } catch (error) {
        console.error("Error reproduciendo mensaje:", error);
        isPlayingRef.current = false;
        resolve();
      }
    });
  };
  
  // Función para procesar mensajes rápidamente (híbrido)
  const processMessagesQuickly = async (useLocal = false) => {
    const currentSession = sessionIdRef.current;
    
    if (messageQueueRef.current.length === 0) {
      setLoading(false);
      setPollingEnabled(false);
      return;
    }
    
    try {
      setPendingMessages(true);
      console.log(`🔄 Procesando ${messageQueueRef.current.length} mensajes en cola (modo: ${useLocal ? 'local' : 'backend'})`);
      
      console.log("🚀 Generando audio del primer mensaje para respuesta instantánea");
      const firstMessage = messageQueueRef.current[0];
      const firstAudio = await preloadMessageAudio(firstMessage, 0, false, useLocal);
      
      preloadTimerRef.current = setTimeout(() => {
        console.log("🔄 Iniciando precarga de mensajes restantes en segundo plano");
        preloadRemainingMessages(useLocal);
      }, 100);
      
      if (currentSession !== sessionIdRef.current) return;
      
      setPollingEnabled(false);
      
      if (firstAudio) {
        await playMessageAudio(firstAudio);
      }
      
      for (let i = 1; i < messageQueueRef.current.length; i++) {
        if (currentSession !== sessionIdRef.current) {
          console.log("⚠️ Sesión cambiada, deteniendo procesamiento");
          break;
        }
        
        const preloadedIndex = preloadedAudiosRef.current.findIndex(
          audio => audio.originalIndex === i
        );
        
        let nextAudio;
        
        if (preloadedIndex >= 0) {
          nextAudio = preloadedAudiosRef.current.splice(preloadedIndex, 1)[0];
          console.log(`✅ Usando audio ya precargado para mensaje ${i+1}/${messageQueueRef.current.length}`);
        } else {
          console.log(`🔄 Generando audio para mensaje ${i+1}/${messageQueueRef.current.length} (no estaba precargado)`);
          nextAudio = await preloadMessageAudio(messageQueueRef.current[i], i, true, useLocal);
        }
        
        if (nextAudio) {
          await playMessageAudio(nextAudio);
        }
      }
    } catch (error) {
      console.error("Error procesando mensajes:", error);
      setPollingEnabled(false);
    } finally {
      if (currentSession === sessionIdRef.current) {
        setLoading(false);
        setIsThinking(false); // 🔧 Asegurar que se limpie thinking
        setProcessingStatus(null); // 🔧 Limpiar estado de procesamiento
        setMessageFinished(true);
        setPendingMessages(false);
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
    
    window.dispatchEvent(new CustomEvent('message-ended'));
    window.dispatchEvent(new CustomEvent('avatar-audio-ended'));
    
    setMessage(null);
  };

  const resetPollingState = () => {
    setPollingEnabled(false);
    setProcessingStatus(null);
    setPollingSessionId(prev => prev + 1);
  };

  // Función principal de chat HÍBRIDO
  const chat = async (userMessage) => {
    if (!isUserReady()) {
      console.log("⚠️ Usuario no está listo para chat");
      addNotification("Configurando usuario, por favor espere...", "info");
      return;
    }
    if (!userMessage?.trim()) {
      addNotification("Por favor, introduce un mensaje", "warning");
      return;
    }
    
    stopAnyPlayingAudio();
    
    if (preloadTimerRef.current) {
      clearTimeout(preloadTimerRef.current);
    }
    
    setLoading(true);
    setIsThinking(true);
    setDisplayResponses([]);
    setMessage(null);
    setMessageFinished(false);
    setFunctionResults(null);
    
    // 🔥 DECISIÓN: ¿Local o Backend?
    const storedRole = localStorage.getItem('naia_selected_role') || 'researcher';
    
    // 🔧 FIX: Convertir ID numérico a nombre de rol si es necesario
    let currentRole = storedRole;
    if (!isNaN(storedRole) && REVERSE_ROLE_MAPPING[parseInt(storedRole)]) {
      currentRole = REVERSE_ROLE_MAPPING[parseInt(storedRole)];
      console.log(`🔄 Convirtiendo rol ID ${storedRole} a nombre: ${currentRole}`);
    }
    
    const requiresBackendResult = localChat.requiresBackend(userMessage);
    const shouldUseLocal = currentRole === 'researcher' && !requiresBackendResult;
    
    console.log(`🔍 DEBUG DECISIÓN:`);
    console.log(`  - Mensaje: "${userMessage}"`);
    console.log(`  - Rol actual: "${currentRole}"`);
    console.log(`  - requiresBackend("${userMessage}"): ${requiresBackendResult}`);
    console.log(`  - shouldUseLocal: ${shouldUseLocal}`);
    
    setIsUsingLocalMode(shouldUseLocal);
    
    if (shouldUseLocal) {
      console.log("🏠 USANDO CHAT LOCAL - Conversación simple detectada");
      // Para chat local: solo limpiar estados, NO resetear polling
      setPollingEnabled(false);
      setProcessingStatus("Procesando localmente...");
    } else {
      console.log("🏢 USANDO BACKEND - Funciones complejas requeridas");
      // Para backend: SÍ resetear polling state
      resetPollingState();
      setTimeout(() => {
        setProcessingStatus("Pensando");
        setTimeout(() => {
          setPollingEnabled(true);
        }, 3000);
      }, 20);
    }
    
    sessionIdRef.current = Date.now();
    
    messageQueueRef.current = [];
    preloadedAudiosRef.current = [];
    isPlayingRef.current = false;
    preloadingStatusRef.current = {};
    
    try {
      setConversationHistory(prev => [...prev, { role: 'user', content: userMessage }]);
      
      let apiResponse;
      
      if (shouldUseLocal) {
        // 🏠 RUTA LOCAL
        console.log("🏠 Procesando con OpenAI directamente...");
        const localHistory = shouldUseLocal ? localConversationHistoryRef.current : [];
        
        apiResponse = await localChat.generateLocalResponse(userMessage, localHistory);
        
        if (apiResponse) {
          // Actualizar historial local
          localConversationHistoryRef.current = apiResponse.conversationHistory;
        }
        
      } else {
        // 🏢 RUTA BACKEND
        console.log("🏢 Enviando mensaje al backend...");
        apiResponse = await backendApiRef.current.getResponse(userMessage, userId);
      }
      
      setPollingEnabled(false);
      setIsThinking(false);
      
      setTimeout(() => {
        setProcessingStatus(null);
      }, 100);
      
      if (!apiResponse) {
        console.log("⚠️ Respuesta cancelada o null");
        setLoading(false);
        return;
      }
      
      console.log(`✅ Respuesta recibida ${shouldUseLocal ? 'localmente' : 'del backend'}`);
      
      // Solo manejar warnings y function results si viene del backend
      if (!shouldUseLocal) {
        if (apiResponse.warning) {
          console.log("⚠️ Advertencia recibida de la API:", apiResponse.warning);
          if (apiResponse.warning === "token_limit") {
            handleTokenWarning();
          }
        }
        
        if (apiResponse.function_results) {
          console.log("🧩 Resultados de funciones recibidos:", apiResponse.function_results);
          setFunctionResults(apiResponse.function_results);
        }
      }
      
      messageQueueRef.current = apiResponse.messages || [];
      
      if (!messageQueueRef.current.length) {
        console.log("⚠️ No hay mensajes para procesar");
        setLoading(false);
        return;
      }
      
      // Procesar los mensajes con el modo apropiado
      await processMessagesQuickly(shouldUseLocal);
      
    } catch (error) {
      console.error('Hybrid chat error:', error);
      addNotification(`Error: ${error.message}`, 'error');
      
      // 🔧 Limpiar TODOS los estados en caso de error
      setLoading(false);
      setIsThinking(false);
      setPollingEnabled(false);
      setProcessingStatus(null);
      setIsUsingLocalMode(false);
      setMessage(null);
      setMessageFinished(false);
    }
  };
  
  return (
    <HybridChatContext.Provider
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
        pollingEnabled,
        isUsingLocalMode, // Nuevo estado para saber qué modo está usando
        messages: message ? [message] : []
      }}
    >
      {/* Componente de polling solo para modo backend */}
      {!isUsingLocalMode && (
        <PollingManager 
          serverStatusUrl={`${BACKEND_URL}/api/v1/status/`}
          onStatusUpdate={handleStatusUpdate}
          enabled={pollingEnabled}
          interval={POLLING_INTERVAL}
          startDelay={POLLING_START_DELAY}
          debug={true}
          userId={userId}
          roleId={getCurrentRoleId()}
          sessionId={pollingSessionId}
        />
      )}
      
      {children}
    </HybridChatContext.Provider>
  );
}

export const useHybridChat = () => {
  const context = useContext(HybridChatContext);
  if (!context) {
    throw new Error("useHybridChat debe usarse dentro de un HybridChatProvider");
  }
  return context;
};

export const HybridChatEventListener = () => {
  const { chat } = useContext(HybridChatContext);

  useEffect(() => {
    const handleChatEvent = (event) => {
      chat(event.detail);
    };

    window.addEventListener('chat', handleChatEvent);
    return () => window.removeEventListener('chat', handleChatEvent);
  }, [chat]);

  return null;
};