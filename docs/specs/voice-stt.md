# Entrada por notas de voz (STT con Groq Whisper)
Estado: completada

## Requisitos
- Recibir notas de voz (`voice`) en Telegram, transcribirlas a texto en español y pasarlas exactamente por el mismo flujo que un mensaje de texto (crear movimientos, consultar, comparar, responder monto faltante o nombre de categoría).
- No mostrar el texto transcrito al usuario: responder directamente el resultado de la acción.
- Rechazar notas de voz que superen **30 segundos** antes de descargar el archivo o llamar a Groq, avisando amablemente al usuario.
- No requerir `ffmpeg` ni conversión local de audio (descargar `.ogg` en memoria y enviarlo directo a Groq).
- Fuera de alcance: respuestas en audio (TTS), archivos de audio adjuntos largos (`audio` de música/podcasts), transcripción de notas de voz durante el primer registro antes de crear usuario.

## Investigación
**Conceptos clave:**
- `STT (Speech-to-Text)`: convierte audio hablado en texto plano.
- `OGG / Opus`: formato comprimido nativo en el que Telegram graba las notas de voz (`~60–150 KB` para 30s).
- `WER (Word Error Rate)`: porcentaje de error en palabras transcritas (menor es mejor).

### Opción A: Groq `whisper-large-v3-turbo`
- **Cómo funciona**: `groq-sdk` (`client.audio.transcriptions.create`) acepta `.ogg` de Telegram directamente sin `ffmpeg` usando `File` nativo de Node 24 y `language: 'es'`.
- **Costo / límites (tier gratuito)**: **20 RPM**, **2,000 peticiones/día**, **28,800 segundos de audio/día (~8 horas)** y hasta **25 MB** por archivo. Si algún día pasas a pago: `~$0.04/hora`.
- **Encaje con el proyecto**: ya tienes `GROQ_API_KEY`, `groq-sdk` y `whisper-large-v3-turbo` activo en tu cuenta; es más rápido (~216x tiempo real) y suficiente para dictado corto en español.

### Opción B: Groq `whisper-large-v3`
- **Cómo funciona**: mismo endpoint y soporte `.ogg`, con 1.55B parámetros y soporte de traducción a inglés.
- **Costo / límites**: mismas cuotas gratuitas (20 RPM / 2,000 RPD), algo más lento (~189x) y más caro en pago (`~$0.111/hora`).
- **Encaje con el proyecto**: innecesario como default porque no necesitamos traducir al inglés; queda configurable vía variable opcional `GROQ_WHISPER_MODEL` si alguna vez se requiere mayor precisión.

### Decisión
- **Elegida: Opción A (`whisper-large-v3-turbo` en `GroqProvider`)** enviando `.ogg` directo en memoria con `language: 'es'` y `temperature: 0`.
- **Por qué**: 0 dependencias nuevas, sin `ffmpeg` (cuida la RAM del futuro VPS de 2 GB), latencia mínima y cuota gratuita amplísima para audios de hasta 30s.

## Spec
### Flujo
`Nota de voz en Telegram (bot.on('voice')) → valida duration <= 30s → sendChatAction('typing') → ctx.telegram.getFileLink(file_id) → descarga .ogg con fetch nativo → AiService.transcribeAudio(buffer, 'voice.ogg') → Groq Whisper → texto transcrito → TelegramService.processTextInput(ctx, user, text) (mismo flujo unificado de texto)`.

### Casos borde
- [x] Audio mayor a 30 segundos (`voice.duration > 30`) → rechazar sin descargar ni llamar a Groq y avisar: *"La nota de voz supera el límite de 30 segundos..."*.
- [x] Audio vacío, solo ruido o transcripción en blanco → responder pidiendo repetir el audio o escribir por texto, sin llamar al extractor de movimientos.
- [x] Error de descarga de Telegram o falla/cuota `429` en Groq Whisper → capturar error, loggear warning y responder aviso amigable sin tumbar el bot.
- [x] Audio mientras hay flujo pendiente (`awaiting_record_amount`, `awaiting_category_name`, `awaiting_record_input`) → el texto transcrito entra al mismo flujo y completa el paso pendiente.

### Plan
- [x] Agregar tipos de transcripción en `src/ai/ai.types.ts` y método `transcribeAudio(audioBuffer, filename, language)` en `GroqProvider` y `AiService` (`whisper-large-v3-turbo`, `language: 'es'`).
- [x] Extraer la lógica del handler de texto en `TelegramService` a un método privado reutilizable `processTextInput(ctx, user, rawText)`.
- [x] Registrar `this.bot.on('voice', ...)` (antes del catch-all `bot.on('message')`) validando `duration <= 30`, descargando el `.ogg` con `fetch` y pasando el texto a `processTextInput`.
- [x] Agregar tests unitarios en `ai.service.spec.ts` (transcripción exitosa, vacía y error) y verificar con `tsc --noEmit`, `eslint`, `jest` y `nest build`.
