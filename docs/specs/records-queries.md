# Consultas y comparaciones de movimientos por lenguaje natural
Estado: completada

## Requisitos
- Consultar movimientos por texto libre en cualquier rango de fechas: relativo (*hoy, ayer, semana pasada, hace dos semanas, mes pasado, este mes*), día de la semana (*el jueves, viernes pasado* → siempre hacia el pasado, nunca futuro) o fecha exacta (*10 de noviembre de 2026*).
- Filtrar opcionalmente por tipo (`gasto`, `ingreso`, `ahorro`) y/o por categoría existente (ej. *"en Comida"*, *"en Gastos hormiga"* si existe esa categoría).
- Soportar comparaciones entre dos períodos o dos días (ej. *"compara mis gastos del mes pasado con este mes"*, *"compara el lunes con hoy"*).
- Calcular todos los rangos de fechas en `user.timezone` (ej. `America/Guayaquil` UTC-5) convertidos a **UTC** para consultar `records.occurred_at` en PostgreSQL, y mostrar fechas/horas en la zona del usuario.
- Formato en Telegram (sin tablas, formateado en backend a 0 tokens extra):
  - **Consulta**: total general + desglose por categoría + últimos movimientos (máx. 15, agrupados por fecha local).
  - **Comparación**: totales de ambos períodos, diferencia en `$` y `%`, y top categorías con mayor cambio.
- Fuera de alcance: botones nuevos en el menú principal, segunda llamada a la IA para redactar consejos, flag dedicado `is_ant_expense` en BD, notas de voz y edición/borrado de registros.

## Investigación
**Conceptos clave:**
- `Intervalo semiabierto [inicio, fin)`: consultar `occurred_at >= inicioUtc AND occurred_at < inicioDiaSiguienteUtc` evita perder milisegundos o fallar en cambios de horario (DST).
- `Intent unificado`: usar un solo prompt/JSON para clasificar si el usuario quiere crear, consultar o comparar, en lugar de hacer múltiples llamadas encadenadas.

### Opción A: Parser de fechas en código (`chrono-node` / regex en backend)
- **Cómo funciona**: añade una librería NLP/regex para extraer fechas en español antes de llamar a la IA.
- **Costo / límites**: 0 tokens para fechas aisladas, pero no resuelve intención ni filtros de categoría/tipo ni comparaciones compuestas, así que igual requiere IA y obliga a mantener otra dependencia + reglas frágiles en español.
- **Encaje con el proyecto**: bajo; añade complejidad duplicando lo que ya hace la llamada única de IA.

### Opción B: Traductor de rangos en la misma llamada de IA + límites UTC con `date-fns-tz` y SQL en Prisma
- **Cómo funciona**: ampliamos el esquema `zod` de `AiService` con `intent: 'create_record' | 'query_records' | 'compare_records' | 'unknown'` y fechas locales `startDate`, `endDate`, `compareStartDate`, `compareEndDate` (`YYYY-MM-DD`). Le pasamos la fecha local actual **y el día de la semana** (ej. `viernes 2026-11-20`) para que resuelva cualquier fecha relativa siempre hacia el pasado. El backend convierte esos días a límites UTC con `fromZonedTime`, ejecuta la consulta exacta en PostgreSQL (`Prisma`) y arma la respuesta en código.
- **Costo / límites**: **1 sola llamada a Groq** (`openai/gpt-oss-20b`) por consulta o comparación; **0 tokens** para sumar y formatear.
- **Encaje con el proyecto**: 0 dependencias nuevas, reutiliza `AiService`, `date-fns-tz` y `RecordsModule`.

### Decisión
- **Elegida: Opción B (Intent unificado + rangos UTC en `DateTimeUtil` + SQL exacto en Prisma)**.
- **Por qué**: mantiene el principio de máximo 1 llamada por mensaje libre, calcula totales exactos al centavo en PostgreSQL y respeta cualquier `user.timezone` sin añadir librerías extra.

## Spec
### Flujo
1. **Extracción unificada (1 llamada IA)**:
   `Texto libre → AiService.extractMessage(text, categories, user.timezone, nowUtc) → JSON validado con zod`:
   - `intent: 'create_record'` → flujo actual de registro.
   - `intent: 'query_records'` → recibe `startDate`, `endDate`, `type?`, `categoryName?`.
   - `intent: 'compare_records'` → recibe `startDate`, `endDate`, `compareStartDate`, `compareEndDate`, `type?`, `categoryName?`.
2. **Consulta (`query_records`)**:
   `DateTimeUtil.getLocalDateRangeUtc(startDate, endDate, user.timezone) → RecordsService.queryByRange(...) (isDeleted: false) → agrupa totales por categoría + últimos 15 agrupados por fecha local → responde en Telegram`.
3. **Comparación (`compare_records`)**:
   `Convierte ambos rangos a UTC → 2 queries paralelas en PostgreSQL → calcula total A, total B, diferencia en $ y % (manejando base 0) y top categorías → formatea y responde en Telegram`.

### Casos borde
- [x] Día de la semana ambiguo (ej. hoy viernes y pide *"el jueves"*) → la IA lo resuelve al jueves inmediatamente pasado, nunca futuro; si `startDate > endDate`, el backend los ordena.
- [x] Categoría mencionada en el filtro no existe → avisar que no existe esa categoría y mostrar sugerencia/lista de sus categorías activas en lugar de devolver `$0` silencioso.
- [x] Período sin movimientos → responder mensaje claro indicando que no hay registros en ese rango (mostrando las fechas consultadas).
- [x] Más de 15 movimientos en el período → mostrar total exacto de **todos** los movimientos + desglose completo por categoría + los **últimos 15** con nota *"(mostrando los últimos 15 de N)"*.
- [x] Comparación con período anterior en `$0` → evitar división por cero (`NaN`/`Infinity`) mostrando incremento absoluto sin porcentaje engañoso.
- [x] Consulta sin fecha explícita (ej. *"mis gastos"*) → asumir mes actual en `user.timezone` por defecto.

### Plan
- [x] Ampliar `src/common/datetime.util.ts` con `getLocalWeekdayName`, `getLocalDateRangeUtc` (intervalo semiabierto `[startUtc, nextDayStartUtc)`) y `getCurrentMonthLocalRange` + tests en `datetime.util.spec.ts`.
- [x] Ampliar `AiModule` (`ai.types.ts`, `ai.schema.ts`, `ai.service.ts`) para soportar `query_records` y `compare_records` con fecha local + día de la semana en el prompt + tests en `ai.service.spec.ts`.
- [x] Ampliar `RecordsModule` (`records.types.ts`, `records.repository.ts`, `records.service.ts`) con consultas por rango UTC, totales por categoría, límite de últimos 15 y comparación entre dos períodos + tests en `records.service.spec.ts`.
- [x] Crear formateadores de consulta y comparación en `src/telegram/telegram.reports.ts` y conectar `query_records` y `compare_records` en `TelegramService`.
- [x] Verificar con `tsc --noEmit`, `eslint`, `jest` y `nest build` (más prueba en vivo del prompt contra Groq).
