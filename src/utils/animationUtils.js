// utils/animationUtils.js - NUEVO ARCHIVO
export const GENDER_MAPPING = {
  'researcher': 'female',
  'receptionist': 'female',
  'companion': 'female',
  'trainer': 'male',        // ← Masculino
  'guide': 'male',          // ← Masculino
  'assistant': 'male',
  'ciudadano': 'female',
  'mompox': 'female',
  'toefl-tutor': 'female'   // ← NUEVO: Tutora TOEFL femenina

};

/**
 * Obtiene el archivo de animaciones correcto basado en el rol
 * @param {string} roleId - ID del rol actual
 * @returns {string} Ruta del archivo de animaciones
 */
export const getAnimationFileForRole = (roleId) => {
  const gender = GENDER_MAPPING[roleId] || 'female';
  return gender === 'male' ? '/models/male_animations.glb' : '/models/animations.glb';
};

/**
 * Obtiene el género del rol actual
 * @param {string} roleId - ID del rol
 * @returns {string} 'male' o 'female'
 */
export const getRoleGender = (roleId) => {
  return GENDER_MAPPING[roleId] || 'female';
};

/**
 * Verifica si un rol es masculino
 * @param {string} roleId - ID del rol
 * @returns {boolean}
 */
export const isRoleMale = (roleId) => {
  return GENDER_MAPPING[roleId] === 'male';
};