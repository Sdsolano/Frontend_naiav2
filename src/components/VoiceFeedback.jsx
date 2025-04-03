import React, { useState, useEffect, useRef, useCallback } from 'react';

const VoiceFeedback = ({ isListening }) => {
  const [volumeLevel, setVolumeLevel] = useState(0);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const microphoneStreamRef = useRef(null);
  const animationFrameRef = useRef(null);
  
  // Iniciar análisis de audio
  const startAudioAnalysis = useCallback(async () => {
    if (!isListening) {
      return;
    }
    
    try {
      // Crear contexto de audio
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      
      // Obtener stream de micrófono
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      microphoneStreamRef.current = stream;
      
      // Configurar analizador
      const analyser = audioContextRef.current.createAnalyser();
      analyser.fftSize = 256;
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyser);
      analyserRef.current = analyser;
      
      // Comenzar análisis
      analyzeAudio();
    } catch (error) {
      console.error('Error iniciando análisis de volumen:', error);
    }
  }, [isListening]);
  
  // Analizar el audio y actualizar el nivel de volumen
  const analyzeAudio = useCallback(() => {
    if (!analyserRef.current || !isListening) {
      return;
    }
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    
    const updateVolume = () => {
      if (!analyserRef.current || !isListening) {
        return;
      }
      
      analyserRef.current.getByteFrequencyData(dataArray);
      
      // Calcular volumen promedio (0-255)
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const average = sum / dataArray.length;
      
      // Normalizar a escala 0-100 con un poco de amplificación para mejor visualización
      const normalizedVolume = Math.min(100, (average / 128) * 100);
      setVolumeLevel(normalizedVolume);
      
      animationFrameRef.current = requestAnimationFrame(updateVolume);
    };
    
    updateVolume();
  }, [isListening]);
  
  // Detener análisis de audio
  const stopAudioAnalysis = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    if (microphoneStreamRef.current) {
      microphoneStreamRef.current.getTracks().forEach(track => track.stop());
      microphoneStreamRef.current = null;
    }
    
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(err => console.error(err));
      audioContextRef.current = null;
    }
    
    analyserRef.current = null;
    setVolumeLevel(0);
  }, []);
  
  // Gestionar inicio/parada del análisis
  useEffect(() => {
    if (isListening) {
      startAudioAnalysis();
    } else {
      stopAudioAnalysis();
    }
    
    return () => {
      stopAudioAnalysis();
    };
  }, [isListening, startAudioAnalysis, stopAudioAnalysis]);
  
  if (!isListening) {
    return null;
  }
  
  // Calcular altura de barras basada en el volumen
  const getBarHeight = (index, totalBars = 6) => {
    // Crear un efecto "ecualizador" donde las barras centrales son más altas
    const centerOffset = Math.abs(index - (totalBars - 1) / 2);
    const centerFactor = 1 - (centerOffset / ((totalBars - 1) / 2)) * 0.5;
    
    // Calcular la altura basada en el volumen actual multiplicado por el factor central
    // y añadir un mínimo para que siempre haya algo visible
    const minHeight = 3; // altura mínima en píxeles
    const maxHeight = 24; // altura máxima en píxeles
    const dynamicHeight = (volumeLevel / 100) * maxHeight * centerFactor;
    
    return Math.max(minHeight, dynamicHeight);
  };
  
  // Generar barras para visualización
  const bars = [...Array(6)].map((_, i) => (
    <div 
      key={i}
      className="bg-blue-500 rounded-full mx-px w-1"
      style={{ 
        height: `${getBarHeight(i)}px`,
        transition: 'height 0.1s ease-in-out'
      }}
    />
  ));
  
  return (
    <div className="flex items-center h-6 ml-2">
      <div className="flex items-end">{bars}</div>
    </div>
  );
};

export default VoiceFeedback;