import { z } from 'zod';

export const extractedRecordSchema = z.object({
  intent: z.enum(['create_record', 'unknown']),
  type: z.enum(['gasto', 'ingreso', 'ahorro']).nullable(),
  amount: z.number().positive().nullable().catch(null),
  description: z.string().trim().min(1).max(500).nullable().catch(null),
  categoryName: z.string().trim().min(1).max(100).nullable().catch(null),
  occurredAtDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .catch(null),
});

export type ExtractedRecordSchemaOutput = z.infer<typeof extractedRecordSchema>;
