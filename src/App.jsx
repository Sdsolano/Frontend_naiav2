import { Loader } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Leva } from "leva";
import { Experience } from "./components/Experience";
import { SimpleUI } from "./components/SimpleUI";
import SubtitlesContext from './components/subtitles';
import React, { useState } from 'react';
import { ChatEventListener } from './hooks/useChat';
import PermissionHandler from "./components/PermissionHandler";
import Notifications from './components/Notifications';
import { AuthenticatedTemplate, UnauthenticatedTemplate, useMsal } from '@azure/msal-react';
import LoginPage from "./components/LoginPage";
import { UserProvider } from "./components/UserContext";

function App() {
  const [subtitles, setSubtitles] = useState('');
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const { accounts } = useMsal();
  
  const isAuthenticated = accounts && accounts.length > 0;

  const handlePermissionsGranted = () => {
    setPermissionsGranted(true);
  };

  return (
    <>
      {/* Login screen for unauthenticated users */}
      <UnauthenticatedTemplate>
        <LoginPage />
      </UnauthenticatedTemplate>
      
      {/* Main application for authenticated users */}
      <AuthenticatedTemplate>
        <UserProvider>
          <SubtitlesContext.Provider value={{ subtitles, setSubtitles }}>
            <Leva hidden />
            <Loader />
            <SimpleUI hidden={!permissionsGranted} />
            <Canvas shadows camera={{ position: [0, 0, 1], fov: 30 }}>
              <Experience />
            </Canvas>
            <ChatEventListener />
            {isAuthenticated && (
              <PermissionHandler 
                onAllPermissionsGranted={handlePermissionsGranted} 
              />
            )}
          </SubtitlesContext.Provider>
        </UserProvider>
      </AuthenticatedTemplate>
      
      {/* Notifications are visible in both authenticated and unauthenticated states */}
      <Notifications />
    </>
  );
}

export default App;