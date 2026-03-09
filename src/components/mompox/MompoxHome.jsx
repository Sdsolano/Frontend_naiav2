import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Users, Video, MessageSquare } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import MompoxImage from "../../assets/mompox.png";
import MompoxHamburgerMenu from "./MompoxHamburgerMenu";

const HeroCarousel = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const images = [
    { src: MompoxImage, alt: "Asistente de Atención al Ciudadano", role: "Asistente Ciudadano" }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [images.length]);

  return (
    <div className="relative h-[340px] sm:h-[400px] md:h-[480px] lg:h-[520px] w-full max-w-full overflow-hidden ">
      <div className="absolute inset-0 rounded-full opacity-20 blur-3xl"></div>

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

      <div className="absolute top-4 right-4 bg-white/10 backdrop-blur-sm text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm border border-white/10">
        IA
      </div>
    </div>
  );
};

const MompoxHome = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleMenuToggle = () => {
    console.log("Boton hamburguesa presionado, isMenuOpen:", !isMenuOpen);
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-amber-50">
      <header className="text-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-blue-900 font-bold text-xl">M</span>
                </div>
                <div>
                  <h1 className="text-2xl font-bold">SABIA</h1>
                  <p className="text-blue-900/80 text-sm">Sistema de Atención de Bolívar con Inteligencia Artificial</p>
                </div>
              </div>
            </div>

            <button
              onClick={handleMenuToggle}
              className="p-3 rounded-lg bg-blue-900 hover:bg-blue-800 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-200"
              aria-label="Abrir menú"
              type="button"
            >
              <div className="w-6 h-6 flex flex-col justify-center items-center space-y-1">
                <div className={`w-5 h-0.5 bg-white rounded-full transition-all duration-300 ${isMenuOpen ? "rotate-45 translate-y-1.5" : ""}`}></div>
                <div className={`w-5 h-0.5 bg-white rounded-full transition-all duration-300 ${isMenuOpen ? "opacity-0" : ""}`}></div>
                <div className={`w-5 h-0.5 bg-white rounded-full transition-all duration-300 ${isMenuOpen ? "-rotate-45 -translate-y-1.5" : ""}`}></div>
              </div>
            </button>
          </div>
        </div>
      </header>

      <MompoxHamburgerMenu
        isOpen={isMenuOpen}
        onClose={() => {
          console.log("Cerrando menu");
          setIsMenuOpen(false);
        }}
      />

      <main className="space-y-12 pb-12 md:px-32">
        <section className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-blue-950 via-blue-900 to-blue-700 text-white shadow-2xl mx-4 sm:mx-6 lg:mx-8 mt-12">
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
              <div className="px-6 sm:px-8 lg:px-12 py-12 lg:py-16">
                <div className="space-y-4">
                  <div className="inline-flex items-center bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 text-sm font-medium">
                    <Users className="mr-2 h-4 w-4" />
                    Asistente IA
                  </div>

                  <h1 className="text-4xl md:text-5xl font-bold leading-tight">
                    Conoce a SABIA, <br />
                    <span className="text-amber-300">tu asistente AI</span> de Mompox
                  </h1>

                  <p className="text-lg sm:text-xl text-blue-100 leading-relaxed max-w-2xl">
                    Tu asistente inteligente para servicios gubernamentales de Mompox.
                    Obtén información sobre trámites, programas sociales y servicios al ciudadano de forma rápida y eficiente.
                  </p>

                  <div className="flex flex-col sm:flex-row gap-4 pt-4">
                    <Link
                      to="/mompox/naia"
                      className="flex items-center justify-center gap-2 bg-amber-400 text-blue-950 hover:bg-amber-300 px-8 py-4 rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl hover:scale-105"
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

              <div className="px-6 sm:px-8 lg:px-12 py-8 lg:py-12">
                <HeroCarousel />
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
                <h2 className="text-3xl sm:text-4xl font-bold text-slate-800 mb-4 md:pt-12">
                  Cómo puede ayudarte SABIA?
                </h2>
                <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                  Diseñado específicamente para la Gobernación de Mompox, nuestro asistente IA te guía
                  en todos los procesos gubernamentales.
                </p>

            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-blue-100">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-6">
                  <MessageSquare className="w-6 h-6 text-blue-800" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-4">Consultas Inteligentes</h3>
                <p className="text-gray-600">
                  Pregunta sobre cualquier trámite, programa social o servicio gubernamental
                  y recibe respuestas precisas al instante.
                </p>
              </div>

              <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-amber-200">
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mb-6">
                  <Users className="w-6 h-6 text-amber-700" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-4">Atención Personalizada</h3>
                <p className="text-gray-600">
                  Recibe orientación paso a paso adaptada a tu situación específica
                  y necesidades particulares.
                </p>
              </div>

              <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-blue-100">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-6">
                  <ArrowRight className="w-6 h-6 text-blue-800" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-4">Conexión Directa</h3>
                <p className="text-gray-600">
                  Te conectamos directamente con las dependencias correctas
                  cuando necesites atención presencial.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default MompoxHome;
