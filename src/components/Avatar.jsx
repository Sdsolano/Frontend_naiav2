// components/Avatar.jsx - VERSIÓN ACTUALIZADA CON GÉNERO
import { useAnimations, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { button, useControls } from "leva";
import React, { useEffect, useRef, useState } from "react";
import defaultLipsync from "../utils/defaultLipsync";
import * as THREE from "three";
import { useUniversalChat } from "../hooks/useUniversalChat";
import { getCurrentRoleConfig } from "../utils/roleUtils";
import { getAnimationFileForRole, getRoleGender } from "../utils/animationUtils"; // ← NUEVO IMPORT

const facialExpressions = {
  default: {},
  smile: {
    browInnerUp: 0.17,
    eyeSquintLeft: 0.4,
    eyeSquintRight: 0.44,
    noseSneerLeft: 0.1700000727403593,
    noseSneerRight: 0.14000002836874015,
    mouthPressLeft: 0.61,
    mouthPressRight: 0.41000000000000003,
  },
  funnyFace: {
    jawLeft: 0.63,
    mouthPucker: 0.53,
    noseSneerLeft: 1,
    noseSneerRight: 0.39,
    mouthLeft: 1,
    eyeLookUpLeft: 1,
    eyeLookUpRight: 1,
    cheekPuff: 0.9999924982764238,
    mouthDimpleLeft: 0.414743888682652,
    mouthRollLower: 0.32,
    mouthSmileLeft: 0.35499733688813034,
    mouthSmileRight: 0.35499733688813034,
  },
  sad: {
    mouthFrownLeft: 1,
    mouthFrownRight: 1,
    mouthShrugLower: 0.78341,
    browInnerUp: 0.452,
    eyeSquintLeft: 0.72,
    eyeSquintRight: 0.75,
    eyeLookDownLeft: 0.5,
    eyeLookDownRight: 0.5,
    jawForward: 1,
  },
  surprised: {
    eyeWideLeft: 0.5,
    eyeWideRight: 0.5,
    jawOpen: 0.351,
    mouthFunnel: 1,
    browInnerUp: 1,
  },
  angry: {
    browDownLeft: 1,
    browDownRight: 1,
    eyeSquintLeft: 1,
    eyeSquintRight: 1,
    jawForward: 1,
    jawLeft: 1,
    mouthShrugLower: 1,
    noseSneerLeft: 1,
    noseSneerRight: 0.42,
    eyeLookDownLeft: 0.16,
    eyeLookDownRight: 0.16,
    cheekSquintLeft: 1,
    cheekSquintRight: 1,
    mouthClose: 0.23,
    mouthFunnel: 0.63,
    mouthDimpleRight: 1,
  },
  crazy: {
    browInnerUp: 0.9,
    jawForward: 1,
    noseSneerLeft: 0.5700000000000001,
    noseSneerRight: 0.51,
    eyeLookDownLeft: 0.39435766259644545,
    eyeLookUpRight: 0.4039761421719682,
    eyeLookInLeft: 0.9618479575523053,
    eyeLookInRight: 0.9618479575523053,
    jawOpen: 0.9618479575523053,
    mouthDimpleLeft: 0.9618479575523053,
    mouthDimpleRight: 0.9618479575523053,
    mouthStretchLeft: 0.27893590769016857,
    mouthStretchRight: 0.2885543872656917,
    mouthSmileLeft: 0.5578718153803371,
    mouthSmileRight: 0.38473918302092225,
    tongueOut: 0.9618479575523053,
  },
};

const corresponding = {
  A: "viseme_PP",
  B: "viseme_kk",
  C: "viseme_I",
  D: "viseme_AA",
  E: "viseme_O",
  F: "viseme_U",
  G: "viseme_FF",
  H: "viseme_TH",
  X: "viseme_PP",
};

let setupMode = false;

// Función para determinar el modelo basado en el rol
const getModelPathForRole = (roleId) => {
  switch (roleId) {
    case 'guide':
      return "/models/uni.glb";
    case 'companion':
      return "/models/companion.glb";
    case 'trainer':
      return "/models/trainer.glb";
    case 'assistant':
      return "/models/personal.glb";
    case 'receptionist':
      return "/models/receptionist.glb";
    case 'ciudadano':  // ← NUEVO: Asistente de Atención al Ciudadano
      return "/models/ciudadano.glb";
    case 'mompox':
      return "/models/mompox.glb";

    case 'toefl-tutor':  // ← NUEVO: Tutora TOEFL (reutiliza companion femenino)
      return "/models/companion.glb";
    default:
      return "/models/investigator.glb";

  }
};

export function Avatar(props) {
  // Estado de rol actual
  const [currentRole, setCurrentRole] = useState(() => {
    const roleConfig = getCurrentRoleConfig();
    return roleConfig.id;
  });
  
  // Estado del modelo actual
  const [modelPath, setModelPath] = useState(() => {
    const roleConfig = getCurrentRoleConfig();
    return getModelPathForRole(roleConfig.id);
  });

  // ← NUEVO: Estado para archivo de animaciones dinámico
  const [animationPath, setAnimationPath] = useState(() => {
    const roleConfig = getCurrentRoleConfig();
    return getAnimationFileForRole(roleConfig.id);
  });

  // ← NUEVO: Estado para género actual
  const [currentGender, setCurrentGender] = useState(() => {
    const roleConfig = getCurrentRoleConfig();
    return getRoleGender(roleConfig.id);
  });

  // Efecto para cambios de rol - ACTUALIZADO
  useEffect(() => {
    const handleRoleChange = () => {
      const roleConfig = getCurrentRoleConfig();
      const newRole = roleConfig.id;
      
      if (newRole !== currentRole) {
        console.log(`🎭 Avatar: Cambiando rol de ${currentRole} a ${newRole}`);
        setCurrentRole(newRole);
        
        const newModelPath = getModelPathForRole(newRole);
        const newAnimationPath = getAnimationFileForRole(newRole); // ← NUEVO
        const newGender = getRoleGender(newRole); // ← NUEVO
        
        console.log(`📦 Avatar: Cambiando modelo a ${newModelPath}`);
        console.log(`🎭 Avatar: Cambiando animaciones a ${newAnimationPath}`);
        console.log(`👤 Avatar: Género ${newGender}`);
        
        setModelPath(newModelPath);
        setAnimationPath(newAnimationPath); // ← NUEVO
        setCurrentGender(newGender); // ← NUEVO
      }
    };

    // Verificar inmediatamente
    handleRoleChange();

    // Escuchar eventos de cambio
    window.addEventListener('role-changed', handleRoleChange);
    window.addEventListener('storage', (e) => {
      if (e.key === 'naia_selected_role') {
        handleRoleChange();
      }
    });

    return () => {
      window.removeEventListener('role-changed', handleRoleChange);
      window.removeEventListener('storage', handleRoleChange);
    };
  }, [currentRole]);

  // ← MODIFICADO: Cargar modelo y animaciones dinámicamente
  const { nodes, materials, scene } = useGLTF(modelPath, true);
  const { animations } = useGLTF(animationPath, true); // ← Usar animationPath dinámico

  const { message, onMessagePlayed, chat, isThinking } = useUniversalChat();

  const [lipsync, setLipsync] = useState();
  const [audio, setAudio] = useState();
  const [isPlaying, setIsPlaying] = useState(false);
  const audioEndTimerRef = useRef(null);

  // Estados específicos para Realtime API lipsync
  const [realtimeLipsync, setRealtimeLipsync] = useState();
  const [isRealtimeLipsyncActive, setIsRealtimeLipsyncActive] = useState(false);
  const [realtimeStartTime, setRealtimeStartTime] = useState(null);

  // Referencias estáticas
  const group = useRef();
  const { actions, mixer } = useAnimations(animations, group);

  // Estado de animación
  const [animation, setAnimation] = useState("Idle");

  // Función para aplicar animaciones de forma segura
  const setAnimationSafely = (animName) => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`🎭 [${timestamp}] setAnimationSafely: "${animName}" para rol ${currentRole} (${currentGender})`);
    
    if (!actions || Object.keys(actions).length === 0) {
      console.warn(`⚠️ [${timestamp}] Actions no disponibles para ${currentRole}, reintentando...`);
      
      setTimeout(() => {
        if (actions && actions[animName]) {
          console.log(`✅ [${timestamp}] Retry exitoso: ${animName} para ${currentRole}`);
          setAnimation(animName);
        } else {
          console.error(`❌ [${timestamp}] Retry fallido: ${animName} para ${currentRole}`);
        }
      }, 300);
      return;
    }
    
    if (actions[animName]) {
      console.log(`✅ [${timestamp}] APLICANDO animación: "${animName}" para ${currentRole} (${currentGender})`);
      console.log(`🎬 [${timestamp}] Animación anterior era: "${animation}"`);
      setAnimation(animName);
      console.log(`🎬 [${timestamp}] Animación cambiada a: "${animName}"`);
    } else {
      console.warn(`❌ [${timestamp}] Animación "${animName}" NO encontrada para ${currentRole}`);
      console.log(`📋 [${timestamp}] Animaciones disponibles (${Object.keys(actions).length}):`, Object.keys(actions));
      
      // Buscar fallback
      const fallbacks = ['Idle', 'Talking_1', 'Talking_0', Object.keys(actions)[0]];
      for (const fallback of fallbacks) {
        if (actions[fallback]) {
          console.log(`🔄 [${timestamp}] Usando fallback: "${fallback}"`);
          setAnimation(fallback);
          break;
        }
      }
    }
  };

  // Resetear a Idle cuando cambie el modelo
  useEffect(() => {
    if (actions && Object.keys(actions).length > 0) {
      console.log(`🔄 Animaciones cargadas para ${currentRole} (${currentGender}), aplicando Idle`);
      setTimeout(() => {
        setAnimationSafely("Idle");
      }, 100);
    }
  }, [actions, currentRole, currentGender]);

  // ← NUEVO: Precargar ambos archivos de animaciones
  useEffect(() => {
    console.log("🔄 Precargando archivos de animaciones...");
    
    // Precargar animaciones femeninas
    useGLTF.preload("/models/animations.glb");
    
    // Precargar animaciones masculinas
    useGLTF.preload("/models/male_animations.glb");
    
    console.log("✅ Archivos de animaciones precargados");
  }, []);

  // Listener para animaciones de Realtime API
  useEffect(() => {
    const handleRealtimeAnimation = (event) => {
      const animationData = event.detail;
      const timestamp = new Date().toLocaleTimeString();
      
      console.log(`🎭 [${timestamp}] AVATAR recibiendo evento Realtime:`, {
        animation: animationData.animation,
        counter: animationData.animationCounter || 'N/A',
        isRealtimeAnimation: animationData.isRealtimeAnimation
      });
      
      if (animationData.isRealtimeAnimation) {
        console.log(`🎭 [${timestamp}] AVATAR procesando animación #${animationData.animationCounter || 'N/A'}: ${animationData.animation}`);
        console.log(`📊 [${timestamp}] Lipsync data recibido:`, {
          mouthCues: animationData.lipsync?.mouthCues?.length || 0,
          duration: animationData.lipsync?.metadata?.duration || 0,
          timestamp: animationData.timestamp
        });
        
        // Aplicar animación directamente sin audio
        console.log(`🎬 [${timestamp}] Aplicando animación: ${animationData.animation}`);
        setAnimationSafely(animationData.animation || "Talking_0");
        setFacialExpression(animationData.facialExpression || "default");
        
        // Aplicar lipsync usando sistema Realtime
        if (animationData.animation !== 'Idle') {
          console.log(`💋 [${timestamp}] ACTIVANDO lipsync Realtime dinámico...`);
          
          // Activar sistema Realtime de lipsync
          setRealtimeLipsync(animationData.lipsync || defaultLipsync);
          setIsRealtimeLipsyncActive(true);
          setRealtimeStartTime(Date.now());
          console.log(`💋 [${timestamp}] Lipsync Realtime ACTIVADO con ${animationData.lipsync?.mouthCues?.length || 0} mouth cues`);
          
        } else {
          // Para Idle, desactivar lipsync Realtime
          console.log(`💤 [${timestamp}] Idle detectado - DESACTIVANDO lipsync Realtime`);
          setIsRealtimeLipsyncActive(false);
          setRealtimeLipsync(null);
          setRealtimeStartTime(null);
          console.log(`💤 [${timestamp}] Lipsync Realtime DESACTIVADO`);
        }
      }
    };

    // Agregar listener
    window.addEventListener('realtime-animation', handleRealtimeAnimation);

    // Cleanup
    return () => {
      window.removeEventListener('realtime-animation', handleRealtimeAnimation);
    };
  }, []);

  useEffect(() => {
    console.log(message);

    if (isThinking) {
      console.log("Avatar pensando...");
      setAnimationSafely("Thinking");
      setFacialExpression("default");
      return;
    }

    if (!message) {
      if (isPlaying) {
        setAnimation("Idle");
        setFacialExpression("default");
        setIsPlaying(false);
      }
      return;
    }
    
    // Limpiar cualquier temporizador anterior
    if (audioEndTimerRef.current) {
      clearTimeout(audioEndTimerRef.current);
      audioEndTimerRef.current = null;
    }
    
    // Solo procesar si tenemos un mensaje completo con audio
    if (!message.audio) {
      return;
    }

    // Configurar todo antes de reproducir el audio
    setAnimationSafely(message.animation || "Talking_1");
    setFacialExpression(message.facialExpression || "default");
    setLipsync(message.lipsync || defaultLipsync);
    setIsPlaying(true);
    
    // Crear y reproducir el audio
    const audioElement = new Audio("data:audio/mp3;base64," + message.audio);
    
    // Calcular duración estimada para el temporizador de respaldo
    const estimatedDuration = Math.max(3000, message.text.length * 100);
    
    // Establecer temporizador de respaldo por si falla el evento onended
    audioEndTimerRef.current = setTimeout(() => {
      console.log("🔄 Avatar: Temporizador de respaldo activado!");
      setAnimationSafely("Idle");
      setFacialExpression("default");
      setIsPlaying(false);
      if (onMessagePlayed) onMessagePlayed();
    }, estimatedDuration + 500);
    
    // Establecer los callbacks antes de reproducir
    audioElement.onended = () => {
      console.log("🔄 Avatar: Audio terminado, volviendo a Idle");
      setAnimation("Idle");
      setFacialExpression("default");
      setIsPlaying(false);
      
      // Limpiar el temporizador ya que el audio terminó correctamente
      if (audioEndTimerRef.current) {
        clearTimeout(audioEndTimerRef.current);
        audioEndTimerRef.current = null;
      }
      
      // Notificar inmediatamente que el mensaje ha terminado
      if (onMessagePlayed) {
        onMessagePlayed();
      }
      
      // Emitir un evento personalizado para notificar a otros componentes
      const audioEndedEvent = new CustomEvent('avatar-audio-ended');
      window.dispatchEvent(audioEndedEvent);
    };
    
    // Fallback si hay error en la reproducción
    audioElement.onerror = (err) => {
      console.error('Error playing audio:', err);
      setAnimation("Idle");
      setFacialExpression("default");
      setIsPlaying(false);
      
      // Limpiar el temporizador ya que el audio terminó (con error)
      if (audioEndTimerRef.current) {
        clearTimeout(audioEndTimerRef.current);
        audioEndTimerRef.current = null;
      }
      
      if (onMessagePlayed) onMessagePlayed();
    };
    
    // Guardar la referencia del audio y reproducirlo
    setAudio(audioElement);
    
    // Pequeño retraso para asegurar que la animación y expresión se han aplicado
    setTimeout(() => {
      audioElement.play()
        .then(() => {
          console.log("🔄 Avatar: Audio iniciado correctamente");
          // Emitir evento para sincronizar subtítulos
          const audioStartedEvent = new CustomEvent('avatar-audio-started');
          window.dispatchEvent(audioStartedEvent);
        })
        .catch(err => {
          console.error('Error playing audio:', err);
          setAnimation("Idle");
          setFacialExpression("default");
          setIsPlaying(false);
        });
    }, 100);
    
  }, [message, isThinking]);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      if (audioEndTimerRef.current) {
        clearTimeout(audioEndTimerRef.current);
      }
      
      if (audio) {
        audio.pause();
        audio.onended = null;
        audio.onerror = null;
      }
    };
  }, [audio]);

  useEffect(() => {
    const timestamp = new Date().toLocaleTimeString();
    
    // Verificar que la animación existe
    if (actions && animation && actions[animation]) {
      console.log(`🎬 [${timestamp}] EJECUTANDO animación "${animation}" con Three.js`);
      console.log(`🎬 [${timestamp}] Mixer stats:`, mixer?.stats);
      
      actions[animation].timeScale = 0.5;
      actions[animation]
        .reset()
        .fadeIn(mixer && mixer.stats.actions.inUse === 0 ? 0 : 0.5)
        .play();
      
      console.log(`✅ [${timestamp}] Animación "${animation}" INICIADA exitosamente`);
      
      // Verificar también en la función de limpieza
      return () => {
        if (actions && animation && actions[animation]) {
          console.log(`🛑 [${timestamp}] Deteniendo animación "${animation}"`);
          actions[animation].fadeOut(0.5);
        }
      };
    } else {
      if (!actions) {
        console.warn(`⚠️ [${timestamp}] No hay actions disponibles para ejecutar "${animation}"`);
      } else if (!animation) {
        console.warn(`⚠️ [${timestamp}] No hay animación definida para ejecutar`);
      } else if (!actions[animation]) {
        console.warn(`⚠️ [${timestamp}] La animación "${animation}" no existe en actions`);
        console.log(`📋 [${timestamp}] Actions disponibles:`, Object.keys(actions));
      }
    }
  }, [animation, actions, mixer]);

  const lerpMorphTarget = (target, value, speed = 0.1) => {
    scene.traverse((child) => {
      if (child.isSkinnedMesh && child.morphTargetDictionary) {
        const index = child.morphTargetDictionary[target];
        if (
          index === undefined ||
          child.morphTargetInfluences[index] === undefined
        ) {
          return;
        }
        child.morphTargetInfluences[index] = THREE.MathUtils.lerp(
          child.morphTargetInfluences[index],
          value,
          speed
        );

        if (!setupMode) {
          try {
            set({
              [target]: value,
            });
          } catch (e) {}
        }
      }
    });
  };

  const [blink, setBlink] = useState(false);
  const [winkLeft, setWinkLeft] = useState(false);
  const [winkRight, setWinkRight] = useState(false);
  const [facialExpression, setFacialExpression] = useState("");

  const vowelIntensity = {
    "A": 1.5,
    "C": 1.3,
    "D": 1.4,
    "E": 1.3,
    "F": 1.3,
    "B": 0.9,
    "G": 0.8,
    "H": 0.7,
    "X": 0.6
  };

  useFrame(() => {
    !setupMode &&
      Object.keys(nodes.EyeLeft.morphTargetDictionary).forEach((key) => {
        const mapping = facialExpressions[facialExpression];
        if (key === "eyeBlinkLeft" || key === "eyeBlinkRight") {
          return;
        }
        if (mapping && mapping[key]) {
          lerpMorphTarget(key, mapping[key], 0.1);
        } else {
          lerpMorphTarget(key, 0, 0.1);
        }
      });

    lerpMorphTarget("eyeBlinkLeft", blink || winkLeft ? 1 : 0, 0.5);
    lerpMorphTarget("eyeBlinkRight", blink || winkRight ? 1 : 0, 0.5);

    // LIPSYNC SYSTEM - Soporte para chat tradicional Y Realtime API
    if (setupMode) {
      return;
    }

    const appliedMorphTargets = [];
    
    // 1. Sistema tradicional (chat con elemento audio)
    if (isPlaying && message && lipsync && audio) {
      const currentAudioTime = audio.currentTime;
      
      const lastCue = lipsync.mouthCues[lipsync.mouthCues.length - 1];
      const isWithinDataRange = currentAudioTime <= lastCue.end;
      
      if (isWithinDataRange) {
        for (let i = 0; i < lipsync.mouthCues.length; i++) {
          const mouthCue = lipsync.mouthCues[i];
          if (
            currentAudioTime >= mouthCue.start &&
            currentAudioTime <= mouthCue.end
          ) {
            const visemeKey = mouthCue.value;
            const morphTarget = corresponding[visemeKey];
            
            const intensity = vowelIntensity[visemeKey] || 1.0;
            
            appliedMorphTargets.push(morphTarget);
            lerpMorphTarget(morphTarget, intensity, 0.25);
            break;
          }
        }
      } else {
        const cycleDuration = 0.8;
        const cyclePosition = (currentAudioTime % cycleDuration) / cycleDuration;
        
        if (cyclePosition < 0.2) {
          lerpMorphTarget(corresponding["X"], 0.3, 0.2);
          appliedMorphTargets.push(corresponding["X"]);
        } else if (cyclePosition < 0.3) {
          lerpMorphTarget(corresponding["F"], 0.8, 0.3);
          appliedMorphTargets.push(corresponding["F"]);
        } else if (cyclePosition < 0.5) {
          lerpMorphTarget(corresponding["A"], 1.5, 0.3);
          appliedMorphTargets.push(corresponding["A"]);
        } else if (cyclePosition < 0.7) {
          lerpMorphTarget(corresponding["C"], 1.2, 0.3);
          appliedMorphTargets.push(corresponding["C"]);
        } else {
          lerpMorphTarget(corresponding["D"], 0.9, 0.3);
          appliedMorphTargets.push(corresponding["D"]);
        }
      }
    }
    
    // 2. Sistema Realtime (WebRTC, sin elemento audio)
    else if (isRealtimeLipsyncActive && realtimeLipsync && realtimeStartTime) {
      const currentRealtimeTime = (Date.now() - realtimeStartTime) / 1000; // Convertir a segundos
      
      const lastCue = realtimeLipsync.mouthCues[realtimeLipsync.mouthCues.length - 1];
      const isWithinDataRange = currentRealtimeTime <= lastCue.end;
      
      // Log periódico para debug (cada 100 frames aproximadamente)
      if (Math.floor(currentRealtimeTime * 60) % 100 === 0) {
      }
      
      if (isWithinDataRange) {
        for (let i = 0; i < realtimeLipsync.mouthCues.length; i++) {
          const mouthCue = realtimeLipsync.mouthCues[i];
          if (
            currentRealtimeTime >= mouthCue.start &&
            currentRealtimeTime <= mouthCue.end
          ) {
            const visemeKey = mouthCue.value;
            const morphTarget = corresponding[visemeKey];
            
            const intensity = vowelIntensity[visemeKey] || 1.0;
            
            appliedMorphTargets.push(morphTarget);
            lerpMorphTarget(morphTarget, intensity, 0.25);
            
            // Log ocasional para verificar aplicación
            if (i % 50 === 0) {
              console.log(`💋 APLICANDO: ${visemeKey} → ${morphTarget} (intensidad: ${intensity})`);
            }
            break;
          }
        }
      } else {
        // Fallback a patrón cíclico cuando no hay más data
        const cycleDuration = 0.8;
        const cyclePosition = (currentRealtimeTime % cycleDuration) / cycleDuration;
        
        if (cyclePosition < 0.2) {
          lerpMorphTarget(corresponding["X"], 0.3, 0.2);
          appliedMorphTargets.push(corresponding["X"]);
        } else if (cyclePosition < 0.3) {
          lerpMorphTarget(corresponding["F"], 0.8, 0.3);
          appliedMorphTargets.push(corresponding["F"]);
        } else if (cyclePosition < 0.5) {
          lerpMorphTarget(corresponding["A"], 1.5, 0.3);
          appliedMorphTargets.push(corresponding["A"]);
        } else if (cyclePosition < 0.7) {
          lerpMorphTarget(corresponding["C"], 1.2, 0.3);
          appliedMorphTargets.push(corresponding["C"]);
        } else {
          lerpMorphTarget(corresponding["D"], 0.9, 0.3);
          appliedMorphTargets.push(corresponding["D"]);
        }
        
        // Log cuando entramos en modo fallback
        if (Math.floor(currentRealtimeTime * 10) % 50 === 0) {
          console.log(`💋 FALLBACK REALTIME: Usando patrón cíclico (tiempo=${currentRealtimeTime.toFixed(2)}s > ${lastCue.end}s)`);
        }
      }
    }
    
    Object.values(corresponding).forEach((value) => {
      if (appliedMorphTargets.includes(value)) {
        return;
      }
      lerpMorphTarget(value, 0, 0.1);
    });
  });

  useControls("FacialExpressions", {
    chat: button(() => chat()),
    winkLeft: button(() => {
      setWinkLeft(true);
      setTimeout(() => setWinkLeft(false), 300);
    }),
    winkRight: button(() => {
      setWinkRight(true);
      setTimeout(() => setWinkRight(false), 300);
    }),
    animation: {
      value: animation,
      options: animations.map((a) => a.name),
      onChange: (value) => setAnimation(value),
    },
    facialExpression: {
      options: Object.keys(facialExpressions),
      onChange: (value) => setFacialExpression(value),
    },
    enableSetupMode: button(() => {
      setupMode = true;
    }),
    disableSetupMode: button(() => {
      setupMode = false;
    }),
    logMorphTargetValues: button(() => {
      const emotionValues = {};
      Object.keys(nodes.EyeLeft.morphTargetDictionary).forEach((key) => {
        if (key === "eyeBlinkLeft" || key === "eyeBlinkRight") {
          return;
        }
        const value =
          nodes.EyeLeft.morphTargetInfluences[
            nodes.EyeLeft.morphTargetDictionary[key]
          ];
        if (value > 0.01) {
          emotionValues[key] = value;
        }
      });
      console.log(JSON.stringify(emotionValues, null, 2));
    }),
  });

  const [, set] = useControls("MorphTarget", () =>
    Object.assign(
      {},
      ...Object.keys(nodes.EyeLeft.morphTargetDictionary).map((key) => {
        return {
          [key]: {
            label: key,
            value: 0,
            min: nodes.EyeLeft.morphTargetInfluences[
              nodes.EyeLeft.morphTargetDictionary[key]
            ],
            max: 1,
            onChange: (val) => {
              if (setupMode) {
                lerpMorphTarget(key, val, 1);
              }
            },
          },
        };
      })
    )
  );

  // Diagnóstico cuando cambie el rol
  useEffect(() => {
    if (nodes && scene) {
      console.log(`🔍 DIAGNÓSTICO PARA ROL: ${currentRole} (${currentGender})`);
      console.log(`📦 Modelo cargado: ${modelPath}`);
      console.log(`🎭 Animaciones cargadas: ${animationPath}`);
      
      if (nodes.EyeLeft && nodes.EyeLeft.morphTargetDictionary) {
        console.log("  ✅ EyeLeft morph targets disponibles");
        const morphTargets = Object.keys(nodes.EyeLeft.morphTargetDictionary);
        const lipsyncTargets = Object.values(corresponding).filter(target => morphTargets.includes(target));
        console.log(`  💋 ${lipsyncTargets.length}/9 morph targets de lipsync encontrados:`, lipsyncTargets);
      } else {
        console.error("  ❌ No se encontró EyeLeft o morphTargetDictionary");
      }
      
      if (actions) {
        console.log(`  ✅ ${Object.keys(actions).length} animaciones disponibles:`, Object.keys(actions));
        if (actions.Idle) {
          console.log("  ✅ Animación 'Idle' encontrada");
        } else {
          console.error("  ❌ Animación 'Idle' NO encontrada");
        }
      } else {
        console.error("  ❌ No hay actions disponibles");
      }
    }
  }, [nodes, scene, currentRole, currentGender, modelPath, animationPath, actions]);

  // Log de estado del sistema Realtime lipsync
  useEffect(() => {
    console.log(`💋 ESTADO REALTIME LIPSYNC: 
      Activo: ${isRealtimeLipsyncActive}
      Data disponible: ${realtimeLipsync ? realtimeLipsync.mouthCues.length + ' mouth cues' : 'No'}
      Tiempo inicio: ${realtimeStartTime ? new Date(realtimeStartTime).toLocaleTimeString() : 'No establecido'}`);
  }, [isRealtimeLipsyncActive, realtimeLipsync, realtimeStartTime]);

  useEffect(() => {
    let blinkTimeout;
    const nextBlink = () => {
      blinkTimeout = setTimeout(() => {
        setBlink(true);
        setTimeout(() => {
          setBlink(false);
          nextBlink();
        }, 200);
      }, THREE.MathUtils.randInt(1000, 5000));
    };
    nextBlink();
    return () => clearTimeout(blinkTimeout);
  }, []);

  return (
    <group {...props} dispose={null} ref={group}>
      <primitive object={nodes.Hips} />
      <skinnedMesh
        name="Wolf3D_Body"
        geometry={nodes.Wolf3D_Body.geometry}
        material={materials.Wolf3D_Body}
        skeleton={nodes.Wolf3D_Body.skeleton}
      />
      <skinnedMesh
        name="Wolf3D_Outfit_Bottom"
        geometry={nodes.Wolf3D_Outfit_Bottom.geometry}
        material={materials.Wolf3D_Outfit_Bottom}
        skeleton={nodes.Wolf3D_Outfit_Bottom.skeleton}
      />
      <skinnedMesh
        name="Wolf3D_Outfit_Footwear"
        geometry={nodes.Wolf3D_Outfit_Footwear.geometry}
        material={materials.Wolf3D_Outfit_Footwear}
        skeleton={nodes.Wolf3D_Outfit_Footwear.skeleton}
      />
      <skinnedMesh
        name="Wolf3D_Outfit_Top"
        geometry={nodes.Wolf3D_Outfit_Top.geometry}
        material={materials.Wolf3D_Outfit_Top}
        skeleton={nodes.Wolf3D_Outfit_Top.skeleton}
      />
      {(() => {
        try {
          if (nodes.Wolf3D_Glasses && materials.Wolf3D_Glasses) {
            return (
              <skinnedMesh
                name="Wolf3D_Glasses"
                geometry={nodes.Wolf3D_Glasses.geometry}
                material={materials.Wolf3D_Glasses}
                skeleton={nodes.Wolf3D_Glasses.skeleton}
              />
            );
          }
          return null;
        } catch (error) {
          console.warn("Error loading glasses mesh, skipping:", error);
          return null;
        }
      })()}
      {(() => {
        try {
          if (nodes.Wolf3D_Hair && materials.Wolf3D_Hair) {
            return (
               <skinnedMesh
                name="Wolf3D_Hair"
                geometry={nodes.Wolf3D_Hair.geometry}
                material={materials.Wolf3D_Hair}
                skeleton={nodes.Wolf3D_Hair.skeleton}
              />
            );
          }
          return null;
        } catch (error) {
          console.warn("Error loading hair mesh, skipping:", error);
          return null;
        }
      })()}
     
      <skinnedMesh
        name="EyeLeft"
        geometry={nodes.EyeLeft.geometry}
        material={materials.Wolf3D_Eye}
        skeleton={nodes.EyeLeft.skeleton}
        morphTargetDictionary={nodes.EyeLeft.morphTargetDictionary}
        morphTargetInfluences={nodes.EyeLeft.morphTargetInfluences}
      />
      <skinnedMesh
        name="EyeRight"
        geometry={nodes.EyeRight.geometry}
        material={materials.Wolf3D_Eye}
        skeleton={nodes.EyeRight.skeleton}
        morphTargetDictionary={nodes.EyeRight.morphTargetDictionary}
        morphTargetInfluences={nodes.EyeRight.morphTargetInfluences}
      />
      <skinnedMesh
        name="Wolf3D_Head"
        geometry={nodes.Wolf3D_Head.geometry}
        material={materials.Wolf3D_Skin}
        skeleton={nodes.Wolf3D_Head.skeleton}
        morphTargetDictionary={nodes.Wolf3D_Head.morphTargetDictionary}
        morphTargetInfluences={nodes.Wolf3D_Head.morphTargetInfluences}
      />
      <skinnedMesh
        name="Wolf3D_Teeth"
        geometry={nodes.Wolf3D_Teeth.geometry}
        material={materials.Wolf3D_Teeth}
        skeleton={nodes.Wolf3D_Teeth.skeleton}
        morphTargetDictionary={nodes.Wolf3D_Teeth.morphTargetDictionary}
        morphTargetInfluences={nodes.Wolf3D_Teeth.morphTargetInfluences}
      />
    </group>
  );
}

// ← ACTUALIZADO: Precargar todos los modelos y ambos archivos de animaciones
useGLTF.preload("/models/investigator.glb");
useGLTF.preload("/models/uni.glb");
useGLTF.preload("/models/companion.glb");  
useGLTF.preload("/models/trainer.glb");
useGLTF.preload("/models/personal.glb");
useGLTF.preload("/models/receptionist.glb");
useGLTF.preload("/models/mompox.glb");

// ← NUEVO: Precargar ambos archivos de animaciones
useGLTF.preload("/models/animations.glb");      // Femeninas
useGLTF.preload("/models/male_animations.glb"); // Masculinas