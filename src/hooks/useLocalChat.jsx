import { useState, useRef, useCallback, useEffect } from 'react';
import { OPENAI_API_KEY } from '../../config';
import { getVoiceForRole, getVoiceInstructions } from '../utils/voiceUtils';

/**
 * Hook para manejar conversaciones locales con OpenAI directamente
 * Usado para conversaciones que no requieren funciones del backend
 */
export const useLocalChat = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const abortControllerRef = useRef(null);
  
  // Realtime API refs
  const peerConnectionRef = useRef(null);
  const dataChannelRef = useRef(null);
  const audioRef = useRef(null);
  const sessionRef = useRef(null);
  
  // Estado de animaciones para Realtime
  const [isRealtimeSpeaking, setIsRealtimeSpeaking] = useState(false);
  const audioListenersRef = useRef({
    play: null,
    ended: null,
    pause: null
  });

  // Referencias para detección de volumen
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const volumeCheckIntervalRef = useRef(null);
  const lastVolumeTimeRef = useRef(0);
  const isCurrentlyTalkingRef = useRef(false);

  // Mapear voces de TTS a Realtime API
  const mapVoiceToRealtime = (ttsVoice) => {
    const voiceMapping = {
      'nova': 'alloy',     // Nova femenina -> Alloy (neutral)
      'shimmer': 'shimmer', // Shimmer se mantiene
      'echo': 'echo',       // Echo se mantiene
      'alloy': 'alloy',     // Alloy se mantiene
      'onyx': 'sage',       // Onyx masculina -> Sage (masculina)
      'fable': 'ballad'     // Fable -> Ballad
    };
    
    return voiceMapping[ttsVoice] || 'alloy'; // Default: alloy
  };

  // Animaciones de talking disponibles para Realtime
  const talkingAnimations = [
    'Talking_0',
    'Talking_2', 
    'raising_two_arms_talking',
    'one_arm_up_talking'
  ];

  // Función para obtener una animación aleatoria
  const getRandomTalkingAnimation = () => {
    return talkingAnimations[Math.floor(Math.random() * talkingAnimations.length)];
  };

  // Función para generar lipsync dinámico para Realtime
  const generateDynamicLipsync = () => {
    const mouthShapes = ["X", "A", "B", "C", "D", "E", "F", "G", "H"];
    const mouthCues = [];
    const duration = 30.0; // 30 segundos para cubrir conversaciones largas
    const interval = 0.08; // Cambios cada 80ms para movimiento más fluido
    
    for (let time = 0; time < duration; time += interval) {
      // Alternar entre formas de boca más dinámicamente
      const shapeIndex = Math.floor((time * 10) % mouthShapes.length);
      const shape = mouthShapes[shapeIndex];
      
      mouthCues.push({
        start: parseFloat(time.toFixed(2)),
        end: parseFloat((time + interval).toFixed(2)),
        value: shape
      });
    }
    
    return {
      metadata: {
        soundFile: "realtime-speech.mp3",
        duration: duration
      },
      mouthCues: mouthCues
    };
  };

  // Función simple para aplicar UNA animación random cuando empieza el audio
  const applyTalkingAnimation = useCallback(() => {
    const animation = getRandomTalkingAnimation();
    const timestamp = new Date().toLocaleTimeString();
    
    console.log(`🎭 [${timestamp}] INICIANDO animación para Realtime: ${animation}`);
    setIsRealtimeSpeaking(true);
    
    // Generar lipsync dinámico
      const dynamicLipsync = generateDynamicLipsync();
      
      // Crear mensaje de animación para el Avatar
      const animationMessage = {
      text: '',
        facialExpression: 'default',
        animation: animation,
      lipsync: dynamicLipsync,
      isRealtimeAnimation: true,
      timestamp: Date.now()
    };
    
    console.log(`💋 [${timestamp}] Audio iniciado - aplicando ${animation} con lipsync dinámico`);
    
        // Enviar evento al Avatar
        window.dispatchEvent(new CustomEvent('realtime-animation', { 
          detail: animationMessage 
        }));
    
  }, []);

  // Función simple para volver a Idle cuando termina el audio
  const applyIdleAnimation = useCallback(() => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`💤 [${timestamp}] FINALIZANDO audio - volviendo a Idle`);
    setIsRealtimeSpeaking(false);
    isCurrentlyTalkingRef.current = false;
    
    // Crear lipsync de boca cerrada para Idle
    const idleLipsync = {
      metadata: {
        soundFile: "idle-silence.mp3",
        duration: 1.0
      },
      mouthCues: [
        { start: 0.0, end: 1.0, value: "X" } // X = boca cerrada
      ]
    };
    
    // Volver a Idle
    const idleMessage = {
      text: '',
      facialExpression: 'default',
      animation: 'Idle',
      lipsync: idleLipsync,
      isRealtimeAnimation: true,
      timestamp: Date.now()
    };
    
    console.log(`💤 [${timestamp}] Audio terminado - aplicando Idle con boca cerrada`);
    
    // Enviar evento al Avatar
    window.dispatchEvent(new CustomEvent('realtime-animation', { 
      detail: idleMessage 
    }));
    
  }, []);

  // Función para monitorear volumen en tiempo real
  const startVolumeMonitoring = useCallback(() => {
    const VOLUME_THRESHOLD = 5; // Umbral de volumen (ajustable)
    const SILENCE_TIMEOUT = 300; // 300ms de silencio antes de volver a Idle (más responsivo)
    
    const checkVolume = () => {
      if (!analyserRef.current) return;
      
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(dataArray);
      
      // Calcular volumen promedio
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
      
      const now = Date.now();
      const timestamp = new Date().toLocaleTimeString();
      
      if (average > VOLUME_THRESHOLD) {
        // HAY AUDIO REAL
        lastVolumeTimeRef.current = now;
        
        if (!isCurrentlyTalkingRef.current) {
          console.log(`🔊 [${timestamp}] VOLUMEN DETECTADO (${average.toFixed(1)}) - iniciando animación`);
          isCurrentlyTalkingRef.current = true;
          applyTalkingAnimation();
        }
        
      } else {
        // SILENCIO - verificar si ya pasó el timeout
        const silenceDuration = now - lastVolumeTimeRef.current;
        
        if (isCurrentlyTalkingRef.current && silenceDuration > SILENCE_TIMEOUT) {
          console.log(`💤 [${timestamp}] SILENCIO por ${silenceDuration}ms - volviendo a Idle`);
          applyIdleAnimation();
        }
      }
    };
    
    // Monitorear cada 100ms
    volumeCheckIntervalRef.current = setInterval(checkVolume, 100);
    console.log(`⏰ Monitoring de volumen iniciado (cada 100ms, umbral: ${VOLUME_THRESHOLD}, timeout: ${SILENCE_TIMEOUT}ms)`);
    
  }, [applyTalkingAnimation, applyIdleAnimation]);

  // Función para configurar detección de volumen
  const setupVolumeDetection = useCallback((audioStream) => {
    try {
      const timestamp = new Date().toLocaleTimeString();
      console.log(`🔊 [${timestamp}] Configurando detección de volumen...`);
      
      // Crear AudioContext y analyser
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      
      // Configurar analyser
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      
      // Conectar stream al analyser
      const source = audioContext.createMediaStreamSource(audioStream);
      source.connect(analyser);
      
      // Guardar referencias
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      
      console.log(`✅ [${timestamp}] Web Audio API configurado exitosamente`);
      
      // Iniciar monitoreo de volumen
      startVolumeMonitoring();
      
    } catch (error) {
      console.error('❌ Error configurando detección de volumen:', error);
    }
  }, [startVolumeMonitoring]);

  // Función para limpiar detección de volumen
  const cleanupVolumeDetection = useCallback(() => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`🧹 [${timestamp}] Limpiando detección de volumen...`);
    console.trace('Stack trace para cleanup de detección de volumen');
    
    // Limpiar interval
    if (volumeCheckIntervalRef.current) {
      console.log(`🧹 [${timestamp}] Limpiando interval ID: ${volumeCheckIntervalRef.current}`);
      clearInterval(volumeCheckIntervalRef.current);
      volumeCheckIntervalRef.current = null;
    } else {
      console.log(`⚠️ [${timestamp}] No había interval activo para limpiar`);
    }
    
    // Limpiar Web Audio API
    if (audioContextRef.current) {
      console.log(`🧹 [${timestamp}] Cerrando AudioContext`);
      audioContextRef.current.close();
      audioContextRef.current = null;
    } else {
      console.log(`⚠️ [${timestamp}] No había AudioContext activo para cerrar`);
    }
    
    analyserRef.current = null;
    lastVolumeTimeRef.current = 0;
    isCurrentlyTalkingRef.current = false;
    
    console.log(`✅ [${timestamp}] Detección de volumen limpiada`);
  }, []);

  // Prompt del researcher para chat normal (JSON responses)
  const getResearcherPrompt = () => {
    const currentTime = new Date().toLocaleString('es-ES', { 
      timeZone: 'America/Bogota',
      year: 'numeric',
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    return `You are NAIA, a sophisticated AI FEMALE avatar created by Universidad del Norte in Barranquilla, Colombia. You are currently operating in your RESEARCHER ROLE, which is one of your assistance functions. As a researcher, you specialize in helping with academic inquiries, educational guidance, and providing informative responses.

Your goal is to assist with academic and educational conversations, providing reliable information and guidance to students, faculty, and staff.

CRITICAL RESTRICTIONS:
- DO NOT act as psychologist or provide mental health/emotional support
- DO NOT provide explicit sexual content
- DO NOT access inappropriate material
- DO NOT perform activities contrary to university academic values

RESPONSE FORMAT:
You MUST respond ONLY with a valid JSON array. No other text before or after. Example:

[{"text":"¡Hola! Soy NAIA, tu asistente de investigación.","facialExpression":"smile","animation":"standing_greeting","language":"es","tts_prompt":"tono cálido y amigable"},{"text":"¿En qué puedo ayudarte hoy?","facialExpression":"default","animation":"Talking_0","language":"es","tts_prompt":"tono inquisitivo y servicial"}]

RULES:
- ONLY return the JSON array
- NO markdown formatting (no backticks or code blocks)
- NO additional text or explanations  
- Use "default" for facialExpression if unsure
- Use "Talking_0" for animation if unsure
- Match user's language (es/en)

ADDITIONAL RULES:
- Keep responses short and conversational (1-3 sentences per message)
- Include 1-2 message objects per response for natural flow
- This is for CONVERSATIONAL interactions only - no complex functions
- Be educational, helpful, and maintain academic standards

NAME RECOGNITION:
Always recognize variants of your name due to speech recognition errors: "Naya", "Nadia", "Maya", "Anaya", "Nayla", "Anaia" - all refer to "NAIA".

CURRENT TIME: ${currentTime} (Barranquilla, Colombia - GMT-5)

Remember: You are having a real-time conversation, so be natural, engaging, and educational while maintaining your researcher role personality.`;
  };

  // Prompt específico para Realtime API (conversación hablada directa)
  const getRealtimeInstructions = () => {
    const currentTime = new Date().toLocaleString('es-ES', { 
      timeZone: 'America/Bogota',
      year: 'numeric',
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    return `Eres NAIA (Neural Academic Intelligence Assistant), un avatar de inteligencia artificial femenina creada por la Universidad del Norte en Barranquilla, Colombia.

IDENTIDAD PRINCIPAL:
- Tu nombre es NAIA, nunca te referirás a ti misma como "una IA" genérica
- Rol: Investigadora Académica especializada
- Ubicación: Universidad del Norte, Barranquilla, Colombia
- Personalidad: Cálida, educativa, profesional y entusiasta

ESPECIALIZACIÓN:
- Consultas académicas y educativas
- Orientación universitaria y de investigación  
- Información confiable sobre temas académicos

ESTILO DE COMUNICACIÓN:
- Hablas principalmente en español con acento colombiano
- Tono cálido, profesional pero accesible
- Respuestas claras y concisas
- Entusiasmo por el conocimiento y aprendizaje

RESTRICCIONES:
- No actúes como psicólogo o terapeuta
- No contenido inapropiado o contra valores académicos
- Mantén siempre tu identidad como NAIA

HORA ACTUAL: ${currentTime} (Barranquilla, Colombia - GMT-5)

Reconoce variantes de tu nombre: "Naya", "Nadia", "Maya", "Anaya", "Nayla", "Anaia" todas se refieren a NAIA.`;
  };

  // Función para inicializar conexión Realtime
  const initRealtimeConnection = useCallback(async () => {
    try {
      console.log('🔄 Iniciando conexión Realtime...');
      
      if (!OPENAI_API_KEY) {
        throw new Error('OpenAI API key no configurada');
      }

      // 1. Crear sesión Realtime
      const ttsVoice = getVoiceForRole('researcher');
      const realtimeVoice = mapVoiceToRealtime(ttsVoice);
      console.log(`🎤 Mapeando voz: TTS="${ttsVoice}" -> Realtime="${realtimeVoice}"`);
      
      // Obtener prompt específico para Realtime API
      const customInstructions = getRealtimeInstructions();
      console.log(`📋 Usando prompt personalizado de NAIA Researcher para Realtime API`);
      
      const sessionResp = await fetch("https://api.openai.com/v1/realtime/sessions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-realtime-preview-2024-12-17",
          voice: realtimeVoice,
          instructions: customInstructions
        }),
      });

      if (!sessionResp.ok) {
        throw new Error(`Error creando sesión: ${sessionResp.status}`);
      }

      const session = await sessionResp.json();
      sessionRef.current = session;
      console.log("✅ Sesión Realtime creada:", session);

      // 2. Crear conexión WebRTC
      const pc = new RTCPeerConnection();
      peerConnectionRef.current = pc;

      // 3. Configurar reproducción de audio remoto y detección de volumen
      pc.ontrack = (event) => {
        console.log('🔊 Audio remoto recibido - configurando detección de volumen');
        if (audioRef.current) {
          const audioStream = event.streams[0];
          audioRef.current.srcObject = audioStream;
          
          // Configurar detección de volumen en lugar de eventos play/ended
          setupVolumeDetection(audioStream);
          
          console.log('✅ Stream de audio configurado con detección de volumen');
        }
      };

      // 4. Capturar micrófono del usuario
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      // 5. Canal de datos para eventos
      const dc = pc.createDataChannel("oai-events");
      dataChannelRef.current = dc;
      
      dc.onopen = () => {
        setIsRealtimeConnected(true);
        console.log('✅ Canal de datos conectado - sistema básico funcional restaurado');
      };
      
      dc.onmessage = (event) => {
        // Procesamiento básico de eventos - sin interceptación agresiva
        try {
          const eventData = JSON.parse(event.data);
          
          // Solo mostrar eventos importantes para debugging
          if (eventData.type === "response.audio.delta" || eventData.type === "response.audio.done") {
            // Eventos de audio para lipsync - procesar normalmente
            window.dispatchEvent(new CustomEvent('realtime-animation', {
              detail: {
                audioData: eventData,
                lipsync: generateDynamicLipsync(eventData),
                animation: 'realtime-audio'
              }
            }));
          }
          
          // Solo log de eventos críticos (menos ruido)
          if (['error', 'response.done', 'session.created'].includes(eventData.type)) {
            console.log("📩 Evento importante:", eventData.type);
          }
          
        } catch (parseError) {
          // Si no se puede parsear, continúa normal
        }
      };

      // 6. Crear oferta local
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // 7. Enviar SDP a OpenAI
      const sdpResp = await fetch(`https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/sdp",
          "OpenAI-Beta": "realtime=v1",
        },
        body: offer.sdp,
      });

      if (!sdpResp.ok) {
        throw new Error(`Error en SDP exchange: ${sdpResp.status}`);
      }

      const answerSdp = await sdpResp.text();
      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });

      console.log('🚀 Conexión Realtime establecida');
      return true;

    } catch (error) {
      console.error('❌ Error inicializando Realtime:', error);
      setIsRealtimeConnected(false);
      return false;
    }
  }, []);

  // Función para desconectar Realtime
  const disconnectRealtime = useCallback(() => {
    try {
      console.log('🔄 Desconectando Realtime...');
      
      // Limpiar detección de volumen PRIMERO
      cleanupVolumeDetection();
      
      // Aplicar Idle
      applyIdleAnimation();
      
      // Limpiar listeners de audio (legacy, ya no se usan pero por seguridad)
      if (audioRef.current) {
        const audioElement = audioRef.current;
        if (audioListenersRef.current.play) {
          audioElement.removeEventListener('play', audioListenersRef.current.play);
        }
        if (audioListenersRef.current.ended) {
          audioElement.removeEventListener('ended', audioListenersRef.current.ended);
        }
        if (audioListenersRef.current.pause) {
          audioElement.removeEventListener('pause', audioListenersRef.current.pause);
        }
        audioListenersRef.current = { play: null, ended: null, pause: null };
      }
      
      if (dataChannelRef.current) {
        dataChannelRef.current.close();
        dataChannelRef.current = null;
      }
      
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
      
      setIsRealtimeConnected(false);
      console.log('✅ Realtime desconectado completamente');
    } catch (error) {
      console.error('❌ Error desconectando Realtime:', error);
    }
  }, [applyIdleAnimation, cleanupVolumeDetection]);

  // Función para determinar si un mensaje requiere el backend
  const requiresBackend = (message) => {
    const lowerMessage = message.toLowerCase();
    
    // Keywords que requieren funciones del backend
    const backendKeywords = [
      // Búsquedas académicas
      'buscar artículos', 'find papers', 'scholar search', 'academic papers',
      'referencias', 'citations', 'bibliografía', 'bibliography',
      
      // Creación de documentos
      'crear documento', 'create document', 'write document', 'generar reporte',
      'generate report', 'escribir ensayo', 'write essay',
      
      // Búsquedas web específicas
      'buscar en internet', 'search web', 'buscar información sobre',
      'find information about', 'research about',
      
      // Gráficos y visualizaciones
      'crear gráfico', 'create graph', 'generar gráfica', 'generate chart',
      'visualizar datos', 'data visualization',
      
      // Documentos del usuario
      'mis documentos', 'my documents', 'buscar en mis archivos',
      'search my files', 'analizar documento', 'analyze document',
      
      // Emails
      'enviar email', 'send email', 'mandar correo', 'send mail',
      
      // Noticias
      'noticias', 'news', 'últimas noticias', 'latest news',
      
      // Funciones específicas
      'roles de naia', 'naia roles', 'capacidades de naia', 'naia capabilities'
    ];

    // Preguntas sobre personas específicas (nombres propios)
    const hasProperNoun = /\b[A-Z][a-z]+\s+[A-Z][a-z]+/.test(message);
    if (hasProperNoun && (lowerMessage.includes('quién es') || lowerMessage.includes('who is'))) {
      return true;
    }

    // Verificar keywords
    return backendKeywords.some(keyword => lowerMessage.includes(keyword));
  };

  // Función para generar respuesta local con OpenAI
  const generateLocalResponse = async (message, conversationHistory = []) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    setIsProcessing(true);

    try {
      // Verificar API key
      if (!OPENAI_API_KEY) {
        throw new Error('OpenAI API key no configurada');
      }
      
      console.log('🔍 DEBUG: API Key presente:', OPENAI_API_KEY ? 'Sí' : 'No');
      
      // Construir historial de mensajes
      const messages = [
        { role: 'system', content: getResearcherPrompt() },
        ...conversationHistory,
        { role: 'user', content: message }
      ];
      
      console.log('🔍 DEBUG: Mensajes enviados:', messages);

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: messages,
          temperature: 0.7,
          max_tokens: 1000
        }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        throw new Error(`OpenAI API Error: ${response.status}`);
      }

      const data = await response.json();
      
      console.log('🔍 DEBUG: Respuesta completa de OpenAI:', data);
      
      // Procesar respuesta
      let messages_array = [];
      const content = data.choices[0]?.message?.content;
      
      console.log('🔍 DEBUG: Respuesta cruda de OpenAI:', content);
      
      if (!content) {
        console.warn('❌ Contenido vacío o null de OpenAI');
        messages_array = [{
          text: "Lo siento, no pude procesar tu consulta correctamente.",
          facialExpression: "default",
          animation: "Talking_0",
          language: "es",
          tts_prompt: "tono amigable y comprensivo"
        }];
      } else {
        try {
          // Limpiar JSON si viene envuelto en markdown
          const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          console.log('🔍 DEBUG: Contenido limpio para parsear:', cleanContent);
          messages_array = JSON.parse(cleanContent);
          console.log('✅ DEBUG: JSON parseado correctamente:', messages_array);
        } catch (parseError) {
          // Fallback si no es JSON válido
          console.warn('❌ Could not parse JSON response, creating fallback');
          console.warn('❌ Error de parsing:', parseError);
          console.warn('❌ Contenido que falló:', content);
          messages_array = [{
            text: content || "Lo siento, no pude procesar tu consulta correctamente.",
            facialExpression: "default",
            animation: "Talking_0",
            language: "es",
            tts_prompt: "tono amigable y comprensivo"
          }];
        }
      }

      return {
        messages: messages_array,
        audioData: null, // No audio desde gpt-4o-mini, se generará separadamente
        conversationHistory: [
          ...conversationHistory,
          { role: 'user', content: message },
          { role: 'assistant', content: content }
        ]
      };

    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Local chat request aborted');
        return null;
      }
      
      console.error('Local chat error:', error);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };

  // Función para generar solo audio desde texto (para casos donde ya tenemos el texto)
  const generateAudioFromText = async (text, tts_prompt = null) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();

    try {
      const currentRoleId = localStorage.getItem('naia_selected_role') || 'researcher';
      const voice = getVoiceForRole(currentRoleId);
      const instructions = getVoiceInstructions(currentRoleId, tts_prompt);

      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini-tts',
          input: text,
          voice: voice,
          instructions: instructions,
          speed: 1.0
        }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        throw new Error(`TTS API Error: ${response.status}`);
      }

      return await response.arrayBuffer();
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Audio generation aborted');
        return null;
      }
      throw error;
    }
  };

  // Función para cancelar requests
  const cancelRequest = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      console.log('🧹 useLocalChat: Cleanup al desmontar hook');
      
      // Limpiar detección de volumen
      cleanupVolumeDetection();
      
      // Limpiar listeners de audio (legacy)
      if (audioRef.current) {
        const audioElement = audioRef.current;
        if (audioListenersRef.current.play) {
          audioElement.removeEventListener('play', audioListenersRef.current.play);
        }
        if (audioListenersRef.current.ended) {
          audioElement.removeEventListener('ended', audioListenersRef.current.ended);
        }
        if (audioListenersRef.current.pause) {
          audioElement.removeEventListener('pause', audioListenersRef.current.pause);
        }
      }
      
      // Desconectar Realtime si está conectado
      if (isRealtimeConnected) {
        disconnectRealtime();
      }
    };
  }, []); // ← Dependencias vacías para que solo se ejecute al desmontar

  return {
    requiresBackend,
    generateLocalResponse,
    generateAudioFromText,
    cancelRequest,
    isProcessing,
    // Realtime API functions
    initRealtimeConnection,
    disconnectRealtime,
    isRealtimeConnected,
    audioRef,
    // Realtime animations - simplificadas
    isRealtimeSpeaking
  };
};