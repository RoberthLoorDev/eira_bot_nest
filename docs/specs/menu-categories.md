# Menú guiado y gestión básica de categorías
Estado: completada

## Requisitos
- Abrir el menú principal con botones en Telegram al usar `/start`, `/menu` o saludos cortos (`hola`, `buenas`, `menu`).
- Mostrar botones de categorías (`📂 Mis categorías`, `➕ Nueva categoría`) y botones placeholder de movimientos (`💸 Registrar gasto`, `💰 Registrar ingreso`, `🐷 Registrar ahorro`) que avisen que estarán disponibles pronto.
- Listar las categorías activas del usuario (`deletedAt: null`) agrupadas por tipo (`gasto`, `ingreso`, `ahorro`).
- Crear una categoría nueva en 2 pasos rápidos: elegir tipo con botones (`gasto | ingreso | ahorro`) y enviar el nombre por texto.
- Persistir el estado conversacional de usuarios registrados en la tabla `conversation_state` (PostgreSQL).
- Fuera de alcance: editar o eliminar categorías, asignar emoji o `budgetLimit`, registrar movimientos reales, términos y condiciones, y llamadas a IA (Gemini/Groq).

## Investigación
**Conceptos clave:**
- `Inline Keyboard`: botones adjuntos debajo de un mensaje de Telegram que envían un `callback_query` en lugar de texto en el chat.
- `callback_data`: etiqueta oculta que envía cada botón (límite estricto de **64 bytes** en Telegram, medido en bytes UTF-8, no en caracteres).
- `answerCbQuery()`: respuesta obligatoria a Telegram al pulsar un botón para quitar el icono de carga infinito.
- `TTL (Time-To-Live)`: tiempo de vida tras el cual un estado pendiente expira automáticamente.

### Estado conversacional: Memoria (`Map` / `Telegraf session`) vs `ConversationState` (Prisma + PostgreSQL)
- **Opción A — En memoria (`Map` o `session()` de Telegraf):** respuesta instantánea sin consultar la BD, pero cualquier reinicio de NestJS o deploy borra el flujo en curso y no escala si corren más instancias.
- **Opción B — `ConversationState` en PostgreSQL (Prisma):** usa la tabla `conversation_state` ya creada en `schema.prisma` (con `pendingAction`, `pendingData` en JSON y `expiresAt`). Añade una consulta ligera por mensaje, pero sobrevive reinicios, evita instalar Redis en un futuro VPS de 2 GB y mantiene una sola fuente de verdad.

### Decisión
- **Elegida:** **Opción B (`ConversationState` en Prisma)** para todo usuario ya registrado, dejando `pendingRegistration` en memoria solo durante el registro inicial (porque `conversation_state.user_id` exige llave foránea hacia `users`).
- **Botones con Telegraf `Markup.inlineKeyboard`:** usaremos prefijos cortos ASCII menores a 64 bytes (`menu:main`, `cat:list`, `cat:new`, `cat:type:gasto`, `rec:soon:gasto`, `flow:cancel`) capturados con `bot.action(...)` y respondiendo siempre `ctx.answerCbQuery()`.

## Spec
### Flujo
1. **Menú principal (`/start`, `/menu`, saludo corto o botón Volver):**
   `Telegram → Middleware (verifica usuario) → TelegramService → responde menú InlineKeyboard (0 tokens IA)`.
2. **Listar categorías (`cat:list`):**
   `Botón → CategoriesService.findAllByUser(userId) → agrupa por tipo → edita/envía lista + botones [➕ Nueva categoría] [⬅️ Menú]`.
3. **Crear categoría (`cat:new`):**
   `Botón → pide tipo [💸 Gasto | 💰 Ingreso | 🐷 Ahorro | ❌ Cancelar] → usuario elige cat:type:<tipo> → guarda estado awaiting_category_name en conversation_state (TTL 5 min) → usuario escribe nombre → CategoriesService.create(...) → limpia estado → confirma y ofrece menú`.
4. **Botones de movimientos (`rec:soon:<tipo>`):**
   `Botón → answerCbQuery() + mensaje corto indicando que el registro de movimientos llegará en la siguiente fase`.

### Casos borde
- [x] Estado expirado (`expiresAt < now`) → limpiar `conversation_state` y tratar el mensaje como flujo normal.
- [x] Usuario escribe un comando (`/menu`, `/cancel`) o pulsa `flow:cancel` mientras esperaba nombre → cancelar estado pendiente y mostrar menú.
- [x] Nombre vacío, no-texto (sticker/audio) o mayor a 100 caracteres → pedir un nombre válido en texto (máx. 100 chars).
- [x] Nombre de categoría duplicado para el mismo usuario (`uq_categories_user_name`, comparando sin distinguir mayúsculas/minúsculas) → avisar que ya existe y pedir otro nombre sin romper el flujo.
- [x] Usuario pulsa botón cuando la sesión expiró → responder con `answerCbQuery()` y redirigir al menú sin dejar el botón cargando.

### Plan
- [x] Crear `ConversationModule` (`conversation.module.ts`, `conversation.service.ts`, `conversation.repository.ts`, `conversation.types.ts`) con interfaces explícitas para leer, guardar con TTL de 5 min y limpiar `ConversationState`.
- [x] Crear `CategoriesModule` (`categories.module.ts`, `categories.service.ts`, `categories.repository.ts`, `categories.types.ts`) para listar categorías activas (`deletedAt: null`) y crear categoría validando duplicados y longitud.
- [x] Reutilizar `UsersService.findByTelegramId` en `TelegramMiddleware` para pasar el `user` autenticado en `ctx.state` sin repetir queries.
- [x] Refactorizar `TelegramService` y crear `telegram.menu.ts` + `telegram.types.ts` (menú principal, selector de tipo, listado y cancelación) manejando `bot.action(...)`, saludos cortos y estados pendientes.
- [x] Verificar con `nest build`, `tsc --noEmit`, `eslint`, pruebas unitarias (5/5 suites nuevas/activas) y prueba rápida de arranque (`node dist/main.js`).
