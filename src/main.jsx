import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import App from "./App";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Documents from "./pages/Documents";
import RoleSelection from "./components/RoleSelection";
import { NotificationProvider } from "./components/NotificationContext";
import { ChatProvider } from "./hooks/useChat";
import { AuthProvider } from "./components/AuthContext";
import LoginModal from "./components/LoginModal";
import "./index.css";

// MSAL imports
import { PublicClientApplication } from "@azure/msal-browser";
import { MsalProvider } from "@azure/msal-react";
import { msalConfig } from "./authConfig";



// Crear el root una sola vez
const root = ReactDOM.createRoot(document.getElementById("root"));

// Mostrar loader mientras se inicializa
root.render(
  <div style={{
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'linear-gradient(145deg, #f8fafc, #f1f5f9)'
  }}>
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', 
      background: 'white',
      padding: '2rem',
      borderRadius: '1rem',
      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05), 0 8px 10px -6px rgba(0,0,0,0.02)'
    }}>
      <div style={{
        marginBottom: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          width: '2rem',
          height: '2rem',
          background: 'linear-gradient(to bottom right, #172554, #1e3a8a)',
          borderRadius: '0.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: 'bold',
          fontSize: '0.875rem',
          marginRight: '0.75rem'
        }}>N</div>
        <span style={{
          fontSize: '1.5rem',
          fontWeight: '900',
          background: 'linear-gradient(to right, #172554, #0c4a6e)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>NAIA</span>
      </div>
      
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0.5rem 0 1.5rem'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem'
        }}>
          <div style={{
            width: '0.5rem',
            height: '0.5rem',
            borderRadius: '50%',
            backgroundColor: '#172554',
            animation: 'loadingDot 1.5s infinite ease-in-out',
            animationDelay: '0s'
          }}></div>
          <div style={{
            width: '0.5rem',
            height: '0.5rem',
            borderRadius: '50%',
            backgroundColor: '#172554',
            animation: 'loadingDot 1.5s infinite ease-in-out',
            animationDelay: '0.2s'
          }}></div>
          <div style={{
            width: '0.5rem',
            height: '0.5rem',
            borderRadius: '50%',
            backgroundColor: '#172554',
            animation: 'loadingDot 1.5s infinite ease-in-out',
            animationDelay: '0.4s'
          }}></div>
        </div>
      </div>
      
      <p style={{
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '0.9rem', 
        color: '#64748b',
        margin: 0
      }}>Iniciando NAIA</p>
      
      <style>{`
        @keyframes loadingDot {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  </div>
);

// Inicialización asíncrona
const initializeApp = async () => {
  try {
    console.log("Inicializando MSAL...");
    const msalInstance = new PublicClientApplication(msalConfig);
    
    // IMPORTANTE: Esperar a que MSAL se inicialice completamente
    await msalInstance.initialize();
      try {
    console.log("✅ MSAL inicializado correctamente, intentando autenticación silenciosa");
    const accounts = msalInstance.getAllAccounts();
    
    if (accounts.length > 0) {
      console.log("🔑 Cuenta encontrada, estableciendo cuenta activa", accounts[0].username);
      msalInstance.setActiveAccount(accounts[0]);
      
      // Intenta adquirir token silenciosamente
      const silentRequest = {
        scopes: ["User.Read", "profile", "openid", "email"],
        account: accounts[0]
      };
      
      await msalInstance.acquireTokenSilent(silentRequest)
        .then(response => {
          console.log("🎉 Autenticación silenciosa exitosa");
        })
        .catch(error => {
          console.warn("⚠️ No se pudo hacer autenticación silenciosa:", error);
        });
    }
  } catch (e) {
    console.warn("⚠️ Error durante la verificación de autenticación silenciosa:", e);
  }
    
    // Establecer cuenta activa si existe
    const accounts = msalInstance.getAllAccounts();
    if (accounts.length > 0) {
      msalInstance.setActiveAccount(accounts[0]);
    }
    
    // Renderizar la aplicación
    root.render(
      <React.StrictMode>
        <MsalProvider instance={msalInstance}>
          <NotificationProvider>
            <ChatProvider>
              <AuthProvider>
                <BrowserRouter>
                  <Routes>
                    <Route path="/" element={<Layout />}>
                      <Route index element={<Home />} />
                      <Route path="documents" element={<Documents />} />
                      <Route path="naia" element={<RoleSelection />} />
                      <Route path="naia/interface" element={<App />} />
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Route>
                  </Routes>
                  <LoginModal />
                </BrowserRouter>
              </AuthProvider>
            </ChatProvider>
          </NotificationProvider>
        </MsalProvider>
      </React.StrictMode>
    );
  } catch (error) {
    console.error("Error al inicializar la aplicación:", error);
    
    // Si hay error en la inicialización, limpiar el almacenamiento y recargar
    try {
      console.log("Limpiando almacenamiento por error de inicialización...");
      
      // Limpiar localStorage y sessionStorage
      const storageTypes = [localStorage, sessionStorage];
      
      storageTypes.forEach(storage => {
        const keysToRemove = [];
        
        for (let i = 0; i < storage.length; i++) {
          const key = storage.key(i);
          if (key && (
              key.startsWith('msal.') || 
              key.includes('login') || 
              key.includes('microsoft') ||
              key.includes('auth')
          )) {
            keysToRemove.push(key);
          }
        }
        
        keysToRemove.forEach(key => {
          console.log(`Eliminando: ${key}`);
          storage.removeItem(key);
        });
      });
      
      // Mostrar mensaje de error
      root.render(
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'white', padding: '20px'
        }}>
          <div style={{
            maxWidth: '500px', textAlign: 'center', background: '#fff', 
            padding: '20px', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{color: '#d32f2f', marginBottom: '16px'}}>
              Error al inicializar la aplicación
            </h2>
            <p style={{marginBottom: '16px'}}>
              Hubo un problema al iniciar sesión. Se han limpiado los datos de sesión.
            </p>
            <button 
              onClick={() => window.location.reload()}
              style={{
                background: '#2196f3', color: 'white', border: 'none',
                padding: '8px 16px', borderRadius: '4px', cursor: 'pointer'
              }}
            >
              Recargar página
            </button>
          </div>
        </div>
      );
    } catch (cleanupError) {
      console.error("Error al limpiar almacenamiento:", cleanupError);
      
      // Recargar de todos modos
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    }
  }
};

// Iniciar la aplicación
initializeApp();