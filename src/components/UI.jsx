import React, { useRef, useState, useEffect } from "react";
import { useChat } from "../hooks/useChat";
import { useConversationalVoice } from "../hooks/useConversationalVoice";
import { Send, Loader, Mic, MicOff, Volume2, VolumeX } from "lucide-react";

export const UI = ({ hidden, ...props }) => {
  const input = useRef();
  const { chat, loading, cameraZoomed, setCameraZoomed, message, displayResponses } = useChat();
  const [language, setLanguage] = useState('es-ES');
  const [hasResponded, setHasResponded] = useState(false);
  
  // Determinar si el avatar está respondiendo
  const isAvatarResponding = loading || !!message;
  
  // Rastrear cuando el avatar completa una respuesta
  useEffect(() => {
    // Cuando comienza a responder, resetear el estado de respuesta completada
    if (isAvatarResponding) {
      setHasResponded(false);
    } 
    // Cuando termina de responder, marcar como completado
    else if (!isAvatarResponding && !hasResponded) {
      setHasResponded(true);
    }
  }, [isAvatarResponding, hasResponded]);
  
  // Función de envío de mensaje mejorada con logs adicionales
  const handleSendMessage = (text) => {
    if (text && !isAvatarResponding) {
      console.log(`[UI] Enviando mensaje: "${text}"`);
      
      // Prueba para depurar
      try {
        // Verificar que chat es una función
        if (typeof chat !== 'function') {
          console.error('[UI] Error: chat no es una función', chat);
          return;
        }
        
        // Intentar enviar el mensaje
        chat(text);
        console.log('[UI] Mensaje enviado a la función chat');
      } catch (error) {
        console.error('[UI] Error al enviar mensaje:', error);
      }
    } else {
      if (!text) {
        console.log('[UI] No se envió el mensaje: texto vacío');
      }
      if (isAvatarResponding) {
        console.log('[UI] No se envió el mensaje: el avatar está respondiendo');
      }
    }
  };
  
  // Usar el hook de voz conversacional mejorado
  const {
    isListening,
    transcript,
    autoMode,
    startListening,
    stopListening,
    toggleListening,
    toggleAutoMode,
    resetTranscript
  } = useConversationalVoice({
    language: language,
    pauseThreshold: 2000,
    isResponding: isAvatarResponding,
    hasResponded: hasResponded, // Pasar el estado de respuesta completada
    onSendMessage: handleSendMessage // Usar la función mejorada
  });

  const sendMessage = (text = null) => {
    const messageText = text || input.current.value.trim();
    
    if (!isAvatarResponding && messageText) {
      resetTranscript();
      handleSendMessage(messageText);
      if (!text) {
        input.current.value = "";
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Toggle zoom on avatar
  const toggleZoom = () => {
    setCameraZoomed(!cameraZoomed);
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
          
          {/* Indicador de modo automático */}
          {autoMode && (
            <div className="ml-3 px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
              Modo conversación
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

        {/* Speech recognition feedback */}
        {isListening && transcript && (
          <div className="w-full max-w-2xl mx-auto mb-4 pointer-events-auto">
            <div className="backdrop-blur-md bg-white bg-opacity-70 p-3 rounded-lg shadow-lg border-2 border-blue-500 relative">
              <p className="text-gray-700">{transcript}</p>
              <p className="text-xs text-gray-500 mt-1">
                Haz una pausa de 2 segundos para enviar automáticamente
              </p>
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
            disabled={isAvatarResponding}
            rows={1}
          />
          
          {/* Modo automático */}
          <button
            onClick={toggleAutoMode}
            className={`p-3 rounded-md flex-shrink-0 ${
              autoMode 
                ? "bg-green-500 hover:bg-green-600 text-white" 
                : "bg-gray-200 hover:bg-gray-300 text-gray-700"
            }`}
            title={autoMode ? "Desactivar modo conversación" : "Activar modo conversación"}
          >
            {autoMode ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
          
          {/* Botón de micrófono */}
          <button
            onClick={toggleListening}
            className={`p-3 rounded-md flex-shrink-0 ${
              isListening 
                ? "bg-red-500 hover:bg-red-600 text-white" 
                : "bg-gray-200 hover:bg-gray-300 text-gray-700"
            } ${isAvatarResponding ? "cursor-not-allowed opacity-75" : ""}`}
            disabled={isAvatarResponding}
            title={isListening ? "Detener reconocimiento" : "Iniciar reconocimiento"}
          >
            {isListening ? 
              <MicOff className="w-5 h-5" /> : 
              <Mic className="w-5 h-5" />
            }
          </button>
          
          <button
            disabled={isAvatarResponding}
            onClick={() => sendMessage()}
            className={`bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-md flex-shrink-0 ${
              isAvatarResponding ? "cursor-not-allowed opacity-50" : ""
            }`}
            title="Enviar mensaje"
          >
            {loading ? <Loader className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
          
          <button
            onClick={toggleZoom}
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

export default UI;