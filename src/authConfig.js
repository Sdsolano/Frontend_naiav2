// authConfig.js - Configuración alternativa para Web Application
const isProduction = window.location.hostname === 'naia.uninorte.edu.co';

const redirectUri = isProduction 
  ? "https://naia.uninorte.edu.co/" 
  : window.location.origin;

const clientId = isProduction
  ? "71d031dd-5709-4ca1-84a6-d5f622f1a6c8" 
  : "716c96e0-113d-4d95-af42-7ee4dc266e43";

export const msalConfig = {
  auth: {
    clientId: clientId,
    authority: "https://login.microsoftonline.com/bab0b679-bd5f-4fe8-b516-c6b8b317c782",
    redirectUri: redirectUri,
    navigateToLoginRequestUrl: true,
    postLogoutRedirectUri: redirectUri,
    // Configuración para Web Application
    knownAuthorities: ["login.microsoftonline.com"],
    cloudDiscoveryMetadata: "",
    authorityMetadata: ""
  },
  cache: {
    cacheLocation: "localStorage", // Cambiar a localStorage para Web Apps
    storeAuthStateInCookie: true,
    secureCookies: isProduction // Solo cookies seguras en prod
  },
  system: {
    allowRedirectInIframe: false,
    iframeHashTimeout: 10000,
    tokenRenewalOffsetSeconds: 300,
    navigateFrameWait: 0,
    // Configuración específica para Web Application
    allowNativeBroker: false,
    windowHashTimeout: 60000,
    loggerOptions: {
      logLevel: isProduction ? 1 : 3,
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) return;
        if (isProduction && level < 1) return;
        console.log(`MSAL [${level}]: ${message}`);
      },
      piiLoggingEnabled: false
    }
  }
};

// Solicitud de login modificada para Web Application
export const loginRequest = {
  scopes: ["User.Read", "profile", "email", "openid"],
  extraScopesToConsent: [],
  forceRefresh: false,
  // Parámetros adicionales para Web Application
  prompt: "select_account",
  domainHint: "uninorte.edu.co" // Si todos los usuarios son de Uninorte
};