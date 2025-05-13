import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, Search, Video, MessageSquare, Brain, ChevronRight, Building, UserCheck, User, GraduationCap, Mail, Calendar, Globe, Check, Settings, MapPin, Users, FileText, Image, GanttChart, Sparkles, BrainCircuit } from "lucide-react";
import Thinking_naia from "../assets/Thinking_naia.png";
const Home = () => {
  const [activeRole, setActiveRole] = useState(0);
  const [selectedConfig, setSelectedConfig] = useState(0);
  
  // Roles data
  const roles = [
    {
      icon: BookOpen,
      title: "Investigador",
      description: "Investigar y analizar información.",
      color: "bg-blue-950",
      textColor: "text-blue-950",
      bgColor: "bg-blue-50",
      features: [
        "Leer y extraer información de PDFs (hasta 1GB).",
        "Buscar artículos científicos con Google Scholar.",
        "Proporcionar fragmentos de texto copiables.",
        "Generar textos extendidos sobre archivos PDF.",
        "Búsqueda web de cualquier información.",
        "Generación de gráficas a partir de datos complejos."
      ]
    },
    {
      icon: Building,
      title: "Recepcionista",
      description: "Gestionar citas e información de visitantes.",
      color: "bg-emerald-600",
      textColor: "text-emerald-600",
      bgColor: "bg-emerald-50",
      features: [
        "Notificar a residentes vía WhatsApp sobre visitantes.",
        "Enviar anuncios a todos los residentes.",
        "Gestionar reservas de áreas comunes.",
        "Recomendar lugares, restaurantes y eventos cercanos."
      ]
    },
    {
      icon: UserCheck,
      title: "Entrenador de Habilidades",
      description: "Mejorar habilidades personales y profesionales.",
      color: "bg-amber-600",
      textColor: "text-amber-600",
      bgColor: "bg-amber-50",
      features: [
        "Simulaciones de escenarios reales (entrevistas, negociaciones).",
        "Práctica para exámenes de idiomas con componentes orales.",
        "Recomendaciones sobre interacciones sociales y presentación."
      ]
    },
    {
      icon: User,
      title: "Asistente Personal",
      description: "Ayudar con tareas diarias y organización.",
      color: "bg-purple-600",
      textColor: "text-purple-600", 
      bgColor: "bg-purple-50",
      features: [
        "Envío de correos a contactos preregistrados.",
        "Recordatorios usando Google Calendar.",
        "Informes sobre visitantes en tu ausencia.",
        "Información de agenda, clima y noticias."
      ]
    },
    {
      icon: GraduationCap,
      title: "Guía Universitario",
      description: "Navegar la vida académica y recursos.",
      color: "bg-red-600",
      textColor: "text-red-600",
      bgColor: "bg-red-50",
      features: [
        "Información sobre calendarios y fechas académicas.",
        "Guía en procesos académicos clave (matrícula, progreso).",
        "Acceso a servicios de apoyo estudiantil.",
        "Envío de información sobre recursos universitarios."
      ]
    }
  ];

  // Configuración data
  const configData = [
    {
      role: "Investigador",
      icon: BookOpen,
      color: "bg-blue-950",
      lightColor: "bg-blue-50",
      textColor: "text-blue-950",
      borderColor: "border-blue-200",
      description: "Optimiza NAIA para tus necesidades de investigación y análisis de información.",
      steps: [
        {
          title: "Documentos",
          description: "Carga tus documentos para contexto más preciso",
          icon: BookOpen
        }
      ]
    },
    {
      role: "Recepcionista",
      icon: Building,
      color: "bg-emerald-600",
      lightColor: "bg-emerald-50",
      textColor: "text-emerald-600",
      borderColor: "border-emerald-200",
      description: "Configura este rol para gestionar visitantes y reservas de espacios",
      steps: [
        {
          title: "Registrar espacios",
          description: "Añade apartamentos y áreas comunes para organizar las visitas",
          icon: MapPin
        },
        {
          title: "Configurar contactos",
          description: "Agrega residentes y sus datos de contacto para notificaciones",
          icon: Users
        },
        {
          title: "Personalizar mensajes",
          description: "Define plantillas de mensajes para enviar a los residentes",
          icon: MessageSquare
        }
      ]
    },
    {
      role: "Asistente Personal",
      icon: User,
      color: "bg-purple-600",
      lightColor: "bg-purple-50",
      textColor: "text-purple-600",
      borderColor: "border-purple-200",
      description: "Prepara a NAIA para ayudarte con tus tareas diarias y organización",
      steps: [
        {
          title: "Información personal",
          description: "Añade tus datos personales y preferencias para personalizar la experiencia",
          icon: User
        },
        {
          title: "Sincronizar correo",
          description: "Conecta tu cuenta de correo para enviar mensajes y obtener notificaciones",
          icon: Mail
        },
        {
          title: "Calendarios",
          description: "Integra tus calendarios para gestionar tu agenda y recordatorios",
          icon: Calendar
        }
      ]
    },
    {
      role: "Entrenador de Habilidades",
      icon: UserCheck,
      color: "bg-amber-600",
      lightColor: "bg-amber-50",
      textColor: "text-amber-600",
      borderColor: "border-amber-200",
      description: "Define tus objetivos de aprendizaje para simulaciones y práctica efectiva",
      steps: [
        {
          title: "Objetivos de aprendizaje",
          description: "Define las habilidades que deseas desarrollar y su prioridad",
          icon: GanttChart
        },
        {
          title: "Nivel de experiencia",
          description: "Indica tu nivel actual en cada área para adaptar las sesiones",
          icon: Sparkles
        },
        {
          title: "Preferencias de entrenamiento",
          description: "Configura el estilo, duración y frecuencia de las sesiones",
          icon: BrainCircuit
        }
      ]
    },
    {
      role: "Guía Universitario",
      icon: GraduationCap,
      color: "bg-red-600",
      lightColor: "bg-red-50",
      textColor: "text-red-600",
      borderColor: "border-red-200",
      description: "Configura tu experiencia académica con información de la Universidad del Norte",
      steps: [
        {
          title: "Correo institucional",
          description: "Conecta tu cuenta de correo universitario para recibir notificaciones",
          icon: Mail
        },
        {
          title: "Programa académico",
          description: "Selecciona tu carrera, semestre y materias actuales",
          icon: BookOpen
        },
        {
          title: "Recursos académicos",
          description: "Configura tus recursos favoritos y espacios de estudio",
          icon: FileText
        }
      ]
    }
    
  ];

  return (
    <div className="space-y-12 pb-12">
      {/* Hero Section */}

<section className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-blue-950 to-blue-900 text-white">
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]"></div>
        <div className="absolute right-0 top-0 -translate-y-1/4 translate-x-1/4 w-96 h-96 rounded-full bg-sky-400 opacity-20 blur-3xl"></div>
        <div className="absolute left-0 bottom-0 translate-y-1/4 -translate-x-1/4 w-96 h-96 rounded-full bg-blue-300 opacity-20 blur-3xl"></div>
        
        <div className="relative px-8 py-12 md:py-16 max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="flex-1 space-y-6">
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm text-sm font-medium">
                <span className="w-2 h-2 rounded-full bg-sky-400 mr-2 animate-pulse"></span>
                Universidad del Norte
              </div>
              
              <h1 className="text-4xl md:text-5xl font-bold leading-tight">
                Conoce a NAIA, <br />
                <span className="text-sky-300">tu asistente AI</span> multifuncional
              </h1>
              
              <p className="text-lg text-sky-100">
                Un avatar digital animado potencializado con inteligencia artificial para ayudarte en tu productividad y eficiencia a través de una asistencia virtual personalizada basada en roles.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 pt-2">
                <Link
                  to="/naia"
                  className="flex items-center justify-center gap-2 bg-white text-blue-950 hover:bg-sky-50 px-6 py-3 rounded-xl font-medium transition-all shadow-lg shadow-blue-950/20 hover:shadow-xl hover:shadow-blue-950/30"
                >
                  Comenzar ahora
                  <ArrowRight size={18} />
                </Link>
                
                <button className="flex items-center justify-center gap-2 bg-white/10 backdrop-blur-sm hover:bg-white/15 px-6 py-3 rounded-xl font-medium transition-all border border-white/20">
                  <Video size={18} />
                  Ver demostración
                </button>
              </div>
            </div>
            
            {/* Improved image container - much taller and with better positioning */}
            <div className="flex-1 flex items-center justify-center py-6">
              <div className="relative h-[340px] sm:h-[400px] md:h-[480px] lg:h-[520px] w-auto max-w-full">
                {/* Enhanced glow effect */}
                <div className="absolute inset-0 scale-125 bg-gradient-to-br from-sky-400 to-blue-600 rounded-full opacity-20 blur-2xl"></div>
                
                {/* Container for the image with improved sizing */}
                <div className="relative z-10 h-full w-auto flex items-center justify-center">
                  <img 
                    src={Thinking_naia}
                    alt="NAIA Virtual Assistant" 
                    className="h-full w-auto max-w-full object-contain drop-shadow-2xl"
                  />
                </div>
                
                <div className="absolute top-4 right-4 bg-sky-400 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
                  IA
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* About NAIA Section */}
      <section className="text-center max-w-3xl mx-auto px-4">
        <h2 className="text-3xl font-bold text-gray-800 mb-4">
          Descripción General del Proyecto NAIA
        </h2>
        <p className="text-lg text-gray-600">
          NAIA es un avatar digital animado potencializado con inteligencia artificial diseñado para ayudarte a mejorar tu productividad y eficiencia. Ofrece asistencia virtual personalizada a través de una versátil sistema basado en roles, adaptándose a tus necesidades específicas.
        </p>
      </section>
      
      {/* Roles Section - REDESIGNED */}
      <section className="py-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-800 mb-3">
            Cinco roles especializados
          </h2>
          <p className="mt-3 text-lg text-gray-600 max-w-2xl mx-auto">
            NAIA adapta sus capacidades a tus necesidades específicas
          </p>
        </div>
        
        {/* Role Selector */}
        <div className="flex justify-center mb-12 overflow-x-auto pb-4 hide-scrollbar">
          <div className="flex space-x-2 md:space-x-4">
            {roles.map((role, index) => (
              <button
                key={index}
                onClick={() => setActiveRole(index)}
                className={`flex flex-col items-center p-4 rounded-xl transition-all ${
                  activeRole === index 
                    ? `${role.bgColor} ${role.textColor} shadow-md scale-105` 
                    : 'bg-white/70 text-gray-500 hover:bg-gray-50'
                }`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-2 ${
                  activeRole === index ? role.color : 'bg-gray-100'
                }`}>
                  {React.createElement(role.icon, { 
                    size: 22, 
                    className: activeRole === index ? 'text-white' : 'text-gray-500' 
                  })}
                </div>
                <span className="font-medium text-sm whitespace-nowrap">{role.title}</span>
              </button>
            ))}
          </div>
        </div>
        
        {/* Active Role Display */}
        <div className="max-w-5xl mx-auto">
          <div className={`rounded-3xl overflow-hidden relative ${roles[activeRole].bgColor}`}>
            {/* Background decorative elements */}
            <div className="absolute right-0 top-0 opacity-50 w-64 h-64">
              <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                <path fill={roles[activeRole].color.replace('bg-', '#').replace('blue-950', '172554').replace('emerald-600', '059669').replace('amber-600', 'd97706').replace('purple-600', '9333ea').replace('red-600', 'dc2626')} 
                  d="M45.9,-49.6C56.4,-38,60.2,-19,59.4,-1.5C58.7,16.1,53.3,32.1,42.8,43.9C32.1,55.8,16.1,63.3,-1.4,64.8C-18.9,66.2,-37.8,61.5,-50.5,49.8C-63.3,38.1,-69.8,19,-69.9,0C-70,-19.1,-63.6,-38.1,-50.8,-49.7C-38.1,-61.2,-19.1,-65.3,-0.1,-65.2C19,-65.1,38,-61.1,45.9,-49.6Z" transform="translate(100 100)" />
              </svg>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10 p-8 md:p-12">
              {/* Left side: Role info */}
              <div className="flex flex-col justify-center">
                <div className={`w-16 h-16 ${roles[activeRole].color} rounded-2xl flex items-center justify-center text-white mb-6`}>
                  {React.createElement(roles[activeRole].icon, { size: 32 })}
                </div>
                
                <h3 className="text-3xl font-bold text-gray-800 mb-3">{roles[activeRole].title}</h3>
                <p className="text-xl text-gray-700 mb-6">{roles[activeRole].description}</p>
                
                <Link
                  to="/naia"
                  className={`inline-flex items-center self-start ${roles[activeRole].color} text-white hover:bg-opacity-90 px-6 py-3 rounded-xl font-medium transition-all shadow-md`}
                >
                  Seleccionar este rol
                  <ArrowRight size={18} className="ml-2" />
                </Link>
              </div>
              
              {/* Right side: Features */}
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
                <h4 className={`font-semibold ${roles[activeRole].textColor} mb-4 text-lg`}>Funciones principales:</h4>
                <ul className="space-y-4">
                  {roles[activeRole].features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <div className={`${roles[activeRole].color} rounded-full p-1 flex-shrink-0 mr-4 mt-0.5`}>
                        <Check size={12} className="text-white" />
                      </div>
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Configuration Section - IMPROVED */}
      <section className="py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-800 mb-3">Configuración Específica por Rol</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Para aprovechar todas las capacidades de NAIA, es necesario configurar información específica para cada rol
          </p>
        </div>

        {/* Config Selector */}
        <div className="max-w-6xl mx-auto mb-12 flex justify-center">
          <div className="inline-flex p-1.5 rounded-xl bg-gray-100/70 backdrop-blur-sm overflow-x-auto hide-scrollbar">
            {configData.map((config, index) => (
              <button
                key={index}
                onClick={() => setSelectedConfig(index)}
                className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  selectedConfig === index 
                    ? `${config.color} text-white shadow-md` 
                    : 'text-gray-600 hover:bg-white hover:shadow-sm'
                }`}
              >
                {React.createElement(config.icon, { 
                  size: 16, 
                  className: selectedConfig === index ? 'text-white' : config.textColor
                })}
                {config.role}
              </button>
            ))}
          </div>
        </div>

        {/* Config Content */}
        <div className="max-w-5xl mx-auto">
          <div className={`rounded-2xl overflow-hidden border ${configData[selectedConfig].borderColor}`}>
            <div className={`${configData[selectedConfig].lightColor} p-8`}>
              <div className="flex flex-col md:flex-row items-start gap-6">
                <div className={`${configData[selectedConfig].color} rounded-xl p-3 text-white shrink-0`}>
                  {React.createElement(configData[selectedConfig].icon, { size: 28 })}
                </div>
                
                <div className="flex-1">
                  <h3 className={`text-2xl font-bold ${configData[selectedConfig].textColor} mb-2`}>
                    Configurar: {configData[selectedConfig].role}
                  </h3>
                  <p className="text-gray-700 mb-8">
                    {configData[selectedConfig].description}
                  </p>
                  
                  <div className="space-y-6">
                    {configData[selectedConfig].steps.map((step, index) => (
                      <div 
                        key={index} 
                        className="flex gap-4 bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow border border-gray-100"
                      >
                        <div className={`w-10 h-10 rounded-lg flex-shrink-0 ${configData[selectedConfig].color} bg-opacity-10 flex items-center justify-center ${configData[selectedConfig].textColor}`}>
                          {React.createElement(step.icon, { size: 20 })}
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-800 mb-1">{step.title}</h4>
                          <p className="text-sm text-gray-600">{step.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-8 flex justify-end">
                    <Link
                      to="/documents"
                      className={`flex items-center gap-2 ${configData[selectedConfig].color} text-white px-5 py-2.5 rounded-lg font-medium hover:bg-opacity-90 transition-colors shadow-sm hover:shadow-md`}
                    >
                      <Settings size={16} />
                     Configurar este rol
                  </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Universidad del Norte Section */}
      <section className="bg-gradient-to-br from-gray-50 to-sky-50 p-8 rounded-3xl shadow-sm border border-sky-50">
        <div className="flex flex-col md:flex-row items-center gap-8">
          <div className="flex-1">
           
            <div className="mt-6 space-y-4">
              <h3 className="text-2xl font-bold text-gray-800">
                Desarrollada para la comunidad Uninorte
              </h3>
              <p className="text-gray-600">
                NAIA ha sido especialmente diseñada para satisfacer las necesidades específicas de estudiantes, docentes e investigadores de la Universidad del Norte, integrándose perfectamente con los recursos académicos disponibles.
              </p>
              <div className="pt-2">
                <a href="https://www.uninorte.edu.co" target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-blue-950 font-medium hover:text-blue-800 transition-colors">
                  Visitar sitio web de la Universidad
                  <ArrowRight size={16} className="ml-2" />
                </a>
              </div>
            </div>
          </div>
          
          <div className="flex-1">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-xl shadow-sm flex flex-col items-center text-center hover:shadow-md transition-shadow">
                <Calendar className="text-blue-950 mb-2" size={24} />
                <h4 className="font-medium text-gray-800 text-sm mb-1">Calendarios Académicos</h4>
                <p className="text-xs text-gray-600">Fechas clave y eventos del semestre</p>
              </div>
              
              <div className="bg-white p-4 rounded-xl shadow-sm flex flex-col items-center text-center hover:shadow-md transition-shadow">
                <Mail className="text-blue-950 mb-2" size={24} />
                <h4 className="font-medium text-gray-800 text-sm mb-1">Correo Universitario</h4>
                <p className="text-xs text-gray-600">Integración con tu cuenta académica</p>
              </div>
              
              <div className="bg-white p-4 rounded-xl shadow-sm flex flex-col items-center text-center hover:shadow-md transition-shadow">
                <BookOpen className="text-blue-950 mb-2" size={24} />
                <h4 className="font-medium text-gray-800 text-sm mb-1">Recursos Bibliográficos</h4>
                <p className="text-xs text-gray-600">Acceso a bibliotecas digitales</p>
              </div>
              
              <div className="bg-white p-4 rounded-xl shadow-sm flex flex-col items-center text-center hover:shadow-md transition-shadow">
                <Globe className="text-blue-950 mb-2" size={24} />
                <h4 className="font-medium text-gray-800 text-sm mb-1">Úsalo dónde quieras</h4>
                <p className="text-xs text-gray-600">Accede a la plataforma desde tu casa</p>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Get Started CTA */}
      <section className="bg-gradient-to-br from-blue-900 to-blue-950 p-8 rounded-3xl text-white text-center">
        <div className="max-w-3xl mx-auto relative">
          <div className="absolute -left-10 -top-10 w-40 h-40 bg-sky-400 rounded-full opacity-10 blur-3xl"></div>
          <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-blue-300 rounded-full opacity-10 blur-3xl"></div>
          
          <div className="relative">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl mb-6">
              <Brain size={32} className="text-sky-300" />
            </div>
            
            <h2 className="text-3xl font-bold mb-4">¿Listo para potenciar tu productividad?</h2>
            <p className="text-lg text-sky-100 mb-8 max-w-2xl mx-auto">
              Empieza a utilizar NAIA ahora mismo y descubre cómo puede transformar tu experiencia académica y profesional con sus múltiples roles especializados.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/naia"
                className="flex items-center justify-center gap-2 bg-white text-blue-950 hover:bg-sky-50 px-6 py-3 rounded-xl font-medium transition-all shadow-lg shadow-blue-950/20 hover:shadow-xl hover:shadow-blue-950/30"
              >
                Comenzar con NAIA
                <ArrowRight size={18} />
              </Link>

            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Home