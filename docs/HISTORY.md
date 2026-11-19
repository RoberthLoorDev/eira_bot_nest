# Historial del proyecto (`eira_bot`)

## Estado actual
El bot arranca con NestJS, se conecta a PostgreSQL (Neon) mediante Prisma 5.22.0 y responde por Telegram en modo polling. Tiene implementado el registro automático de usuarios nuevos, menú guiado con botones (`InlineKeyboard`), persistencia de flujo en `conversation_state` (TTL 5 min) y listado/creación de categorías (`gasto`, `ingreso`, `ahorro`).

## Próximo paso
Definir mediante una mini-spec en `docs/specs/` la siguiente funcionalidad: registro de movimientos (`RecordsModule`) + extracción en 1 llamada JSON con IA (Groq/Gemini) y confirmación por botones.

## Historial
- **2026-11-18** · Menú guiado y categorías básicas (`docs/specs/menu-categories.md`): se crearon `ConversationModule` (estado persistente en `conversation_state` con TTL 5 min), `CategoriesModule` (listar agrupadas por tipo y crear validando duplicados/longitud), teclado inline de menú en Telegram y tests unitarios.
- **2026-11-16** · Metodología Mini-SDD: se agregaron reglas de flujo de trabajo, investigación y plantilla de specs en `AGENTS.md`, junto con `docs/HISTORY.md`.
- **2026-11-16** · Registro de usuarios y middleware de Telegram: se integró `UsersModule`, `TelegramMiddleware` con registro inicial, handler básico de texto, migración inicial aplicada en Neon y permisos de build en `pnpm-workspace.yaml`.
- **2026-04-13** · Base inicial del proyecto: setup de NestJS, esquema de Prisma (`users`, `categories`, `records`, `conversation_state`), ajuste a Prisma 5.22.0 y módulo base de Telegram.
