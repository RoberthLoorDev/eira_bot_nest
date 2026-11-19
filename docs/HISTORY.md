# Historial del proyecto (`eira_bot`)

## Estado actual
El bot arranca con NestJS, se conecta a PostgreSQL (Neon) mediante Prisma 5.22.0 y responde por Telegram en modo polling. Tiene implementado el registro automático de usuarios, menú guiado (`InlineKeyboard`), gestión básica de categorías, persistencia en `conversation_state` (TTL 5 min), extracción de movimientos en 1 llamada JSON (Groq principal + Gemini `@google/genai` fallback) con tarjeta de confirmación y manejo de fechas en UTC/timezone del usuario.

## Próximo paso
Definir mediante una mini-spec en `docs/specs/` la siguiente funcionalidad: notas de voz (Groq Whisper STT) conectadas al flujo de registros, o consultas de movimientos y totales por período/categoría.

## Historial
- **2026-11-18** · Registro de movimientos e IA en 1 llamada (`docs/specs/records-ai.md`): se crearon `DateTimeUtil` (UTC + `user.timezone`), `AiModule` (Groq principal + `@google/genai` fallback validado con `zod`), `RecordsModule`, confirmación previa por botones y creación rápida de categoría faltante.
- **2026-11-18** · Menú guiado y categorías básicas (`docs/specs/menu-categories.md`): se crearon `ConversationModule` (estado persistente en `conversation_state` con TTL 5 min), `CategoriesModule` (listar agrupadas por tipo y crear validando duplicados/longitud), teclado inline de menú en Telegram y tests unitarios.
- **2026-11-16** · Metodología Mini-SDD: se agregaron reglas de flujo de trabajo, investigación y plantilla de specs en `AGENTS.md`, junto con `docs/HISTORY.md`.
- **2026-11-16** · Registro de usuarios y middleware de Telegram: se integró `UsersModule`, `TelegramMiddleware` con registro inicial, handler básico de texto, migración inicial aplicada en Neon y permisos de build en `pnpm-workspace.yaml`.
- **2026-04-13** · Base inicial del proyecto: setup de NestJS, esquema de Prisma (`users`, `categories`, `records`, `conversation_state`), ajuste a Prisma 5.22.0 y módulo base de Telegram.
