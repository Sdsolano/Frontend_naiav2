// utils/voiceUtils.js - NUEVO ARCHIVO
// Mapeo de voces únicas para cada rol

export const ROLE_VOICE_MAPPING = {
  // === VOCES FEMENINAS ===
  'researcher': 'nova',        // Investigadora - Voz clara y profesional
  'receptionist': 'shimmer',   // Recepcionista - Voz amigable y cálida  
  'companion': 'alloy',        // Compañera de bienestar - Voz suave y empática
  'ciudadano': 'nova',         // Asistente Ciudadano - Voz femenina clara y profesional

  // === VOCES MASCULINAS ===
  'trainer': 'onyx',           // Entrenador - Voz energética y motivadora
  'guide': 'echo',            // Guía Universitario - Voz autorizada y conocedora
  'assistant': 'fable',        // Asistente Personal - Voz versátil y útil

};

/**
 * Obtiene la voz específica para el rol actual
 * @param {string} roleId - ID del rol actual
 * @returns {string} Nombre de la voz de OpenAI
 */
export const getVoiceForRole = (roleId) => {
  const voice = ROLE_VOICE_MAPPING[roleId];
  
  if (!voice) {
    console.warn(`⚠️ Voz no encontrada para rol: ${roleId}, usando 'nova' por defecto`);
    return 'nova';
  }
  
  console.log(`🎤 Voz seleccionada para ${roleId}: ${voice}`);
  return voice;
};

/**
 * Obtiene información detallada sobre la voz del rol
 * @param {string} roleId - ID del rol actual
 * @returns {object} Información de la voz
 */
export const getVoiceInfo = (roleId) => {
  const voiceDescriptions = {
    'nova': {
      name: 'Nova',
      description: 'Voz femenina clara y profesional',
      personality: 'Inteligente, precisa, académica'
    },
    'shimmer': {
      name: 'Shimmer', 
      description: 'Voz femenina cálida y amigable',
      personality: 'Servicial, acogedora, sociable'
    },
    'alloy': {
      name: 'Alloy',
      description: 'Voz femenina suave y empática', 
      personality: 'Comprensiva, tranquila, cariñosa'
    },
    'echo': {
      name: 'Echo',
      description: 'Voz masculina energética y motivadora',
      personality: 'Dinámico, entusiasta, inspirador'
    },
    'onyx': {
      name: 'Onyx', 
      description: 'Voz masculina profunda y autorizada',
      personality: 'Sabio, confiable, experimentado'
    },
    'fable': {
      name: 'Fable',
      description: 'Voz masculina versátil y útil',
      personality: 'Adaptable, eficiente, organizado'
    }
  };

  const voice = getVoiceForRole(roleId);
  return {
    voice,
    ...voiceDescriptions[voice]
  };
};

/**
 * Obtiene todas las voces disponibles con sus roles asignados
 * @returns {object} Mapeo completo de roles y voces
 */
export const getAllVoiceAssignments = () => {
  return Object.entries(ROLE_VOICE_MAPPING).map(([roleId, voice]) => ({
    roleId,
    voice,
    ...getVoiceInfo(roleId)
  }));
};

// === INSTRUCCIONES DE VOZ PERSONALIZADAS POR ROL ===
export const getVoiceInstructions = (roleId, tts_prompt = null) => {
  // Instrucciones base para el acento colombiano costeño
  const baseInstructions = "Utiliza un acento colombiano costeño pero de la alta sociedad y educada, con un tono alegre, aspiración de la <s> al final de sílabas. Ignora los signos que no conozcas";
  
  // Instrucciones específicas por rol
  const roleSpecificInstructions = {
    'researcher': ", habla con precisión académica y curiosidad intelectual",
    'receptionist': ", usa un tono muy amigable y servicial, como si estuvieras ayudando a un huésped importante", 
    'companion': ", habla con calidez y empatía, como una amiga comprensiva que escucha atentamente",
    'trainer': ", habla con energía y motivación, como un entrenador que inspira confianza",
    'guide': ", usa un tono conocedor y confiable, como un profesor experimentado que guía estudiantes",
    'assistant': ", habla de forma eficiente y organizada, como un asistente profesional muy competente",
    'ciudadano': ", habla con amabilidad y profesionalismo, como una funcionaria pública que atiende ciudadanos con cortesía y eficiencia"

  };
  
  const roleInstruction = roleSpecificInstructions[roleId] || "";
  
  // Si hay un tts_prompt específico, añadirlo
  const specificPrompt = tts_prompt ? `, para este caso habla de esta manera: ${tts_prompt}` : "";
  
  return `${baseInstructions}${roleInstruction}${specificPrompt}`;
};