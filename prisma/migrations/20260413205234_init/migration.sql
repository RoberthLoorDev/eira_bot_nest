-- CreateEnum
CREATE TYPE "category_type" AS ENUM ('gasto', 'ingreso', 'ahorro');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "telegram_id" BIGINT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "language" VARCHAR(10) NOT NULL DEFAULT 'es',
    "timezone" VARCHAR(50) NOT NULL DEFAULT 'America/Guayaquil',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "type" "category_type" NOT NULL,
    "budget_limit" DECIMAL(10,2),
    "emoji" VARCHAR(10),
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "records" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "notes" TEXT,
    "occurred_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_state" (
    "user_id" UUID NOT NULL,
    "pending_action" VARCHAR(100),
    "pending_data" JSONB,
    "last_bot_msg" TEXT,
    "expires_at" TIMESTAMPTZ,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "conversation_state_pkey" PRIMARY KEY ("user_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_telegram_id_key" ON "users"("telegram_id");

-- CreateIndex
CREATE INDEX "idx_users_telegram_id" ON "users"("telegram_id");

-- CreateIndex
CREATE INDEX "idx_categories_user_id" ON "categories"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "categories_user_id_name_key" ON "categories"("user_id", "name");

-- CreateIndex
CREATE INDEX "idx_records_user_id" ON "records"("user_id");

-- CreateIndex
CREATE INDEX "idx_records_category_id" ON "records"("category_id");

-- CreateIndex
CREATE INDEX "idx_records_occurred_at" ON "records"("occurred_at");

-- CreateIndex
CREATE INDEX "idx_records_user_occurred" ON "records"("user_id", "occurred_at");

-- CreateIndex
CREATE INDEX "idx_records_user_deleted" ON "records"("user_id", "is_deleted");

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "records" ADD CONSTRAINT "records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "records" ADD CONSTRAINT "records_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_state" ADD CONSTRAINT "conversation_state_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
