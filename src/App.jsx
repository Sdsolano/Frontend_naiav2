import { Loader } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Leva } from "leva";
import { Experience } from "./components/Experience";
import { SimpleUI } from "./components/SimpleUI";
import SubtitlesContext from './components/subtitles';
import React, { useState, useEffect, useRef } from 'react';
import { ChatEventListener, useChat } from './hooks/useChat';
import ElegantSubtitles from "./components/ElegantSubtitles";
import RoleGuard from "./components/RoleGuard";

function App() {
  const [subtitles, setSubtitles] = useState('');
  const [currentRole, setCurrentRole] = useState(null);
  useEffect(() => {
    const roleId = localStorage.getItem('naia_selected_role');
    
    if (roleId) {
      setCurrentRole(roleId);
      console.log("Rol activo:", roleId);
    }
  }, []);
  // Obtener estados del contexto
  const { processingStatus, pollingEnabled, pollingSessionId } = useChat();
  
  // Estado para controlar la visibilidad y texto
  const [showSubtitles, setShowSubtitles] = useState(false);
  const [currentText, setCurrentText] = useState("");
  
  // Referencia para rastrear información de polling
  const pollingInfoRef = useRef({
    sessionId: null,              // ID de la sesión actual
    sessionStartTime: 0,          // Timestamp de inicio de la sesión
    delayBeforeShow: 7000,        // Mostrar después de 7 segundos
    showTimerActive: false,       // Si hay un temporizador activo
    showTimerId: null,            // ID del temporizador
    lastStatus: null,             // Último estado procesado
    latestStatus: ""              // Estado más reciente recibido durante el período de retraso
  });
  
  // Efecto para rastrear cambios en el polling habilitado/deshabilitado
  useEffect(() => {
    // Si el polling se desactiva, cancelar cualquier temporizador y ocultar
    if (!pollingEnabled) {
      if (pollingInfoRef.current.showTimerId) {
        clearTimeout(pollingInfoRef.current.showTimerId);
        pollingInfoRef.current.showTimerId = null;
        pollingInfoRef.current.showTimerActive = false;
      }
      setShowSubtitles(false);
      setCurrentText("");
      return;
    }
    
    // Si el polling se activa, registrar tiempo e iniciar temporizador
    if (pollingEnabled && !pollingInfoRef.current.showTimerActive) {
      console.log(`💡 Polling activado en tiempo: ${Date.now()}`);
      
      // Registrar tiempo de inicio y resetear estado más reciente
      pollingInfoRef.current.sessionStartTime = Date.now();
      pollingInfoRef.current.showTimerActive = true;
      pollingInfoRef.current.latestStatus = "";
      
      // Ocultar durante el período inicial
      setShowSubtitles(false);
      
      // Programar para mostrar después del retraso
      pollingInfoRef.current.showTimerId = setTimeout(() => {
        console.log(`⏱️ Retraso de ${pollingInfoRef.current.delayBeforeShow}ms completado, ahora se mostrarán los estados`);
        pollingInfoRef.current.showTimerActive = false;
        
        // Mostrar el estado MÁS RECIENTE que hayamos recibido durante el período de retraso
        if (pollingInfoRef.current.latestStatus) {
          console.log(`✅ Mostrando el estado más reciente: "${pollingInfoRef.current.latestStatus}"`);
          setCurrentText(pollingInfoRef.current.latestStatus);
          setShowSubtitles(true);
        }
      }, pollingInfoRef.current.delayBeforeShow);
    }
  }, [pollingEnabled]);
  
  // Efecto para rastrear cambios en la sesión de polling
  useEffect(() => {
    // Si cambió la sesión, resetear todo
    if (pollingSessionId !== pollingInfoRef.current.sessionId) {
      console.log(`💡 Nueva sesión de polling detectada: ${pollingSessionId}`);
      
      // Cancelar cualquier temporizador existente
      if (pollingInfoRef.current.showTimerId) {
        clearTimeout(pollingInfoRef.current.showTimerId);
        pollingInfoRef.current.showTimerId = null;
      }
      
      // Ocultar subtítulos y resetear estado
      setShowSubtitles(false);
      setCurrentText("");
      
      // Actualizar ID de sesión y resetear estado más reciente
      pollingInfoRef.current.sessionId = pollingSessionId;
      pollingInfoRef.current.showTimerActive = false;
      pollingInfoRef.current.latestStatus = "";
    }
  }, [pollingSessionId]);
  
  // Efecto para manejar cambios en processingStatus
  useEffect(() => {
    // Si no hay polling activo o no hay estado, no hacer nada
    if (!pollingEnabled || processingStatus === null) {
      if (processingStatus === null) {
        setShowSubtitles(false);
      }
      return;
    }
    
    // Calcular tiempo desde inicio de sesión
    const timeSinceSessionStart = Date.now() - pollingInfoRef.current.sessionStartTime;
    
    // Actualizar último estado procesado y el estado más reciente
    if (processingStatus !== pollingInfoRef.current.lastStatus) {
      pollingInfoRef.current.lastStatus = processingStatus;
      
      // Siempre actualizar el estado más reciente, incluso durante el período de retraso
      pollingInfoRef.current.latestStatus = processingStatus;
      
      // Solo mostrar si ha pasado el tiempo de retraso
      if (timeSinceSessionStart >= pollingInfoRef.current.delayBeforeShow) {
        console.log(`✅ Mostrando estado inmediatamente: "${processingStatus}"`);
        setCurrentText(processingStatus);
        setShowSubtitles(true);
      } else {
        console.log(`⏳ Estado recibido durante período de retraso (guardado como más reciente): "${processingStatus}"`);
      }
    }
  }, [processingStatus, pollingEnabled]);
  
  // Log para depuración
  useEffect(() => {
    if (processingStatus !== pollingInfoRef.current.lastStatus) {
      console.log(
        `🔍 Estado de UI: pollingEnabled=${pollingEnabled}, ` +
        `processingStatus=${processingStatus || 'null'}, ` +
        `mostrar=${showSubtitles}, texto="${currentText}", ` +
        `latestStatus="${pollingInfoRef.current.latestStatus}", ` +
        `tiempoDesdeInicio=${Date.now() - pollingInfoRef.current.sessionStartTime}ms`
      );
    }
  }, [pollingEnabled, processingStatus, showSubtitles, currentText]);
  
  // Envolver el contenido en RoleGuard para verificar la selección de rol
  return (
    <RoleGuard>
      <div className="overflow-hidden fixed inset-0 w-screen h-screen">
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
            
            {/* Subtítulos con retraso fijo y usando estado más reciente */}
            <ElegantSubtitles 
              text={currentText || 'Procesando'} 
              isActive={showSubtitles && pollingEnabled}
            />
            
            <ChatEventListener />
          </SubtitlesContext.Provider>
      </div>
    </RoleGuard>
  );
}

export default App;