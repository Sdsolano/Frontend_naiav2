import React from 'react';
import { Link } from 'react-router-dom';
import { X, Home, Brain, ArrowRight, Shield } from 'lucide-react';

const PermissionDeniedModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 overflow-y-auto">
      {/* Background overlay */}
      <div className="fixed inset-0 bg-gradient-to-br from-blue-950/80 to-gray-900/90 backdrop-blur-lg"></div>
      
      {/* Modal container */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full 
                     animate-[fadeIn_0.3s_ease-out] overflow-hidden border border-blue-100">
        
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-red-500"></div>
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-orange-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-16 -left-16 w-40 h-40 bg-red-500/10 rounded-full blur-3xl"></div>
        
        {/* Close button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-all duration-200 text-gray-500 hover:text-gray-700 z-10"
          aria-label="Cerrar"
        >
          <X size={18} />
        </button>
        
        {/* Content */}
        <div className="relative p-8">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-100 to-red-100 rounded-full flex items-center justify-center">
              <Shield className="text-orange-600" size={32} />
            </div>
          </div>
          
          {/* Title */}
          <h2 className="text-2xl font-bold text-gray-800 text-center mb-4">
            Acceso No Autorizado
          </h2>
          
          {/* Message */}
          <p className="text-gray-600 text-center mb-6 leading-relaxed">
            Lamentablemente, tu cuenta no tiene los permisos necesarios para acceder a NAIA en este momento. 
            <br /><br />
            Sin embargo, te invitamos a conocer todo lo que NAIA es capaz de hacer.
          </p>
          
          {/* Features preview */}
          <div className="bg-gradient-to-br from-blue-50 to-sky-50 rounded-xl p-4 mb-6 border border-blue-100">
            <div className="flex items-center mb-3">
              <Brain className="text-blue-600 mr-2" size={20} />
              <span className="font-medium text-blue-800 text-sm">¿Qué puede hacer NAIA?</span>
            </div>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Investigación académica avanzada</li>
              <li>• Análisis de documentos y PDFs</li>
              <li>• Entrenamiento de habilidades personales</li>
              <li>• Asistencia personal inteligente</li>
              <li>• Y mucho más...</li>
            </ul>
          </div>
          
          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/home"
              onClick={onClose}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-xl font-medium transition-all shadow-lg hover:shadow-xl group"
            >
              <Home size={18} />
              Descubrir NAIA
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            
            <button
              onClick={onClose}
              className="px-6 py-3 text-gray-600 hover:text-gray-800 font-medium transition-colors"
            >
              Cerrar
            </button>
          </div>
          
          {/* Contact info */}
          <div className="mt-6 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-500 text-center">
              Si crees que esto es un error, contacta al administrador del sistema.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PermissionDeniedModal;