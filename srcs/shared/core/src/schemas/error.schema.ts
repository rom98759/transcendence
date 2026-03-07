import z from 'zod';

export const SimpleErrorWithMessageSchema = z.object({
  statusCode: z.number().int().gte(100).lte(599).describe('HTTP code'),
  errorCode: z.string().describe('Internal error code (for dev use)'),
  message: z.string().optional().describe('User friendly message'),
});

export const DetailedErrorSchema = SimpleErrorWithMessageSchema.extend({
  details: z
    .array(
      z.object({
        reason: z.string().optional(),
        resource: z.string().optional(),
        field: z.string().optional(),
        message: z.string().optional(),
        expected: z.string().optional(),
        received: z.string().optional(),
      }),
    )
    .optional()
    .describe('Error context details for frontend'),
});

export const ValidationErrorSchema = DetailedErrorSchema.describe('Validation error');
