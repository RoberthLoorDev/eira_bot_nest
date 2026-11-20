# Historial del proyecto (`eira_bot`)

## Estado actual
El bot arranca con NestJS, se conecta a PostgreSQL (Neon) mediante Prisma 5.22.0 y responde por Telegram en modo polling. Tiene implementado el registro automático de usuarios, menú guiado (`InlineKeyboard`), gestión básica de categorías, persistencia en `conversation_state` (TTL 5 min), entrada por notas de voz (Groq `whisper-large-v3-turbo`, máx. 30s) y extracción en 1 llamada JSON (Groq `openai/gpt-oss-20b` + Gemini `@google/genai` fallback) para crear, consultar y comparar movimientos ajustados a `user.timezone` (UTC en BD).

## Próximo paso
Definir mediante una mini-spec en `docs/specs/` la siguiente funcionalidad: onboarding con Términos y selector/cambio de zona horaria, presupuestos/gastos hormiga o lectura de fotos de facturas/transferencias.

## Historial
- **2026-11-20** · Entrada por notas de voz (`docs/specs/voice-stt.md`): se integró Groq Whisper (`whisper-large-v3-turbo`, `.ogg` directo en memoria sin `ffmpeg`, límite 30s) en `GroqProvider`/`AiService` y `bot.on('voice')` en `TelegramService` reutilizando `processTextInput`.
- **2026-11-20** · Consultas y comparaciones por lenguaje natural (`docs/specs/records-queries.md`): se amplió `DateTimeUtil` con intervalos semiabiertos UTC por `user.timezone`, `AiModule` con intents `query_records` y `compare_records`, `RecordsModule` con agregaciones/comparaciones exactas y formateadores en `telegram.reports.ts` (0 tokens extra).
- **2026-11-18** · Registro de movimientos e IA en 1 llamada (`docs/specs/records-ai.md`): se crearon `DateTimeUtil` (UTC + `user.timezone`), `AiModule` (Groq principal + `@google/genai` fallback validado con `zod`), `RecordsModule`, confirmación previa por botones y creación rápida de categoría faltante.
- **2026-11-18** · Menú guiado y categorías básicas (`docs/specs/menu-categories.md`): se crearon `ConversationModule` (estado persistente en `conversation_state` con TTL 5 min), `CategoriesModule` (listar agrupadas por tipo y crear validando duplicados/longitud), teclado inline de menú en Telegram y tests unitarios.
- **2026-11-16** · Metodología Mini-SDD: se agregaron reglas de flujo de trabajo, investigación y plantilla de specs en `AGENTS.md`, junto con `docs/HISTORY.md`.
- **2026-11-16** · Registro de usuarios y middleware de Telegram: se integró `UsersModule`, `TelegramMiddleware` con registro inicial, handler básico de texto, migración inicial aplicada en Neon y permisos de build en `pnpm-workspace.yaml`.
- **2026-04-13** · Base inicial del proyecto: setup de NestJS, esquema de Prisma (`users`, `categories`, `records`, `conversation_state`), ajuste a Prisma 5.22.0 y módulo base de Telegram.
