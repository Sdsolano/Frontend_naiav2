import { useState, useRef, useCallback, useEffect } from 'react';
import { OPENAI_API_KEY, BACKEND_URL } from '../../config';
import { getVoiceForRole, getVoiceInstructions } from '../utils/voiceUtils';
import { getCurrentRoleConfig, ROLE_NAMES } from '../utils/roleUtils';
import { useUser } from '../components/UserContext';

/**
 * Hook para manejar conversaciones locales con OpenAI directamente
 * Usado para conversaciones que no requieren funciones del backend
 */
export const useLocalChat = () => {
  const { userId, isUserReady } = useUser(); // Obtener userId dinámico del contexto
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [functionResults, setFunctionResults] = useState(null);
  const abortControllerRef = useRef(null);
  
  // Realtime API refs
  const wsRef = useRef(null); // Para RTCPeerConnection
  const dataChannelRef = useRef(null); // Para RTCDataChannel
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
    
        // Enviar evento al Avatar
        window.dispatchEvent(new CustomEvent('realtime-animation', { 
          detail: animationMessage 
        }));
    
  }, []);

  // Función simple para volver a Idle cuando termina el audio
  const applyIdleAnimation = useCallback(() => {
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
      
      if (average > VOLUME_THRESHOLD) {
        // HAY AUDIO REAL
        lastVolumeTimeRef.current = now;
        
        if (!isCurrentlyTalkingRef.current) {
          isCurrentlyTalkingRef.current = true;
          applyTalkingAnimation();
        }
        
      } else {
        // SILENCIO - verificar si ya pasó el timeout
        const silenceDuration = now - lastVolumeTimeRef.current;
        
        if (isCurrentlyTalkingRef.current && silenceDuration > SILENCE_TIMEOUT) {
          applyIdleAnimation();
        }
      }
    };
    
    // Monitorear cada 100ms
    volumeCheckIntervalRef.current = setInterval(checkVolume, 100);
    
  }, [applyTalkingAnimation, applyIdleAnimation]);

  // Función para configurar detección de volumen
  const setupVolumeDetection = useCallback((audioStream) => {
    try {
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
      
      // Iniciar monitoreo de volumen
      startVolumeMonitoring();
      
    } catch (error) {
      console.error('❌ Error configurando detección de volumen:', error);
    }
  }, [startVolumeMonitoring]);

  // Función para limpiar detección de volumen
  const cleanupVolumeDetection = useCallback(() => {
    console.trace('Stack trace para cleanup de detección de volumen');
    
    // Limpiar interval
    if (volumeCheckIntervalRef.current) {
      clearInterval(volumeCheckIntervalRef.current);
      volumeCheckIntervalRef.current = null;
    }
    
    // Limpiar Web Audio API
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    analyserRef.current = null;
    lastVolumeTimeRef.current = 0;
    isCurrentlyTalkingRef.current = false;
    
  }, []);


  // Ejecutar function calls y comunicarse con el backend
  const executeFunctionCall = async (functionName, functionArgs, callId, dataChannel) => {
    const timestamp = new Date().toISOString();
    console.log(`🔧 [${timestamp}] executeFunctionCall INICIADO: ${functionName}`, functionArgs);
    console.log(`🆔 [${timestamp}] Call ID: ${callId}`);
    console.log(`👤 [${timestamp}] userId del contexto: ${userId}`);
    
    try {
      // Mapeo de funciones a endpoints
      const endpointMap = {
        'frequently_asked_questions': '/api/v1/gobernacion/faq/',
        'search_traffic_fines': '/api/v1/gobernacion/traffic-fines/',
        'explain_passport_process': '/api/v1/gobernacion/passport-process/',
        'get_location_events': '/api/v1/gobernacion/events/',
        'get_location_places': '/api/v1/gobernacion/places/'
      };

      const endpoint = endpointMap[functionName];
      if (!endpoint) {
        throw new Error(`Función no reconocida: ${functionName}`);
      }

      const fullUrl = `${BACKEND_URL}${endpoint}`;
      console.log(`📡 Llamando endpoint: ${fullUrl}`);

      // Parsear argumentos si vienen como string
      const args = typeof functionArgs === 'string' ? JSON.parse(functionArgs) : functionArgs;
      
      // Obtener user_id del contexto de usuario
      if (!args.user_id && userId) {
        args.user_id = userId;
        console.log(`👤 Usando userId del contexto: ${userId}`);
      } else if (!args.user_id) {
        // Fallback para roles que no requieren autenticación (como ciudadano)
        const fallbackUserId = parseInt(localStorage.getItem('naia_user_id') || '325', 10);
        args.user_id = fallbackUserId;
        console.log(`👤 Usando fallback userId del localStorage: ${fallbackUserId}`);
      }

      // Hacer petición al backend
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(args)
      });

      if (!response.ok) {
        throw new Error(`Error en endpoint ${endpoint}: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log(`✅ Resultado de ${functionName}:`, result);

      // 🎯 ACTUALIZAR ESTADO PARA MOSTRAR EN FunctionResultsDisplay
      console.log('🔍 [DEBUG] Actualizando functionResults con:', result);
      setFunctionResults(result);
      console.log('🔍 [DEBUG] setFunctionResults llamado exitosamente');

      // Enviar resultado de vuelta al modelo via data channel (según documentación oficial)
      const functionOutput = {
        type: "conversation.item.create",
        item: {
          type: "function_call_output", 
          call_id: callId, 
          output: JSON.stringify(result)
        }
      };

      dataChannel.send(JSON.stringify(functionOutput));
      console.log('📤 Resultado enviado al modelo');

    } catch (error) {
      console.error(`❌ Error ejecutando función ${functionName}:`, error);
      
      // Enviar error al modelo
      const errorOutput = {
        type: "conversation.item.create",
        item: {
          type: "function_call_output",
          call_id: callId, // ✅ Usar call_id que viene del modelo
          output: JSON.stringify({
            error: `Error al ejecutar ${functionName}: ${error.message}`,
            success: false
          })
        }
      };

      dataChannel.send(JSON.stringify(errorOutput));
      
      // Solicitar respuesta con el error
      setTimeout(() => {
        const createResponse = {
          type: "response.create"
        };
        dataChannel.send(JSON.stringify(createResponse));
      }, 100);
    }
  };

  // Prompt dinámico para chat normal (JSON responses) - se adapta al rol actual
  const getDynamicRolePrompt = () => {
    const currentTime = new Date().toLocaleString('es-ES', { 
      timeZone: 'America/Bogota',
      year: 'numeric',
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    // Obtener configuración del rol actual dinámicamente
    const currentRoleId = localStorage.getItem('naia_selected_role') || 'researcher';
    const roleName = ROLE_NAMES[currentRoleId] || 'Investigador';

    // Descripción específica por rol
    const roleDescriptions = {
      'researcher': 'As a researcher, you specialize in helping with academic inquiries, educational guidance, and providing informative responses. Your goal is to assist with academic and educational conversations, providing reliable information and guidance to students, faculty, and staff.',
      'ciudadano': 'As a citizen services assistant, you specialize in helping with government procedures, social programs information, and administrative guidance. Your goal is to assist citizens with government services from Atlántico Department.',
      'guide': 'As a university guide, you specialize in helping new students navigate the university, providing information about campus services, locations, and student activities.',
      'companion': 'As a wellness companion, you specialize in providing emotional support and wellness guidance in an educational context.',
      'trainer': 'As a skills trainer, you specialize in helping with professional development and skill building.',
      'assistant': 'As a personal assistant, you specialize in organization, productivity, and administrative support.',
      'receptionist': 'As a receptionist, you specialize in providing information and directing visitors and students to appropriate services.'
    };

    const roleDescription = roleDescriptions[currentRoleId] || roleDescriptions['researcher'];

    return `You are NAIA, a sophisticated AI FEMALE avatar created by Universidad del Norte in Barranquilla, Colombia. You are currently operating in your ${roleName.toUpperCase()} ROLE, which is one of your assistance functions. ${roleDescription}

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

Remember: You are having a real-time conversation, so be natural, engaging, and educational while maintaining your ${roleName.toLowerCase()} role personality.`;
  };

  // Sistema de instrucciones optimizado para GPT-Realtime 2025
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

    // Obtener configuración del rol actual dinámicamente
    const currentRoleId = localStorage.getItem('naia_selected_role') || 'researcher';
    const roleName = ROLE_NAMES[currentRoleId] || 'Investigador';

    // System prompt optimizado para el nuevo GPT-Realtime con estructura profesional
    return `# Role & Objective
Eres NAIA, asistente especializada de la Universidad del Norte en Barranquilla, Colombia. Tu rol específico actual es ${roleName}. Tu éxito se mide por brindar respuestas precisas, útiles y mantener consistentemente tu identidad como NAIA.

IDENTIDAD CRÍTICA E INMUTABLE:
- Tu nombre es NAIA - NUNCA digas que eres ChatGPT, Assistant o cualquier otra IA
- Eres NAIA específicamente, no "una inteligencia artificial" genérica
- NAIA es tu identidad fija y permanente
- Siempre responde "Soy NAIA" cuando pregunten quién eres

# Personality & Tone
## Personality
- Profesional pero cercana y empática
- Orgullosa de tu identidad como NAIA de Universidad del Norte
- Entusiasta por ayudar y proporcionar información valiosa
- Confiable y competente en tu área de especialización

## Tone  
- Cálido, profesional, nunca servil
- Conversacional y natural, apropiado para interacción de voz
- Seguro y confiado al brindar información
- Acogedor pero manteniendo estándares institucionales

## Length
- 1-3 oraciones por respuesta en conversación normal
- Respuestas concisas pero completas
- No repitas información innecesariamente

## Pacing
- Habla con ritmo natural y cálido
- No aceleres artificialmente, mantén naturalidad
- Pausa apropiadamente para énfasis cuando sea importante

# Context
${currentRoleId === 'ciudadano' ? 
`Operas como asistente oficial de la Gobernación del Atlántico, especializada en:
- Servicios y trámites gubernamentales del departamento
- Información sobre procesos administrativos
- Orientación sobre programas sociales y beneficios ciudadanos
- Consulta de multas de tránsito y expedición de pasaportes
- Información turística y cultural del Atlántico` :
`Operas desde la Universidad del Norte en Barranquilla, especializada en:
- Consultas académicas y educativas
- Orientación para estudiantes y profesores
- Información confiable sobre temas universitarios
- Apoyo en investigación y aprendizaje`}

Ubicación: Barranquilla, Colombia (GMT-5)
Hora actual: ${currentTime}

# Reference Pronunciations
- Pronuncia "NAIA" como "NA-ia" (dos sílabas)
- Pronuncia "Atlántico" con acento en la 'á'
- Pronuncia "Barranquilla" como "Ba-rran-qui-lla"

# Instructions / Rules
## Behavior
- MANTÉN tu identidad como NAIA en toda conversación
- Responde siempre en español con acento colombiano natural
- No repitas la misma frase dos veces consecutivas
- Varía respuestas para sonar natural, no robótica
- ${currentRoleId === 'ciudadano' ? 'Proporciona información gubernamental precisa y profesional' : 'Proporciona información académica confiable y educativa'}

## Audio Handling
- Solo responde a audio claro o preguntas comprensibles
- Si audio no es claro, pide cortésmente clarificación
- Mantén el idioma del usuario (principalmente español)
- Usa entonación natural apropiada para el contenido

## Identity Protection
- Si alguna vez sientes confusión sobre tu identidad, recuerda: TU NOMBRE ES NAIA
- NUNCA cambies a ChatGPT, Assistant u otras identidades
- Tu identidad NAIA es permanente e inmutable
- Si preguntan directamente quién eres: "Soy NAIA, ${currentRoleId === 'ciudadano' ? 'asistente de la Gobernación del Atlántico' : 'de la Universidad del Norte'}"

# Conversation Flow
## Estado inicial: Presentación
- Identifícate como NAIA en tu primer contacto
- Mantén presentación breve y enfocada en ayudar
- Invita al usuario a compartir cómo puedes asistir

## Estado de consulta
- Escucha activamente la necesidad del usuario
- Proporciona información precisa y útil
- ${currentRoleId === 'ciudadano' ? 'Ofrece orientación sobre procesos gubernamentales apropiados' : 'Guía hacia recursos académicos apropiados'}

# Safety & Escalation
- No proporciones información médica, legal o financiera específica
- Para consultas fuera de tu competencia, orienta cortésmente hacia contactos apropiados
- Mantén siempre estándares profesionales institucionales

# Name Recognition
- Reconoce variantes por errores de reconocimiento de voz: "Naya", "Nadia", "Maya", "Anaya", "Nayla", "Anaia"
- Todas estas variantes se refieren a tu nombre: NAIA

RECORDATORIO FINAL: Tu nombre es NAIA. NUNCA olvides tu identidad específica como NAIA.`;
  };

  // Función para inicializar conexión Realtime
  const initRealtimeConnection = useCallback(async () => {
    try {
      console.log('🔄 Iniciando conexión Realtime...');
      
      if (!OPENAI_API_KEY) {
        throw new Error('OpenAI API key no configurada');
      }

      // 1. Crear sesión Realtime
      const currentRoleId = localStorage.getItem('naia_selected_role') || 'researcher';
      const ttsVoice = getVoiceForRole(currentRoleId);
      const realtimeVoice = mapVoiceToRealtime(ttsVoice);
      console.log(`🎤 Mapeando voz: TTS="${ttsVoice}" -> Realtime="${realtimeVoice}" para rol: ${currentRoleId}`);
      
      // Obtener prompt específico para Realtime API
      const customInstructions = getRealtimeInstructions();
      console.log(`📋 Usando prompt personalizado de NAIA ${ROLE_NAMES[currentRoleId]} para Realtime API`);
      
      // IMPLEMENTACIÓN WEBRTC NATIVA según documentación oficial OpenAI
      console.log('🔗 Implementando WebRTC nativo según documentación oficial...');
      
      // 1. Obtener ephemeral token desde TU backend (según documentación oficial)
      console.log('🔐 Obteniendo ephemeral token desde backend...');
      const finalUserId = userId || parseInt(localStorage.getItem('naia_user_id') || '325', 10);
      console.log(`👤 initRealtimeConnection - userId del contexto: ${userId}, usando: ${finalUserId}`);
      
      const tokenResponse = await fetch(`${BACKEND_URL}/api/v1/token/realtime/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          roleId: currentRoleId,
          user_id: 5,
        }),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        throw new Error(`Error obteniendo token: ${tokenResponse.status} - ${errorText}`);
      }

      const tokenData = await tokenResponse.json();
      const ephemeralKey = tokenData.client_secret;
      
      if (!ephemeralKey) {
        throw new Error('❌ No se obtuvo ephemeral token válido');
      }
      
      console.log(`✅ Ephemeral token obtenido: ${ephemeralKey.substring(0, 10)}...`);

      // 2. Crear WebRTC PeerConnection (según documentación oficial)
      console.log('🔗 Configurando WebRTC PeerConnection...');
      const pc = new RTCPeerConnection();

      // 3. Configurar audio element para reproducir respuestas del modelo
      const audioElement = audioRef.current || document.createElement("audio");
      audioElement.autoplay = true;
      pc.ontrack = (e) => {
        audioElement.srcObject = e.streams[0];
        
        // Setup volume detection for animations
        setupVolumeDetection(e.streams[0]);
      };

      // 4. Agregar track de micrófono local
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true 
      });
      
      pc.addTrack(stream.getTracks()[0]);
      console.log('🎤 Micrófono configurado');

      // 5. Configurar Data Channel para eventos (según documentación oficial)
      const dc = pc.createDataChannel("oai-events");

      // 6. Event listeners para Data Channel
      dc.onopen = () => {
        console.log('✅ Data Channel abierto');
        setIsRealtimeConnected(true);
      
        console.log('📡 NAIA WebRTC conectada con instrucciones configuradas');
        
        // ✅ SessionRef simplificado - ya no necesitamos tracking complejo
        sessionRef.current = {
          connected: true
        };
      };

      dc.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📩 Evento recibido:', data.type);

          // Manejo específico de eventos
          switch (data.type) {
            case 'response.audio.delta':
              // Audio streaming para lipsync y animaciones
              window.dispatchEvent(new CustomEvent('realtime-animation', {
                detail: {
                  audioData: data.delta,
                  lipsync: generateDynamicLipsync(data),
                  animation: 'Talking_0'
                }
              }));
              break;

            // 🔧 EVENTOS PARA FUNCTION CALLING - SIMPLIFICADOS
            case 'response.output_item.added':
              console.log('📦 Nuevo item de salida agregado:', data.item?.type);
              // ✅ Ya no necesitamos guardar nada - response.done tiene todo
              break;

            case 'conversation.item.added':
              console.log('💬 Item agregado a conversación:', data.item?.type);
              break;

            case 'response.function_call_arguments.delta':
              // Los argumentos se construyen en streaming - solo log si necesitas debug
              // console.log('📝 Delta de argumentos:', data.delta);
              break;

            case 'response.function_call_arguments.done':
              console.log('✅ Argumentos de función completados - pero usaremos response.done');
              // ✅ Ya no ejecutamos aquí - response.done tiene la info completa
              break;
              
            case 'response.done':
              console.log('🏁 Respuesta completada, verificando function calls...');
              
              // ✅ USAR RESPONSE.DONE - Tiene toda la información completa
            if (data.response?.output && Array.isArray(data.response.output)) {
              const functionCalls = data.response.output.filter(item => item.type === 'function_call');
              
              if (functionCalls.length > 0) {
                await Promise.all(functionCalls.map(funcCall => {
                  const args = typeof funcCall.arguments === 'string' 
                    ? JSON.parse(funcCall.arguments) 
                    : funcCall.arguments;
                  return executeFunctionCall(funcCall.name, args, funcCall.call_id, dc);
                }));
                dc.send(JSON.stringify({ type: "response.create" }));

                } else {
                  console.log('✅ Respuesta completada sin function calls');
                }
              } else {
                console.log('✅ Respuesta completada sin output array');
              }
              
              setIsProcessing(false);
              break;
              
            case 'error':
              console.error('❌ Error del modelo:', data.error);
              break;
              
            default:
              console.log('📩 Evento no manejado:', data.type);
          }

        } catch (parseError) {
          console.error('Error parseando mensaje WebRTC:', parseError);
        }
      };

      dc.onerror = (error) => {
        console.error('❌ Error Data Channel:', error);
        setIsProcessing(false);
        setIsRealtimeConnected(false);
      };

      // 7. Configurar audio entrante
      pc.ontrack = (event) => {
        const audioElement = audioRef.current;
        if (audioElement && event.streams[0]) {
          audioElement.srcObject = event.streams[0];
          audioElement.autoplay = true;
          
          // Setup volume detection for animations
          setupVolumeDetection(event.streams[0]);
        }
      };

      // 6. Crear offer y configurar SDP (según documentación oficial)
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      console.log('📤 Enviando offer a OpenAI según documentación oficial...');

      // 7. Enviar offer a OpenAI usando endpoint correcto (/calls)
      const baseUrl = "https://api.openai.com/v1/realtime/calls";
      const model = "gpt-realtime";
      const sdpResp = await fetch(`${baseUrl}?model=${model}`, {
        method: "POST",
        body: offer.sdp, // ✅ Solo SDP, no JSON
        headers: {
          Authorization: `Bearer ${ephemeralKey}`,
          "Content-Type": "application/sdp", // ✅ Content-Type correcto
        },
      });

      if (!sdpResp.ok) {
        const errorText = await sdpResp.text();
        throw new Error(`Error intercambiando SDP: ${sdpResp.status} - ${errorText}`);
      }

      const answerSdp = await sdpResp.text(); // ✅ Respuesta como texto, no JSON
      
      // 8. Configurar respuesta remota
      const answer = {
        type: "answer",
        sdp: answerSdp,
      };
      await pc.setRemoteDescription(answer);

      console.log('✅ WebRTC PeerConnection establecida exitosamente');

      // 11. Guardar referencias para cleanup
      wsRef.current = pc;
      dataChannelRef.current = dc;

      console.log('🚀 Conexión Realtime iniciada');
      return true;

    } catch (error) {
      console.error('❌ Error inicializando Realtime:', error);
      setIsRealtimeConnected(false);
      return false;
    }
  }, []);

  // Función auxiliar para enviar audio al modelo (WebRTC nativo)
  const sendAudioToRealtime = useCallback((audioData) => {
    if (!wsRef.current || !dataChannelRef.current || !isRealtimeConnected) {
      console.warn('⚠️ WebRTC PeerConnection no está conectada');
      return;
    }

    try {
      // Con WebRTC nativo, el audio se transmite automáticamente via RTCPeerConnection
      // Los audio tracks se configuran automáticamente en getUserMedia
    } catch (error) {
      console.error('❌ Error con audio WebRTC:', error);
    }
  }, [isRealtimeConnected]);

  // Función auxiliar para solicitar respuesta (WebRTC nativo)
  const requestRealtimeResponse = useCallback(() => {
    if (!wsRef.current || !dataChannelRef.current || !isRealtimeConnected) {
      console.warn('⚠️ WebRTC PeerConnection no está conectada');
      return;
    }

    try {
      // Con WebRTC nativo, las respuestas se manejan automáticamente via server_vad
      // El turn_detection configurado en la sesión controla cuándo responder
      setIsProcessing(true);
    } catch (error) {
      console.error('❌ Error solicitando respuesta:', error);
    }
  }, [isRealtimeConnected]);

  // Función para desconectar Realtime
  const disconnectRealtime = useCallback(async () => {
    try {
      console.log('🔄 Desconectando Realtime...');
      
      // Limpiar detección de volumen PRIMERO
      cleanupVolumeDetection();
      
      // Reset variables globales de control de identidad
      window.naiaFirstResponseProcessed = false;
      
      // Limpiar function results
      setFunctionResults(null);
      
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
      
      // Desconectar WebRTC PeerConnection y DataChannel
      if (dataChannelRef.current) {
        dataChannelRef.current.close();
        dataChannelRef.current = null;
      }
      
      if (wsRef.current && typeof wsRef.current.close === 'function') {
        wsRef.current.close();
        wsRef.current = null;
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
        { role: 'system', content: getDynamicRolePrompt() },
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
        return null;
      }
      throw error;
    }
  };

  // Función para limpiar function results
  const clearFunctionResults = () => {
    setFunctionResults(null);
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
    // Function results para display
    functionResults,
    setFunctionResults,
    clearFunctionResults,
    // Realtime API functions
    initRealtimeConnection,
    disconnectRealtime,
    isRealtimeConnected,
    audioRef,
    // Funciones auxiliares Realtime
    sendAudioToRealtime,
    requestRealtimeResponse,
    // Realtime animations - simplificadas
    isRealtimeSpeaking
  };
};