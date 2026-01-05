import z from 'zod';

export const SimpleErrorWithMessageSchema = z.object({
  statusCode: z.number().int().describe('HTTP code'),
  error: z.string().describe('Error name'),
  message: z.string().describe('User friendly message'),
  code: z.string().optional().describe('Internal error code (for dev use)'),
});

export const DetailedErrorSchema = SimpleErrorWithMessageSchema.extend({
  details: z
    .record(z.string(), z.unknown())
    .optional()
    .describe('Error context details for frontend'),
});

export const ValidationErrorSchema = DetailedErrorSchema.describe('Validation error');
