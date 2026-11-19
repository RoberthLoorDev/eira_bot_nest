# Registro de movimientos y extracción con IA (1 llamada)
Estado: completada

## Requisitos
- Activar los botones del menú (`💸 Registrar gasto`, `💰 Registrar ingreso`, `🐷 Registrar ahorro`) para pedir el movimiento por texto y procesarlo igual que un mensaje libre.
- Interpretar texto libre sin abrir menú (ej. *"compré un mando PS5 de $25 para Navidad"*) en **máximo 1 llamada de IA** que devuelva JSON validado con `zod`.
- Usar `user.timezone` (con `date-fns-tz`) para interpretar fechas relativas (*hoy*, *ayer*) y mostrar la hora local en Telegram, guardando `occurredAt` siempre en **UTC** en PostgreSQL.
- Antes de guardar en `records`, mostrar tarjeta previa con `[✅ Guardar]`, `[🏷️ Cambiar categoría]` y `[❌ Cancelar]`.
- Si falta la categoría o no existe ninguna coincidencia, avisar y listar las categorías del tipo en botones; si el texto mencionó un nombre nuevo, ofrecer `[➕ Crear "<nombre>"]` para crearla y continuar.
- Fuera de alcance: notas de voz (Groq Whisper), fotos/PDFs, consultas de totales, editar/borrar registros guardados, `budgetLimit` y tipo `inversion`.

## Investigación
**Conceptos clave:**
- `Structured Output / JSON Mode`: modo donde el LLM devuelve JSON válido siguiendo un esquema, evitando texto conversacional extra.
- `RPM / RPD / TPD`: límites de peticiones por minuto, peticiones por día y tokens por día del proveedor.
- `Fallback`: proveedor secundario que responde automáticamente si el principal falla o devuelve límite de cuota (`429`).

### Opción A: Groq (`openai/gpt-oss-20b` / `openai/gpt-oss-120b`)
- **Cómo funciona**: `groq-sdk` (ya instalado) soporta `response_format: { type: 'json_object' }` y responde en milisegundos.
- **Costo / límites (tier gratuito)**: acceso gratuito por API (sin tarjeta) con modelos actuales como `openai/gpt-oss-20b` y `openai/gpt-oss-120b` (además de `whisper-large-v3-turbo` para audio).
- **Encaje con el proyecto**: ya tienes `GROQ_API_KEY` y `groq-sdk`. Como solo mandamos el mensaje actual + lista corta de categorías (sin historial), un JSON pequeño cabe holgado.

### Opción B: Gemini API (`gemini-2.5-flash` / `gemini-2.5-flash-lite`)
- **Cómo funciona**: El paquete actual `@google/generative-ai` está deprecado; el SDK vigente es `@google/genai` (acepta JSON Schema vía `z.toJSONSchema()`).
- **Costo / límites (tier gratuito AI Studio)**: `gemini-2.5-flash` ronda **10–15 RPM** y **250–1,500 RPD**; `flash-lite` varía según proyecto (**20–1,000 RPD**).
- **Nota sobre tu suscripción Google AI Pro**: no sube automáticamente el Free Tier, pero incluye **\$10/mes en créditos de Google Cloud** aplicables a la API si activas una cuenta de facturación en AI Studio (requiere depósito inicial mínimo).

### Decisión
- **Elegida: Groq (`openai/gpt-oss-20b`) como principal + Gemini (`@google/genai`) como fallback** si Groq falla o da `429`.
- **Por qué**: en 100% gratis sin configurar billing, Groq responde rápido con modelos activos (`openai/gpt-oss-20b`) y modo JSON; guardamos Gemini como respaldo (y para futuras fotos de facturas).

## Spec
### Flujo
1. **Por botón (`rec:new:<tipo>`)**:
   `Botón → guarda awaiting_record_input (type) en conversation_state → pide texto → 1 llamada IA (type fijo) → tarjeta previa`.
2. **Por texto libre (sin estado pendiente)**:
   `Texto → 1 llamada AiService.extractRecord(text, categories, user.timezone, nowUtc) → valida con zod`.
   - Si no es un movimiento (`intent: 'unknown'`): responde guía corta con menú (`0` guardados).
   - Si falta `amount` o `type`: guarda borrador en `conversation_state` y pide el dato faltante (botones de tipo o texto numérico sin volver a llamar a la IA).
   - Si `categoryName` no coincide: guarda borrador en `conversation_state` y muestra botones de categorías del tipo + `[➕ Crear "<nombre>"]` (si sugirió una nueva) + `[❌ Cancelar]`.
   - Si está completo con categoría existente desde la IA: guarda directo en `records` (UTC), limpia `conversation_state` y responde el resumen con el menú (si pasó por botones/pasos extra, muestra tarjeta con `[✅ Guardar] [🏷️ Cambiar categoría] [❌ Cancelar]`).
3. **Confirmación (`rec:confirm` / `rec:cat:<id>` / `rec:cat_create`)**:
   `Botón → RecordsService.create(...) en PostgreSQL (UTC) → limpia conversation_state → confirma con menú`.

### Casos borde
- [x] Texto con múltiples números (ej. *"calle 3 av 24 gasté 35"*) → la IA extrae `amount: 35` y `zod` valida `amount > 0`.
- [x] Monto faltante o inválido (`<= 0`) tras elegir por menú → pedir monto numérico y parsearlo en código sin re-llamar a la IA.
- [x] Groq devuelve `429` o JSON inválido → reintentar 1 vez con Gemini fallback; si ambos fallan, avisar al usuario sin guardar nada.
- [x] Categoría mencionada no existe y usuario pulsa `[➕ Crear "<nombre>"]` → crea categoría con `CategoriesService` y pasa directo a la tarjeta de confirmación.
- [x] Sesión expirada (`> 5 min`) al pulsar `[✅ Guardar]` → `answerCbQuery()` avisando que expiró y volver al menú sin duplicar registro.

### Plan
- [x] Crear `DateTimeUtil` (helper con `date-fns-tz`) para obtener fecha/hora local en `user.timezone`, convertir fechas relativas a UTC y formatear tarjetas.
- [x] Crear `AiModule` (`ai.types.ts`, `ai.schema.ts` con `zod`, `groq.provider.ts`, `gemini.provider.ts`, `ai.service.ts`) usando `@google/genai` (reemplazando `@google/generative-ai`) y `groq-sdk`.
- [x] Crear `RecordsModule` (`records.types.ts`, `records.repository.ts`, `records.service.ts`, `records.module.ts`) para insertar en `records` y actualizar `ConversationModule` (`PendingAction` y `pendingData` para borradores de registro).
- [x] Integrar flujos en `TelegramService` y `telegram.menu.ts` (reemplazar `rec:soon:` por `rec:new:`, tarjeta previa, selector/creación rápida de categoría y captura de monto faltante).
- [x] Agregar tests unitarios (`ai.service.spec.ts`, `records.service.spec.ts`, `datetime.spec.ts` → `datetime.util.spec.ts`) y verificar con `tsc --noEmit`, `eslint`, `jest` y `nest build`.
