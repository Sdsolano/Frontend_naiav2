import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Users, Video, MessageSquare, BookOpen } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Companion_AF from "../../assets/Companion_AF.png";
import ToeflHamburgerMenu from './ToeflHamburgerMenu';

const HeroCarousel = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const images = [
    { src: Companion_AF, alt: "Asistente TOEFL", role: "Asistente TOEFL" }
  ];

  // Avanzar automáticamente cada 5 segundos (aunque solo hay una imagen)
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [images.length]);

  return (
    <div className="relative h-[340px] sm:h-[400px] md:h-[480px] lg:h-[520px] w-full max-w-full overflow-hidden ">
      {/* Sutil efecto de resplandor */}
      <div className="absolute inset-0 rounded-full opacity-20 blur-3xl"></div>

      {/* Carrusel de imágenes */}
      <div className="relative h-full w-full flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="relative h-full max-h-full w-auto flex items-center justify-center">
              <motion.img
                src={images[currentIndex].src}
                alt={images[currentIndex].alt}
                className="h-full w-auto max-w-full object-contain drop-shadow-2xl"
                animate={{
                  scale: [1, 1.02, 1],
                }}
                transition={{
                  duration: 6,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Indicadores del carrusel */}
      <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2">
        {images.map((image, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`flex flex-col items-center transition-all duration-300 ${
              index === currentIndex
                ? "transform scale-110"
                : "opacity-70 hover:opacity-100"
            }`}
            aria-label={`Ver ${image.role}`}
          >
            <div className={`w-2 h-2 rounded-full ${
              index === currentIndex
                ? "w-6 bg-white"
                : "bg-white/50 hover:bg-white/80"
            }`}></div>
            {index === currentIndex && (
              <motion.span
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-white text-xs mt-2 font-medium"
              >
                {image.role}
              </motion.span>
            )}
          </button>
        ))}
      </div>

      {/* Etiqueta de IA con estilo minimalista */}
      <div className="absolute top-4 right-4 bg-white/10 backdrop-blur-sm text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm border border-white/10">
        IA
      </div>
    </div>
  );
};

const ToeflHome = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Cerrar menú con Escape
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Debug function para verificar que el botón funciona
  const handleMenuToggle = () => {
    console.log('🍔 Botón hamburguesa presionado, isMenuOpen:', !isMenuOpen);
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-white">
      {/* Header */}
      <header className="text-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            {/* Logo y título */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-blue-600 font-bold text-xl">T</span>
                </div>
                <div>
                  <h1 className="text-2xl font-bold">NAIA TOEFL</h1>
                  <p className="text-blue-800 text-sm">Tu preparación inteligente para el TOEFL</p>
                </div>
              </div>
            </div>

            {/* Hamburger Menu Button - MEJORADO */}
            <button
              onClick={handleMenuToggle}
              className="p-3 rounded-lg bg-blue-600 hover:bg-blue-400 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white/50"
              aria-label="Abrir menú"
              type="button"
            >
              <div className="w-6 h-6 flex flex-col justify-center items-center space-y-1">
                <div className={`w-5 h-0.5 bg-white rounded-full transition-all duration-300 ${isMenuOpen ? 'rotate-45 translate-y-1.5' : ''}`}></div>
                <div className={`w-5 h-0.5 bg-white rounded-full transition-all duration-300 ${isMenuOpen ? 'opacity-0' : ''}`}></div>
                <div className={`w-5 h-0.5 bg-white rounded-full transition-all duration-300 ${isMenuOpen ? '-rotate-45 -translate-y-1.5' : ''}`}></div>
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* Hamburger Menu - ASEGURAR QUE SE RENDERIZA */}
      <ToeflHamburgerMenu
        isOpen={isMenuOpen}
        onClose={() => {
          console.log('🚪 Cerrando menú');
          setIsMenuOpen(false);
        }}
      />

      {/* Main Content */}
      <main className="space-y-12 pb-12 md:px-32">
        {/* Hero Section */}
        <section className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-600 text-white shadow-2xl mx-4 sm:mx-6 lg:mx-8 mt-12">
          {/** SVG background como variable para evitar error de comillas en JSX **/}
          {(() => {
            const svgBg = "data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='white' fill-opacity='0.1'%3E%3Cpath d='m0 40l40-40h-40v40zm40 0v-40h-40l40 40z'/%3E%3C/g%3E%3C/svg%3E";
            return (
              <div
                className="absolute inset-0 opacity-20"
                style={{ backgroundImage: `url(\"${svgBg}\")` }}
              ></div>
            );
          })()}

          <div className="relative">
            <div className="grid lg:grid-cols-2 gap-8 lg:gap-2 items-center">
              {/* Contenido de texto */}
              <div className="px-6 sm:px-8 lg:px-12 py-12 lg:py-16">
                <div className="space-y-4">
                  <div className="inline-flex items-center bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 text-sm font-medium">
                    <BookOpen className="mr-2 h-4 w-4" />
                    Asistente TOEFL IA
                  </div>

                 <h1 className="text-4xl md:text-5xl font-bold leading-tight">
                  Conoce a NAIA, <br />
                  <span className="text-blue-300">tu tutora AI</span> para TOEFL
                    </h1>

                  <p className="text-lg sm:text-xl text-blue-100 leading-relaxed max-w-2xl">
                    Tu asistente inteligente especializado en preparación TOEFL.
                    Practica listening, reading, speaking y writing con ejercicios personalizados y retroalimentación inmediata.
                  </p>

                  <div className="flex flex-col sm:flex-row gap-4 pt-4">
                    <Link
                      to="/toefl/naia"
                      className="flex items-center justify-center gap-2 bg-white text-blue-600 hover:bg-blue-50 px-8 py-4 rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl hover:scale-105"
                    >
                      Comenzar ahora
                      <ArrowRight size={18} />
                    </Link>

                    <button className="flex items-center justify-center gap-2 border-2 border-white/30 text-white hover:bg-white/10 px-8 py-4 rounded-xl font-semibold transition-all">
                      <Video size={18} />
                      Ver demo
                    </button>
                  </div>
                </div>
              </div>

              {/* Carrusel de imágenes */}
              <div className="px-6 sm:px-8 lg:px-12 py-8 lg:py-12">
                <HeroCarousel />
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-4 md:pt-12">
                ¿Cómo puede ayudarte NAIA con el TOEFL?
              </h2>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                Diseñado específicamente para la preparación TOEFL, nuestro asistente IA te guía
                en todas las secciones del examen.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-blue-100">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-6">
                  <MessageSquare className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-4">Práctica Interactiva</h3>
                <p className="text-gray-600">
                  Practica todas las secciones del TOEFL con ejercicios adaptativos
                  y recibe retroalimentación inmediata personalizada.
                </p>
              </div>

              <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-indigo-100">
                <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mb-6">
                  <Users className="w-6 h-6 text-indigo-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-4">Evaluación Personalizada</h3>
                <p className="text-gray-600">
                  Identifica tus fortalezas y áreas de mejora con análisis detallados
                  de tu progreso en cada sección.
                </p>
              </div>

              <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-blue-100">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-6">
                  <BookOpen className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-4">Estrategias Avanzadas</h3>
                <p className="text-gray-600">
                  Aprende técnicas específicas para cada sección del TOEFL
                  y mejora tu puntuación con estrategias comprobadas.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default ToeflHome;