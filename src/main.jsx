// main.jsx - Versión con autenticación al inicio
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
import SmartChatProvider from "./components/SmartChatProvider";
import LoginModal from "./components/LoginModal";
import "./index.css";

// MSAL imports
import { PublicClientApplication } from "@azure/msal-browser";
import { MsalProvider } from "@azure/msal-react";
import { msalConfig } from "./authConfig";
import { UserProvider } from "./components/UserContext";
import ProtectedRouteWrapper from "./components/ProtectedRouteWrapper";
import GovHome from "./components/gov/GovHome";
import GovRoleSelection from "./components/gov/GovRoleSelection";
import HybridChatTest from "./components/HybridChatTest";

// Crear el root una sola vez
const root = ReactDOM.createRoot(document.getElementById("root"));

// Componente de loading mejorado
const LoadingScreen = ({ message = "Iniciando NAIA" }) => (
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
          width: '2rem', height: '2rem',
          background: 'linear-gradient(to bottom right, #172554, #1e3a8a)',
          borderRadius: '0.5rem',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontWeight: 'bold', fontSize: '0.875rem',
          marginRight: '0.75rem'
        }}>N</div>
        <span style={{
          fontSize: '1.5rem', fontWeight: '900',
          background: 'linear-gradient(to right, #172554, #0c4a6e)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>NAIA</span>
      </div>
      
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0.5rem 0 1.5rem'
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: '0.5rem'
        }}>
          {[0, 0.2, 0.4].map((delay, i) => (
            <div key={i} style={{
              width: '0.5rem', height: '0.5rem', borderRadius: '50%',
              backgroundColor: '#172554',
              animation: `loadingDot 1.5s infinite ease-in-out`,
              animationDelay: `${delay}s`
            }}></div>
          ))}
        </div>
      </div>
      
      <p style={{
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '0.9rem', color: '#64748b', margin: 0
      }}>{message}</p>
      
      <style>{`
        @keyframes loadingDot {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  </div>
);

// Inicialización con verificación de autenticación PRIMERO
const initializeApp = async () => {
  try {
    console.log("🔄 Inicializando MSAL...");
    
    // Mostrar loading inicial
    root.render(<LoadingScreen message="Configurando autenticación..." />);
    
    const msalInstance = new PublicClientApplication(msalConfig);
    
    // CRÍTICO: Esperar inicialización completa
    await msalInstance.initialize();
    
    // CRÍTICO: Manejar redirect ANTES de renderizar la app
    console.log("🔄 Procesando resultados de autenticación...");
    root.render(<LoadingScreen message="Verificando sesión..." />);
    
    try {
      const redirectResult = await msalInstance.handleRedirectPromise();
      
      if (redirectResult) {
        console.log("✅ Autenticación por redirect exitosa:", redirectResult.account?.name);
        
        // Establecer cuenta activa inmediatamente
        if (redirectResult.account) {
          msalInstance.setActiveAccount(redirectResult.account);
        }
      } else {
        console.log("ℹ️ No hay resultado de redirect - verificando sesión existente...");
        
        // Verificar si hay cuentas existentes
        const accounts = msalInstance.getAllAccounts();
        if (accounts.length > 0) {
          console.log("🔑 Sesión existente encontrada:", accounts[0].name);
          msalInstance.setActiveAccount(accounts[0]);
          
          // Verificar que la sesión sigue válida
          try {
            await msalInstance.acquireTokenSilent({
              scopes: ["User.Read"],
              account: accounts[0]
            });
            console.log("✅ Sesión válida confirmada");
          } catch (silentError) {
            console.warn("⚠️ Sesión existente no válida:", silentError);
            // Limpiar cuenta inválida
            await msalInstance.clearCache();
          }
        }
      }
    } catch (error) {
      console.error("❌ Error procesando autenticación:", error);
      
      // Si hay errores de autenticación, limpiar y continuar
      if (error.message?.includes("AADSTS")) {
        console.log("🧹 Limpiando datos de autenticación por error AADSTS");
        await msalInstance.clearCache();
      }
    }
    
    // AHORA renderizar la aplicación completa
    console.log("🚀 Renderizando aplicación principal...");
    root.render(<LoadingScreen message="Cargando aplicación..." />);
    
    // Pequeño delay para smooth transition
    setTimeout(() => {
      root.render(
        <React.StrictMode>
          <MsalProvider instance={msalInstance}>
            <NotificationProvider>
              <UserProvider>
              <SmartChatProvider>
                <AuthProvider>
                  <BrowserRouter>
                    <Routes>
                      <Route path="/" element={<Layout />}>
                        <Route index element={<Home />} />

                        <Route path="documents" element={
                          <ProtectedRouteWrapper>
                            <Documents />
                          </ProtectedRouteWrapper>
                        } />
                        <Route path="naia" element={<RoleSelection />} />
                        <Route path="naia/interface" element={
                          <ProtectedRouteWrapper>
                            <App />
                          </ProtectedRouteWrapper>
                        } />
                        <Route path="naia/test" element={
                          <ProtectedRouteWrapper>
                            <HybridChatTest />
                          </ProtectedRouteWrapper>
                        } />
                        <Route path="*" element={<Navigate to="/" replace />} />
                      </Route>
                      <Route path="/gov" element={<GovHome />} />
                      <Route path="/gov/naia" element={ <GovRoleSelection />} />
                      <Route path="/gov/naia/interface" element={<App />} />
                    </Routes>
                    <LoginModal />
                  </BrowserRouter>
                </AuthProvider>
              </SmartChatProvider>
              </UserProvider>
            </NotificationProvider>
          </MsalProvider>
        </React.StrictMode>
      );
    }, 300);
    
  } catch (error) {
    console.error("❌ Error fatal en inicialización:", error);
    
    // Mostrar error y opción de reload
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
            Error al inicializar
          </h2>
          <p style={{marginBottom: '16px'}}>
            Hubo un problema al inicializar NAIA. 
          </p>
          <button 
            onClick={() => {
              // Limpiar todo y recargar
              localStorage.clear();
              sessionStorage.clear();
              window.location.reload();
            }}
            style={{
              background: '#2196f3', color: 'white', border: 'none',
              padding: '8px 16px', borderRadius: '4px', cursor: 'pointer'
            }}
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }
};

// Iniciar la aplicación con el nuevo flujo
initializeApp();