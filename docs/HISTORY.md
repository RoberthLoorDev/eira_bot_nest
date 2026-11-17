# Historial del proyecto (`eira_bot`)

## Estado actual
El bot arranca con NestJS, se conecta a PostgreSQL (Neon) mediante Prisma 5.22.0 y responde por Telegram en modo polling. Actualmente solo tiene implementado el registro automático de usuarios nuevos (creando 3 categorías por defecto) y una respuesta temporal para mensajes de texto.

## Próximo paso
Definir mediante una mini-spec en `docs/specs/` la siguiente funcionalidad (por ejemplo, menú guiado con botones, módulo de IA/audio con Groq y Gemini, o flujo de categorías y registros).

## Historial
- **2026-11-16** · Metodología Mini-SDD: se agregaron reglas de flujo de trabajo, investigación y plantilla de specs en `AGENTS.md`, junto con `docs/HISTORY.md`.
- **2026-11-16** · Registro de usuarios y middleware de Telegram: se integró `UsersModule`, `TelegramMiddleware` con registro inicial, handler básico de texto, migración inicial aplicada en Neon y permisos de build en `pnpm-workspace.yaml`.
- **2026-04-13** · Base inicial del proyecto: setup de NestJS, esquema de Prisma (`users`, `categories`, `records`, `conversation_state`), ajuste a Prisma 5.22.0 y módulo base de Telegram.
