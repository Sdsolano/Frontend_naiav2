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
    available: true,
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
    available: false,
    image: Receptionist_AF,
    features: [
      "Notificar a residentes vía WhatsApp sobre visitantes",
      "Enviar anuncios a todos los residentes",
      "Gestionar reservas de áreas comunes",
      "Recomendar lugares, restaurantes y eventos cercanos"
    ]
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
    available: false,
    image: Personal_Trainer_AF,
    features: [
      "Simulaciones de escenarios reales (entrevistas, negociaciones)",
      "Práctica para exámenes de idiomas con componentes orales",
      "Recomendaciones sobre interacciones sociales y presentación"
    ]
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
    available: false,
    image: Personal_Assistant_AF,
    features: [
      "Envío de correos a contactos preregistrados",
      "Recordatorios usando Google Calendar",
      "Informes sobre visitantes en tu ausencia",
      "Información de agenda, clima y noticias"
    ]
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
    available: false,
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
  const navigate = useNavigate();

  // Handle role selection
  const handleSelectRole = (role) => {
    if (role.available) {
      setSelectedRole(role);
      setShowDetails(true);
    } else {
      setSelectedUnavailableRole(role);
      setUnavailableModalOpen(true);
    }
  };

  useEffect(() => {
    // Verificar si ya hay un rol seleccionado
    const existingRole = localStorage.getItem('naia_selected_role');
    
    // Si ya hay un rol, ir directamente a la interfaz
    if (existingRole) {
      navigate('/naia/interface');
    }
  }, [navigate]);

  // Handle role confirmation and navigation
  const handleConfirmRole = () => {
    if (selectedRole && selectedRole.available) {
      // Store selected role in localStorage for persistence
      localStorage.setItem('naia_selected_role', selectedRole.id);
      
      // Navigate to the main NAIA interface
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

  // Role Details Panel Component - Rediseñado para mostrar mejor las imágenes verticales
  const RoleDetailsPanel = () => {
    if (!selectedRole) return null;
    
    return (
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowDetails(false)}>
        <div 
          className={`bg-white rounded-2xl shadow-2xl overflow-hidden w-full max-w-5xl border-t-4 ${selectedRole.color}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="relative">
            {/* Close button */}
            <button 
              className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-white/80 hover:bg-white text-gray-700 transition-colors"
              onClick={() => setShowDetails(false)}
            >
              <X size={20} />
            </button>
            
            <div className="grid grid-cols-1 md:grid-cols-12 gap-0">
              {/* Left column - Larger image display */}
              <div className={`md:col-span-5 ${selectedRole.bgColor} p-0 relative overflow-hidden`}>
                <div className="h-full">
                  <img 
                    src={selectedRole.image} 
                    alt={selectedRole.title}
                    className="w-full h-full object-cover md:h-[600px]" 
                  />
                  
                  {/* Overlay with gradient at the bottom */}
                  <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/60 to-transparent"></div>
                  
                  {/* Role badge */}
                  <div className="absolute top-6 left-6 flex items-center gap-2 bg-white/90 backdrop-blur-sm px-4 py-3 rounded-xl shadow-lg">
                    <div className={`w-10 h-10 ${selectedRole.color} rounded-lg flex items-center justify-center text-white`}>
                      {React.createElement(selectedRole.icon, { size: 20 })}
                    </div>
                    <div>
                      <h2 className={`text-xl font-bold ${selectedRole.textColor}`}>{selectedRole.title}</h2>
                      <div className={`text-xs ${selectedRole.available ? 'text-green-600' : 'text-gray-500'} font-medium`}>
                        {selectedRole.available ? 'Disponible ahora' : 'Próximamente'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Right column - Description and features */}
              <div className="md:col-span-7 p-8 flex flex-col">
                <div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">Descripción</h3>
                  <p className="text-gray-700 mb-8 text-lg">{selectedRole.description}</p>
                  
                  <h3 className="text-2xl font-bold text-gray-800 mb-4">Características principales</h3>
                  
                  <ul className="space-y-4 mb-8">
                    {selectedRole.features.map((feature, index) => (
                      <li key={index} className="flex gap-3">
                        <div className={`flex-shrink-0 w-8 h-8 ${selectedRole.color} rounded-full flex items-center justify-center text-white mt-0.5`}>
                          <span className="text-sm font-bold">{index + 1}</span>
                        </div>
                        <span className="text-gray-700 text-lg">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="mt-auto flex gap-4">
                  <button 
                    onClick={() => setShowDetails(false)}
                    className="flex-1 px-6 py-3 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleConfirmRole}
                    className={`flex-1 px-6 py-3 ${selectedRole.color} text-white rounded-xl font-medium hover:bg-opacity-90 transition-colors flex items-center justify-center gap-2`}
                  >
                    <span>Continuar</span>
                    <ArrowRight size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Unavailable Role Modal Component
  const UnavailableRoleModal = () => {
    if (!selectedUnavailableRole) return null;
    
    return (
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setUnavailableModalOpen(false)}>
        <div 
          className="bg-white rounded-2xl shadow-xl overflow-hidden max-w-md w-full"
          onClick={(e) => e.stopPropagation()}
        >
          <div className={`p-1 ${selectedUnavailableRole.color}`}></div>
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center text-amber-600">
                <AlertTriangle size={20} />
              </div>
              <h3 className="text-lg font-bold text-gray-800">Rol no disponible</h3>
            </div>
            
            <p className="text-gray-600 mb-6">
              El rol de <span className="font-medium">{selectedUnavailableRole.title}</span> aún no está disponible en esta versión de NAIA. Estamos trabajando para implementarlo pronto. Por favor, selecciona el rol de Investigador para continuar.
            </p>
            
            <div className="flex justify-end">
              <button 
                onClick={() => setUnavailableModalOpen(false)}
                className="px-5 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-sky-50 flex flex-col">
      {/* Header - Minimalista y moderno */}
      <header className="pt-4 pb-4 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-gray-100">
            <h1 className="text-3xl font-bold text-gray-900 mb-3">Selecciona un rol para NAIA</h1>
            <p className="text-gray-600">
              Elige el rol que mejor se adapte a tus necesidades. Cada perfil optimiza las capacidades de NAIA para diferentes tareas.
            </p>
          </div>
        </div>
      </header>
      
      {/* Main Content - Carousel/Showcase of Roles */}
      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-4">
          {/* Role Carousel/Showcase */}
          <div className="relative mb-8">
            {/* Navigation arrows */}
            <button 
              onClick={prevRole}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 w-12 h-12 flex items-center justify-center rounded-full bg-white shadow-lg hover:bg-gray-50 transition-colors text-gray-700"
              aria-label="Rol anterior"
            >
              <ChevronLeft size={24} />
            </button>
            
            <button 
              onClick={nextRole}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 w-12 h-12 flex items-center justify-center rounded-full bg-white shadow-lg hover:bg-gray-50 transition-colors text-gray-700"
              aria-label="Siguiente rol"
            >
              <ChevronRight size={24} />
            </button>
            
            {/* 3D Carousel Layout */}
            <div className="flex justify-center items-center h-[700px] overflow-hidden py-4">
              {roles.map((role, index) => {
                // Calculate position relative to activeIndex
                const position = (index - activeIndex + roles.length) % roles.length;
                
                // Apply different styles based on position
                const isActive = position === 0;
                const isLeft = position === roles.length - 1 || position === roles.length - 2;
                const isRight = position === 1 || position === 2;
                
                const zIndex = isActive ? 30 : (isLeft || isRight ? 20 : 10);
                const opacity = isActive ? 1 : (isLeft || isRight ? 0.7 : 0.4);
                const scale = isActive ? 1 : (isLeft || isRight ? 0.8 : 0.6);
                
                // X translation for carousel effect
                let translateX = 0;
                if (isActive) translateX = 0;
                else if (position === 1) translateX = '65%';
                else if (position === 2) translateX = '120%';
                else if (position === roles.length - 1) translateX = '-65%';
                else if (position === roles.length - 2) translateX = '-120%';
                else translateX = position > 2 ? '150%' : '-150%';
                
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
                    {/* Action Figure Card - Vertical Design */}
                    <div 
                      className={`w-72 h-[600px] rounded-2xl overflow-hidden shadow-xl border-2 ${role.available ? role.borderColor : 'border-gray-200'} relative group`}
                    >
                      {/* Role image - Taking full height for vertical images */}
                      <div className="h-full w-full overflow-hidden">
                        <div className="h-full w-full relative">
                          <img 
                            src={role.image} 
                            alt={role.title}
                            className={`h-full w-full object-cover ${!role.available ? 'grayscale filter opacity-80' : ''}`}
                          />
                          
                          {/* Action figure packaging style overlay */}
                          <div className={`absolute inset-x-0 top-0 h-40 bg-gradient-to-b ${role.available ? `from-${role.color.split('-')[1]}-800` : 'from-gray-800'} to-transparent opacity-60`}></div>
                          <div className="absolute inset-x-0 bottom-0 h-80 bg-gradient-to-t from-black to-transparent"></div>
                          
                          {/* Role indicator badge */}
                          <div className="absolute top-4 right-4">
                            <div className={`${role.available ? role.color : 'bg-gray-600'} text-white text-xs rounded-full px-3 py-1 font-medium shadow-md`}>
                              {role.available ? 'Disponible' : 'Próximamente'}
                            </div>
                          </div>
                          
                          {/* Role title - Action figure style */}
                          <div className="absolute bottom-24 inset-x-0 text-center">
                            <h2 className="text-white text-3xl font-black tracking-wide drop-shadow-lg transform -rotate-6">{role.title.toUpperCase()}</h2>
                            <div className="flex justify-center mt-2">
                              <div className={`w-10 h-10 ${role.available ? role.color : 'bg-gray-600'} rounded-full flex items-center justify-center shadow-lg`}>
                                {React.createElement(role.icon, { size: 20, className: "text-white" })}
                              </div>
                            </div>
                          </div>
                          
                          {/* View details button */}
                          <div className="absolute bottom-8 inset-x-0 flex justify-center">
                            <button 
                              className={`bg-white/90 backdrop-blur-sm shadow-lg px-4 py-2 rounded-full 
                                ${role.available ? role.textColor : 'text-gray-600'} 
                                font-semibold flex items-center gap-2 
                                transform transition-transform duration-300 group-hover:scale-105`}
                            >
                              <span>Ver detalles</span>
                              <ArrowRight size={16} />
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
          
          {/* Role Description Section - Only for active role */}
          <div className="bg-white rounded-2xl shadow-lg p-8 max-w-4xl mx-auto">
            <div className="flex items-start gap-6">
              <div className={`w-14 h-14 ${roles[activeIndex].color} rounded-xl flex items-center justify-center text-white flex-shrink-0`}>
                {React.createElement(roles[activeIndex].icon, { size: 28 })}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-2xl font-bold text-gray-800">{roles[activeIndex].title}</h2>
                  <div className={`text-xs ${roles[activeIndex].available ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'} px-2 py-1 rounded-full font-medium`}>
                    {roles[activeIndex].available ? 'Disponible' : 'Próximamente'}
                  </div>
                </div>
                
                <p className="text-gray-700 mb-6 text-lg">{roles[activeIndex].description}</p>
                
                <div className="flex flex-wrap gap-3 mb-6">
                  {roles[activeIndex].features.slice(0, 3).map((feature, index) => (
                    <div key={index} className="bg-gray-100 rounded-lg px-3 py-1.5 text-sm text-gray-700">
                      {feature.split(' ').slice(0, 3).join(' ')}...
                    </div>
                  ))}
                  <div className="bg-gray-100 rounded-lg px-3 py-1.5 text-sm text-gray-700">
                    +{roles[activeIndex].features.length - 3} más
                  </div>
                </div>
                
                <button 
                  onClick={() => handleSelectRole(roles[activeIndex])}
                  className={`px-6 py-3 ${roles[activeIndex].color} text-white rounded-xl font-medium hover:bg-opacity-90 transition-colors flex items-center gap-2`}
                  disabled={!roles[activeIndex].available}
                >
                  <span>{roles[activeIndex].available ? 'Seleccionar este rol' : 'No disponible'}</span>
                  {roles[activeIndex].available && <ArrowRight size={18} />}
                </button>
              </div>
            </div>
          </div>
          
          {/* Dots Navigation */}
          <div className="flex justify-center mt-8">
            {roles.map((_, index) => (
              <button
                key={index}
                onClick={() => setActiveIndex(index)}
                className={`w-3 h-3 mx-1 rounded-full transition-all ${
                  index === activeIndex 
                    ? 'bg-blue-800 w-6' 
                    : 'bg-gray-300 hover:bg-gray-400'
                }`}
                aria-label={`Ver rol ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="py-6 border-t border-gray-200 bg-white/70 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center">
          <div className="flex items-center mb-4 sm:mb-0">
            <img 
              src={Thinking_naia} 
              alt="NAIA Logo" 
              className="h-10 w-auto mr-3"
            />
            <div>
              <h2 className="text-lg font-bold bg-gradient-to-r from-blue-950 to-sky-900 bg-clip-text text-transparent">NAIA</h2>
              <p className="text-xs text-gray-500">Universidad del Norte © 2025</p>
            </div>
          </div>
          <div className="flex items-center space-x-6 text-gray-600">
            <Link to="/home" className="text-sm hover:text-blue-950 transition-colors flex items-center gap-1">
            <button className="text-sm hover:text-blue-950 transition-colors flex items-center gap-1">
              <Info size={16} />
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