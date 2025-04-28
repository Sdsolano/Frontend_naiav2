import { Loader } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Leva } from "leva";
import { Experience } from "./components/Experience";
import { SimpleUI } from "./components/SimpleUI";
import SubtitlesContext from './components/subtitles';
import React, { useState, useEffect } from 'react';
import { ChatEventListener } from './hooks/useChat';
import { UserProvider } from "./components/UserContext";

function App() {
  const [subtitles, setSubtitles] = useState('');

  // Añadir efecto para prevenir scroll en el body
  useEffect(() => {
    // Guardar el overflow original
    const originalOverflow = document.body.style.overflow;
    
    // Prevenir scroll
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    
    // Restaurar al desmontar
    return () => {
      document.body.style.overflow = originalOverflow;
      document.documentElement.style.overflow = '';
    };
  }, []);

  return (
    <div className="overflow-hidden fixed inset-0 w-screen h-screen">
      <UserProvider>
        <SubtitlesContext.Provider value={{ subtitles, setSubtitles }}>
          <Leva hidden />
          <Loader />
          <SimpleUI hidden={false} />
          <Canvas 
            shadows 
            camera={{ position: [0, 0, 1], fov: 30 }}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
          >
            <Experience />
          </Canvas>
          <ChatEventListener />
        </SubtitlesContext.Provider>
      </UserProvider>
    </div>
  );
}

export default App;