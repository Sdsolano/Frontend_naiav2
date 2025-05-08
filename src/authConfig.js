// authConfig.js
// Determinar la URL de redirección basada en el entorno
const isProduction = window.location.hostname === 'naia.uninorte.edu.co';
const redirectUri = isProduction 
  ? "https://naia.uninorte.edu.co" 
  : window.location.origin;

// authConfig.js
export const msalConfig = {
  auth: {
    clientId: "716c96e0-113d-4d95-af42-7ee4dc266e43",
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