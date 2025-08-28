import { useChat } from "./useChat";
import { useHybridChat } from "./useHybridChat";

/**
 * Hook universal que funciona con cualquiera de los dos sistemas de chat
 * Intenta usar híbrido primero, sino fallback al normal
 */
export const useUniversalChat = () => {
  try {
    // Intentar usar híbrido primero
    const hybridChat = useHybridChat();
    return {
      ...hybridChat,
      isUsingLocalMode: hybridChat.isUsingLocalMode || false
    };
  } catch (error) {
    // Fallback al chat normal
    const normalChat = useChat();
    return {
      ...normalChat,
      isUsingLocalMode: false // Chat normal nunca usa modo local
    };
  }
};

export default useUniversalChat;