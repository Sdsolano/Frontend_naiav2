import React, { useState, useRef, useEffect } from "react";
import { HybridChatProvider, useHybridChat } from "../hooks/useHybridChat";
import { useSimpleVoice } from "../hooks/useSimpleVoice";
import { Send, Loader, Mic, MicOff, Zap, Server, Users } from "lucide-react";
import { useNotification } from "./NotificationContext";

// Componente interno que usa el contexto híbrido
const HybridChatInterface = () => {
  const [inputMessage, setInputMessage] = useState("");
  const inputRef = useRef(null);
  const { addNotification } = useNotification();

  // Hook híbrido
  const { 
    chat, 
    loading, 
    isThinking, 
    displayResponses, 
    conversationHistory, 
    functionResults, 
    processingStatus,
    isUsingLocalMode 
  } = useHybridChat();

  // Hook de voz
  const {
    isListening,
    transcript,
    toggleListening,
    continuousMode,
    toggleContinuousMode,
    alwaysListeningMode,
    toggleAlwaysListeningMode,
  } = useSimpleVoice({
    handleSendMessage: chat,
    language: 'es-ES',
    onContinuousModeEnabled: () => {
      addNotification('Modo conversación continua activado', 'success');
    },
    onContinuousModeDisabled: () => {
      addNotification('Modo conversación continua desactivado', 'info');
    },
    onAlwaysListeningEnabled: () => {
      addNotification('Siempre escuchando activado - Di "Oye Naia"', 'info');
    },
    onAlwaysListeningDisabled: () => {
      addNotification('Siempre escuchando desactivado', 'info');
    }
  });

  // Escuchar el evento de chat directo desde la voz
  useEffect(() => {
    const handleDirectChat = (event) => {
      const message = event.detail;
      console.log(`📞 Mensaje directo desde voz: "${message}"`);
      chat(message);
    };

    window.addEventListener('directchat', handleDirectChat);
    return () => window.removeEventListener('directchat', handleDirectChat);
  }, [chat]);

  // Actualizar transcript en input cuando hay uno activo
  useEffect(() => {
    if (transcript && !loading) {
      setInputMessage(transcript);
    }
  }, [transcript, loading]);

  // Función para enviar mensaje
  const handleSendMessage = async (e) => {
    e?.preventDefault();
    
    const messageToSend = inputMessage.trim();
    if (!messageToSend) return;
    
    setInputMessage("");
    if (inputRef.current) {
      inputRef.current.focus();
    }
    
    await chat(messageToSend);
  };

  // Manejar Enter en input
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header con información del modo actual */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">🧪 Chat Híbrido NAIA</h1>
            <p className="text-blue-100">
              Prueba del sistema híbrido: conversaciones simples en frontend, funciones complejas en backend
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-medium ${
              isUsingLocalMode 
                ? 'bg-green-500 bg-opacity-20 text-green-100' 
                : 'bg-orange-500 bg-opacity-20 text-orange-100'
            }`}>
              {isUsingLocalMode ? <Zap className="w-4 h-4" /> : <Server className="w-4 h-4" />}
              <span>{isUsingLocalMode ? 'Modo Local' : 'Modo Backend'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Status de procesamiento */}
      {(loading || isThinking || processingStatus) && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <Loader className={`w-4 h-4 text-yellow-600 ${loading ? 'animate-spin' : ''}`} />
            <span className="text-yellow-800 font-medium">
              {processingStatus || (isThinking ? 'Procesando...' : 'Cargando...')}
            </span>
            <span className={`px-2 py-1 rounded-full text-xs ${
              isUsingLocalMode 
                ? 'bg-green-100 text-green-700' 
                : 'bg-blue-100 text-blue-700'
            }`}>
              {isUsingLocalMode ? 'LOCAL' : 'BACKEND'}
            </span>
          </div>
        </div>
      )}

      {/* Ejemplos de mensajes para probar */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="font-semibold text-green-800 mb-2 flex items-center">
            <Zap className="w-4 h-4 mr-2" />
            Conversaciones Locales (Fast)
          </h3>
          <div className="space-y-2 text-sm text-green-700">
            <button 
              onClick={() => setInputMessage("Hola, ¿cómo estás?")}
              className="block w-full text-left p-2 rounded hover:bg-green-100"
            >
              "Hola, ¿cómo estás?"
            </button>
            <button 
              onClick={() => setInputMessage("¿Qué es la ingeniería biomédica?")}
              className="block w-full text-left p-2 rounded hover:bg-green-100"
            >
              "¿Qué es la ingeniería biomédica?"
            </button>
            <button 
              onClick={() => setInputMessage("Explícame sobre la Universidad del Norte")}
              className="block w-full text-left p-2 rounded hover:bg-green-100"
            >
              "Explícame sobre la Universidad del Norte"
            </button>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-800 mb-2 flex items-center">
            <Server className="w-4 h-4 mr-2" />
            Funciones Backend (Full Features)
          </h3>
          <div className="space-y-2 text-sm text-blue-700">
            <button 
              onClick={() => setInputMessage("Buscar artículos sobre inteligencia artificial")}
              className="block w-full text-left p-2 rounded hover:bg-blue-100"
            >
              "Buscar artículos sobre inteligencia artificial"
            </button>
            <button 
              onClick={() => setInputMessage("Crear documento sobre metodología de investigación")}
              className="block w-full text-left p-2 rounded hover:bg-blue-100"
            >
              "Crear documento sobre metodología de investigación"
            </button>
            <button 
              onClick={() => setInputMessage("¿Quién es el rector de la Universidad del Norte?")}
              className="block w-full text-left p-2 rounded hover:bg-blue-100"
            >
              "¿Quién es el rector de la Universidad del Norte?"
            </button>
          </div>
        </div>
      </div>

      {/* Controles de voz */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="font-semibold text-gray-800 mb-3">Controles de Voz</h3>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={toggleListening}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              isListening 
                ? 'bg-red-500 text-white hover:bg-red-600' 
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            <span>{isListening ? 'Detener' : 'Escuchar'}</span>
          </button>

          <button
            onClick={toggleContinuousMode}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              continuousMode 
                ? 'bg-green-500 text-white' 
                : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Continuo</span>
          </button>

          <button
            onClick={toggleAlwaysListeningMode}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              alwaysListeningMode 
                ? 'bg-purple-500 text-white' 
                : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
            }`}
          >
            <span>👂</span>
            <span>Always Listening</span>
          </button>
        </div>

        {transcript && (
          <div className="mt-3 p-3 bg-yellow-100 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Escuchando:</strong> {transcript}
            </p>
          </div>
        )}
      </div>

      {/* Input de chat */}
      <form onSubmit={handleSendMessage} className="space-y-4">
        <div className="flex space-x-2">
          <input
            ref={inputRef}
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe un mensaje para probar el chat híbrido..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !inputMessage.trim()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {loading ? (
              <Loader className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            <span>Enviar</span>
          </button>
        </div>
      </form>

      {/* Respuestas */}
      {displayResponses.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-800">Respuestas:</h3>
          {displayResponses.map((response, index) => (
            <div key={index} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-gray-800">{response}</p>
            </div>
          ))}
        </div>
      )}

      {/* Resultados de funciones (solo para backend) */}
      {functionResults && !isUsingLocalMode && (
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-800">Resultados de Funciones (Backend):</h3>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <pre className="text-sm text-gray-600 whitespace-pre-wrap">
              {JSON.stringify(functionResults, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* Historial de conversación */}
      {conversationHistory.length > 0 && (
        <details className="bg-gray-50 rounded-lg">
          <summary className="p-4 font-semibold text-gray-800 cursor-pointer">
            Historial de Conversación ({conversationHistory.length} mensajes)
          </summary>
          <div className="px-4 pb-4 space-y-2">
            {conversationHistory.slice(-10).map((msg, index) => (
              <div key={index} className={`p-2 rounded text-sm ${
                msg.role === 'user' 
                  ? 'bg-blue-100 text-blue-800' 
                  : 'bg-green-100 text-green-800'
              }`}>
                <strong>{msg.role === 'user' ? 'Usuario' : 'NAIA'}:</strong> {msg.content}
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
};

// Componente principal con Provider
const HybridChatTest = () => {
  return (
    <HybridChatProvider>
      <HybridChatInterface />
    </HybridChatProvider>
  );
};

export default HybridChatTest;