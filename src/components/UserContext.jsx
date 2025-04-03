import React, { createContext, useContext, useState, useEffect } from 'react';
import { useMsal } from '@azure/msal-react';
import { useNotification } from './NotificationContext';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const { instance, accounts } = useMsal();
  const { addNotification } = useNotification();
  const [userInfo, setUserInfo] = useState(null);
  const [isLoadingUserInfo, setIsLoadingUserInfo] = useState(false);

  useEffect(() => {
    const fetchUserInfo = async () => {
      if (accounts.length > 0) {
        setIsLoadingUserInfo(true);
        try {
          // Set active account if not already set
          instance.setActiveAccount(accounts[0]);
          
          // Get basic account info
          const userAccount = {
            name: accounts[0].name || accounts[0].username.split('@')[0],
            username: accounts[0].username,
            tenantId: accounts[0].tenantId,
          };
          
          setUserInfo(userAccount);
          
          // Optionally fetch more user data from Microsoft Graph API
          // This would require additional configuration and permissions
          
        } catch (error) {
          console.error('Error fetching user information:', error);
          addNotification('Error al obtener información del usuario', 'error');
        } finally {
          setIsLoadingUserInfo(false);
        }
      } else {
        setUserInfo(null);
      }
    };

    fetchUserInfo();
  }, [accounts, instance, addNotification]);

  const logout = async () => {
    try {
      await instance.logoutPopup({
        postLogoutRedirectUri: window.location.origin,
      });
    } catch (error) {
      console.error('Logout error:', error);
      addNotification('Error al cerrar sesión', 'error');
    }
  };

  return (
    <UserContext.Provider value={{ 
      userInfo, 
      isLoadingUserInfo, 
      logout 
    }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);

export default UserContext;