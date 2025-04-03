import React, { useRef, useEffect, useState } from "react";
import { useChat } from "../hooks/useChat";
import { useSimpleVoice } from "../hooks/useSimpleVoice"; // Importar el hook modificado
import { Send, Loader, Mic, MicOff, RefreshCw } from "lucide-react";

// Variable global para evitar envíos duplicados
let lastSentMessage = '';
let lastSentTime = 0;

export const SimpleUI = ({ hidden, ...props }) => {
  const input = useRef();
  const { chat, loading, cameraZoomed, setCameraZoomed, message, displayResponses, onMessagePlayed } = useChat();
  // Estado para deshabilitar temporalmente los controles después de enviar
  const [inputDisabled, setInputDisabled] = useState(false);
  const [messageEnded, setMessageEnded] = useState(false);
  
  // Determinar si el avatar está respondiendo
  const isAvatarResponding = loading || !!message;
  
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
    
    try {
      // Enviar el mensaje al chat
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
  
  // Usar el hook simplificado con funcionalidades extendidas
  const { 
    isListening, 
    toggleListening,
    startListening,
    continuousMode,
    toggleContinuousMode 
  } = useSimpleVoice({
    language: 'es-ES'
  });

  // Escuchar evento directchat (ahora único punto de entrada)
  useEffect(() => {
    const directChatHandler = (event) => {
      const messageText = event.detail;
      console.log(`📱 UI: Evento directchat recibido: "${messageText}"`);
      
      // Usar el mecanismo general de envío con override para asegurar el envío
      // incluso si isAvatarResponding no se ha actualizado completamente
      sendMessage(messageText, true);
    };
    
    window.addEventListener('directchat', directChatHandler);
    return () => window.removeEventListener('directchat', directChatHandler);
  }, []);

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
      
      // Si estamos en modo continuo y no estamos escuchando ya
      if (continuousMode) {
        // Pequeño retraso para asegurar que los estados se actualizan
        setTimeout(() => {
          if (!isListening) {
            console.log("🔄 Reiniciando escucha inmediatamente (modo continuo)");
            // Iniciar la escucha inmediatamente
            startListening();
          }
        }, 300);
      }
    };
    
    // Escuchar el evento personalizado del Avatar
    window.addEventListener('avatar-audio-ended', handleAvatarAudioEnded);
    
    return () => {
      window.removeEventListener('avatar-audio-ended', handleAvatarAudioEnded);
    };
  }, [continuousMode, isListening, startListening]);

  // También mantener el anterior efecto para casos de respaldo
  useEffect(() => {
    // Si estamos en modo continuo, el mensaje ha terminado y no estamos escuchando ya
    if (continuousMode && messageEnded && !isAvatarResponding && !isListening) {
      console.log("🔄 Reiniciando escucha como respaldo (modo continuo)");
      
      // Pequeño retardo para asegurar que todo está listo
      const timer = setTimeout(() => {
        startListening();
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [continuousMode, messageEnded, isAvatarResponding, isListening, startListening]);

  // Monitorear el objeto message para detectar cuándo termina
  useEffect(() => {
    // Si message pasa de existir a no existir (null), consideramos que terminó
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

  if (hidden) {
    return null;
  }

  return (
    <>
      <div className="fixed top-0 left-0 right-0 bottom-0 z-10 flex justify-between p-4 flex-col pointer-events-none">
        <div className="self-start backdrop-blur-md bg-white bg-opacity-50 p-4 rounded-lg flex items-center">
          <h1 className="font-black text-xl">NAIA</h1>
          
          {/* Indicador de estado de escucha */}
          {isListening && (
            <div className="ml-3 flex items-center">
              <div className="relative mr-2">
                <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-75"></div>
                <div className="relative rounded-full bg-red-600 h-3 w-3"></div>
              </div>
              <span className="mr-2 text-sm font-medium">Escuchando</span>
            </div>
          )}
          
          {/* Indicador de respuesta */}
          {isAvatarResponding && (
            <div className="ml-3 flex items-center">
              <div className="relative mr-2">
                <div className="absolute inset-0 bg-blue-500 rounded-full animate-pulse opacity-75"></div>
                <div className="relative rounded-full bg-blue-600 h-3 w-3"></div>
              </div>
              <span className="mr-2 text-sm font-medium">Respondiendo</span>
            </div>
          )}
          
          {/* Indicador de modo continuo */}
          {continuousMode && (
            <div className="ml-3 flex items-center">
              <div className="relative mr-2">
                <div className="absolute inset-0 bg-green-500 rounded-full animate-pulse opacity-75"></div>
                <div className="relative rounded-full bg-green-600 h-3 w-3"></div>
              </div>
              <span className="mr-2 text-sm font-medium">Modo continuo</span>
            </div>
          )}
        </div>

        {/* Response area */}
        {displayResponses && displayResponses.length > 0 && (
          <div className="w-full max-w-2xl mx-auto my-4 pointer-events-auto">
            <div className="backdrop-blur-md bg-white bg-opacity-70 p-4 rounded-lg shadow-lg">
              {displayResponses.map((text, index) => (
                <p key={index} className="mb-2">{text}</p>
              ))}
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
            disabled={isAvatarResponding || inputDisabled}
            rows={1}
          />
          
          {/* Botón de modo continuo */}
          <button
            onClick={toggleContinuousMode}
            className={`p-3 rounded-md flex-shrink-0 ${
              continuousMode 
                ? "bg-green-500 hover:bg-green-600 text-white" 
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
                ? "bg-red-500 hover:bg-red-600 text-white" 
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
            className={`bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-md flex-shrink-0 ${
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
    </>
  );
};

export default SimpleUI;