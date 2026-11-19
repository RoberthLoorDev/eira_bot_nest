# Roadmap del proyecto (`eira_bot`)

## Visión
**Eira** es una asistente contable personal (*contadora de confianza y amiga*, no un Excel frío) para gestionar gastos, ingresos, ahorros e inversiones por chat. Prioriza **eficiencia de tokens** (combinando botones rápidos sin IA con llamadas puntuales en JSON y modelos económicos/gratuitos) y guarda toda fecha en **UTC** para adaptarse a la zona horaria de cada usuario fuera de Ecuador.

## Notas de trabajo y arquitectura
- **Sin orden rígido**: los bloques de abajo son áreas temáticas, no fases secuenciales; puedes tomar cualquier ítem en el orden que prefieras (solo se respetan dependencias obvias).
- **Sin BD vectorial por ahora**: consultas y sumas por fecha o categoría se resuelven con SQL exacto en PostgreSQL; el historial corto se gestiona con `conversation_state`.
- **Híbrido menú + lenguaje natural**: botones y comandos responden en código (0 tokens); texto libre, audio, fotos y PDFs usan extracción estructurada en 1 llamada.

---

## 1. Onboarding, usuarios y flujo conversacional
- [ ] **Términos y registro inicial**: al detectar un `telegramId` nuevo, mostrar Términos y Condiciones (link rápido en Notion al inicio, página propia después) antes de pedir el nombre; saludo cordial a usuarios existentes.
- [ ] **Zonas horarias (UTC)**: ✅ guardado en UTC y conversión/formato a `user.timezone` con `date-fns-tz` en `records-ai`; pendiente: permitir cambiar la timezone al usuario.
- [ ] **Menú guiado + confirmación conversacional**: ✅ menú completo, botones de movimientos y tarjeta previa con `[✅ Guardar] [🏷️ Cambiar categoría] [❌ Cancelar]`; pendiente: corregir categoría después de guardar.

## 2. Categorías, movimientos y consultas
- [ ] **Categorías flexibles**: ✅ categorías por defecto (`gasto`, `ingreso`, `ahorro`), crear/listar por menú y elegir/crear por botones si falta al registrar (`records-ai`); pendiente: evaluar `inversion` y listar/ajustar por lenguaje natural (*"recuérdame mis categorías"*).
- [x] **Registros por texto natural**: crear movimientos con contexto completo en 1 llamada de IA (ej. *"saldo de $25 de mando PS5 en Navidad"*).
- [ ] **Consultas en lenguaje natural**: responder preguntas sobre gastos/ingresos por categoría o período (*hoy, ayer, últimos 10/15/30 días, mes pasado*).

## 3. Inteligencia financiera, alertas y reportes
- [ ] **Límites de presupuesto y categorías vigiladas**: `budgetLimit` opcional por categoría con alertas progresivas sin bloquear gastos (preventiva ~80% 🟡, límite cercano/excedido 🔴) + flag de *"adviérteme sobre esta categoría"*.
- [ ] **Control de gastos hormiga**: flag/check en BD para marcar categorías de gastos pequeños (snacks, compras menores) y destacarlos en consultas y análisis.
- [ ] **Resumen automático mensual + mejores prácticas**: informe enviado el día 1 de cada mes con resumen del mes anterior, análisis de gastos hormiga innecesarios y consejos basados en buenas prácticas de finanzas personales.

## 4. Multimodal (Audio, Fotos y PDF)
- [ ] **Entrada por notas de voz (STT)**: transcribir audios para registrar o consultar directamente sin abrir menús.
- [ ] **Respuestas en audio (TTS, opcional/bajo costo)**: que Eira pueda responder con notas de voz en Telegram, Web y Móvil; investigar opciones gratuitas o muy económicas frente a alternativas caras como ElevenLabs.
- [ ] **Lectura de fotos**: interpretar facturas de compra y comprobantes de depósito/transferencia bancaria (distinguiendo gasto vs ingreso sin conectar cuentas bancarias).
- [ ] **Soporte y generación de PDF**: leer PDFs enviados por el usuario y generar reportes PDF mensuales con alertas de presupuesto y detalle de gastos hormiga.

## 5. Plataformas e infraestructura (mediano/largo plazo)
- [ ] **Monorepo + Web App (Dashboard SPA)**: convertir el repo en monorepo con una web de vista única (tablas y gráficos dinámicos que se adaptan a las categorías de cada usuario, filtros y chat integrado).
- [ ] **App Móvil (React Native — Android e iOS)**: mismo dashboard con métricas filtrables, chat integrado y **widget en pantalla de inicio** para abrir micrófono o cámara en 1 toque.
- [ ] **Despliegue en VPS propio**: montar backend y BD en un VPS (~2 GB RAM) cuidando librerías ligeras (especialmente al generar PDFs).
