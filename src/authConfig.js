// authConfig.js
// Determinar la URL de redirección basada en el entorno
const isProduction = window.location.hostname === 'naia.uninorte.edu.co';
console.log("Entorno de producción:", isProduction);
const redirectUri = isProduction 
  ? "https://naia.uninorte.edu.co" 
  : "https://naia.uninorte.edu.co" ;

// Determinar el clientId basado en el entorno
const clientId = isProduction
  ? "71d031dd-5709-4ca1-84a6-d5f622f1a6c8" 
  : "71d031dd-5709-4ca1-84a6-d5f622f1a6c8";

// authConfig.js
export const msalConfig = {
  auth: {
    clientId: clientId,
    authority: "https://login.microsoftonline.com/bab0b679-bd5f-4fe8-b516-c6b8b317c782",
    redirectUri: redirectUri,
    navigateToLoginRequestUrl: false
  },
  cache: {
    cacheLocation: "localStorage",
    storeAuthStateInCookie: false, // CAMBIADO: desactivar cookies para autenticación
    secureCookies: false // AÑADIDO: desactivar cookies seguras
  },
  system: {
    allowRedirectInIframe: true,
    iframeHashTimeout: 6000,
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) return;
        if (level >= 3) console.log(`MSAL: ${message}`);
      },
      piiLoggingEnabled: false
    }
  }
};

export const loginRequest = {
  scopes: ["User.Read", "profile", "openid", "email"]
};