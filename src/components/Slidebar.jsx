"use client"

import { useState, useEffect } from "react"
import { NavLink, useLocation, useNavigate } from "react-router-dom"
import { Home, FileText, Menu, X, Layers, LogIn, LogOut, User } from "lucide-react"
import { useIsAuthenticated, useMsal } from "@azure/msal-react"
import { useAuth } from "./AuthContext";

const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const isNaiaRoute = location.pathname === "/naia"
  const { instance, accounts } = useMsal()
  const { isAuthenticated, handleLogout, openLoginModal } = useAuth();

  // Obtener información del usuario autenticado
  const userAccount = accounts[0];
  const userName = userAccount?.name || userAccount?.username?.split('@')[0] || '';
  const userEmail = userAccount?.username || '';

  // Close sidebar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const sidebar = document.getElementById("sidebar")
      const toggleButton = document.getElementById("sidebar-toggle")

      if (
        isOpen &&
        sidebar &&
        !sidebar.contains(event.target) &&
        toggleButton &&
        !toggleButton.contains(event.target)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isOpen])

  // Close sidebar with escape key
  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === "Escape" && isOpen) {
        setIsOpen(false)
      }
    }

    document.addEventListener("keydown", handleEscKey)
    return () => document.removeEventListener("keydown", handleEscKey)
  }, [isOpen])

  const toggleSidebar = () => {
    setIsOpen(!isOpen)
  }

  // Add a special z-index for the toggle button when on the NAIA route
  const toggleButtonZIndex = isNaiaRoute ? "z-[1000]" : "z-50"

  return (
    <>
      {/* Toggle Button - Always visible */}
      <button
        id="sidebar-toggle"
        onClick={toggleSidebar}
        className={`fixed top-6 left-6 ${toggleButtonZIndex} flex items-center justify-center w-12 h-12 bg-gradient-to-br from-white to-white-600 bg-opacity-50 text-black rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:ring-offset-2`}
        aria-label="Toggle menu"
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar - Only visible when open */}
      <div
        id="sidebar"
        className={`fixed inset-y-0 left-0 z-[1001] w-72 transform transition-all duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-full flex flex-col m-4 rounded-2xl bg-white bg-opacity-80  backdrop-blur-md shadow-2xl overflow-hidden border border-sky-100">
          {/* Logo/Brand */}
          <div className="p-6 border-b border-sky-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-blue-800 to-blue-950">
                <Layers className="text-white" size={20} />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-950 to-sky-900 bg-clip-text text-transparent">
                NAIA
              </h1>
            </div>
            
            {/* User info - only show when authenticated */}
            {isAuthenticated && userName && (
              <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50 to-sky-50 rounded-xl border border-blue-100">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 text-white text-sm font-semibold">
                  {userName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">
                    {userName}
                  </p>
                  <p className="text-xs text-gray-500 truncate" title={userEmail}>
                    {userEmail}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 overflow-y-auto p-4">
            <ul className="space-y-2">
              <li>
                <NavLink
                  to="/"
                  className={({ isActive }) =>
                    `flex items-center p-4 rounded-xl transition-all ${
                      isActive ? "bg-gray-300 text-blue-950 font-medium shadow-sm" : "text-gray-600 hover:bg-gray-50"
                    }`
                  }
                  onClick={() => setIsOpen(false)}
                >
                  <Home className="mr-3" size={20} />
                  <span>Home</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/documents"
                  className={({ isActive }) =>
                    `flex items-center p-4 rounded-xl transition-all ${
                      isActive ? "bg-gray-300 text-blue-950 font-medium shadow-sm" : "text-gray-600 hover:bg-gray-50"
                    }`
                  }
                  onClick={() => setIsOpen(false)}
                >
                  <FileText className="mr-3" size={20} />
                  <span>Documents</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/naia"
                  className={({ isActive }) =>
                    `flex items-center p-4 rounded-xl transition-all ${
                      isActive ? "bg-gray-300 text-blue-950 font-medium shadow-sm" : "text-gray-600 hover:bg-gray-50"
                    }`
                  }
                  onClick={() => setIsOpen(false)}
                >
                  <div className="w-5 h-5 mr-3 flex items-center justify-center rounded-md bg-gradient-to-br from-blue-800 to-blue-950 text-white font-medium text-xs">
                    N
                  </div>
                  <span>NAIA</span>
                </NavLink>
              </li>
              
              {/* Botón de inicio o cierre de sesión según el estado de autenticación */}
              {!isAuthenticated ? (
                <li>
                  <button
                    onClick={() => {
                      openLoginModal();
                      setIsOpen(false);
                    }}
                    className="w-full flex items-center p-4 rounded-xl transition-all text-gray-600 hover:bg-gray-50"
                  >
                    <LogIn className="mr-3" size={20} />
                    <span>Iniciar sesión</span>
                  </button>
                </li>
              ) : (
                <li>
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsOpen(false);
                    }}
                    className="w-full flex items-center p-4 rounded-xl transition-all text-gray-600 hover:bg-gray-50"
                  >
                    <LogOut className="mr-3" size={20} />
                    <span>Cerrar sesión</span>
                  </button>
                </li>
              )}
            </ul>
          </nav>

          {/* Footer */}
          <div className="p-6 border-t border-sky-100">
            <p className="text-sm text-gray-500">© 2025 NAIA</p>
          </div>
        </div>
      </div>

      {/* Overlay - Only visible when sidebar is open */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[1000]" onClick={() => setIsOpen(false)} />
      )}
    </>
  )
}

export default Sidebar