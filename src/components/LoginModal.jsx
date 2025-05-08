// LoginModal.jsx - Rediseñado para ser más moderno y atractivo
import React, { useState, useEffect } from 'react';
import { X, RefreshCw, LogIn } from 'lucide-react';
import Uninorte_logo from '../assets/Uninorte_logo.png';
import { useAuth } from './AuthContext';
import { InteractionStatus } from '@azure/msal-browser';

const LoginModal = () => {
  const { isLoginModalOpen, closeLoginModal, handleLogin, isLoggingIn, inProgress, clearAllAuthData } = useAuth();
  const [showResetOption, setShowResetOption] = useState(false);
  
  // Detectar cuando parece que estamos atascados
  useEffect(() => {
    let timeoutId;
    
    if (isLoggingIn) {
      // Mostrar opción de reinicio después de 5 segundos
      timeoutId = setTimeout(() => {
        setShowResetOption(true);
      }, 5000);
    } else {
      setShowResetOption(false);
    }
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isLoggingIn]);

  if (!isLoginModalOpen) return null;

  // Función para reinicio completo
  const handleCompleteReset = () => {
    console.log("Ejecutando reinicio forzado de sesión");
    
    // Mostrar overlay elegante de "Reiniciando"
    const resetMessage = document.createElement('div');
    resetMessage.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(255,255,255,0.95);display:flex;align-items:center;justify-center;z-index:9999;flex-direction:column;font-family:system-ui;';
    resetMessage.innerHTML = `
      <div class="reset-container">
        <h3>Reiniciando sesión</h3>
        <p>Limpiando datos de autenticación</p>
        <div class="loader-dots">
          <div></div><div></div><div></div>
        </div>
      </div>
      <style>
        .reset-container {
          background: linear-gradient(145deg, #ffffff, #f5f7fa);
          padding: 2rem;
          border-radius: 1rem;
          box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05), 0 8px 10px -6px rgba(0,0,0,0.02);
          text-align: center;
          max-width: 400px;
        }
        .reset-container h3 {
          margin-top: 0;
          color: #172554;
          font-size: 1.5rem;
          font-weight: 700;
        }
        .reset-container p {
          margin-bottom: 1.5rem;
          color: #64748b;
        }
        .loader-dots {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 0.5rem;
        }
        .loader-dots div {
          width: 0.5rem;
          height: 0.5rem;
          border-radius: 50%;
          background-color: #172554;
          animation: fade 1.5s infinite ease-in-out;
        }
        .loader-dots div:nth-child(2) {
          animation-delay: 0.2s;
        }
        .loader-dots div:nth-child(3) {
          animation-delay: 0.4s;
        }
        @keyframes fade {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      </style>
    `;
    document.body.appendChild(resetMessage);
    
    // Llamar a la función de limpieza
    if (typeof clearAllAuthData === 'function') {
      clearAllAuthData();
    }
    
    // Recargar con parámetro para forzar recarga completa
    setTimeout(() => {
      window.location.href = window.location.origin + '?nocache=' + Date.now();
    }, 1500);
  };

  // Verificar si hay un login en progreso
  const isLoginInProgress = isLoggingIn || inProgress !== InteractionStatus.None;

  return (
    <div className="fixed inset-0 z-[1500] flex items-center justify-center p-4 overflow-y-auto">
      {/* Background overlay con efecto de blur y gradiente */}
      <div className="fixed inset-0 bg-gradient-to-br from-blue-950/70 to-gray-900/80 backdrop-blur-lg"></div>
      
      {/* Modal container con animación */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full 
                     animate-[fadeIn_0.3s_ease-out] overflow-hidden border border-blue-100">
        {/* Elementos de diseño decorativos */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-blue-800"></div>
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-16 -left-16 w-40 h-40 bg-blue-800/10 rounded-full blur-3xl"></div>
        
        {/* Botón de cerrar */}
        <button 
          onClick={closeLoginModal}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-all duration-200 text-gray-500 hover:text-gray-700 z-10"
          aria-label="Cerrar"
        >
          <X size={18} />
        </button>
        
        <div className="p-8 sm:p-10">
          <div className="text-center mb-8">
            <img src={Uninorte_logo} alt="Logo Universidad del Norte" className="w-auto h-14 mx-auto mb-6" />
            <div className="inline-flex items-center justify-center mb-2">
              <div className="w-7 h-7 bg-gradient-to-br from-blue-800 to-blue-950 rounded-lg flex items-center justify-center text-white mr-2.5">
                <span className="font-bold text-xs">N</span>
              </div>
              <h1 className="text-2xl font-black bg-gradient-to-r from-blue-950 to-sky-900 bg-clip-text text-transparent">
                NAIA
              </h1>
            </div>
            <p className="text-gray-600 text-sm max-w-xs mx-auto">
              Tu asistente virtual de la Universidad del Norte
            </p>
          </div>
          
          <div className="space-y-6">
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
              <p className="text-sm text-blue-800 font-medium text-center">
                Inicia sesión con tu cuenta institucional para acceder a todas las funcionalidades
              </p>
            </div>
            
            <button
              onClick={handleLogin}
              disabled={isLoginInProgress}
              className={`w-full relative group overflow-hidden bg-gradient-to-r from-blue-950 to-blue-900 text-white font-semibold py-3.5 px-4 rounded-xl transition-all duration-200 flex items-center justify-center 
                ${isLoginInProgress ? 'opacity-90 cursor-not-allowed' : 'hover:shadow-md hover:translate-y-[-1px]'}`}
            >
              {/* Overlay de iluminación en hover */}
              <span className="absolute inset-0 w-full h-full bg-gradient-to-tr from-white/0 to-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></span>
              
              {isLoginInProgress ? (
                <>
                  {/* Loader personalizado */}
                  <div className="flex items-center">
                    <div className="loader-pulse mr-3">
                      <span className="h-5 w-5 block rounded-full border-4 border-t-white border-r-transparent border-b-transparent border-l-transparent animate-spin"></span>
                    </div>
                    <span>Iniciando sesión...</span>
                  </div>
                </>
              ) : (
                <>
                  <svg width="20" height="20" className="mr-2.5" viewBox="0 0 1024 1024" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M44.522 44.5217H489.739V489.739H44.522V44.5217Z" fill="#F35325"/>
                    <path d="M534.261 44.5217H979.478V489.739H534.261V44.5217Z" fill="#81BC06"/>
                    <path d="M44.522 534.261H489.739V979.478H44.522V534.261Z" fill="#05A6F0"/>
                    <path d="M534.261 534.261H979.478V979.478H534.261V534.261Z" fill="#FFBA08"/>
                  </svg>
                  <span className="relative z-10">Iniciar sesión con Microsoft</span>
                </>
              )}
            </button>
          </div>
          
          {/* Opción de reinicio cuando parece que hay problemas */}
          {showResetOption && (
            <div className="mt-6 p-4 bg-amber-50 rounded-xl border border-amber-200 animate-[fadeIn_0.3s_ease-out]">
              <div className="flex items-start">
                <div className="flex-shrink-0 w-7 h-7 bg-amber-100 rounded-full flex items-center justify-center text-amber-700 mr-3 mt-0.5">
                  <RefreshCw size={14} />
                </div>
                <div>
                  <p className="text-sm text-amber-800 mb-3">
                    El inicio de sesión está tardando más de lo esperado. Puede haber un problema con los datos de autenticación almacenados.
                  </p>
                  <button
                    onClick={handleCompleteReset}
                    className="w-full flex items-center justify-center bg-amber-100 hover:bg-amber-200 text-amber-800 font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    <RefreshCw size={14} className="mr-2" />
                    Reiniciar completamente
                  </button>
                </div>
              </div>
            </div>
          )}
          
          <div className="mt-8 flex items-center justify-center">
            <LogIn size={14} className="text-gray-400 mr-2" />
            <p className="text-xs text-gray-500">
              Solo para usuarios de la Universidad del Norte
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;