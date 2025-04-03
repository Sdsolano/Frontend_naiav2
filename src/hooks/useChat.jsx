import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { useNotification } from "../components/NotificationContext";
import defaultLipsync from "../utils/defaultLipsync";
import { OPENAI_API_KEY } from "../../config";


const VOICE_TYPE = "nova";

// Available options for animations and expressions
const availableAnimations = [ "Talking_1 ","Talking_2", "Crying", "Laughing", "Rumba", "Idle", "Terrified", "Angry", "standing_greeting", "raising_two_arms_talking", "put_hand_on_chin", "one_arm_up_talking", "happy_expressions"];
const availableFacialExpressions = ["smile", "sad", "angry", "surprised", "funnyFace", "crazy", "default"];

// Helper function
const getRandomItem = (array) => array[Math.floor(Math.random() * array.length)];

// Create the context
const ChatContext = createContext();

// CRITICAL: Single global audio object to prevent duplicates
let currentAudio = null;

/**
 * OpenAI API Service
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
    
    const systemPrompt = `
     You are a female virtual avatar with voice named NAIA who is a researcher. Reply with JSON.
Each message has text, facialExpression, and animation properties.
Keep responses short and concise with max 3 sentences.
Use same language as user (en or es).

Facial expressions:
- smile: Use when expressing happiness, satisfaction, or giving positive information
- sad: Use when expressing disappointment, regret, or delivering negative news
- angry: Use when disagreeing strongly or expressing frustration
- default: Use for neutral information or normal conversation

Animation descriptions and when to use them:
- Talking_1: Basic talking animation for neutral statements and regular conversation
- Talking_2: More dynamic talking with slight hand movement, good for explanations
- Crying: Only use when expressing sadness or sympathizing with misfortune
- Laughing: Use when responding to humor or expressing delight
- Rumba: Playful dance-like movement for celebratory or very enthusiastic moments
- Idle: Subtle standing animation for moments of listening or thinking
- Terrified: Use when expressing shock or alarm at surprising information
- Angry: Strong negative reaction for frustration or disappointment
- standing_greeting: ONLY use for initial greetings when beginning a conversation
- raising_two_arms_talking: Animated gesture with both arms raised, for emphasis or excitement
- put_hand_on_chin: Thoughtful pose perfect for analyzing, considering hypotheses, or deep thinking
- one_arm_up_talking: Good for presenting information, pointing out facts, or enumerating points
- happy_expressions: Joyful animations for very positive news or congratulations

Choose different animations for variety and match them to the content of your message.
IMPORTANT: Only use standing_greeting for initial greetings, not for regular responses.
    `;
    
    try {

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message }
          ],
          temperature: 0.7,
          max_tokens: 1000,
          response_format: { type: 'json_object' }
        }),
        signal
      });

      // const response = await fetch('http://127.0.0.1:8000/api/v1/chat/', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({
      //     user_input: message,
      //     user_id: 1,
      //     role_id: 1,
      //   })
      // });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'API error');
      }

      const data = await response.json();
      return JSON.parse(data.choices[0].message.content);
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Request cancelled');
        return null;
      }
      throw error;
    }
  }

  async getAudio(text) {
    const signal = this.abortController ? this.abortController.signal : null;
    
    try {
      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'tts-1',
          input: text,
          voice: VOICE_TYPE,
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

/**
 * IMPORTANT: This function must be the ONLY place audio is created
 */
function playAudioData(audioData) {
  return new Promise((resolve) => {
    // Force stop any existing audio
    if (currentAudio) {
      try {
        currentAudio.pause();
        currentAudio.onended = null;
        currentAudio.src = '';
      } catch (e) {
        console.error('Error stopping previous audio', e);
      }
      currentAudio = null;
    }
    
    try {
      // Convert ArrayBuffer to base64
      const base64Audio = arrayBufferToBase64(audioData);
      
      // Create a fresh audio element
      const audio = new Audio(`data:audio/mp3;base64,${base64Audio}`);
      
      // Set callbacks before playing
      audio.onended = () => {
        currentAudio = null;
        resolve();
      };
      
      audio.onerror = (e) => {
        console.error('Audio error:', e);
        currentAudio = null;
        resolve();
      };
      
      // IMPORTANT: Set as global audio BEFORE playing
      currentAudio = audio;
      
      // Start playback
      audio.play().catch(err => {
        console.error('Play error:', err);
        currentAudio = null;
        resolve();
      });
    } catch (e) {
      console.error('Fatal audio error:', e);
      currentAudio = null;
      resolve();
    }
  });
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
  const { addNotification } = useNotification();
  const [loading, setLoading] = useState(false);
  const [cameraZoomed, setCameraZoomed] = useState(true);
  const [displayResponses, setDisplayResponses] = useState([]);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [message, setMessage] = useState(null);
  const [messageFinished, setMessageFinished] = useState(false);
  
  // API service ref
  const apiRef = useRef(new OpenAIAPI(OPENAI_API_KEY));
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (currentAudio) {
        try {
          currentAudio.pause();
          currentAudio.onended = null;
          currentAudio.src = '';
          currentAudio = null;
        } catch (e) {
          console.error('Cleanup error', e);
        }
      }
      
      if (apiRef.current) {
        apiRef.current.reset();
      }
    };
  }, []);
  
  // Chat function
  const chat = async (userMessage) => {
    if (!userMessage?.trim()) {
      addNotification("Please enter a message", "warning");
      return;
    }
    
    // Start fresh - stop any audio and reset
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
    
    setLoading(true);
    setDisplayResponses([]);
    setMessage(null);
    setMessageFinished(false);
    
    try {
      // Update history
      setConversationHistory(prev => [...prev, { role: 'user', content: userMessage }]);
      
      // Get response from API
      const response = await apiRef.current.getResponse(userMessage);
      
      if (!response) {
        setLoading(false);
        return;
      }
      
      // Handle different response formats
      const messages = response.messages || [response];
      
      // Process messages one by one
      for (const msg of messages) {
        const text = msg.text || "I'm not sure how to respond to that.";
        const facialExpression = msg.facialExpression || getRandomItem(availableFacialExpressions);
        const animation = msg.animation || getRandomItem(availableAnimations);
        
        try {
          // Obtener el audio primero antes de actualizar la UI
          const audioData = await apiRef.current.getAudio(text);
          
          if (!audioData) continue;
          
          // Convertir a base64 para el mensaje (necesario para lipsync)
          const base64Audio = arrayBufferToBase64(audioData);
          
          // Actualizar todo simultáneamente
          // Primero añadir la respuesta para que se muestre el texto
          setDisplayResponses(prev => [...prev, text]);
          
          // Luego establecer el mensaje completo para el avatar con audio ya incluido
          const completeMessage = {
            text,
            facialExpression,
            animation,
            lipsync: defaultLipsync,
            audio: base64Audio
          };
          
          // Actualizar el mensaje que activará la animación y el audio en Avatar.jsx
          setMessage(completeMessage);
          
          // Esperar a que se complete la reproducción del audio
          await new Promise(resolve => {
            // Calculamos la duración estimada basándonos en la longitud del texto
            const estimatedDuration = Math.max(3000, text.length * 100);
            setTimeout(resolve, estimatedDuration);
          });
          
          // Añadir a la historia
          setConversationHistory(prev => [...prev, { role: 'assistant', content: text }]);
        } catch (error) {
          console.error('Audio processing error:', error);
          addNotification(`Audio error: ${error.message}`, 'error');
          
          // En caso de error, al menos mostrar la respuesta de texto
          setDisplayResponses(prev => [...prev, text]);
          setConversationHistory(prev => [...prev, { role: 'assistant', content: text }]);
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      addNotification(`Error: ${error.message}`, 'error');
    } finally {
      setLoading(false);
      setMessage(null);
      
      // NUEVO: Señalar que el mensaje ha terminado
      console.log("🔄 Chat: Mensaje terminado, notificando...");
      setMessageFinished(true);
      
      // Pequeño retraso para asegurarnos de que todos los componentes
      // tienen tiempo de reaccionar antes de resetear el flag
      setTimeout(() => {
        setMessageFinished(false);
      }, 1000);
    }
  };
  
  // Mejorado para notificar cuando termina un mensaje
  const onMessagePlayed = () => {
    console.log("🔄 Chat: onMessagePlayed llamado");
    // El audio ha terminado
    setMessageFinished(true);
    
    // Emitir un evento que puede ser capturado por otros componentes
    const messageEndedEvent = new CustomEvent('message-ended');
    window.dispatchEvent(messageEndedEvent);
  };
  
  return (
    <ChatContext.Provider
      value={{
        chat,
        message,
        onMessagePlayed,
        loading,
        cameraZoomed,
        setCameraZoomed,
        displayResponses,
        conversationHistory,
        messageFinished,
        // For backwards compatibility
        messages: message ? [message] : []
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within a ChatProvider");
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