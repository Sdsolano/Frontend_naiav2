// utils/roleUtils.js
// Mapeo centralizado de roles entre IDs de string y números para la API

export const ROLE_MAPPING = {
  'researcher': 1,
  'guide': 2,
  'receptionist': 3, 
  'trainer': 4,
  'assistant': 5,
  'companion': 6  // ← NUEVO: Compañero de bienestar
};

export const REVERSE_ROLE_MAPPING = {
  1: 'researcher',
  2: 'guide',
  3: 'receptionist',
  4: 'trainer', 
  5: 'assistant',
  6: 'companion'  // ← NUEVO: Compañero de bienestar
};

export const ROLE_NAMES = {
  'researcher': 'Investigador',
  'receptionist': 'Recepcionista',
  'trainer': 'Entrenador de Habilidades',
  'assistant': 'Asistente Personal', 
  'guide': 'Guía Universitario',
  'companion': 'Compañero de bienestar'  // ← NUEVO
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
  const availableRoles = ['researcher', 'guide', 'companion']; // ← Añadido 'companion'
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