import React, { createContext, useState, useContext, useEffect } from 'react';

// Create a context for configuration settings
const ConfigContext = createContext();

export const ConfigProvider = ({ children }) => {
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [voiceType, setVoiceType] = useState('alloy'); // OpenAI voices: alloy, echo, fable, onyx, nova, shimmer
  
  // Try to load the API key from localStorage on initial load
  useEffect(() => {
    const savedApiKey = localStorage.getItem('openai_api_key');
    if (savedApiKey) {
      setOpenaiApiKey(savedApiKey);
    }
    
    const savedVoice = localStorage.getItem('voice_type');
    if (savedVoice) {
      setVoiceType(savedVoice);
    }
  }, []);

  // Save API key to localStorage when it changes
  useEffect(() => {
    if (openaiApiKey) {
      localStorage.setItem('openai_api_key', openaiApiKey);
    }
  }, [openaiApiKey]);
  
  // Save voice type to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('voice_type', voiceType);
  }, [voiceType]);

  return (
    <ConfigContext.Provider value={{ 
      openaiApiKey, 
      setOpenaiApiKey,
      voiceType,
      setVoiceType
    }}>
      {children}
    </ConfigContext.Provider>
  );
};

export const useConfig = () => useContext(ConfigContext);