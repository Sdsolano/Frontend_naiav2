import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { NotificationProvider } from './components/NotificationContext';
import { ChatProvider } from "./hooks/useChat";
import "./index.css";

// MSAL imports
import { PublicClientApplication } from '@azure/msal-browser';
import { MsalProvider } from '@azure/msal-react';
import { msalConfig } from './authConfig';

// Initialize MSAL instance
const msalInstance = new PublicClientApplication(msalConfig);

// Check if there are cached accounts
const accounts = msalInstance.getAllAccounts();
if (accounts.length > 0) {
  msalInstance.setActiveAccount(accounts[0]);
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <MsalProvider instance={msalInstance}>
      <NotificationProvider>
        <ChatProvider>
          <App />
        </ChatProvider>
      </NotificationProvider>
    </MsalProvider>
  </React.StrictMode>
);