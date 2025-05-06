import React, { useRef, useEffect, useState } from "react";
import { useChat } from "../hooks/useChat";
import { useSimpleVoice } from "../hooks/useSimpleVoice";
import { useUserImage } from "../hooks/useUserImage"; 
import { Send, Loader, Mic, MicOff, RefreshCw, Camera } from "lucide-react";
import FunctionResultsDisplay from "./FunctionResultsDisplay";

// Variable global para evitar envíos duplicados
let lastSentMessage = '';
let lastSentTime = 0;

export const SimpleUI = ({ hidden, ...props }) => {
  const input = useRef();
  const hiddenVideoRef = useRef(null);
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
    functionResults } = useChat();
  // Estado para deshabilitar temporalmente los controles después de enviar
  const [inputDisabled, setInputDisabled] = useState(false);
  const [messageEnded, setMessageEnded] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState(null);
  const [showDebugVideo, setShowDebugVideo] = useState(false); // Para depuración
  
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
  
  // Determinar si el avatar está respondiendo
  const isAvatarResponding = loading || !!message;
  
  // Inicializar la cámara cuando carga el componente
  useEffect(() => {
    if (!hidden) {
      // Inicializar cámara
      const setupCamera = async () => {
        console.log('🎥 Iniciando configuración de cámara...');
        const success = await initCamera();
        console.log(`🎥 Inicialización de cámara: ${success ? 'exitosa' : 'fallida'}`);
        
        // Asignar el elemento de video
        if (success && hiddenVideoRef.current) {
          console.log('🎥 Asignando elemento de video al hook');
          setVideoElement(hiddenVideoRef.current);
          
          // Esperar un tiempo para permitir que la cámara se inicialice completamente
          setTimeout(() => {
            // Realizar la captura inicial UNA SOLA VEZ
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
      // Limpiar el subtítulo actual cuando termina el audio
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
      // Establecer el texto del mensaje actual como subtítulo
      setCurrentSubtitle(message.text);
      console.log("📝 Subtítulo actualizado:", message.text);
    } else {
      // Limpiar subtítulo si no hay mensaje
      setCurrentSubtitle("");
    }
  }, [message]);
  
  // Función para manejar la entrada del usuario y capturar imagen anticipadamente
  const handleInputChange = (e) => {
    // Si ya hay un timeout, limpiarlo
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }
    
    // Establecer un nuevo timeout para capturar la imagen después de que el usuario ha dejado de escribir
    const timeout = setTimeout(() => {
      // Solo capturar si la cámara está lista y hay algo escrito
      if (isCameraReady && e.target.value.trim().length > 0) {
        console.log('📸 Capturando imagen anticipada mientras escribe...');
        captureAndUpload().catch(e => console.error("Error en captura anticipada:", e));
      }
    }, 1500); // 1.5 segundos después de que el usuario deja de escribir
    
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
    
    // Actualizar variables de seguimiento
    lastSentMessage = messageText;
    lastSentTime = now;
    
    console.log(`📱 UI: Enviando mensaje: "${messageText}"`);
    
    // Deshabilitar temporalmente la entrada
    setInputDisabled(true);
    
    // Verificar el tiempo desde la última captura
    // Si hace menos de 3 segundos que capturamos una imagen, no necesitamos otra
    const timeSinceLastCapture = Date.now() - getLastCaptureTime();
    const needsNewCapture = timeSinceLastCapture > 3000;
    
    // Capturar imagen solo si es necesario, en paralelo con el envío del mensaje
    if (isCameraReady && needsNewCapture) {
      captureAndUpload()
        .then(success => {
          console.log(`📸 Imagen pre-mensaje enviada: ${success ? 'éxito' : 'falló'}`);
        })
        .catch(e => console.error("Error en captura pre-mensaje:", e));
    } else if (!needsNewCapture) {
      console.log('📸 Usando imagen reciente, no es necesario capturar otra');
    }
    
    // Enviar el mensaje inmediatamente sin esperar por la imagen
    try {
      chat(messageText);
      
      // Limpiar input si es un mensaje de texto
      if (!text && input.current) {
        input.current.value = "";
      }
    } catch (error) {
      console.error("📱 UI: Error al enviar mensaje:", error);
    }
    
    // Restaurar después de un breve retraso
    setTimeout(() => {
      setInputDisabled(false);
    }, 500);

    // Indicar que se ha enviado un nuevo mensaje
    setMessageEnded(false);
  };
  const handleContinuousModeEnabled = () => {
    console.log("🔄 SimpleUI: Modo continuo activado, cargando conversación previa...");
    // Llamamos a la función para cargar la conversación
    // Esta función ahora limpia los subtítulos internamente
    loadConversation();
  };

  const handleContinuousModeDisabled = () => {
    console.log("🔄 SimpleUI: Modo continuo desactivado, guardando conversación...");
    // Llamamos a la función para guardar la conversación
    saveConversation();
  };
  
  // Usar el hook simplificado con funcionalidades extendidas
  const { 
    isListening, 
    toggleListening,
    startListening,
    continuousMode,
    toggleContinuousMode 
  } = useSimpleVoice({
    language: 'es-ES',
    onContinuousModeDisabled: handleContinuousModeDisabled,
    onContinuousModeEnabled: handleContinuousModeEnabled
  });

  // Escuchar evento directchat (ahora único punto de entrada)
  useEffect(() => {
    const directChatHandler = (event) => {
      const messageText = event.detail;
      console.log(`📱 UI: Evento directchat recibido: "${messageText}"`);
      
      // Verificar si necesitamos una nueva captura
      const timeSinceLastCapture = Date.now() - getLastCaptureTime();
      const needsNewCapture = timeSinceLastCapture > 3000;
      
      // Capturar imagen solo si es necesario
      if (isCameraReady && needsNewCapture) {
        captureAndUpload()
          .then(success => {
            console.log(`📸 Imagen pre-mensaje de voz enviada: ${success ? 'éxito' : 'falló'}`);
          })
          .catch(e => console.error("Error en captura pre-mensaje de voz:", e));
      }
      
      // No esperar a que termine la captura, enviar el mensaje inmediatamente
      sendMessage(messageText);
    };
    
    window.addEventListener('directchat', directChatHandler);
    return () => window.removeEventListener('directchat', directChatHandler);
  }, [isCameraReady, captureAndUpload, getLastCaptureTime]);

  // Función personalizada para manejar el fin de un mensaje
  const handleMessageEnd = () => {
    console.log("📱 UI: Mensaje finalizado, notificando...");
    setMessageEnded(true);
    
    // También llamar al callback original si existe
    if (onMessagePlayed) {
      onMessagePlayed();
    }
  };

  // Vigilar cuando termina el mensaje y el modo continuo está activo
  useEffect(() => {
    const handleAvatarAudioEnded = () => {
      console.log("🔄 UI: Evento avatar-audio-ended recibido");
      
      // Solo activar reconocimiento si estamos en modo continuo,
      // NO hay mensajes pendientes, y no estamos escuchando ya
      if (continuousMode && !pendingMessages && !isListening) {
        console.log("✅ No hay más mensajes pendientes, iniciando escucha");
        // Pequeño retraso para asegurar que los estados se actualizan
        setTimeout(() => {
          startListening();
        }, 300);
      } else if (pendingMessages) {
        console.log("⏳ Aún hay mensajes pendientes, esperando...");
      }
    };
    
    window.addEventListener('avatar-audio-ended', handleAvatarAudioEnded);
    
    return () => {
      window.removeEventListener('avatar-audio-ended', handleAvatarAudioEnded);
    };
  }, [continuousMode, isListening, pendingMessages, startListening]);

  // También mantener el anterior efecto para casos de respaldo
  useEffect(() => {
    // Solo activar si en modo continuo, mensaje terminado, sin respuesta activa,
    // sin mensajes pendientes y no estamos escuchando
    if (continuousMode && messageEnded && !isAvatarResponding && 
        !pendingMessages && !isListening) {
      console.log("🔄 Reiniciando escucha como respaldo (sin mensajes pendientes)");
      
      const timer = setTimeout(() => {
        startListening();
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [continuousMode, messageEnded, isAvatarResponding, pendingMessages, isListening, startListening]);

  // Monitorear el objeto message para detectar cuándo termina
  useEffect(() => {
    // Si message pasa de existir a no existir (null), consideramos que terminó
    if (!message && isAvatarResponding === false) {
      handleMessageEnd();
    }
  }, [message, isAvatarResponding]);

  // Toggle para el video de depuración
  const toggleDebugVideo = () => {
    setShowDebugVideo(!showDebugVideo);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (hidden) {
    return null;
  }

  return (
    <>
      {/* Video para la cámara - ahora posicionado fuera de la pantalla para que se renderice correctamente */}
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
          <h1 className="font-black text-xl">NAIA</h1>

          {pendingMessages && (
              <div className="ml-3 flex items-center">
                <div className="relative mr-2">
                  <div className="absolute inset-0 bg-yellow-700 rounded-full animate-pulse opacity-75"></div>
                  <div className="relative rounded-full bg-yellow-800 h-3 w-3"></div>
                </div>
                <span className="mr-2 text-sm font-medium">Procesando respuesta</span>
              </div>
          )}

          {/* Indicador de estado de escucha */}
          {isListening && (
            <div className="ml-3 flex items-center">
              <div className="relative mr-2">
                <div className="absolute inset-0 bg-red-900 rounded-full animate-ping opacity-75"></div>
                <div className="relative rounded-full bg-red-800 h-3 w-3"></div>
              </div>
              <span className="mr-2 text-sm font-medium">Escuchando</span>
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
          
          {/* Indicador de modo continuo */}
          {continuousMode && (
            <div className="ml-3 flex items-center">
              <div className="relative mr-2">
                <div className="absolute inset-0 bg-green-9 rounded-full animate-pulse opacity-75"></div>
                <div className="relative rounded-full bg-green-900 h-3 w-3"></div>
              </div>
              <span className="mr-2 text-sm font-medium">Modo continuo</span>
            </div>
          )}
          
          {/* Información de depuración sobre la cámara */}
          {showDebugVideo && debugInfo && (
            <div className="ml-3 text-xs text-gray-700">
              <span>Video: {debugInfo.videoWidth}x{debugInfo.videoHeight} (RS:{debugInfo.readyState})</span>
            </div>
          )}
        </div>

        {/* Function Results Display */}
        <FunctionResultsDisplay functionResults={functionResults} />

        <div className="flex flex-col">
          {/* Subtitles area - Positioned higher to leave space for ElegantSubtitles */}
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
            
            {/* Botón de modo continuo */}
            <button
              onClick={toggleContinuousMode}
              className={`p-3 rounded-md flex-shrink-0 ${
                continuousMode 
                  ? "bg-green-900 hover:bg-green-950 text-white" 
                  : "bg-gray-200 hover:bg-gray-300 text-gray-700"
              }`}
              title={continuousMode ? "Desactivar modo continuo" : "Activar modo continuo"}
            >
              <RefreshCw className={`w-5 h-5 ${continuousMode ? "animate-spin" : ""}`} />
            </button>
            
            {/* Botón de micrófono */}
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
          </div>
        </div>
      </div>
    </>
  );
};

export default SimpleUI;