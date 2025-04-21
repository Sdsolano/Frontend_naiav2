import React from "react"
import ReactDOM from "react-dom/client"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import App from "./App"
import Layout from "./components/Layout"
import Home from "./pages/Home"
import Documents from "./pages/Documents"
import { NotificationProvider } from "./components/NotificationContext"
import { ChatProvider } from "./hooks/useChat"
import "./index.css"

// MSAL imports
import { PublicClientApplication } from "@azure/msal-browser"
import { MsalProvider } from "@azure/msal-react"
import { msalConfig } from "./authConfig"

// Initialize MSAL instance
const msalInstance = new PublicClientApplication(msalConfig)

// Check if there are cached accounts
const accounts = msalInstance.getAllAccounts()
if (accounts.length > 0) {
  msalInstance.setActiveAccount(accounts[0])
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <MsalProvider instance={msalInstance}>
      <NotificationProvider>
        <ChatProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<Home />} />
                <Route path="documents" element={<Documents />} />
                <Route path="naia" element={<App />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </ChatProvider>
      </NotificationProvider>
    </MsalProvider>
  </React.StrictMode>,
)
