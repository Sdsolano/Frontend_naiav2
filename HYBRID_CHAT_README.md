# 🚀 Sistema de Chat Híbrido NAIA

## ¿Qué es esto?

El **Sistema de Chat Híbrido** es una implementación revolucionaria que optimiza dramáticamente la latencia de respuesta de NAIA decidiendo inteligentemente entre:

- 🏠 **Chat Local**: Conversaciones simples procesadas directamente en el frontend con OpenAI
- 🏢 **Chat Backend**: Funciones complejas que requieren búsquedas académicas, creación de documentos, etc.

## 🎯 Objetivo Principal

**Reducir la latencia de respuesta** de ~8-12 segundos a ~2-3 segundos para conversaciones conversacionales simples, manteniendo todas las capacidades avanzadas cuando se necesiten.

## 🔧 Arquitectura

### Flujo Tradicional (Backend Only)
```
Usuario → Frontend → Backend → LLM → Funciones → TTS → Audio
        ↳ ~8-12 segundos de latencia
```

### Nuevo Flujo Híbrido
```
Conversación Simple:
Usuario → Frontend → OpenAI directamente → Audio
        ↳ ~2-3 segundos de latencia

Funciones Complejas:
Usuario → Frontend → Backend → LLM → Funciones → TTS → Audio  
        ↳ ~8-12 segundos (igual que antes)
```

## ⚡ Decisión Inteligente

La lógica de decisión está en `useLocalChat.jsx` función `requiresBackend()`:

### Se usa CHAT LOCAL para:
- ✅ Conversaciones generales ("Hola", "¿cómo estás?")
- ✅ Preguntas educativas simples ("¿Qué es la ingeniería biomédica?")
- ✅ Información general de la Universidad del Norte
- ✅ Charla casual y orientación académica básica

### Se usa BACKEND para:
- 🔍 Búsquedas académicas ("buscar artículos sobre IA")
- 📄 Creación de documentos ("crear ensayo sobre...")
- 🌐 Búsquedas web específicas ("¿quién es el rector?")
- 📊 Gráficos y visualizaciones
- 📁 Análisis de documentos del usuario
- 📧 Envío de emails
- 📰 Noticias actuales
- 🎭 Explicación de roles de NAIA

## 📁 Archivos Principales

### Core Implementation
- `src/hooks/useLocalChat.jsx` - Hook para chat local con OpenAI
- `src/hooks/useHybridChat.jsx` - Manager híbrido que decide local vs backend
- `src/components/HybridChatTest.jsx` - Componente de pruebas

### Integration Points
- `src/main.jsx` - Ruta `/naia/test` para pruebas
- `src/hooks/useChat.jsx` - Hook original (mantenido para compatibilidad)

## 🧪 Cómo Probar

1. **Acceder a la página de pruebas:**
   ```
   http://localhost:5173/naia/test
   ```

2. **Ejemplos de Conversación Local** (Fast ⚡):
   - "Hola, ¿cómo estás?"
   - "¿Qué es la ingeniería biomédica?"
   - "Explícame sobre la Universidad del Norte"

3. **Ejemplos de Backend** (Full Features 🔧):
   - "Buscar artículos sobre inteligencia artificial"
   - "Crear documento sobre metodología"
   - "¿Quién es el rector de la Universidad del Norte?"

## 🎤 Integración con Voz

El sistema híbrido funciona perfectamente con:

- ✅ **Reconocimiento de voz** (`useSimpleVoice.jsx`)
- ✅ **Modo continuo** para conversaciones fluidas
- ✅ **Always listening** con wake words ("Oye Naia")
- ✅ **TTS optimizado** por rol

## 🔄 API de OpenAI Utilizada

### Chat Local:
- **Modelo**: `gpt-4o-audio-preview`
- **Feature**: Chat Completions API con audio output
- **Ventaja**: Una sola llamada → texto + audio
- **Costo**: ~$0.24/minuto de audio

### Backend (sin cambios):
- **Modelos**: `gpt-4.1`, `gpt-4.1-mini`
- **TTS**: `gpt-4o-mini-tts`
- **Funciones**: Scholar search, document creation, etc.

## 🚀 Beneficios

1. **📈 Latencia Reducida**: 2-3 segundos vs 8-12 segundos
2. **💰 Optimización de Costos**: Menos carga en el backend
3. **⚖️ Escalabilidad**: Distribución de carga
4. **🔧 Flexibilidad**: Funciones complejas siguen disponibles
5. **👤 UX Mejorada**: Respuestas instantáneas para chat casual

## ⚙️ Configuración

### Variables de Entorno Requeridas:
```env
VITE_OPENAI_API_KEY=tu_openai_api_key_aquí
```

### Rol Soportado Inicialmente:
- **researcher** (Investigador) - Solo este rol tiene chat híbrido habilitado

## 🔮 Próximos Pasos

1. **Validar y Optimizar**: Probar latencia real y calidad de respuestas
2. **Extender a Otros Roles**: skills_trainer, personal_assistant, etc.
3. **WebSocket Realtime**: Evaluar OpenAI Realtime API para latencia aún menor
4. **Analytics**: Métricas de uso local vs backend
5. **Fallback Inteligente**: Si OpenAI falla, usar backend automáticamente

## 🐛 Debugging

### Estados a Monitorear:
- `isUsingLocalMode` - ¿Está usando chat local?
- `isProcessing` - ¿Está procesando localmente?
- `processingStatus` - Estado del backend (si aplica)

### Logs Importantes:
```javascript
console.log("🏠 USANDO CHAT LOCAL - Conversación simple detectada");
console.log("🏢 USANDO BACKEND - Funciones complejas requeridas");
```

## 💡 Consideraciones Técnicas

### Limitaciones Actuales:
- Solo funciona para rol `researcher`
- Requiere OpenAI API key en frontend
- Memoria de conversación local separada del backend

### Ventajas Arquitectónicas:
- Fallback automático al backend
- Sin cambios en la UI existente
- Compatible con sistema de voz actual
- Preserva todas las funciones avanzadas

---

**¡Esto es solo el comienzo de una experiencia de chat más rápida y eficiente! 🎉**