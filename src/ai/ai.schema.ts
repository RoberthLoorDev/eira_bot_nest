import { z } from 'zod';

const nullableIsoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .nullable()
  .catch(null);

export const extractedRecordSchema = z.object({
  intent: z.enum([
    'create_record',
    'query_records',
    'compare_records',
    'list_categories',
    'create_category',
    'unknown',
  ]),
  type: z.enum(['gasto', 'ingreso', 'ahorro']).nullable().catch(null),
  amount: z.number().positive().nullable().catch(null),
  description: z.string().trim().min(1).max(500).nullable().catch(null),
  categoryName: z.string().trim().min(1).max(100).nullable().catch(null),
  occurredAtDate: nullableIsoDate,
  startDate: nullableIsoDate,
  endDate: nullableIsoDate,
  compareStartDate: nullableIsoDate,
  compareEndDate: nullableIsoDate,
});

export type ExtractedRecordSchemaOutput = z.infer<typeof extractedRecordSchema>;
