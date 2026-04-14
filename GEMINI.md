# Mia — Bot Contable de Telegram
## 04 · Estructura del proyecto NestJS

---

### Estructura de carpetas

```
src/
├── main.ts                         # Bootstrap, modo polling vs webhook
├── app.module.ts
│
├── telegram/
│   ├── telegram.module.ts
│   ├── telegram.service.ts         # Inicializa bot, maneja updates
│   ├── telegram.middleware.ts      # Registro automático de usuario nuevo
│   └── keyboards/
│       └── inline.keyboards.ts    # Definiciones de inline keyboards reutilizables
│
├── ai/
│   ├── ai.module.ts
│   ├── gemini.service.ts           # Llamada a Gemini con tool calling
│   ├── groq.service.ts             # Transcripción de audio con Whisper
│   └── tools/
│       ├── tool-schemas.ts         # Definiciones JSON de las tools para Gemini
│       └── tool-validator.ts       # Schemas Zod para validar outputs de Gemini
│
├── users/
│   ├── users.module.ts
│   ├── users.service.ts            # CRUD de usuarios, flujo de registro
│   └── users.repository.ts
│
├── categories/
│   ├── categories.module.ts
│   ├── categories.service.ts       # CRUD + lógica de budget_limit
│   └── categories.repository.ts
│
├── records/
│   ├── records.module.ts
│   ├── records.service.ts          # CRUD + búsqueda + soft delete
│   └── records.repository.ts
│
├── conversation/
│   ├── conversation.module.ts
│   └── conversation.service.ts    # Leer/escribir/limpiar conversation_state
│
└── common/
    ├── prisma.service.ts           # Singleton de Prisma
    ├── message.handler.ts          # Orquestador central de mensajes
    └── utils/
        ├── date.utils.ts           # Formateo de fechas con timezone
        └── format.utils.ts         # Formateo de respuestas para Telegram
```

---

### `message.handler.ts` — el orquestador central

Este archivo es el núcleo. Recibe cada mensaje de Telegram y decide qué hacer.

```typescript
@Injectable()
export class MessageHandler {
  constructor(
    private users: UsersService,
    private conversation: ConversationService,
    private gemini: GeminiService,
    private groq: GroqService,
    private records: RecordsService,
    private categories: CategoriesService,
  ) {}

  async handle(ctx: Context): Promise<void> {
    const telegramId = ctx.from.id;

    // 1. Obtener usuario (el middleware ya lo registró si era nuevo)
    const user = await this.users.findByTelegramId(telegramId);
    if (!user) return; // el middleware maneja el flujo de registro

    // 2. ¿Hay estado pendiente vigente?
    const state = await this.conversation.getActiveState(user.id);
    if (state) {
      await this.handlePendingState(ctx, user, state);
      return;
    }

    // 3. ¿Es audio?
    let text: string;
    if (ctx.message?.voice) {
      text = await this.transcribeVoice(ctx);
    } else {
      text = ctx.message?.text || '';
    }

    if (!text.trim()) return;

    // 4. Llamada a Gemini
    const userCategories = await this.categories.listNames(user.id);
    const result = await this.gemini.processMessage(text, user, userCategories);

    // 5. ¿Tool call o texto libre?
    if (result.tool_call) {
      await this.executeTool(ctx, user, result.tool_call);
    } else {
      await ctx.reply(result.text);
    }
  }
}
```

---

### `telegram.middleware.ts` — registro automático

```typescript
// Se ejecuta antes de cada mensaje
async onEveryMessage(ctx: Context, next: () => Promise<void>) {
  const telegramId = ctx.from?.id;
  if (!telegramId) return next();

  const exists = await this.users.existsByTelegramId(telegramId);

  if (!exists) {
    // Primera vez: iniciar flujo de registro
    await ctx.reply(
      '¡Hola! Soy Mia, tu asistente contable 💼\n\n¿Cómo quieres que te llame?'
    );
    // Guardar estado pendiente de registro
    await this.conversation.setPending(null, {
      pending_action: 'awaiting_user_name',
      pending_data: { telegram_id: telegramId },
      expires_at: addMinutes(new Date(), 10),
    });
    return; // No continuar hasta que den el nombre
  }

  return next();
}
```

---

### `gemini.service.ts` — estructura básica

```typescript
@Injectable()
export class GeminiService {
  private model: GenerativeModel;

  constructor() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash-lite', // ajustar al nombre exacto disponible
      tools: [{ functionDeclarations: TOOL_DEFINITIONS }],
    });
  }

  async processMessage(
    text: string,
    user: User,
    categories: string[],
  ): Promise<{ tool_call?: ToolCall; text?: string }> {
    const systemPrompt = buildSystemPrompt(user.name, categories);

    const result = await this.model.generateContent({
      systemInstruction: systemPrompt,
      contents: [{ role: 'user', parts: [{ text }] }],
    });

    const response = result.response;
    const functionCall = response.candidates?.[0]?.content?.parts
      ?.find(p => p.functionCall)?.functionCall;

    if (functionCall) {
      return { tool_call: functionCall };
    }

    return { text: response.text() };
  }
}
```

---

### `groq.service.ts` — transcripción de audio

```typescript
@Injectable()
export class GroqService {
  private client: Groq;

  constructor() {
    this.client = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }

  async transcribeFromUrl(fileUrl: string): Promise<string> {
    // Descargar el OGG desde Telegram
    const response = await fetch(fileUrl);
    const buffer = await response.arrayBuffer();

    const transcription = await this.client.audio.transcriptions.create({
      file: new File([buffer], 'audio.ogg', { type: 'audio/ogg' }),
      model: 'whisper-large-v3-turbo',
      language: 'es',
    });

    return transcription.text;
  }
}
```

---

### Inicialización del proyecto

```bash
# Crear proyecto con NestJS CLI vía pnpm
pnpm dlx @nestjs/cli new mia-bot
cd mia-bot

# Instalar dependencias de producción
pnpm add \
  telegraf@^4.16.3 \
  @google/generative-ai@^0.21.0 \
  groq-sdk@^0.9.0 \
  @prisma/client@^5.22.0 \
  zod@^3.23.8 \
  date-fns@^3.6.0 \
  date-fns-tz@^3.2.0 \
  reflect-metadata@^0.2.0 \
  rxjs@^7.8.1

# Instalar dependencias de desarrollo
pnpm add -D \
  prisma@^5.22.0 \
  @nestjs/cli@^10.4.5 \
  @types/node@^20.16.0 \
  typescript@^5.4.5 \
  ts-node@^10.9.2 \
  @types/node@^20

# Inicializar Prisma
pnpm dlx prisma init
```

### `package.json` de referencia

```json
{
  "name": "mia-bot",
  "version": "0.1.0",
  "private": true,
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=9.0.0"
  },
  "scripts": {
    "build": "nest build",
    "start": "nest start",
    "start:dev": "nest start --watch",
    "start:prod": "node dist/main",
    "db:migrate": "prisma migrate dev",
    "db:deploy": "prisma migrate deploy",
    "db:generate": "prisma generate",
    "db:studio": "prisma studio"
  },
  "dependencies": {
    "@google/generative-ai": "^0.21.0",
    "@nestjs/common": "^10.4.1",
    "@nestjs/core": "^10.4.1",
    "@nestjs/platform-express": "^10.4.1",
    "@prisma/client": "^5.22.0",
    "date-fns": "^3.6.0",
    "date-fns-tz": "^3.2.0",
    "groq-sdk": "^0.9.0",
    "reflect-metadata": "^0.2.0",
    "rxjs": "^7.8.1",
    "telegraf": "^4.16.3",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.4.5",
    "@types/node": "^20.16.0",
    "prisma": "^5.22.0",
    "ts-node": "^10.9.2",
    "typescript": "^5.4.5"
  }
}
```

**Nota sobre versiones:** Estas son las versiones estables en abril 2026. Antes de instalar, verificar la última versión de `@google/generative-ai` en npm ya que Google actualiza frecuentemente el SDK de Gemini. El resto es estable.

---

### Prisma schema (referencia rápida)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id           String   @id @default(uuid())
  telegramId   BigInt   @unique @map("telegram_id")
  name         String   @db.VarChar(100)
  language     String   @default("es") @db.VarChar(10)
  timezone     String   @default("America/Guayaquil") @db.VarChar(50)
  isActive     Boolean  @default(true) @map("is_active")
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  categories        Category[]
  records           Record[]
  conversationState ConversationState?

  @@map("users")
}

model Category {
  id          String   @id @default(uuid())
  userId      String   @map("user_id")
  name        String   @db.VarChar(100)
  type        String   @db.VarChar(20)
  budgetLimit Decimal? @map("budget_limit") @db.Decimal(10,2)
  emoji       String?  @db.VarChar(10)
  isDefault   Boolean  @default(false) @map("is_default")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  user    User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  records Record[]

  @@unique([userId, name])
  @@map("categories")
}

model Record {
  id          String   @id @default(uuid())
  userId      String   @map("user_id")
  categoryId  String   @map("category_id")
  amount      Decimal  @db.Decimal(10,2)
  description String   @db.VarChar(500)
  notes       String?  @db.Text
  occurredAt  DateTime @map("occurred_at")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
  isDeleted   Boolean  @default(false) @map("is_deleted")

  user     User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  category Category @relation(fields: [categoryId], references: [id])

  @@map("records")
}

model ConversationState {
  userId        String   @id @map("user_id")
  pendingAction String?  @map("pending_action") @db.VarChar(100)
  pendingData   Json?    @map("pending_data")
  lastBotMsg    String?  @map("last_bot_msg") @db.Text
  expiresAt     DateTime? @map("expires_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("conversation_state")
}
```
