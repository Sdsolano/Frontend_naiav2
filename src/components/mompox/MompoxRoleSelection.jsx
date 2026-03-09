import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Users, ArrowRight, X, ChevronLeft, Info } from "lucide-react";
import Thinking_naia from "../../assets/NAIA_greeting.png";
import MompoxImage from "../../assets/mompox.png";
import { getMompoxConfig } from "../../utils/roleUtils";

const roles = [
  {
    id: "mompox",
    icon: Users,
    title: "Asistente de Atención al Ciudadano",
    description: "Tu guía especializada para trámites y servicios gubernamentales de Mompox.",
    color: "bg-blue-900",
    textColor: "text-blue-900",
    bgColor: "bg-blue-50",
    hoverBgColor: "hover:bg-blue-50",
    borderColor: "border-blue-200",
    available: true,
    image: MompoxImage,
    features: [
      "Información sobre trámites y servicios gubernamentales",
      "Orientación para procesos administrativos",
      "Consultas sobre programas sociales y beneficios ciudadanos",
      "Contacto directo con dependencias específicas",
      "Horarios de atención y requisitos documentales"
    ],
    developmentStatus: "Disponible ahora - Especializado en Gobernación de Mompox",
    functionPlaceholder: "TODO(MOMPOX): agregar funciones cuando se definan"
  }
];

const MompoxRoleSelection = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedRole, setSelectedRole] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [windowWidth, setWindowWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 1024);
  const navigate = useNavigate();

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleSelectRole = (role) => {
    setSelectedRole(role);
    setShowDetails(true);
  };

  const handleConfirmRole = () => {
    if (selectedRole && selectedRole.available) {
      const mompoxConfig = getMompoxConfig();
      localStorage.setItem("naia_selected_role", mompoxConfig.roleKey);
      localStorage.setItem("naia_mompox_context", "true");
      localStorage.setItem("naia_user_id", mompoxConfig.userId.toString());

      console.log(`Contexto Mompox activado: ${selectedRole.title} (${selectedRole.id})`);

      window.dispatchEvent(new CustomEvent("role-changed", {
        detail: { roleId: selectedRole.id, roleName: selectedRole.title, isMompox: true }
      }));

      navigate("/mompox/naia/interface");
    }
  };

  const RoleDetailsPanel = () => {
    if (!selectedRole) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-3 overflow-auto" onClick={() => setShowDetails(false)}>
        <div
          className={`relative bg-white rounded-3xl shadow-2xl w-full max-w-3xl border ${selectedRole.borderColor} my-4 max-h-[95vh] overflow-hidden flex flex-col`}
          onClick={e => e.stopPropagation()}
        >
          <button
            className="absolute top-4 right-4 z-50 w-8 h-8 flex items-center justify-center rounded-full bg-white/90 hover:bg-white text-gray-700 transition-colors shadow-md"
            onClick={() => setShowDetails(false)}
          >
            <X size={20} />
          </button>

          <div className="overflow-y-auto max-h-[calc(82vh-4rem)] md:max-h-[calc(88vh-4rem)]">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-0">
              <div className={`md:col-span-5 ${selectedRole.bgColor} p-0 relative overflow-hidden`}>
                <div className="h-[280px] sm:h-[400px] md:h-[600px]">
                  <img
                    src={selectedRole.image}
                    alt={selectedRole.title}
                    className="w-full h-full object-cover"
                  />

                  <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/60 to-transparent"></div>

                  <div className="absolute top-4 left-4 sm:top-6 sm:left-6 flex items-center gap-2 bg-white/90 backdrop-blur-sm px-3 py-2 sm:px-4 sm:py-3 rounded-xl shadow-lg">
                    <div className={`w-8 h-8 sm:w-10 sm:h-10 ${selectedRole.color} rounded-lg flex items-center justify-center text-white`}>
                      {React.createElement(selectedRole.icon, { size: 18 })}
                    </div>
                    <div>
                      <h2 className={`text-base sm:text-xl font-bold ${selectedRole.textColor}`}>{selectedRole.title}</h2>
                      <div className={`text-xs ${selectedRole.available ? "text-green-600" : "text-gray-500"} font-medium`}>
                        {selectedRole.available ? "Disponible" : "Proximamente"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="md:col-span-7 p-4 sm:p-6 md:p-8 flex flex-col justify-between">
                <div>
                  <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800 mb-2 sm:mb-4">{selectedRole.title}</h3>
                  <p className="text-gray-600 text-sm sm:text-base mb-4 sm:mb-6 leading-relaxed">{selectedRole.description}</p>

                  <div className="mb-4 sm:mb-6">
                    <h4 className="font-semibold text-gray-800 mb-2 sm:mb-3 text-sm sm:text-base">Capacidades principales:</h4>
                    <ul className="space-y-1.5 sm:space-y-2">
                      {selectedRole.features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-2 sm:gap-3">
                          <div className={`w-5 h-5 sm:w-6 sm:h-6 ${selectedRole.color} rounded-full flex items-center justify-center text-white flex-shrink-0 mt-0.5`}>
                            <span className="text-xs sm:text-sm font-bold">{index + 1}</span>
                          </div>
                          <span className="text-gray-700 text-xs sm:text-sm md:text-base">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => setShowDetails(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors text-xs sm:text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirmRole}
                    className={`flex-1 px-4 py-2 ${selectedRole.color} text-white rounded-xl font-medium hover:bg-opacity-90 transition-colors flex items-center justify-center gap-2 text-xs sm:text-sm`}
                  >
                    <span>Continuar</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-amber-50">
      <header className="relative text-blue-900 ">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            <Link
              to="/mompox"
              className="flex items-center space-x-2 hover:bg-white/10 px-3 py-2 rounded-lg transition-colors duration-200"
            >
              <ChevronLeft size={20} />
              <span className="font-medium">Volver</span>
            </Link>

            <div className="text-center">
              <h1 className="text-lg sm:text-xl font-bold">SABIA</h1>
              <p className="text-blue-800 text-xs sm:text-sm">Sistema de Atención de Bolívar con Inteligencia Artificial</p>
            </div>

            <div className="w-20"></div>
          </div>
        </div>

      </header>

      <main className="flex-1 overflow-x-hidden">
        <div className="max-w-6xl mx-auto px-2 sm:px-4 w-full">
          <div className="relative mb-4 sm:mb-8 w-full overflow-hidden">
            <div className="flex justify-center items-center h-[430px] sm:h-[550px] md:h-[700px] overflow-hidden py-4 max-w-full w-full mx-auto px-1">
              {roles.map((role, index) => {
                const isActive = true;
                const zIndex = 30;
                const opacity = 1;
                const scale = 1;

                return (
                  <div
                    key={role.id}
                    className="absolute transform transition-all duration-500 ease-in-out cursor-pointer"
                    style={{
                      zIndex,
                      opacity,
                      transform: `translateX(0) scale(${scale})`,
                    }}
                    onClick={() => handleSelectRole(role)}
                  >
                    <div
                      className={`w-56 xs:w-64 sm:w-80 md:w-96 h-[450px] xs:h-[480px] sm:h-[600px] md:h-[700px] rounded-2xl overflow-hidden shadow-xl border-2 ${role.available ? role.borderColor : "border-gray-300"} bg-white transition-all duration-300 group hover:shadow-2xl`}
                    >
                      <div className={`h-16 xs:h-20 sm:h-24 md:h-28 ${role.color} text-white p-3 sm:p-4 flex flex-col justify-center relative overflow-hidden`}>
                        <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/10 rounded-full"></div>
                        <div className="relative z-10">
                          <div className="flex items-center justify-between mb-1">
                            <role.icon className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7" />
                            <div className="w-1.5 h-1.5 bg-white rounded-full opacity-80"></div>
                          </div>
                          <h3 className="text-sm sm:text-lg md:text-xl font-bold leading-tight">{role.title}</h3>
                        </div>
                      </div>

                      <div className="relative h-[250px] xs:h-[280px] sm:h-[380px] md:h-[450px] overflow-hidden">
                        <img
                          src={role.image}
                          alt={role.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                      </div>

                      <div className="p-5">
                        <div>
                          <div className={`inline-flex items-center text-xs ${role.available ? "bg-amber-100 text-amber-900" : "bg-gray-100 text-gray-800"} px-2 py-1 rounded-full font-medium`}>
                            {role.available ? "Disponible" : "Proximamente"}
                          </div>
                        </div>

                        <button
                          className={`mt-2 w-full ${role.textColor} border ${role.borderColor} ${role.hoverBgColor}
                            py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold
                            transition-all duration-300 group-hover:scale-105
                            flex items-center justify-center gap-1`}
                        >
                          <span>Ver detalles</span>
                          <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform duration-200" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 md:p-8 max-w-4xl mx-auto border border-blue-100">
            <div className="flex items-start gap-3 sm:gap-6">
              <div className={`w-10 h-10 sm:w-14 sm:h-14 ${roles[activeIndex].color} rounded-xl flex items-center justify-center text-white flex-shrink-0`}>
                {React.createElement(roles[activeIndex].icon, { size: 20, className: "sm:w-7 sm:h-7" })}
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                  <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800">{roles[activeIndex].title}</h2>
                  <div className={`text-xs ${roles[activeIndex].available ? "bg-amber-100 text-amber-900" : "bg-gray-100 text-gray-800"} px-2 py-0.5 sm:py-1 rounded-full font-medium`}>
                    {roles[activeIndex].available ? "Disponible" : "Proximamente"}
                  </div>
                </div>

                <p className="text-gray-600 text-sm sm:text-base mb-3 sm:mb-4 leading-relaxed">
                  {roles[activeIndex].description}
                </p>

                <div className="flex flex-wrap gap-2 sm:gap-3">
                  <button
                    onClick={() => handleSelectRole(roles[activeIndex])}
                    className={`${roles[activeIndex].available ? roles[activeIndex].color + " text-white hover:bg-opacity-90" : "bg-gray-300 text-gray-600 cursor-not-allowed"}
                      px-4 py-2 sm:px-6 sm:py-3 rounded-xl font-semibold transition-all duration-300
                      flex items-center gap-2 text-sm sm:text-base ${roles[activeIndex].available ? "hover:scale-105 hover:shadow-lg" : ""}`}
                    disabled={!roles[activeIndex].available}
                  >
                    <span>{roles[activeIndex].available ? "Comenzar ahora" : "Proximamente"}</span>
                    {roles[activeIndex].available && <ArrowRight size={16} className="sm:w-5 sm:h-5" />}
                  </button>

                  <button
                    onClick={() => handleSelectRole(roles[activeIndex])}
                    className={`${roles[activeIndex].textColor} border ${roles[activeIndex].borderColor} ${roles[activeIndex].hoverBgColor}
                      px-4 py-2 sm:px-6 sm:py-3 rounded-xl font-semibold transition-all duration-300
                      flex items-center gap-2 text-sm sm:text-base hover:scale-105`}
                  >
                    <span>Ver detalles</span>
                    <ArrowRight size={16} className="sm:w-5 sm:h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-center mt-6 sm:mt-8">
            <div className="flex gap-2">
               <div className="w-4 sm:w-6 h-2 bg-blue-900 rounded-full" aria-label="Rol actual" />
            </div>
          </div>
        </div>
      </main>

      <footer className="py-4 sm:py-6 border-t border-gray-200 bg-white/70 backdrop-blur-sm mt-4">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 flex flex-col sm:flex-row justify-between items-center">
          <div className="flex items-center mb-3 sm:mb-0">
            <img
              src={Thinking_naia}
              alt="NAIA Logo"
              className="h-8 sm:h-10 w-auto mr-2 sm:mr-3"
            />
            <div>
              <h2 className="text-base sm:text-lg font-bold bg-gradient-to-r from-blue-900 to-amber-500 bg-clip-text text-transparent">SABIA</h2>
              <p className="text-[10px] sm:text-xs text-gray-500">Gobernación de Mompox (c) 2025</p>
            </div>
          </div>
          <div className="flex items-center space-x-4 sm:space-x-6 text-gray-600">
            <Link to="/mompox" className="text-xs sm:text-sm hover:text-blue-900 transition-colors flex items-center gap-1">
              <Info size={14} className="sm:w-4 sm:h-4" />
              <span>Acerca de SABIA</span>
            </Link>
          </div>
        </div>
      </footer>

      {showDetails && <RoleDetailsPanel />}
    </div>
  );
};

export default MompoxRoleSelection;
