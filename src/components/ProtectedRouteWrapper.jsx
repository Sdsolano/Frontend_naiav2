// ProtectedRouteWrapper.jsx - Versión corregida
import React, { useState, useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { useUser } from './UserContext';
import { useMsal } from '@azure/msal-react';
import { X, Shield, Clock } from 'lucide-react';

const ProtectedRouteWrapper = ({ children }) => {
  const { 
    isAuthenticated, 
    userId, 
    userSetupFailed, 
    lastFailureReason,
    isLoadingUserId
  } = useUser();
  const { accounts } = useMsal();
  
  const [showTempModal, setShowTempModal] = useState(false);
  
  // 🚨 SOLO REF PARA EVITAR MÚLTIPLES ACTIVACIONES
  const modalActivatedRef = useRef(false);

  // 🚨 DETECTAR FALTA DE PERMISOS de forma más estable
  const hasPermissionError = userSetupFailed && lastFailureReason?.includes('Sin permisos');

  // 🚨 ACTIVAR MODAL UNA SOLA VEZ - ESTE HOOK DEBE EJECUTARSE SIEMPRE
  useEffect(() => {
    if (hasPermissionError && !modalActivatedRef.current) {
      console.log('🚫 Activando modal de permisos denegados (SIN TIMERS)');
      modalActivatedRef.current = true;
      setShowTempModal(true);
    }
  }, [hasPermissionError]);

  // Si no está autenticado con Microsoft, redirigir al login
  if (!isAuthenticated || accounts.length === 0) {
    return <Navigate to="/login" replace />;
  }

  // Si está cargando el usuario, mostrar loading
  if (isLoadingUserId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-sky-50">
        <div className="bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600">Verificando permisos...</p>
        </div>
      </div>
    );
  }

  // Si hay error general de configuración (no de permisos), mostrar mensaje
  if (userSetupFailed && !hasPermissionError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-red-50 to-orange-50">
        <div className="bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Error de configuración</h2>
          <p className="text-gray-600 mb-4 text-center">{lastFailureReason}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Intentar de nuevo
          </button>
        </div>
      </div>
    );
  }

  // Modal temporal para permisos denegados
  const TempPermissionModal = () => {
    // 🚨 ESTADO LOCAL DEL MODAL - NO AFECTA EL COMPONENTE PADRE
    const [localCountdown, setLocalCountdown] = React.useState(4);
    
    // 🚨 TODO EL TIMER DENTRO DEL MODAL
    React.useEffect(() => {
      console.log('🚀 Modal iniciado, comenzando countdown y redirección');
      
      // Timer para redirección (independiente del countdown visual)
      const redirectTimer = setTimeout(() => {
        console.log('🏠 Redirigiendo a home (window.location)');
        window.location.href = '/home';
      }, 4000);
      
      // Timer para countdown visual (independiente de la redirección)
      const countdownTimer = setInterval(() => {
        setLocalCountdown(prev => {
          const newCount = prev - 1;
          console.log(`⏰ Countdown modal: ${newCount}`);
          if (newCount <= 0) {
            clearInterval(countdownTimer);
          }
          return newCount;
        });
      }, 1000);
      
      // Cleanup cuando el modal se desmonte
      return () => {
        console.log('🧹 Limpiando timers del modal');
        clearTimeout(redirectTimer);
        clearInterval(countdownTimer);
      };
    }, []); // Sin dependencias - solo se ejecuta una vez
    
    // 🚨 FUNCIÓN PARA REDIRECCIÓN MANUAL
    const handleManualRedirect = () => {
      console.log('👆 Redirección manual activada');
      window.location.href = '/home';
    };

    return (
      <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6 overflow-y-auto">
        {/* Background overlay */}
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm"></div>
        
        {/* Modal container */}
        <div className="relative bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl max-w-md w-full 
                       animate-[slideUp_0.5s_ease-out] overflow-hidden border border-white/20
                       shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)]">
          
          {/* Gradient border effect */}
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-blue-500/20 via-indigo-500/20 to-purple-500/20 p-[1px]">
            <div className="bg-white/95 backdrop-blur-xl rounded-3xl h-full w-full"></div>
          </div>
          
          {/* Content */}
          <div className="relative p-8">
            {/* Icon with countdown */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-2xl blur-lg opacity-30 animate-pulse"></div>
                <div className="relative w-16 h-16 bg-gradient-to-br from-blue-100 via-indigo-50 to-blue-100 
                               rounded-2xl flex items-center justify-center shadow-xl border border-white/40">
                  <Shield className="text-blue-600" size={32} />
                </div>
                
              </div>
            </div>
            
            {/* Title */}
            <div className="text-center mb-5">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-800 via-slate-700 to-gray-800 
                             bg-clip-text text-transparent mb-2 leading-tight">
                Acceso Restringido
              </h2>
              <div className="w-12 h-0.5 bg-gradient-to-r from-blue-400 to-indigo-500 mx-auto rounded-full"></div>
            </div>
            
            {/* Message */}
            <div className="text-center mb-6">
              <p className="text-gray-700 leading-relaxed font-medium mb-3">
                Inicie sesión con una cuenta con permisos para poder acceder a todas las capacidades de NAIA.
              </p>
              <div className="flex items-center justify-center text-sm text-blue-600 mb-4">
                <Clock size={16} className="mr-2" />
                <span>Redirigiendo al inicio...</span>
              </div>
              
              {/* 🚨 BOTÓN MANUAL DE REDIRECCIÓN */}
              <button
                onClick={handleManualRedirect}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 
                          text-white px-6 py-2 rounded-lg transition-all duration-300 transform hover:scale-105 
                          shadow-lg hover:shadow-xl font-medium"
              >
                Ir al inicio ahora
              </button>
            </div>
            
            {/* Quick access message */}
            <div className="bg-gradient-to-br from-blue-50/80 via-sky-50/60 to-indigo-50/80 
                           backdrop-blur-sm rounded-xl p-4 border border-blue-100/50">
              <p className="text-sm text-blue-700 text-center">
                Mientras tanto, puedes explorar las capacidades de NAIA en nuestra página principal.
              </p>
            </div>
          </div>
        </div>

        <style jsx>{`
          @keyframes slideUp {
            from {
              opacity: 0;
              transform: translateY(30px) scale(0.95);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }
        `}</style>
      </div>
    );
  };

  // 🚨 MOSTRAR MODAL SI HAY ERROR DE PERMISOS (ANTES de verificar userId)
  if (hasPermissionError && showTempModal) {
    console.log('📱 Mostrando modal temporal de permisos');
    return <TempPermissionModal />;
  }

  // 🚨 SOLO DESPUÉS de verificar permisos, verificar userId
  // Si no tiene userId válido Y no hay error de permisos, redirigir al home
  if (!userId && !hasPermissionError) {
    console.log('🔄 Sin userId válido, redirigiendo al home');
    return <Navigate to="/home" replace />;
  }

  // Si todo está bien, mostrar el contenido protegido
  console.log('✅ Acceso autorizado, mostrando contenido protegido');
  return children;
};

export default ProtectedRouteWrapper;
