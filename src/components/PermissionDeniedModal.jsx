import React from 'react';
import { X, Home, Brain, ArrowRight, ShieldX, Sparkles } from 'lucide-react';
import { useMsal } from '@azure/msal-react';

const PermissionDeniedModal = ({ isOpen, onClose }) => {
  const { instance } = useMsal();
  
  if (!isOpen) return null;

  // Función para limpiar sesión y cerrar modal
  const handleClose = async () => {
    try {
      await instance.clearCache();
      console.log('🧹 Sesión limpiada al cerrar modal de permisos');
    } catch (error) {
      console.warn('⚠️ Error al limpiar sesión:', error);
    }
    onClose();
  };

  // Función para ir al home y limpiar sesión
  const handleGoToHome = async () => {
    try {
      await instance.clearCache();
      console.log('🧹 Sesión limpiada antes de ir al home');
    } catch (error) {
      console.warn('⚠️ Error al limpiar sesión:', error);
    }
    onClose();
    // Navegar usando window.location para evitar problemas de contexto
    window.location.href = '/home';
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6 overflow-y-auto">
      {/* Subtle background overlay */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm"></div>
      
      {/* Modal container with glassmorphism - SMALLER SIZE */}
      <div className="relative bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl max-w-md w-full 
                     animate-[slideUp_0.5s_ease-out] overflow-hidden border border-white/20
                     shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)]">
        
        {/* Gradient border effect */}
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-blue-500/20 via-indigo-500/20 to-purple-500/20 p-[1px]">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl h-full w-full"></div>
        </div>
        
        {/* Floating close button */}
        <button 
          onClick={handleClose}
          className="absolute -top-3 -right-3 w-10 h-10 bg-white/90 hover:bg-white 
                     rounded-full shadow-lg hover:shadow-xl transition-all duration-300 
                     text-gray-500 hover:text-gray-700 z-20 backdrop-blur-sm
                     hover:scale-110 group border border-gray-100"
          aria-label="Cerrar"
        >
          <X size={18} className="group-hover:rotate-90 transition-transform duration-300" />
        </button>
        
        {/* Content */}
        <div className="relative p-8">
          {/* Animated icon with glow effect */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-red-500 rounded-2xl blur-lg opacity-30 animate-pulse"></div>
              <div className="relative w-16 h-16 bg-gradient-to-br from-orange-100 via-red-50 to-rose-100 
                             rounded-2xl flex items-center justify-center shadow-xl border border-white/40
                             hover:scale-105 transition-transform duration-300">
                <ShieldX className="text-gradient bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text" size={32} />
              </div>
            </div>
          </div>
          
          {/* Enhanced title with gradient text */}
          <div className="text-center mb-5">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-800 via-slate-700 to-gray-800 
                           bg-clip-text text-transparent mb-2 leading-tight">
              Acceso Restringido
            </h2>
            <div className="w-12 h-0.5 bg-gradient-to-r from-orange-400 to-red-500 mx-auto rounded-full"></div>
          </div>
          
          {/* Enhanced message with better typography */}
          <div className="text-center mb-6">
            <p className="text-gray-600 leading-relaxed font-light">
              Tu cuenta no tiene permisos para acceder a NAIA.
            </p>
            <p className="text-blue-600 mt-2 font-medium text-sm">
              Te invitamos a descubrir todo su potencial.
            </p>
          </div>
          
          {/* Enhanced features preview with glassmorphism */}
          <div className="bg-gradient-to-br from-blue-50/80 via-sky-50/60 to-indigo-50/80 
                         backdrop-blur-sm rounded-xl p-4 mb-6 border border-blue-100/50
                         shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]">
            <div className="flex items-center mb-3">
              <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg 
                             flex items-center justify-center mr-2 shadow-lg">
                <Brain className="text-white" size={14} />
              </div>
              <span className="font-semibold text-blue-800 text-sm">Capacidades de NAIA</span>
              <Sparkles className="text-blue-400 ml-2" size={14} />
            </div>
            <div className="grid grid-cols-1 gap-1.5">
              {[
                "Investigación académica con IA",
                "Análisis de documentos y PDFs",
                "Entrenamiento de habilidades",
                "Asistencia personal especializada"
              ].map((feature, index) => (
                <div key={index} className="flex items-center text-xs text-blue-700">
                  <div className="w-1 h-1 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full mr-2"></div>
                  {feature}
                </div>
              ))}
            </div>
          </div>
          
          {/* Enhanced action buttons with navy styling */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-5">
            <button
              onClick={handleGoToHome}
              className="group relative overflow-hidden bg-gradient-to-r from-blue-950 via-blue-900 to-blue-950 
                         hover:from-blue-900 hover:via-blue-800 hover:to-blue-900 text-white 
                         px-6 py-3 rounded-xl font-medium transition-all duration-300 
                         shadow-lg hover:shadow-xl hover:shadow-blue-950/30 
                         hover:scale-105 transform-gpu"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 
                             translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
              <div className="relative flex items-center justify-center gap-2">
                <Home size={16} />
                <span className="text-sm">Descubrir NAIA</span>
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform duration-300" />
              </div>
            </button>
            
            <button
              onClick={handleClose}
              className="px-6 py-3 text-gray-600 hover:text-gray-800 font-medium 
                         transition-all duration-300 rounded-xl hover:bg-gray-50/80
                         backdrop-blur-sm border border-gray-200/50 hover:border-gray-300/50
                         hover:shadow-md text-sm"
            >
              Cerrar sesión
            </button>
          </div>
          
          {/* Enhanced contact info */}
          <div className="pt-4 border-t border-gray-100/50">
            <p className="text-xs text-gray-400 text-center leading-relaxed">
              Si consideras que esto es un error, contacta al administrador.
              <br />
              <span className="text-blue-600 font-medium">soporte@uninorte.edu.co</span>
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
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default PermissionDeniedModal;