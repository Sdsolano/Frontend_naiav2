// OpenAI service for handling chat and TTS
class OpenAIService {
    constructor(apiKey) {
      this.apiKey = apiKey;
    }
  
    async generateChatCompletion(prompt, userMessage) {
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: prompt
              },
              {
                role: 'user',
                content: userMessage
              }
            ],
            temperature: 0.7,
            max_tokens: 1000,
            response_format: { type: 'json_object' }
          })
        });
  
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`OpenAI API Error: ${errorData.error?.message || 'Unknown error'}`);
        }
  
        const data = await response.json();
        return JSON.parse(data.choices[0].message.content);
      } catch (error) {
        console.error('Error generating chat completion:', error);
        throw error;
      }
    }
  
    async generateSpeech(text, voice = 'sage') {
      try {
        const response = await fetch('https://api.openai.com/v1/audio/speech', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          },
          body: JSON.stringify({
            model: 'tts-1',
            input: text,
            voice: voice
          })
        });
  
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`OpenAI TTS API Error: ${errorData.error?.message || 'Unknown error'}`);
        }
  
        // Get the audio as ArrayBuffer
        const audioData = await response.arrayBuffer();
        
        // Convert to base64
        const base64Audio = this._arrayBufferToBase64(audioData);
        
        return base64Audio;
      } catch (error) {
        console.error('Error generating speech:', error);
        throw error;
      }
    }
  
    _arrayBufferToBase64(buffer) {
      let binary = '';
      const bytes = new Uint8Array(buffer);
      const len = bytes.byteLength;
      
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      
      return window.btoa(binary);
    }
  }
  
  export default OpenAIService;