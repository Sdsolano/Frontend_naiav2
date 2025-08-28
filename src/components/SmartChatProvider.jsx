import React, { useEffect, useState } from 'react';
import { ChatProvider } from '../hooks/useChat';
import { HybridChatProvider } from '../hooks/useHybridChat';
import { getCurrentRoleId, REVERSE_ROLE_MAPPING } from '../utils/roleUtils';

/**
 * Provider inteligente que usa HybridChat para researcher y ChatProvider normal para otros roles
 */
const SmartChatProvider = ({ children }) => {
  const [currentRole, setCurrentRole] = useState(null);

  useEffect(() => {
    const updateRole = () => {
      // 🔧 FIX: Verificar y corregir localStorage si contiene ID numérico
      const storedRole = localStorage.getItem('naia_selected_role');
      
      if (storedRole && !isNaN(storedRole) && REVERSE_ROLE_MAPPING[parseInt(storedRole)]) {
        const roleName = REVERSE_ROLE_MAPPING[parseInt(storedRole)];
        console.log(`🔄 SmartChatProvider: Corrigiendo rol ID ${storedRole} a nombre: ${roleName}`);
        localStorage.setItem('naia_selected_role', roleName);
        setCurrentRole(roleName);
      } else {
        const roleId = getCurrentRoleId();
        setCurrentRole(storedRole || 'researcher');
        console.log(`🧠 SmartChatProvider: Rol detectado: ${storedRole || 'researcher'}`);
      }
    };

    // Detectar rol inicial
    updateRole();

    // Escuchar cambios de rol
    const handleRoleChange = (event) => {
      console.log(`🧠 SmartChatProvider: Rol cambiado a: ${event.detail?.roleId}`);
      setCurrentRole(event.detail?.roleId);
    };

    window.addEventListener('role-changed', handleRoleChange);

    return () => {
      window.removeEventListener('role-changed', handleRoleChange);
    };
  }, []);

  // Solo usar híbrido para researcher
  if (currentRole === 'researcher') {
    console.log(`🚀 Usando HybridChatProvider para rol: ${currentRole}`);
    return (
      <HybridChatProvider>
        {children}
      </HybridChatProvider>
    );
  } else {
    console.log(`📡 Usando ChatProvider normal para rol: ${currentRole}`);
    return (
      <ChatProvider>
        {children}
      </ChatProvider>
    );
  }
};

export default SmartChatProvider;