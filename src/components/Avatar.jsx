import { useAnimations, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { button, useControls } from "leva";
import React, { useEffect, useRef, useState } from "react";

import * as THREE from "three";
import { useChat } from "../hooks/useChat";

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

export function Avatar(props) {
  const { nodes, materials, scene } = useGLTF(
    "/models/investigator.glb"
  );

  const { message, onMessagePlayed, chat,isThinking } = useChat();

  const [lipsync, setLipsync] = useState();
  const [audio, setAudio] = useState();
  const [isPlaying, setIsPlaying] = useState(false);
  const audioEndTimerRef = useRef(null);

  useEffect(() => {
    console.log(message);

    if (isThinking) {
      console.log("Avatar pensando...");
      setAnimationSafely("Thinking"); // Animación de pensamiento
      setFacialExpression("default");
      return; // Importante: salimos del useEffect aquí
    }


    if (!message) {
      if (isPlaying) {
        // Si estábamos reproduciendo y el mensaje se vuelve null, volvemos a Idle
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
    // (utilizamos el mismo cálculo que en useChat.jsx)
    const estimatedDuration = Math.max(3000, message.text.length * 100);
    
    // Establecer temporizador de respaldo por si falla el evento onended
    audioEndTimerRef.current = setTimeout(() => {
      console.log("🔄 Avatar: Temporizador de respaldo activado!");
      setAnimationSafely("Idle");
      setFacialExpression("default");
      setIsPlaying(false);
      if (onMessagePlayed) onMessagePlayed();
    }, estimatedDuration + 500); // Añadimos un margen de 500ms
    
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
      audioElement.play().catch(err => {
        console.error('Error playing audio:', err);
        setAnimation("Idle");
        setFacialExpression("default");
        setIsPlaying(false);
      });
    }, 100);
    
  }, [message,isThinking]);

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

  const { animations } = useGLTF("/models/animations.glb");

  const group = useRef();
  const { actions, mixer } = useAnimations(animations, group);
  // Función segura para cambiar animaciones
  const setAnimationSafely = (animName) => {
    // Verificar si la animación existe en las acciones disponibles
    if (actions && actions[animName]) {
      setAnimation(animName);
    } else {
      console.warn(`Animation "${animName}" not found, falling back to default`);
      // Buscar una animación de respaldo válida
      const defaultAnim = animations.find(a => actions && actions[a.name]) || {};
      if (defaultAnim.name) {
        console.log(`Using fallback animation: ${defaultAnim.name}`);
        setAnimation(defaultAnim.name);
      }
    }
  };
  
  // Estado inicial seguro
  const [animation, setAnimation] = useState(() => {
    const hasIdle = animations.find((a) => a.name === "Idle");
    return hasIdle ? "Idle" : (animations[0]?.name || "");
  });
  useEffect(() => {
    // Verificar que la animación existe
    if (actions && animation && actions[animation]) {
      actions[animation]
        .reset()
        .fadeIn(mixer.stats.actions.inUse === 0 ? 0 : 0.5)
        .play();
      
      // Verificar también en la función de limpieza
      return () => {
        if (actions && animation && actions[animation]) {
          actions[animation].fadeOut(0.5);
        }
      };
    }
  }, [animation, actions]);

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

  useFrame(() => {
    !setupMode &&
      Object.keys(nodes.EyeLeft.morphTargetDictionary).forEach((key) => {
        const mapping = facialExpressions[facialExpression];
        if (key === "eyeBlinkLeft" || key === "eyeBlinkRight") {
          return; // eyes wink/blink are handled separately
        }
        if (mapping && mapping[key]) {
          lerpMorphTarget(key, mapping[key], 0.1);
        } else {
          lerpMorphTarget(key, 0, 0.1);
        }
      });

    lerpMorphTarget("eyeBlinkLeft", blink || winkLeft ? 1 : 0, 0.5);
    lerpMorphTarget("eyeBlinkRight", blink || winkRight ? 1 : 0, 0.5);

    // LIPSYNC
    if (setupMode) {
      return;
    }

    const appliedMorphTargets = [];
    if (isPlaying && message && lipsync && audio) {
      const currentAudioTime = audio.currentTime;
      for (let i = 0; i < lipsync.mouthCues.length; i++) {
        const mouthCue = lipsync.mouthCues[i];
        if (
          currentAudioTime >= mouthCue.start &&
          currentAudioTime <= mouthCue.end
        ) {
          appliedMorphTargets.push(corresponding[mouthCue.value]);
          lerpMorphTarget(corresponding[mouthCue.value], 1, 0.2);
          break;
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
          return; // eyes wink/blink are handled separately
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
      <skinnedMesh
        name="Wolf3D_Glasses"
        geometry={nodes.Wolf3D_Glasses.geometry}
        material={materials.Wolf3D_Glasses}
        skeleton={nodes.Wolf3D_Glasses.skeleton}
      />
      <skinnedMesh
        name="Wolf3D_Hair"
        geometry={nodes.Wolf3D_Hair.geometry}
        material={materials.Wolf3D_Hair}
        skeleton={nodes.Wolf3D_Hair.skeleton}
      />
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

useGLTF.preload("/models/64f1a714fe61576b46f27ca2.glb");
useGLTF.preload("/models/animations.glb");