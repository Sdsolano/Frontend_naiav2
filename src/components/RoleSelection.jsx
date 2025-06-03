import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  BookOpen, Building, UserCheck, User, GraduationCap,
  ArrowRight, Info, AlertTriangle, ChevronLeft, ChevronRight, X
} from "lucide-react";
import Thinking_naia from "../assets/NAIA_greeting.png";
import Personal_Assistant_AF from "../assets/Personal_Assistant_AF.jpeg";
import Personal_Trainer_AF from "../assets/Personal_Trainer_AF.jpeg";
import Research_AF from "../assets/Research_AF.jpeg";
import Receptionist_AF from "../assets/Receptionist_AF.jpeg";
import University_Guide_AF from "../assets/University_guide_AF.jpeg";
import { useAuth } from './AuthContext';
import { isRoleAvailable, ROLE_NAMES } from '../utils/roleUtils';


// Roles data - utilizando correctamente las imágenes importadas
const roles = [
  {
    id: "researcher",
    icon: BookOpen,
    title: "Investigador",
    description: "Investiga y analiza información de diversas fuentes académicas y científicas.",
    color: "bg-blue-950",
    textColor: "text-blue-950",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    available: true, // ← Completamente implementado
    image: Research_AF,
    features: [
      "Leer y extraer información de PDFs (hasta 1GB)",
      "Buscar artículos científicos con Google Scholar",
      "Proporcionar fragmentos de texto copiables",
      "Generar textos extendidos sobre archivos PDF",
      "Búsqueda web de cualquier información",
      "Generación de gráficas a partir de datos complejos"
    ]
  },
  {
    id: "receptionist",
    icon: Building,
    title: "Recepcionista",
    description: "Gestiona citas, visitantes y espacios comunes con facilidad.",
    color: "bg-emerald-600",
    textColor: "text-emerald-600",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
    available: isRoleAvailable('receptionist'), // ← Verificación dinámica
    image: Receptionist_AF,
    features: [
      "Notificar a residentes vía WhatsApp sobre visitantes",
      "Enviar anuncios a todos los residentes",
      "Gestionar reservas de áreas comunes",
      "Recomendar lugares, restaurantes y eventos cercanos"
    ],
    developmentStatus: "En desarrollo - funcionalidad básica disponible"
  },
  {
    id: "trainer",
    icon: UserCheck,
    title: "Entrenador de Habilidades",
    description: "Mejora tus habilidades personales y profesionales con práctica interactiva.",
    color: "bg-amber-600",
    textColor: "text-amber-600",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    available: isRoleAvailable('trainer'), // ← Verificación dinámica
    image: Personal_Trainer_AF,
    features: [
      "Simulaciones de escenarios reales (entrevistas, negociaciones)",
      "Práctica para exámenes de idiomas con componentes orales",
      "Recomendaciones sobre interacciones sociales y presentación"
    ],
    developmentStatus: "Próximamente - en fase de planificación"
  },
  {
    id: "assistant",
    icon: User,
    title: "Asistente Personal",
    description: "Gestiona tu agenda, comunicaciones y tareas diarias de forma eficiente.",
    color: "bg-purple-600",
    textColor: "text-purple-600",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    available: isRoleAvailable('assistant'), // ← Verificación dinámica
    image: Personal_Assistant_AF,
    features: [
      "Envío de correos a contactos preregistrados",
      "Recordatorios usando Google Calendar",
      "Informes sobre visitantes en tu ausencia",
      "Información de agenda, clima y noticias"
    ],
    developmentStatus: "Próximamente - integraciones en desarrollo"
  },
  {
    id: "guide",
    icon: GraduationCap,
    title: "Guía Universitario",
    description: "Navega la vida académica con un asistente especializado en recursos universitarios.",
    color: "bg-red-600",
    textColor: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    available: true, // ← Cambiado a true
    image: University_Guide_AF,
    features: [
      "Información sobre calendarios y fechas académicas",
      "Guía en procesos académicos clave (matrícula, progreso)",
      "Acceso a servicios de apoyo estudiantil",
      "Envío de información sobre recursos universitarios"
    ]
  }
];

const RoleSelection = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedRole, setSelectedRole] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [unavailableModalOpen, setUnavailableModalOpen] = useState(false);
  const [selectedUnavailableRole, setSelectedUnavailableRole] = useState(null);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  const navigate = useNavigate();
  const { isAuthenticated, openLoginModal } = useAuth();

  // Manejar cambios de tamaño de ventana para cálculos responsivos
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle role selection
  const handleSelectRole = (role) => {
    if (!role.available) {
      setSelectedUnavailableRole(role);
      setUnavailableModalOpen(true);
      return;
    }
    
    setSelectedRole(role);
    setShowDetails(true);
  };

  // Handle role confirmation and navigation - ACTUALIZADO
  const handleConfirmRole = () => {
    if (selectedRole && selectedRole.available) {
      // Si no está autenticado, mostrar modal de login
      if (!isAuthenticated) {
        setShowDetails(false);
        
        openLoginModal(() => {
          localStorage.setItem('naia_selected_role', selectedRole.id);
          console.log(`🎭 Rol seleccionado: ${selectedRole.title} (${selectedRole.id})`);
          navigate('/naia/interface');
        });
        return;
      }
      
      // Si está autenticado, proceder normalmente
      localStorage.setItem('naia_selected_role', selectedRole.id);
      console.log(`🎭 Rol seleccionado: ${selectedRole.title} (${selectedRole.id})`);
      
      // Emitir evento para que otros componentes se enteren del cambio
      window.dispatchEvent(new CustomEvent('role-changed', { 
        detail: { roleId: selectedRole.id, roleName: selectedRole.title }
      }));
      
      navigate('/naia/interface');
    }
  };

  // Navigate carousel
  const nextRole = () => {
    setActiveIndex((prevIndex) => (prevIndex + 1) % roles.length);
  };

  const prevRole = () => {
    setActiveIndex((prevIndex) => (prevIndex - 1 + roles.length) % roles.length);
  };

  // Role Details Panel Component - Rediseñado para responsividad
  const RoleDetailsPanel = () => {
    if (!selectedRole) return null;
    
    return (
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-3 overflow-auto" onClick={() => setShowDetails(false)}>
        <div 
          className={`bg-white rounded-2xl shadow-2xl w-full max-w-5xl border-t-4 ${selectedRole.color} my-4 max-h-[82vh] md:max-h-[88vh] overflow-hidden flex flex-col`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button - Fijo en la esquina superior para fácil acceso en móvil */}
          <button 
            className="absolute top-4 right-4 z-50 w-8 h-8 flex items-center justify-center rounded-full bg-white/90 hover:bg-white text-gray-700 transition-colors shadow-md"
            onClick={() => setShowDetails(false)}
          >
            <X size={20} />
          </button>
          
          <div className="overflow-y-auto max-h-[calc(82vh-4rem)] md:max-h-[calc(88vh-4rem)]">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-0">
              {/* Left column - Imagen con altura adaptativa en móvil */}
              <div className={`md:col-span-5 ${selectedRole.bgColor} p-0 relative overflow-hidden`}>
                <div className="h-[280px] sm:h-[400px] md:h-[600px]">
                  <img 
                    src={selectedRole.image} 
                    alt={selectedRole.title}
                    className="w-full h-full object-cover" 
                  />
                  
                  {/* Overlay with gradient at the bottom */}
                  <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/60 to-transparent"></div>
                  
                  {/* Role badge - Reducido para móvil */}
                  <div className="absolute top-4 left-4 sm:top-6 sm:left-6 flex items-center gap-2 bg-white/90 backdrop-blur-sm px-3 py-2 sm:px-4 sm:py-3 rounded-xl shadow-lg">
                    <div className={`w-8 h-8 sm:w-10 sm:h-10 ${selectedRole.color} rounded-lg flex items-center justify-center text-white`}>
                      {React.createElement(selectedRole.icon, { size: 18 })}
                    </div>
                    <div>
                      <h2 className={`text-base sm:text-xl font-bold ${selectedRole.textColor}`}>{selectedRole.title}</h2>
                      <div className={`text-xs ${selectedRole.available ? 'text-green-600' : 'text-gray-500'} font-medium`}>
                        {selectedRole.available ? 'Disponible ahora' : 'Próximamente'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Right column - Descripción y características */}
              <div className="md:col-span-7 p-4 sm:p-6 md:p-8 flex flex-col">
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">Descripción</h3>
                  <p className="text-gray-700 mb-4 sm:mb-8 text-base sm:text-lg">{selectedRole.description}</p>
                  
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2 sm:mb-4">Características principales</h3>
                  
                  <ul className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
                    {selectedRole.features.map((feature, index) => (
                      <li key={index} className="flex gap-3">
                        <div className={`flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 ${selectedRole.color} rounded-full flex items-center justify-center text-white mt-0.5`}>
                          <span className="text-xs sm:text-sm font-bold">{index + 1}</span>
                        </div>
                        <span className="text-gray-700 text-sm sm:text-base md:text-lg">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="mt-4 sm:mt-auto flex gap-3 sm:gap-4">
                  <button 
                    onClick={() => setShowDetails(false)}
                    className="flex-1 px-4 sm:px-6 py-2 sm:py-3 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors text-sm sm:text-base"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleConfirmRole}
                    className={`flex-1 px-4 sm:px-6 py-2 sm:py-3 ${selectedRole.color} text-white rounded-xl font-medium hover:bg-opacity-90 transition-colors flex items-center justify-center gap-2 text-sm sm:text-base`}
                  >
                    <span>Continuar</span>
                    <ArrowRight size={16} className="sm:w-[18px] sm:h-[18px]" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Unavailable Role Modal Component - Ajustado para responsive
  const UnavailableRoleModal = () => {
    if (!selectedUnavailableRole) return null;
    
    return (
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setUnavailableModalOpen(false)}>
        <div 
          className="bg-white rounded-2xl shadow-xl overflow-hidden max-w-md w-full mx-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className={`p-1 ${selectedUnavailableRole.color}`}></div>
          <div className="p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-amber-100 rounded-full flex items-center justify-center text-amber-600">
                <AlertTriangle size={16} className="sm:w-5 sm:h-5" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-gray-800">Rol en desarrollo</h3>
            </div>
            
            <div className="mb-4">
              <h4 className="font-semibold text-gray-800 mb-2">{selectedUnavailableRole.title}</h4>
              <p className="text-sm sm:text-base text-gray-600 mb-3">
                {selectedUnavailableRole.developmentStatus}
              </p>
              
              {/* Mostrar características planeadas */}
              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <p className="text-xs text-gray-500 mb-2">Características planeadas:</p>
                <ul className="text-xs text-gray-700 space-y-1">
                  {selectedUnavailableRole.features.slice(0, 3).map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <p className="text-sm text-gray-600">
                Mientras tanto, puedes usar el rol de <strong>Investigador</strong> que está completamente funcional.
              </p>
            </div>
            
            <div className="flex gap-2">
              <button 
                onClick={() => setUnavailableModalOpen(false)}
                className="flex-1 px-4 sm:px-5 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors text-sm sm:text-base"
              >
                Entendido
              </button>
              <button 
                onClick={() => {
                  setUnavailableModalOpen(false);
                  // Seleccionar automáticamente el rol de investigador
                  const researcherRole = roles.find(r => r.id === 'researcher');
                  if (researcherRole) {
                    handleSelectRole(researcherRole);
                  }
                }}
                className="flex-1 px-4 sm:px-5 py-2 bg-blue-950 text-white rounded-lg font-medium hover:bg-blue-900 transition-colors text-sm sm:text-base"
              >
                Usar Investigador
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Añadir clase de utilidad para pantallas extra pequeñas
  React.useEffect(() => {
    // Añadir clase para pantallas muy pequeñas si no existe
    if (!document.querySelector("style#xs-screens")) {
      const style = document.createElement('style');
      style.id = 'xs-screens';
      style.innerHTML = `
        @media (max-width: 400px) {
          .xs\\:w-56 { width: 14rem; }
          .xs\\:h-400px { height: 400px; }
        }
      `;
      document.head.appendChild(style);
    }
    
    // Evitar el scroll horizontal
    document.body.style.overflowX = 'hidden';
    
    return () => {
      // Limpiar si es necesario
      document.body.style.overflowX = '';
    };
  }, []);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-sky-50 flex flex-col overflow-x-hidden">
      {/* Header - Adaptado para móvil */}
      <header className="pt-2 pb-2 sm:pt-4 sm:pb-4 px-3 sm:px-6">
        <div className="max-w-4xl mx-auto w-full">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2 sm:mb-3">Selecciona un rol para NAIA</h1>
            <p className="text-sm sm:text-base text-gray-600">
              Elige el rol que mejor se adapte a tus necesidades. Cada perfil optimiza las capacidades de NAIA para diferentes tareas.
            </p>
          </div>
        </div>
      </header>
      
      {/* Main Content - Adaptado para móvil */}
      <main className="flex-1 overflow-x-hidden">
        <div className="max-w-6xl mx-auto px-2 sm:px-4 w-full">
          {/* Role Carousel/Showcase - Rediseñado para móvil */}
          <div className="relative mb-4 sm:mb-8 w-full overflow-hidden">
            {/* Navigation arrows - Adaptados para móvil */}
            <button 
              onClick={prevRole}
              className="absolute left-0 top-1/2 -translate-y-1/2 translate-x-1 sm:-translate-x-4 z-10 w-8 h-8 sm:w-12 sm:h-12 flex items-center justify-center rounded-full bg-white shadow-lg hover:bg-gray-50 transition-colors text-gray-700"
              aria-label="Rol anterior"
            >
              <ChevronLeft size={16} className="sm:w-6 sm:h-6" />
            </button>
            
            <button 
              onClick={nextRole}
              className="absolute right-0 top-1/2 -translate-y-1/2 -translate-x-1 sm:translate-x-4 z-10 w-8 h-8 sm:w-12 sm:h-12 flex items-center justify-center rounded-full bg-white shadow-lg hover:bg-gray-50 transition-colors text-gray-700"
              aria-label="Siguiente rol"
            >
              <ChevronRight size={16} className="sm:w-6 sm:h-6" />
            </button>
            
            {/* 3D Carousel Layout - Adaptado para móvil */}
            <div className="flex justify-center items-center h-[430px] sm:h-[550px] md:h-[700px] overflow-hidden py-4 max-w-full w-full mx-auto px-1">
              {roles.map((role, index) => {
                // Calcular posición relativa
                const position = (index - activeIndex + roles.length) % roles.length;
                
                // Estilos basados en posición
                const isActive = position === 0;
                const isLeft = position === roles.length - 1 || position === roles.length - 2;
                const isRight = position === 1 || position === 2;
                
                const zIndex = isActive ? 30 : (isLeft || isRight ? 20 : 10);
                const opacity = isActive ? 1 : (isLeft || isRight ? 0.7 : 0.4);
                
                // Escala adaptativa para móvil - usando windowWidth state para consistencia
                const scale = isActive ? 1 : (windowWidth < 400 ? (isLeft || isRight ? 0.6 : 0.45) : 
                                              windowWidth < 640 ? (isLeft || isRight ? 0.65 : 0.5) : 
                                              (isLeft || isRight ? 0.8 : 0.6));
                
                // Adaptación de posicionamiento para móvil basado en windowWidth
                let translateX = 0;
                if (isActive) {
                  translateX = 0;
                } else if (position === 1) {
                  // Mucho más cercano en móviles pequeños
                  translateX = windowWidth < 400 ? '42%' : 
                               windowWidth < 640 ? '45%' : '65%';
                } else if (position === 2) {
                  translateX = windowWidth < 400 ? '75%' : 
                               windowWidth < 640 ? '85%' : '120%';
                } else if (position === roles.length - 1) {
                  translateX = windowWidth < 400 ? '-42%' : 
                               windowWidth < 640 ? '-45%' : '-65%';
                } else if (position === roles.length - 2) {
                  translateX = windowWidth < 400 ? '-75%' : 
                               windowWidth < 640 ? '-85%' : '-120%';
                } else {
                  translateX = position > 2 ? '110%' : '-110%';
                }
                
                return (
                  <div
                    key={role.id}
                    className={`absolute transform transition-all duration-500 ease-in-out cursor-pointer`}
                    style={{ 
                      zIndex, 
                      opacity, 
                      transform: `translateX(${translateX}) scale(${scale})`,
                    }}
                    onClick={() => {
                      if (isActive) {
                        handleSelectRole(role);
                      } else {
                        setActiveIndex(index);
                      }
                    }}
                  >
                    {/* Card - Tamaño adaptativo para móvil - medidas más ajustadas */}
                    <div 
                      className={`w-44 xs:w-48 sm:w-64 md:w-72 h-[350px] xs:h-[380px] sm:h-[500px] md:h-[600px] rounded-2xl overflow-hidden shadow-xl border-2 ${role.available ? role.borderColor : 'border-gray-200'} relative group`}
                    >
                      {/* Imagen de rol adaptativa */}
                      <div className="h-full w-full overflow-hidden">
                        <div className="h-full w-full relative">
                          <img 
                            src={role.image} 
                            alt={role.title}
                            className={`h-full w-full object-cover ${!role.available ? 'grayscale filter opacity-80' : ''}`}
                          />
                          
                          {/* Overlays y gradientes */}
                          <div className={`absolute inset-x-0 top-0 h-32 sm:h-40 bg-gradient-to-b ${role.available ? `from-${role.color.split('-')[1]}-800` : 'from-gray-800'} to-transparent opacity-60`}></div>
                          <div className="absolute inset-x-0 bottom-0 h-64 sm:h-80 bg-gradient-to-t from-black to-transparent"></div>
                          
                          {/* Indicador de disponibilidad */}
                          <div className="absolute top-3 right-3 sm:top-4 sm:right-4">
                            <div className={`${role.available ? role.color : 'bg-gray-600'} text-white text-xs rounded-full px-2 py-0.5 sm:px-3 sm:py-1 font-medium shadow-md`}>
                              {role.available ? 'Disponible' : 'Próximamente'}
                            </div>
                          </div>
                          
                          {/* Título de rol - Adaptado para móvil */}
                          <div className="absolute bottom-20 sm:bottom-24 inset-x-0 text-center">
                            <h2 className="text-white text-xl sm:text-2xl md:text-3xl font-black tracking-wide drop-shadow-lg transform -rotate-6">{role.title.toUpperCase()}</h2>
                            <div className="flex justify-center mt-2">
                              <div className={`w-8 h-8 sm:w-10 sm:h-10 ${role.available ? role.color : 'bg-gray-600'} rounded-full flex items-center justify-center shadow-lg`}>
                                {React.createElement(role.icon, { size: 16, className: "sm:w-5 sm:h-5 text-white" })}
                              </div>
                            </div>
                          </div>
                          
                          {/* Botón de detalles */}
                          <div className="absolute bottom-6 sm:bottom-8 inset-x-0 flex justify-center">
                            <button 
                              className={`bg-white/90 backdrop-blur-sm shadow-lg px-3 py-1.5 sm:px-4 sm:py-2 rounded-full 
                                ${role.available ? role.textColor : 'text-gray-600'} 
                                text-sm sm:text-base font-semibold flex items-center gap-1 sm:gap-2 
                                transform transition-transform duration-300 group-hover:scale-105`}
                            >
                              <span>Ver detalles</span>
                              <ArrowRight size={14} className="sm:w-4 sm:h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Role Description Section - Adaptado para móvil */}
          <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 md:p-8 max-w-4xl mx-auto">
            <div className="flex items-start gap-3 sm:gap-6">
              <div className={`w-10 h-10 sm:w-14 sm:h-14 ${roles[activeIndex].color} rounded-xl flex items-center justify-center text-white flex-shrink-0`}>
                {React.createElement(roles[activeIndex].icon, { size: 20, className: "sm:w-7 sm:h-7" })}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                  <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800">{roles[activeIndex].title}</h2>
                  <div className={`text-xs ${roles[activeIndex].available ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'} px-2 py-0.5 sm:py-1 rounded-full font-medium`}>
                    {roles[activeIndex].available ? 'Disponible' : 'Próximamente'}
                  </div>
                </div>
                
                <p className="text-sm sm:text-base md:text-lg text-gray-700 mb-3 sm:mb-6">{roles[activeIndex].description}</p>
                
                <div className="flex flex-wrap gap-2 sm:gap-3 mb-4 sm:mb-6">
                  {roles[activeIndex].features.slice(0, 3).map((feature, index) => (
                    <div key={index} className="bg-gray-100 rounded-lg px-2 py-1 sm:px-3 sm:py-1.5 text-xs sm:text-sm text-gray-700">
                      {feature.split(' ').slice(0, 3).join(' ')}...
                    </div>
                  ))}
                  <div className="bg-gray-100 rounded-lg px-2 py-1 sm:px-3 sm:py-1.5 text-xs sm:text-sm text-gray-700">
                    +{roles[activeIndex].features.length - 3} más
                  </div>
                </div>
                
                <button 
                  onClick={() => handleSelectRole(roles[activeIndex])}
                  className={`px-4 py-2 sm:px-6 sm:py-3 ${roles[activeIndex].color} text-white rounded-xl font-medium hover:bg-opacity-90 transition-colors flex items-center gap-2 text-sm sm:text-base`}
                  disabled={!roles[activeIndex].available}
                >
                  <span>{roles[activeIndex].available ? 'Seleccionar este rol' : 'No disponible'}</span>
                  {roles[activeIndex].available && <ArrowRight size={16} className="sm:w-[18px] sm:h-[18px]" />}
                </button>
              </div>
            </div>
          </div>
          
          {/* Dots Navigation - Adaptado para móvil */}
          <div className="flex justify-center mt-4 sm:mt-8">
            {roles.map((_, index) => (
              <button
                key={index}
                onClick={() => setActiveIndex(index)}
                className={`w-2 h-2 sm:w-3 sm:h-3 mx-1 rounded-full transition-all ${
                  index === activeIndex 
                    ? 'bg-blue-800 w-4 sm:w-6' 
                    : 'bg-gray-300 hover:bg-gray-400'
                }`}
                aria-label={`Ver rol ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </main>
      
      {/* Footer - Adaptado para móvil */}
      <footer className="py-4 sm:py-6 border-t border-gray-200 bg-white/70 backdrop-blur-sm mt-4">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 flex flex-col sm:flex-row justify-between items-center">
          <div className="flex items-center mb-3 sm:mb-0">
            <img 
              src={Thinking_naia} 
              alt="NAIA Logo" 
              className="h-8 sm:h-10 w-auto mr-2 sm:mr-3"
            />
            <div>
              <h2 className="text-base sm:text-lg font-bold bg-gradient-to-r from-blue-950 to-sky-900 bg-clip-text text-transparent">NAIA</h2>
              <p className="text-[10px] sm:text-xs text-gray-500">Universidad del Norte © 2025</p>
            </div>
          </div>
          <div className="flex items-center space-x-4 sm:space-x-6 text-gray-600">
            <Link to="/home" className="text-xs sm:text-sm hover:text-blue-950 transition-colors flex items-center gap-1">
              <button className="text-xs sm:text-sm hover:text-blue-950 transition-colors flex items-center gap-1">
                <Info size={14} className="sm:w-4 sm:h-4" />
                <span>Acerca de NAIA</span>
              </button>
            </Link>
          </div>
        </div>
      </footer>
      
      {/* Role Details Modal */}
      {showDetails && <RoleDetailsPanel />}
      
      {/* Unavailable Role Modal */}
      {unavailableModalOpen && <UnavailableRoleModal />}
    </div>
  );
};

export default RoleSelection;