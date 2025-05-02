import React, { useState, useEffect } from 'react';

const ElegantSubtitles = ({ text, isActive }) => {
  const [displayText, setDisplayText] = useState('');
  const [dots, setDots] = useState('');
  
  // Efecto para gestionar los puntos animados
  useEffect(() => {
    if (!isActive) return;
    
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);
    
    return () => clearInterval(interval);
  }, [isActive]);
  
  // Efecto para actualizar el texto mostrado
  useEffect(() => {
    setDisplayText(text || '');
  }, [text]);
  
  if (!isActive) return null;
  
  return (
    <div className="fixed bottom-16 left-0 right-0 flex justify-center z-40 pointer-events-none">
      <div className="relative max-w-xl w-full mx-auto">
        <div className="bg-black/40 backdrop-blur-md text-white py-2.5 px-5 rounded-xl shadow-lg border border-white/10">
          <div className="flex items-center justify-center space-x-2">
            <div className="h-2 w-2 rounded-full bg-blue-950 animate-pulse" />
            <p className="text-center font-medium">
              {displayText ? `${displayText}${dots}` : `Procesando${dots}`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ElegantSubtitles;