import React, { useRef, useEffect, useState } from "react";
import { useChat } from "../hooks/useChat";
import { useHybridChat } from "../hooks/useHybridChat";
import { useLocalChat } from "../hooks/useLocalChat";
import { useSimpleVoice } from "../hooks/useSimpleVoice";
import { useUserImage } from "../hooks/useUserImage"; 
import { Send, Loader, Mic, MicOff, RefreshCw, Camera, Ear, EarOff, Volume2 } from "lucide-react";
import FunctionResultsDisplay from "./FunctionResultsDisplay";
import { useNavigate } from "react-router-dom";
import { getCurrentRoleName } from "../utils/roleUtils";

// Variable global para evitar envíos duplicados
let lastSentMessage = '';
let lastSentTime = 0;

export const SimpleUI = ({ hidden, ...props }) => {
  const navigate = useNavigate();
  const [currentRoleName, setCurrentRoleName] = useState('Investigador');
  const [isGovContext, setIsGovContext] = useState(false);

  // Función para cambiar de rol con refresh completo de la página
  const handleChangeRole = () => {
    localStorage.removeItem('naia_selected_role');
    
    // Navegar y luego refrescar la página para limpiar todos los estados
    navigate('/naia');
    
    // Usar setTimeout para asegurar que la navegación ocurra antes del refresh
    setTimeout(() => {
      window.location.reload();
    }, 100);
  }

  useEffect(() => {
    const checkGovContext = () => {
      const isGov = window.location.pathname.startsWith('/gov');
      setIsGovContext(isGov);
      console.log(`🏛️ Contexto gubernamental: ${isGov ? 'SÍ' : 'NO'}`);
    };

    // Verificar al cargar
    checkGovContext();

    // Escuchar cambios de ruta
    const handleLocationChange = () => {
      checkGovContext();
    };

    window.addEventListener('popstate', handleLocationChange);
    
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, []);

  const input = useRef();
  const hiddenVideoRef = useRef(null);
  // Hook inteligente - usar híbrido si está disponible, sino normal
  let chatHook;
  let isUsingLocalMode = false;
  
  try {
    chatHook = useHybridChat();
    isUsingLocalMode = chatHook.isUsingLocalMode || false;
  } catch (error) {
    chatHook = useChat();
  }

  // Hook para LocalChat (incluye Realtime API)
  const localChat = useLocalChat();

  const { chat, 
    loading, 
    cameraZoomed, 
    setCameraZoomed, 
    message, 
    displayResponses, 
    onMessagePlayed,
    isThinking,
    saveConversation,
    pendingMessages,
    loadConversation,
    functionResults } = chatHook;

  // Estado para deshabilitar temporalmente los controles después de enviar
  const [inputDisabled, setInputDisabled] = useState(false);
  const [messageEnded, setMessageEnded] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState(null);
  const [showDebugVideo, setShowDebugVideo] = useState(false);
  
  // Estado para mostrar los subtítulos actuales
  const [currentSubtitle, setCurrentSubtitle] = useState("");

  // Hook para manejar imágenes del usuario
  const { 
    initCamera, 
    setVideoElement, 
    captureAndUpload,
    captureInitialImage,
    isReady: isCameraReady,
    getLastCaptureTime,
    debugInfo
  } = useUserImage();
  
  // Detectar cambios de rol
  useEffect(() => {
    const updateRoleName = () => {
      const roleName = getCurrentRoleName();
      setCurrentRoleName(roleName);
      console.log(`🎭 SimpleUI: Rol actualizado a ${roleName}`);
    };

    updateRoleName();

    const handleRoleChange = () => {
      updateRoleName();
    };

    const handleStorageChange = (e) => {
      if (e.key === 'naia_selected_role') {
        updateRoleName();
      }
    };

    window.addEventListener('role-changed', handleRoleChange);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('role-changed', handleRoleChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Determinar si el avatar está respondiendo
  const isAvatarResponding = loading || !!message;
  
  // Inicializar la cámara cuando carga el componente
  useEffect(() => {
    if (!hidden) {
      const setupCamera = async () => {
        console.log('🎥 Iniciando configuración de cámara...');
        const success = await initCamera();
        console.log(`🎥 Inicialización de cámara: ${success ? 'exitosa' : 'fallida'}`);
        
        if (success && hiddenVideoRef.current) {
          console.log('🎥 Asignando elemento de video al hook');
          setVideoElement(hiddenVideoRef.current);
          
          setTimeout(() => {
            console.log('🎥 Intentando captura inicial después de espera');
            captureInitialImage();
          }, 3000);
        }
      };
      
      setupCamera();
    }
  }, [hidden, initCamera, setVideoElement, captureInitialImage]);
  
  // Efecto para capturar imagen SOLO al finalizar reproducción de audio
  useEffect(() => {
    const handleAudioEnded = () => {
      setCurrentSubtitle("");
      
      if (isCameraReady) {
        console.log("🔄 Audio finalizado, capturando imagen de reacción...");
        captureAndUpload()
          .then(success => {
            console.log(`📸 Imagen post-audio enviada: ${success ? 'éxito' : 'falló'}`);
          })
          .catch(e => console.error("Error en captura post-audio:", e));
      }
    };
    
    window.addEventListener('avatar-audio-ended', handleAudioEnded);
    
    return () => {
      window.removeEventListener('avatar-audio-ended', handleAudioEnded);
    };
  }, [isCameraReady, captureAndUpload]);

  // Efecto para actualizar los subtítulos cuando cambia el mensaje
  useEffect(() => {
    if (message && message.text) {
      setCurrentSubtitle(message.text);
      console.log("📝 Subtítulo actualizado:", message.text);
    } else {
      setCurrentSubtitle("");
    }
  }, [message]);
  
  // Función para manejar la entrada del usuario y capturar imagen anticipadamente
  const handleInputChange = (e) => {
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }
    
    const timeout = setTimeout(() => {
      if (isCameraReady && e.target.value.trim().length > 0) {
        console.log('📸 Capturando imagen anticipada mientras escribe...');
        captureAndUpload().catch(e => console.error("Error en captura anticipada:", e));
      }
    }, 1500);
    
    setTypingTimeout(timeout);
  };
  
  // Limpiar el timeout al desmontar el componente
  useEffect(() => {
    return () => {
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
    };
  }, [typingTimeout]);
  
  // Función directa y simple para enviar mensajes, con deduplicación
  const sendMessage = (text) => {
    const messageText = text || (input.current ? input.current.value.trim() : "");
    
    if (!messageText || isAvatarResponding || inputDisabled) {
      if (!messageText) {
        console.log("📱 UI: No se envió mensaje: texto vacío");
      }
      if (isAvatarResponding) {
        console.log("📱 UI: No se envió mensaje: avatar respondiendo");
      }
      if (inputDisabled) {
        console.log("📱 UI: No se envió mensaje: entrada deshabilitada temporalmente");
      }
      return;
    }

    // Comprobar duplicación
    const now = Date.now();
    if (messageText === lastSentMessage && (now - lastSentTime) < 2000) {
      console.log(`📱 UI: Ignorando mensaje duplicado: "${messageText}"`);
      return;
    }
    
    lastSentMessage = messageText;
    lastSentTime = now;
    
    console.log(`📱 UI: Enviando mensaje: "${messageText}"`);
    
    setInputDisabled(true);
    
    const timeSinceLastCapture = Date.now() - getLastCaptureTime();
    const needsNewCapture = timeSinceLastCapture > 3000;
    
    if (isCameraReady && needsNewCapture) {
      captureAndUpload()
        .then(success => {
          console.log(`📸 Imagen pre-mensaje enviada: ${success ? 'éxito' : 'falló'}`);
        })
        .catch(e => console.error("Error en captura pre-mensaje:", e));
    } else if (!needsNewCapture) {
      console.log('📸 Usando imagen reciente, no es necesario capturar otra');
    }
    
    try {
      chat(messageText);
      
      if (!text && input.current) {
        input.current.value = "";
      }
    } catch (error) {
      console.error("📱 UI: Error al enviar mensaje:", error);
    }
    
    setTimeout(() => {
      setInputDisabled(false);
    }, 500);

    setMessageEnded(false);
  };

  // Handlers para los diferentes modos de voz
  const handleContinuousModeEnabled = () => {
    console.log("🔄 SimpleUI: Modo continuo activado por transición automática");
    loadConversation();
  };

  const handleContinuousModeDisabled = () => {
    console.log("🔄 SimpleUI: Modo continuo desactivado");
    saveConversation();
  };

  const handleAlwaysListeningEnabled = () => {
    console.log("🔊 SimpleUI: Modo Always Listening activado manualmente");
    loadConversation();
  };

  const handleAlwaysListeningDisabled = () => {
    console.log("🔊 SimpleUI: Modo Always Listening desactivado por transición automática");
  };
  
  // Hook de voz mejorado con los 3 modos
  const { 
    isListening, 
    toggleListening,
    startListening,
    continuousMode,
    toggleContinuousMode,
    alwaysListeningMode,
    toggleAlwaysListeningMode,
    consecutiveFailures
  } = useSimpleVoice({
    language: 'es-ES',
    onContinuousModeDisabled: handleContinuousModeDisabled,
    onContinuousModeEnabled: handleContinuousModeEnabled,
    onAlwaysListeningEnabled: handleAlwaysListeningEnabled,
    onAlwaysListeningDisabled: handleAlwaysListeningDisabled
  });

  // Escuchar evento directchat
  useEffect(() => {
    const directChatHandler = (event) => {
      const messageText = event.detail;
      console.log(`📱 UI: Evento directchat recibido: "${messageText}"`);
      
      const timeSinceLastCapture = Date.now() - getLastCaptureTime();
      const needsNewCapture = timeSinceLastCapture > 3000;
      
      if (isCameraReady && needsNewCapture) {
        captureAndUpload()
          .then(success => {
            console.log(`📸 Imagen pre-mensaje de voz enviada: ${success ? 'éxito' : 'falló'}`);
          })
          .catch(e => console.error("Error en captura pre-mensaje de voz:", e));
      }
      
      sendMessage(messageText);
    };
    
    window.addEventListener('directchat', directChatHandler);
    return () => window.removeEventListener('directchat', directChatHandler);
  }, [isCameraReady, captureAndUpload, getLastCaptureTime]);

  // Función personalizada para manejar el fin de un mensaje
  const handleMessageEnd = () => {
    console.log("📱 UI: Mensaje finalizado, notificando...");
    setMessageEnded(true);
    
    if (onMessagePlayed) {
      onMessagePlayed();
    }
  };

  // Simplificar lógica - el hook maneja todo el reconocimiento
  useEffect(() => {
    const handleAvatarAudioEnded = () => {
      console.log("🔄 UI: Evento avatar-audio-ended recibido");
      
      if (pendingMessages) {
        console.log("⏳ Aún hay mensajes pendientes, esperando...");
      }
    };
    
    window.addEventListener('avatar-audio-ended', handleAvatarAudioEnded);
    
    return () => {
      window.removeEventListener('avatar-audio-ended', handleAvatarAudioEnded);
    };
  }, [pendingMessages]);

  // Monitorear el objeto message para detectar cuándo termina
  useEffect(() => {
    if (!message && isAvatarResponding === false) {
      handleMessageEnd();
    }
  }, [message, isAvatarResponding]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // 🔧 FUNCIONES MEJORADAS PARA ESTADOS VISUALES CLAROS
  const getVoiceStatus = () => {
    if (alwaysListeningMode) {
      return isListening ? 'Escuchando wake words...' : 'Esperando "Oye Naia"...';
    }
    
    if (continuousMode) {
      if (isListening) {
        return 'Escuchando tu respuesta...';
      }
      return `Conversación activa (${consecutiveFailures}/3 fallos)`;
    }
    
    return isListening ? 'Escuchando...' : 'Presiona para hablar';
  };

  const getVoiceButtonStyle = () => {
    if (alwaysListeningMode) {
      return isListening 
        ? "bg-blue-500 hover:bg-blue-600 text-white shadow-lg" 
        : "bg-blue-600 hover:bg-blue-700 text-white";
    }
    
    if (continuousMode) {
      return isListening 
        ? "bg-green-400 hover:bg-green-500 text-white shadow-lg animate-pulse" 
        : "bg-green-600 hover:bg-green-700 text-white";
    }
    
    return "bg-gray-200 hover:bg-gray-300 text-gray-700";
  };

  const getListeningIndicatorStyle = () => {
    if (alwaysListeningMode) {
      return {
        bg: isListening ? 'bg-blue-500' : 'bg-blue-600',
        animate: isListening ? 'animate-ping' : 'animate-pulse'
      };
    }
    
    if (continuousMode) {
      return {
        bg: isListening ? 'bg-green-400' : 'bg-green-600',
        animate: isListening ? 'animate-ping' : 'animate-pulse'
      };
    }
    
    return {
      bg: 'bg-red-800',
      animate: 'animate-ping'
    };
  };

  if (hidden) {
    return null;
  }

  const listeningStyle = getListeningIndicatorStyle();

  return (
    <>
      {/* Video para la cámara */}
      <video 
        ref={hiddenVideoRef}
        autoPlay 
        playsInline 
        muted
        style={{
          position: showDebugVideo ? 'fixed' : 'absolute',
          right: showDebugVideo ? '10px' : '-9999px',
          bottom: showDebugVideo ? '10px' : '-9999px',
          width: '320px',
          height: '240px',
          zIndex: 1000,
          border: showDebugVideo ? '2px solid red' : 'none'
        }}
      />
      
      <div className="fixed top-0 left-0 right-0 bottom-0 z-10 flex justify-between p-4 pl-20 flex-col pointer-events-none">
        <div className="self-start backdrop-blur-md bg-white bg-opacity-50 p-4 rounded-lg flex items-center">
          <h1 className="font-black text-xl">{isGovContext ? 'MAIA' : 'NAIA'}</h1>
          
          {!isGovContext && (
            <button
              onClick={handleChangeRole}
              className="ml-4 px-3 py-1 rounded-md bg-blue-950 text-white text-sm font-medium pointer-events-auto hover:bg-blue-900 transition-colors flex items-center gap-1"
              title="Cambiar el rol actual"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Cambiar rol</span>
            </button>
          )}

          {/* Indicador de Modo Híbrido */}
          {isUsingLocalMode && (
            <div className="ml-3 flex items-center">
              <div className="px-2 py-1 rounded-full bg-green-100 border border-green-300 flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-1"></div>
                <span className="text-green-700 text-xs font-medium">Chat Local</span>
              </div>
            </div>
          )}

          {pendingMessages && (
              <div className="ml-3 flex items-center">
                <div className="relative mr-2">
                  <div className="absolute inset-0 bg-yellow-700 rounded-full animate-pulse opacity-75"></div>
                  <div className="relative rounded-full bg-yellow-800 h-3 w-3"></div>
                </div>
                <span className="mr-2 text-sm font-medium">Procesando respuesta</span>
              </div>
          )}

          {/* 🔧 INDICADOR MEJORADO DE ESTADOS DE VOZ */}
          {(alwaysListeningMode || continuousMode || isListening) && (
            <div className="ml-3 flex items-center">
              <div className="relative mr-2">
                <div className={`absolute inset-0 ${listeningStyle.bg} rounded-full ${listeningStyle.animate} opacity-75`}></div>
                <div className={`relative rounded-full h-3 w-3 ${listeningStyle.bg.replace('animate-ping', '').replace('animate-pulse', '')}`}></div>
              </div>
              <span className="mr-2 text-sm font-medium">{getVoiceStatus()}</span>
              
              {/* Mostrar contador de fallos si está en modo continuo */}
              {continuousMode && consecutiveFailures > 0 && (
                <span className="ml-1 px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
                  {consecutiveFailures}/3
                </span>
              )}
            </div>
          )}
          
          {/* Indicador de respuesta */}
          {isAvatarResponding && (
            <div className="ml-3 flex items-center">
              <div className="relative mr-2">
                <div className="absolute inset-0 bg-blue-950 rounded-full animate-pulse opacity-75"></div>
                <div className="relative rounded-full bg-blue-900 h-3 w-3"></div>
              </div>
              <span className="mr-2 text-sm font-medium">Respondiendo</span>
            </div>
          )}
        </div>

        {/* Function Results Display */}
        <FunctionResultsDisplay functionResults={functionResults} />

        <div className="flex flex-col">
          {/* Subtitles area */}
          {currentSubtitle && (
            <div className="w-full max-w-2xl mx-auto pointer-events-auto mb-12">
              <div className="backdrop-blur-md bg-white bg-opacity-70 p-4 rounded-lg shadow-lg">
                <p className="mb-0">{currentSubtitle}</p>
              </div>
            </div>
          )}

          {/* Input area */}
          <div className="flex items-center gap-2 pointer-events-auto max-w-screen-sm w-full mx-auto">
            <textarea
              className="w-full h-12 placeholder:text-gray-500 p-3 rounded-md bg-opacity-80 bg-white backdrop-blur-md resize-none"
              placeholder="Escribe un mensaje..."
              ref={input}
              onKeyDown={handleKeyDown}
              onChange={handleInputChange}
              disabled={isAvatarResponding || inputDisabled}
              rows={1}
            />
            
            {/* 🔧 BOTÓN PRINCIPAL DE VOZ UNIFICADO */}
            <button
              onClick={() => {
                console.log(`🔘 Click en botón voice - Estado actual: Always=${alwaysListeningMode}, Continuous=${continuousMode}`);
                
                if (alwaysListeningMode || continuousMode) {
                  // Desactivar cualquier modo activo
                  if (alwaysListeningMode) {
                    toggleAlwaysListeningMode();
                  }
                  if (continuousMode) {
                    toggleContinuousMode();
                  }
                } else {
                  // Activar Always Listening por defecto
                  toggleAlwaysListeningMode();
                }
              }}
              className={`p-3 rounded-md flex-shrink-0 transition-all duration-200 ${getVoiceButtonStyle()}`}
              title={
                alwaysListeningMode 
                  ? `Always Listening Activo - ${getVoiceStatus()}` 
                  : continuousMode 
                    ? `Modo Continuo Activo - ${getVoiceStatus()}`
                    : "Activar Always Listening"
              }
            >
              {alwaysListeningMode ? (
                <Ear className={`w-5 h-5 ${isListening ? 'animate-pulse' : ''}`} />
              ) : continuousMode ? (
                <Volume2 className={`w-5 h-5 ${isListening ? 'animate-pulse' : ''}`} />
              ) : (
                <EarOff className="w-5 h-5" />
              )}
            </button>
            
            {/* Botón de modo continuo manual - Solo cuando no hay modos activos */}
            {!alwaysListeningMode && !continuousMode && (
              <button
                onClick={toggleContinuousMode}
                className="p-3 rounded-md flex-shrink-0 bg-gray-200 hover:bg-gray-300 text-gray-700"
                title="Activar modo continuo manual"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            )}
            
            {/* Botón de micrófono manual - Solo cuando no hay modos activos */}
            {!alwaysListeningMode && !continuousMode && (
              <button
                onClick={toggleListening}
                className={`p-3 rounded-md flex-shrink-0 ${
                  isListening 
                    ? "bg-red-900 hover:bg-red-950 text-white" 
                    : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                } ${(isAvatarResponding || inputDisabled) ? "cursor-not-allowed opacity-75" : ""}`}
                disabled={isAvatarResponding || inputDisabled}
                title={isListening ? "Detener y enviar" : "Iniciar reconocimiento"}
              >
                {isListening ? 
                  <MicOff className="w-5 h-5" /> : 
                  <Mic className="w-5 h-5" />
                }
              </button>
            )}
            
            {/* Botón de enviar */}
            <button
              disabled={isAvatarResponding || inputDisabled}
              onClick={() => sendMessage()}
              className={`bg-blue-950 hover:bg-blue-900 text-white p-3 rounded-md flex-shrink-0 ${
                (isAvatarResponding || inputDisabled) ? "cursor-not-allowed opacity-50" : ""
              }`}
              title="Enviar mensaje"
            >
              {loading ? <Loader className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
            
            {/* Botón de zoom */}
            <button
              onClick={() => setCameraZoomed(!cameraZoomed)}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 p-3 rounded-md flex-shrink-0"
              title={cameraZoomed ? "Alejar" : "Acercar"}
            >
              {cameraZoomed ? "Alejar" : "Acercar"}
            </button>

            {/* Botón temporal para Realtime */}
            <button
              onClick={localChat.isRealtimeConnected ? localChat.disconnectRealtime : localChat.initRealtimeConnection}
              className={`p-3 rounded-md flex-shrink-0 text-sm font-medium ${
                localChat.isRealtimeConnected 
                  ? "bg-red-500 hover:bg-red-600 text-white" 
                  : "bg-purple-500 hover:bg-purple-600 text-white"
              }`}
              title={localChat.isRealtimeConnected ? "Desconectar Realtime" : "Conectar Realtime"}
            >
              {localChat.isRealtimeConnected ? "🔴 RT ON" : "🟣 RT OFF"}
            </button>
          </div>

          {/* 🔧 INFORMACIÓN MEJORADA PARA LOS MODOS DE VOZ */}
          {(alwaysListeningMode || continuousMode) && (
            <div className="text-center mt-3 pointer-events-auto">
              <div className={`border rounded-lg p-3 max-w-md mx-auto ${
                alwaysListeningMode 
                  ? 'bg-blue-50 border-blue-200' 
                  : 'bg-green-50 border-green-200'
              }`}>
                <p className={`text-sm ${
                  alwaysListeningMode ? 'text-blue-800' : 'text-green-800'
                }`}>
                  {alwaysListeningMode ? (
                    <>
                      <Ear className="w-4 h-4 inline mr-1" />
                      <strong>Always Listening:</strong> Di <strong>"Oye Naia"</strong> para activar la conversación
                      {isListening && <span className="block text-xs mt-1">🎤 Escuchando wake words...</span>}
                    </>
                  ) : continuousMode ? (
                    <>
                      <Volume2 className="w-4 h-4 inline mr-1" />
                      <strong>Modo Continuo:</strong> Habla normalmente, despídete para salir
                      {isListening && <span className="block text-xs mt-1">🎤 Esperando tu respuesta...</span>}
                      {consecutiveFailures > 0 && (
                        <span className="block text-xs text-orange-600 mt-1 font-medium">
                          ⚠️ {consecutiveFailures}/3 intentos sin respuesta - Se desactivará automáticamente
                        </span>
                      )}
                    </>
                  ) : (
                    "Activando modo de conversación..."
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Elemento audio oculto para Realtime API */}
          <audio 
            ref={localChat.audioRef} 
            autoPlay 
            playsInline 
            style={{ display: 'none' }}
            title="Audio de Realtime API"
          />
        </div>
      </div>
    </>
  );
};

export default SimpleUI;