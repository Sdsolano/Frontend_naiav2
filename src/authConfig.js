// authConfig.js
const isProduction = window.location.hostname === 'naia.uninorte.edu.co';

const redirectUri = isProduction 
  ? "https://naia.uninorte.edu.co" 
  : window.location.origin.replace(/\/$/, "");

const clientId = isProduction
  ? "71d031dd-5709-4ca1-84a6-d5f622f1a6c8" 
  : "716c96e0-113d-4d95-af42-7ee4dc266e43";

export const msalConfig = {
  auth: {
    clientId: clientId,
    authority: "https://login.microsoftonline.com/bab0b679-bd5f-4fe8-b516-c6b8b317c782",
    redirectUri: redirectUri,
    navigateToLoginRequestUrl: true, // Importante para redirect
    postLogoutRedirectUri: redirectUri
  },
  cache: {
    cacheLocation: "sessionStorage", // Mejor para redirect
    storeAuthStateInCookie: true,    // Compatibilidad con aplicaciones Web
  },
  system: {
    allowRedirectInIframe: false,
    iframeHashTimeout: 10000,
    tokenRenewalOffsetSeconds: 300,
    navigateFrameWait: 0,
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

export const loginRequest = {
  scopes: ["User.Read", "profile", "email"],
  extraScopesToConsent: [],
  forceRefresh: false
};