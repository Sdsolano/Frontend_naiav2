import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { X, Home, MessageSquare, ExternalLink, Sparkles } from "lucide-react";

const MompoxHamburgerMenu = ({ isOpen, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  const menuItems = [
    {
      icon: Home,
      label: "Inicio",
      to: "/mompox",
      description: "Volver a la pagina principal",
      gradient: "from-blue-800 to-blue-900"
    },
    {
      icon: MessageSquare,
      label: "Asistente NAIA",
      to: "/mompox/naia",
      description: "Interactuar con el asistente AI",
      gradient: "from-amber-500 to-amber-600"
    },
    {
      icon: ExternalLink,
      label: "Portal Mompox",
      href: "https://mompoxinteligente.bolivar.gov.co/",
      description: "Sitio web oficial",
      external: true,
      gradient: "from-slate-700 to-slate-800"
    }
  ];

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-md transition-all duration-500"
          onClick={onClose}
          style={{ zIndex: 9998 }}
        />
      )}

      <div
        className={`fixed top-4 right-4 bottom-4 w-96 max-w-sm bg-white bg-opacity-90 backdrop-blur-xl shadow-2xl transition-all duration-500 ease-out flex flex-col border border-white border-opacity-20 ${
          isOpen ? "transform translate-x-0 scale-100 opacity-100" : "transform translate-x-full scale-95 opacity-0"
        }`}
        style={{
          zIndex: 9999,
          borderRadius: "24px",
          boxShadow: `
            0 25px 50px -12px rgba(0, 0, 0, 0.25),
            0 0 0 1px rgba(255, 255, 255, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 0.3)
          `
        }}
      >
        <div className="absolute inset-0 overflow-hidden rounded-3xl">
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-blue-400 to-amber-400 opacity-20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-amber-300 to-blue-500 opacity-20 rounded-full blur-2xl animate-pulse delay-1000"></div>
        </div>

        <div className="relative bg-gradient-to-r from-blue-950 via-blue-900 to-blue-700 text-white p-6 rounded-t-3xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-950 to-blue-700 opacity-90"></div>
          <div className="absolute top-0 right-0 w-20 h-20 bg-white bg-opacity-10 rounded-full -translate-y-4 translate-x-4"></div>
          <div className="absolute bottom-0 left-0 w-16 h-16 bg-white bg-opacity-10 rounded-full translate-y-4 -translate-x-4"></div>

          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">NAIA Gov</h2>
                  <p className="text-blue-100 text-sm opacity-90">Gobernacion de Mompox</p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-2 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 transition-all duration-300 backdrop-blur-sm hover:scale-110 group"
                aria-label="Cerrar menu"
              >
                <X size={24} className="group-hover:rotate-90 transition-transform duration-300" />
              </button>
            </div>
          </div>
        </div>

        <nav className="flex-1 py-6 px-4 relative z-10">
          <div className="space-y-3">
            {menuItems.map((item, index) => {
              const Icon = item.icon;

              if (item.external) {
                return (
                  <a
                    key={index}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center space-x-4 p-4 rounded-2xl bg-white bg-opacity-50 hover:bg-opacity-80 backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:shadow-lg border border-white border-opacity-30"
                    onClick={onClose}
                    style={{
                      animationDelay: `${index * 100}ms`,
                      animation: isOpen ? "slideInRight 0.5s ease-out forwards" : ""
                    }}
                  >
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${item.gradient} flex items-center justify-center text-white shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110`}>
                      <Icon size={20} />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-800 group-hover:text-gray-900">{item.label}</div>
                      <div className="text-sm text-gray-600 group-hover:text-gray-700">{item.description}</div>
                    </div>
                    <ExternalLink size={16} className="text-gray-400 group-hover:text-gray-600 transition-colors duration-300" />
                  </a>
                );
              }

              return (
                <Link
                  key={index}
                  to={item.to}
                  className="group flex items-center space-x-4 p-4 rounded-2xl bg-white bg-opacity-50 hover:bg-opacity-80 backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:shadow-lg border border-white border-opacity-30"
                  onClick={onClose}
                  style={{
                    animationDelay: `${index * 100}ms`,
                    animation: isOpen ? "slideInRight 0.5s ease-out forwards" : ""
                  }}
                >
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${item.gradient} flex items-center justify-center text-white shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110`}>
                    <Icon size={20} />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-800 group-hover:text-gray-900">{item.label}</div>
                    <div className="text-sm text-gray-600 group-hover:text-gray-700">{item.description}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="relative border-t border-white border-opacity-30 p-6 rounded-b-3xl bg-white bg-opacity-30 backdrop-blur-sm">
          <div className="text-center">
            <p className="text-sm text-gray-700 font-medium">
              © 2025 Gobernacion de Mompox
            </p>
            <p className="text-xs text-gray-600 mt-1 flex items-center justify-center space-x-1">
              <span>Powered by</span>
              <Sparkles className="w-3 h-3" />
              <span>NAIA AI Technology</span>
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </>
  );
};

export default MompoxHamburgerMenu;
