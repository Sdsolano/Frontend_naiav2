import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { X, Play, BookOpen, Building, UserCheck, User, GraduationCap, Heart, Sparkles, ArrowRight, Star, Zap } from 'lucide-react';

// Importar las imágenes reales
import Research_AF from "../assets/Research_AF.jpeg";
import Receptionist_AF from "../assets/Receptionist_AF.jpeg";
import Personal_Trainer_AF from "../assets/Personal_Trainer_AF.jpeg";
import Personal_Assistant_AF from "../assets/Personal_Assistant_AF.jpeg";
import University_Guide_AF from "../assets/University_guide_AF.jpeg";
import Companion_AF from "../assets/Companion_AF.png";

export const DemoModal = ({ isOpen, onClose }) => {
  const [selectedRole, setSelectedRole] = useState(0);

  const roles = [
    {
      id: 'investigador',
      title: "Investigador",
      subtitle: "IA Académica",
      icon: BookOpen,
      gradient: "from-blue-500 via-blue-600 to-blue-700",
      glowColor: "blue",
      videoId: "nrsWbBu5A1o",
      description: "Investigar y analizar información académica con herramientas avanzadas de IA",
      image: Research_AF,
      features: ["Análisis de documentos PDF", "Búsqueda académica especializada", "Generación de reportes", "Extracción de datos complejos"]
    },
    {
      id: 'recepcionista',
      title: "Recepcionista",
      subtitle: "Gestión Inteligente",
      icon: Building,
      gradient: "from-emerald-500 via-emerald-600 to-emerald-700",
      glowColor: "emerald",
      videoId: "DuFYj4f6IZI",
      description: "Gestionar citas, visitantes e información con eficiencia profesional",
      image: Receptionist_AF,
      features: ["Gestión inteligente de citas", "Atención personalizada", "Organización de espacios", "Notificaciones automáticas"]
    },
    {
      id: 'entrenador',
      title: "Entrenador",
      subtitle: "Desarrollo Profesional",
      icon: UserCheck,
      gradient: "from-amber-500 via-amber-600 to-amber-700",
      glowColor: "amber",
      videoId: "Nzj7shoQ2yc",
      description: "Desarrollar habilidades personales y profesionales mediante práctica interactiva",
      image: Personal_Trainer_AF,
      features: ["Simulaciones realistas", "Análisis en tiempo real", "Retroalimentación personalizada", "Seguimiento de progreso"]
    },
    {
      id: 'asistente',
      title: "Asistente Personal",
      subtitle: "Productividad Máxima",
      icon: User,
      gradient: "from-purple-500 via-purple-600 to-purple-700",
      glowColor: "purple",
      videoId: "vtfdh6ybldg",
      description: "Optimizar tu productividad diaria con asistencia inteligente personalizada",
      image: Personal_Assistant_AF,
      features: ["Gestión inteligente de tareas", "Sincronización de calendario", "Recordatorios contextuales", "Automatización de rutinas"]
    },
    {
      id: 'guia',
      title: "Guía Universitario",
      subtitle: "Navegación Académica",
      icon: GraduationCap,
      gradient: "from-red-500 via-red-600 to-red-700",
      glowColor: "red",
      videoId: "kHx9tLwAMwM",
      description: "Navegar eficientemente la vida académica y acceder a recursos universitarios",
      image: University_Guide_AF,
      features: ["Información académica actualizada", "Acceso a recursos", "Orientación estudiantil", "Calendario académico"]
    },
    
    {
      id: 'bienestar',
      title: "Compañero",
      subtitle: "Bienestar Mental",
      icon: Heart,
      gradient: "from-pink-500 via-pink-600 to-pink-700",
      glowColor: "pink",
      videoId: "vHG36nh-3Mc",
      description: "Acompañamiento emocional y seguimiento de bienestar mental personalizado",
      image: Companion_AF,
      features: ["Apoyo emocional 24/7", "Técnicas de relajación", "Seguimiento de estado", "Recursos de bienestar"]
    }
  ];

  if (!isOpen) return null;

  const currentRole = roles[selectedRole];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      {/* Backdrop completamente transparente */}
      <div 
        className="absolute inset-0"
        onClick={onClose}
      />
      
      {/* Modal Container - Responsive */}
      <div className="relative w-full max-w-6xl h-[95vh] sm:h-[85vh] bg-white rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header compacto con navegación horizontal */}
        <div className="relative bg-gradient-to-br from-blue-950 via-slate-800 to-blue-900 text-white flex-shrink-0">
          {/* Efectos de fondo */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.1),transparent_50%)]"></div>
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-blue-500/20 to-transparent rounded-full blur-3xl"></div>
          
          <div className="relative px-2 sm:px-4 pt-4 sm:pt-4 pb-2 sm:pb-4">
            {/* Top bar compacto con close */}
            <div className="flex items-center justify-end mb-3 sm:mb-6">              
              <button
                onClick={onClose}
                className="w-7 h-7 sm:w-8 sm:h-8 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center transition-all duration-300 group"
              >
                <X className="w-3 h-3 sm:w-4 sm:h-4 group-hover:rotate-90 transition-transform duration-300" />
              </button>
            </div>

            {/* Navegación horizontal de roles - Responsive */}
            <div className="flex justify-start sm:justify-center overflow-x-auto pb-2 sm:pb-4 scrollbar-hide">
              <div className="flex gap-2 sm:gap-3 min-w-max px-2 sm:px-0">
                {roles.map((role, index) => (
                <button
                  key={role.id}
                  onClick={() => setSelectedRole(index)}
                  className={`p-1 flex-shrink-0 group relative transition-all duration-300 ${
                    selectedRole === index ? 'scale-105' : 'hover:scale-102'
                  }`}
                >
                  {/* Card del rol - Tamaños responsive */}
                  <div className={`relative w-20 h-14 sm:w-32 sm:h-20 rounded-xl sm:rounded-2xl overflow-hidden transition-all duration-300 ${
                    selectedRole === index 
                      ? 'ring-2 ring-white shadow-2xl' 
                      : 'hover:shadow-xl'
                  }`}>
                    
                    {/* Imagen de fondo */}
                    <img 
                      src={role.image} 
                      alt={role.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    
                    {/* Overlay con gradiente */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${role.gradient} ${
                      selectedRole === index ? 'opacity-70' : 'opacity-80'
                    } transition-opacity duration-300`} />
                    
                    {/* Contenido */}
                    <div className="absolute inset-0 p-1 sm:p-3 flex flex-col justify-center items-center text-center text-white">
                      <role.icon className="w-3 h-3 sm:w-5 sm:h-5 mb-0 sm:mb-1" />
                      <span className="text-xs sm:text-sm font-medium leading-tight hidden sm:block">{role.title}</span>
                      <span className="text-xs sm:text-xs opacity-80 hidden sm:block">{role.subtitle}</span>
                      {/* Solo título en mobile */}
                      <span className="text-[10px] font-medium leading-tight block sm:hidden">{role.title}</span>
                    </div>
                    
                    {/* Indicador activo */}
                    {selectedRole === index && (
                      <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 sm:w-3 sm:h-3 bg-white rounded-full animate-pulse shadow-lg" />
                    )}
                  </div>
                </button>
              ))}
              </div>
            </div>
          </div>
        </div>

        {/* Contenido principal - Layout responsive */}
        <div className="flex-1 flex flex-col lg:flex-row bg-gradient-to-br from-slate-50 to-slate-100 overflow-hidden">
          
          {/* Video Section - Responsive */}
          <div className="w-full lg:flex-[2] h-48 sm:h-64 lg:h-full relative bg-black flex-shrink-0">
            {/* Video Player */}
            <iframe
              src={`https://www.youtube.com/embed/${currentRole.videoId}?autoplay=1&rel=0&modestbranding=1&controls=1`}
              title={`Demostración ${currentRole.title}`}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
            />
            
            {/* Video Info Overlay - Responsive */}
            <div className="absolute top-2 left-2 sm:top-4 sm:left-4 bg-black/70 backdrop-blur-md rounded-lg sm:rounded-xl p-2 sm:p-3 text-white">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className={`w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r ${currentRole.gradient} rounded-md sm:rounded-lg flex items-center justify-center`}>
                  <currentRole.icon className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-xs sm:text-sm">{currentRole.title}</h3>
                  <p className="text-[10px] sm:text-xs text-white/70">{currentRole.subtitle}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Details Section - Scrolleable en mobile */}
          <div className="flex-1 lg:flex-1 overflow-y-auto">
            <div className="p-4 sm:p-6 h-full flex flex-col">
              
              {/* Información del rol */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r ${currentRole.gradient} rounded-xl sm:rounded-2xl flex items-center justify-center`}>
                    <currentRole.icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-slate-800">{currentRole.title}</h3>
                    <p className="text-xs sm:text-sm text-slate-500">{currentRole.subtitle}</p>
                  </div>
                </div>
                
                <p className="text-sm sm:text-base text-slate-600 leading-relaxed mb-4 sm:mb-6">{currentRole.description}</p>

                {/* Features */}
                <div className="space-y-3 mb-6">
                  <h4 className="font-semibold text-slate-800 flex items-center gap-2 text-sm sm:text-base">
                    <Zap className="w-4 h-4" />
                    Características principales
                  </h4>
                  <div className="grid grid-cols-1 gap-2">
                    {currentRole.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-2 sm:p-3 bg-white rounded-lg sm:rounded-xl border border-slate-200 hover:shadow-sm transition-shadow">
                        <div className={`w-2 h-2 bg-gradient-to-r ${currentRole.gradient} rounded-full flex-shrink-0`} />
                        <span className="text-xs sm:text-sm text-slate-700">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* CTA funcional - Sticky en mobile */}
              <div className="flex-shrink-0 pt-4 border-t border-slate-200 lg:border-t-0 lg:pt-0">
                <Link 
                  to="/naia" 
                  className={`w-full bg-gradient-to-r ${currentRole.gradient} text-white px-4 sm:px-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-semibold flex items-center justify-center gap-2 sm:gap-3 hover:shadow-xl transition-all duration-300 group text-decoration-none text-sm sm:text-base`}
                >
                  <Play className="w-4 h-4 sm:w-5 sm:h-5" />
                  Probar {currentRole.title}
                  <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform duration-300" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CSS para ocultar scrollbar */}
      <style jsx>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
};