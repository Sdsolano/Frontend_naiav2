// authConfig.js - ULTRA LIMPIO para Single-Page Application
const isProduction = window.location.hostname === 'naia.uninorte.edu.co';

const redirectUri = isProduction 
  ? "https://naia.uninorte.edu.co/" 
  : window.location.origin + "/";

const clientId = isProduction
  ? "71d031dd-5709-4ca1-84a6-d5f622f1a6c8" 
  : "716c96e0-113d-4d95-af42-7ee4dc266e43";

if(isProduction) {
  console.log("Producción: Configuración de MSAL para NAIA");
}else {
  console.log("Desarrollo: Configuración de MSAL para NAIA");
}

export const msalConfig = {
  auth: {
    clientId: clientId,
    authority: "https://login.microsoftonline.com/bab0b679-bd5f-4fe8-b516-c6b8b317c782",
    redirectUri: redirectUri
    // MINIMALISTA - Solo lo esencial para SPA
  },
  cache: {
    cacheLocation: "sessionStorage", 
    storeAuthStateInCookie: false
    // PURO SPA - Sin configuraciones híbridas
  },
  system: {
    allowRedirectInIframe: false,
    loggerOptions: {
      logLevel: isProduction ? 1 : 3,
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) return;
        console.log(`MSAL [${level}]: ${message}`);
      },
      piiLoggingEnabled: false
    }
  }
};

export const loginRequest = {
  scopes: ["User.Read", "profile", "email", "openid"]
};