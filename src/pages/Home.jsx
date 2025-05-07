import React from "react";
import { NavLink } from "react-router-dom";
import { ArrowRight, BookOpen, Search, Video, MessageSquare, Brain, ChevronRight } from "lucide-react";

const Home = () => {
  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-blue-950 to-blue-900 text-white">
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]"></div>
        <div className="absolute right-0 top-0 -translate-y-1/4 translate-x-1/4 w-96 h-96 rounded-full bg-sky-400 opacity-20 blur-3xl"></div>
        <div className="absolute left-0 bottom-0 translate-y-1/4 -translate-x-1/4 w-96 h-96 rounded-full bg-blue-300 opacity-20 blur-3xl"></div>
        
        <div className="relative px-8 py-20 md:py-28 max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="flex-1 space-y-6">
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm text-sm font-medium">
                <span className="w-2 h-2 rounded-full bg-sky-400 mr-2 animate-pulse"></span>
                Universidad del Norte
              </div>
              
              <h1 className="text-4xl md:text-5xl font-bold leading-tight">
                Conoce a NAIA, <br />
                <span className="text-sky-300">tu asistente virtual</span> universitario
              </h1>
              
              <p className="text-lg text-sky-100">
                Diseñada para potenciar tu experiencia académica en la Universidad del Norte con asistencia de investigación inteligente y personalizada.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 pt-2">
                <NavLink
                  to="/naia"
                  className="flex items-center justify-center gap-2 bg-white text-blue-950 hover:bg-sky-50 px-6 py-3 rounded-xl font-medium transition-all shadow-lg shadow-blue-950/20 hover:shadow-xl hover:shadow-blue-950/30"
                >
                  Comenzar ahora
                  <ArrowRight size={18} />
                </NavLink>
                
                <button className="flex items-center justify-center gap-2 bg-white/10 backdrop-blur-sm hover:bg-white/15 px-6 py-3 rounded-xl font-medium transition-all border border-white/20">
                  <Video size={18} />
                  Ver demostración
                </button>
              </div>
            </div>
            
            <div className="flex-1 flex justify-center">
              <div className="relative w-64 h-64 md:w-80 md:h-80">
                <div className="absolute inset-0 bg-gradient-to-br from-sky-400 to-blue-600 rounded-full opacity-20 blur-2xl"></div>
                <img 
                  src="/assets/NAIA_greeting.png" 
                  alt="NAIA Virtual Assistant" 
                  className="relative z-10 w-full h-full object-contain drop-shadow-2xl"
                />
                <div className="absolute top-0 right-0 -mt-2 -mr-2 bg-sky-400 text-white text-xs font-bold px-2 py-1 rounded-full">IA</div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Features Section */}
      <section>
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-gray-800">
            Potenciando la investigación académica
          </h2>
          <p className="mt-3 text-lg text-gray-600 max-w-2xl mx-auto">
            NAIA está diseñada para ayudarte en cada etapa de tu proceso académico
          </p>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow group hover:border-sky-100">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-950 mb-4 group-hover:bg-blue-100 transition-colors">
              <Search size={22} />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-gray-800">Búsqueda académica</h3>
            <p className="text-gray-600">
              Encuentra artículos científicos relevantes usando Google Scholar sin salir de la aplicación.
            </p>
            <div className="mt-4 flex items-center text-sm font-medium text-blue-950 opacity-0 group-hover:opacity-100 transition-opacity">
              <span>Explorar función</span>
              <ChevronRight size={16} className="ml-1" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow group hover:border-sky-100">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-950 mb-4 group-hover:bg-blue-100 transition-colors">
              <BookOpen size={22} />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-gray-800">Análisis de PDFs</h3>
            <p className="text-gray-600">
              Procesa documentos PDF de hasta 1GB, extrayendo información clave y generando resúmenes.
            </p>
            <div className="mt-4 flex items-center text-sm font-medium text-blue-950 opacity-0 group-hover:opacity-100 transition-opacity">
              <span>Explorar función</span>
              <ChevronRight size={16} className="ml-1" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow group hover:border-sky-100">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-950 mb-4 group-hover:bg-blue-100 transition-colors">
              <MessageSquare size={22} />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-gray-800">Conversación natural</h3>
            <p className="text-gray-600">
              Interactúa con NAIA mediante texto o voz para obtener respuestas precisas a tus consultas académicas.
            </p>
            <div className="mt-4 flex items-center text-sm font-medium text-blue-950 opacity-0 group-hover:opacity-100 transition-opacity">
              <span>Explorar función</span>
              <ChevronRight size={16} className="ml-1" />
            </div>
          </div>
        </div>
      </section>
      
      {/* University Section */}
      <section className="bg-white p-8 rounded-3xl shadow-sm border border-gray-50">
        <div className="flex flex-col md:flex-row items-center gap-8">
          <div className="flex-1">
            <img 
              src="/assets/Uninorte_logo.png" 
              alt="Universidad del Norte" 
              className="w-64 mx-auto md:mx-0"
            />
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
          
          <div className="flex-1 bg-gradient-to-br from-gray-50 to-sky-50 p-6 rounded-2xl">
            <h4 className="font-semibold text-gray-800 mb-4">NAIA te ayuda con:</h4>
            <ul className="space-y-3">
              {[
                "Investigación bibliográfica avanzada",
                "Análisis de documentos académicos",
                "Generación de bibliografías y referencias",
                "Asistencia para redacción académica",
                "Búsqueda de recursos disponibles en la universidad"
              ].map((item, index) => (
                <li key={index} className="flex items-start">
                  <div className="w-5 h-5 bg-blue-950 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5 mr-3">
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <span className="text-gray-700">{item}</span>
                </li>
              ))}
            </ul>
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
            
            <h2 className="text-3xl font-bold mb-4">¿Listo para potenciar tu investigación académica?</h2>
            <p className="text-lg text-sky-100 mb-8 max-w-2xl mx-auto">
              Empieza a utilizar NAIA ahora mismo y descubre cómo puede transformar tu experiencia académica en la Universidad del Norte.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <NavLink
                to="/naia"
                className="flex items-center justify-center gap-2 bg-white text-blue-950 hover:bg-sky-50 px-6 py-3 rounded-xl font-medium transition-all shadow-lg shadow-blue-950/20 hover:shadow-xl hover:shadow-blue-950/30"
              >
                Comenzar con NAIA
                <ArrowRight size={18} />
              </NavLink>
              
              <NavLink
                to="/documents"
                className="flex items-center justify-center gap-2 bg-white/10 backdrop-blur-sm hover:bg-white/15 px-6 py-3 rounded-xl font-medium transition-all border border-white/20"
              >
                Explorar documentos
                <BookOpen size={18} />
              </NavLink>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Home