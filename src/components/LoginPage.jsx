import React, { useState } from 'react';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../authConfig';
import { useNotification } from './NotificationContext';
import Uninorte_logo from '../assets/Uninorte_logo.png';
import NaiaGreeting from '../assets/NAIA_greeting.png';
const LoginPage = () => {
  const { instance } = useMsal();
  const { addNotification } = useNotification();
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async () => {
    if (isLoggingIn) return;
    
    setIsLoggingIn(true);
    
    try {
      await instance.loginPopup(loginRequest);
      // Login successful - UI will update automatically via AuthenticatedTemplate
    } catch (error) {
      console.error('Login error:', error);
      addNotification(
        error.message || "Error al iniciar sesión. Por favor intente nuevamente.", 
        "error"
      );
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-r from-white-500 to-white">
      <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full">
        <div className="text-center mb-6">
          <img src={Uninorte_logo} alt="Logo" className="w-auto h-14 mx-auto mb-6" />
          <h1 className="text-2xl font-black">NAIA</h1>
        </div>
        
        {/*<h2 className="text-l font-bold text-center">Bienvenido</h2>*/}
        
        <div className="flex justify-center">
          <img src={NaiaGreeting} alt="" className="w-auto h-44" />
        </div>
        
        <button
          onClick={handleLogin}
          disabled={isLoggingIn}
          className={`w-full bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-4 rounded-md transition duration-200 flex items-center justify-center ${
            isLoggingIn ? 'opacity-70 cursor-not-allowed' : ''
          }`}
        >
          {isLoggingIn ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Iniciando sesión...
            </>
          ) : (
            <>
            <svg width="20" height="20" className="mr-1" viewBox="0 0 1024 1024" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M44.522 44.5217H489.739V489.739H44.522V44.5217Z" fill="#F35325"/>
                <path d="M534.261 44.5217H979.478V489.739H534.261V44.5217Z" fill="#81BC06"/>
                <path d="M44.522 534.261H489.739V979.478H44.522V534.261Z" fill="#05A6F0"/>
                <path d="M534.261 534.261H979.478V979.478H534.261V534.261Z" fill="#FFBA08"/>
                </svg>

             
              Iniciar Sesión con Microsoft
            </>
          )}
        </button>
        
        <p className="mt-4 text-xs text-gray-500 text-center">
          Este sistema es solo para usuarios uninorte.
        </p>
      </div>
    </div>
  );
};

export default LoginPage;