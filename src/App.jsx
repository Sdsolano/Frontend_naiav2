import { Loader } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Leva } from "leva";
import { Experience } from "./components/Experience";
import { SimpleUI } from "./components/SimpleUI";
import SubtitlesContext from './components/subtitles';
import React, { useState, useEffect, useRef } from 'react';
import { ChatEventListener, useChat } from './hooks/useChat';
import { UserProvider } from "./components/UserContext";
import ElegantSubtitles from "./components/ElegantSubtitles";

function App() {
  const [subtitles, setSubtitles] = useState('');
  // Obtener pollingSessionId del contexto
  const { loading, isThinking, processingStatus, pollingSessionId } = useChat();
  
  // Estado para controlar la visibilidad del indicador
  const [showProcessingIndicator, setShowProcessingIndicator] = useState(false);
  // Estado para el texto que se mostrará
  const [displayText, setDisplayText] = useState('');
  
  // Seguimiento de la sesión actual para sincronización
  const currentSessionRef = useRef(pollingSessionId);
  
  // Efecto para actualizar el texto mostrado basado en los cambios de processingStatus
  useEffect(() => {
    // Actualizar nuestra referencia de la sesión actual
    currentSessionRef.current = pollingSessionId;
    
    // Función para verificar si estamos en un estado de carga
    const isLoading = loading || isThinking;
    
    if (!isLoading) {
      // Si no estamos cargando, no mostrar nada
      setDisplayText('');
      return;
    }
    
    // Si estamos cargando y hay un estado de procesamiento, mostrarlo
    if (processingStatus) {
      console.log(`📝 Actualizando texto a mostrar: "${processingStatus}"`);
      setDisplayText(processingStatus);
    } else {
      // Si no hay estado específico, mostrar el genérico
      setDisplayText('pensando...');
    }
  }, [processingStatus, loading, isThinking, pollingSessionId]);
  
  // Efecto para controlar la visibilidad del indicador
  useEffect(() => {
    let timer = null;
    
    if (loading || isThinking) {
      // Mostrar inmediatamente si estamos cargando
      setShowProcessingIndicator(true);
    } else {
      // Pequeño retraso para ocultar y evitar parpadeos
      timer = setTimeout(() => {
        setShowProcessingIndicator(false);
      }, 300);
    }
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [loading, isThinking]);

  // Añadir logs para depuración
  useEffect(() => {
    console.log(
      `🔍 Estado de UI: loading=${loading}, isThinking=${isThinking}, ` +
      `sesión=${pollingSessionId}, texto="${displayText}", mostrar=${showProcessingIndicator}`
    );
  }, [loading, isThinking, pollingSessionId, displayText, showProcessingIndicator]);
  
  return (
    <div className="overflow-hidden fixed inset-0 w-screen h-screen">
      <UserProvider>
        <SubtitlesContext.Provider value={{ subtitles, setSubtitles }}>
          <Leva hidden />
          <Loader />
          <SimpleUI hidden={false} />
          
          {/* Canvas para el mundo 3D */}
          <Canvas 
            shadows 
            camera={{ position: [0, 0, 1], fov: 30 }}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
          >
            <Experience />
          </Canvas>
          
          {/* Indicador de estado elegante */}
          <ElegantSubtitles 
            text={displayText}
            isActive={showProcessingIndicator}
          />
          
          <ChatEventListener />
        </SubtitlesContext.Provider>
      </UserProvider>
    </div>
  );
}

export default App;