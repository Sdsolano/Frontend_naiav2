// authConfig.js

const isProduction = window.location.hostname === 'naia.uninorte.edu.co';

const redirectUri = isProduction 
  ? "https://naia.uninorte.edu.co" 
  : window.location.origin;

// Determinar el clientId basado en el entorno
const clientId = isProduction
  ? "71d031dd-5709-4ca1-84a6-d5f622f1a6c8" 
  : "716c96e0-113d-4d95-af42-7ee4dc266e43";

const normalizeUrl = (url) => {
  // Si URL tiene barra al final, la eliminamos
  if (url.endsWith('/')) {
    return url.slice(0, -1);
  }
  return url;
};


// authConfig.js
export const msalConfig = {
  auth: {
    clientId: clientId,
    authority: "https://login.microsoftonline.com/bab0b679-bd5f-4fe8-b516-c6b8b317c782",
    redirectUri: isProduction ? "https://naia.uninorte.edu.co" : "http://localhost:3000",
    navigateToLoginRequestUrl: true
  },
  cache: {
    cacheLocation: "sessionStorage", // Cambiar de localStorage a sessionStorage
    storeAuthStateInCookie: true,    // Habilitar esto para mayor compatibilidad
  },
  system: {
    allowRedirectInIframe: true,
    iframeHashTimeout: 6000,
    // Añadir configuración para soportar aplicaciones no-SPA
    tokenRenewalOffsetSeconds: 300,
    navigateFrameWait: 0,
    // Aumentar el nivel de logging para ver más detalles
    loggerOptions: {
      logLevel: 3, // Verbose (para debugging)
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) return;
        console.log(`MSAL [${level}]: ${message}`);
      },
      piiLoggingEnabled: false
    }
  }
};

export const loginRequest = {
  scopes: ["User.Read", "profile","email"]
};