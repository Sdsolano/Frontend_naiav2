export const msalConfig = {
    auth: {
      clientId: "716c96e0-113d-4d95-af42-7ee4dc266e43",
      authority: "https://login.microsoftonline.com/bab0b679-bd5f-4fe8-b516-c6b8b317c782",
      redirectUri: "http://localhost:3000"
    },
    cache: {
      cacheLocation: "sessionStorage",
      storeAuthStateInCookie: false,
    }
  };
  
  export const loginRequest = {
    scopes: ["User.Read"]
  };