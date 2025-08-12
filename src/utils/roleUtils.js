// utils/roleUtils.js
// Mapeo centralizado de roles entre IDs de string y números para la API

export const ROLE_MAPPING = {
  'researcher': 1,
  'guide': 2,
  'assistant': 3,
  'trainer': 4,
  'receptionist': 5, 
  'companion': 6,
  'ciudadano': 7  // ← NUEVO: Asistente de Atención al Ciudadano
};

export const REVERSE_ROLE_MAPPING = {
  1: 'researcher',
  2: 'guide',
  3: 'assistant',
  4: 'trainer', 
  5: 'receptionist',
  6: 'companion',  // ← NUEVO: Compañero de bienestar
  7: 'ciudadano'  // ← NUEVO

};

export const ROLE_NAMES = {
  'researcher': 'Investigador',
  'receptionist': 'Recepcionista',
  'trainer': 'Entrenador de Habilidades',
  'assistant': 'Asistente Personal', 
  'guide': 'Guía Universitario',
  'companion': 'Compañero de bienestar',
  'ciudadano': 'Asistente de Atención al Ciudadano'  // ← NUEVO
};

/**
 * Obtiene el role_id numérico para la API basado en el rol seleccionado
 * @returns {number} ID numérico del rol (default: 1)
 */
export const getCurrentRoleId = () => {
  try {
    const selectedRole = localStorage.getItem('naia_selected_role');
    if (!selectedRole) {
      console.warn('No hay rol seleccionado, usando rol por defecto (Investigador)');
      return 1;
    }
    
    const roleId = ROLE_MAPPING[selectedRole];
    if (!roleId) {
      console.warn(`Rol desconocido: ${selectedRole}, usando rol por defecto (Investigador)`);
      return 1;
    }
    
    return roleId;
  } catch (error) {
    console.error('Error obteniendo role_id:', error);
    return 1;
  }
};

/**
 * Obtiene el nombre del rol actual
 * @returns {string} Nombre del rol
 */
export const getCurrentRoleName = () => {
  try {
    const selectedRole = localStorage.getItem('naia_selected_role');
    return ROLE_NAMES[selectedRole] || 'Investigador';
  } catch (error) {
    console.error('Error obteniendo nombre del rol:', error);
    return 'Investigador';
  }
};

/**
 * Verifica si un rol está disponible
 * @param {string} roleId - ID del rol a verificar
 * @returns {boolean} Si el rol está disponible
 */
export const isRoleAvailable = (roleId) => {
  // Roles completamente implementados
  const availableRoles = ['researcher', 'guide', 'companion', 'trainer', 'assistant', 'receptionist', 'ciudadano']; 
  return availableRoles.includes(roleId);
};

/**
 * Obtiene la configuración completa del rol actual
 * @returns {object} Configuración del rol
 */
export const getCurrentRoleConfig = () => {
  const selectedRole = localStorage.getItem('naia_selected_role') || 'researcher';
  
  return {
    id: selectedRole,
    name: getCurrentRoleName(),
    apiId: getCurrentRoleId(),
    available: isRoleAvailable(selectedRole)
  };
};

/**
 * Detecta si estamos en contexto de gobierno
 * @returns {boolean} Si estamos en rutas /gov
 */
export const isGovContext = () => {
  return window.location.pathname.startsWith('/gov');
};

/**
 * Configuración por defecto para el contexto de gobierno
 * @returns {object} Configuración específica de gobierno
 */
export const getGovConfig = () => ({
  userId: 325,
  roleId: 7,
  roleName: 'Asistente de Atención al Ciudadano',
  roleKey: 'ciudadano',
  avatar: 'ciudadano.glb',
  image: 'Ciudadano_AF.png'
});

/**
 * Obtiene la configuración de rol considerando el contexto
 * @returns {object} Configuración del rol (normal o gobierno)
 */
export const getContextualRoleConfig = () => {
  if (isGovContext()) {
    return getGovConfig();
  }
  return getCurrentRoleConfig();
};