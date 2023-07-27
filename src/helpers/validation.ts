import z from 'zod'
import type { Opaque } from 'type-fest'

export type DateLike = z.infer<typeof DateLike>
export const DateLike = z.preprocess(arg =>
  (typeof arg === 'string' || arg instanceof Date ? new Date(arg) : arg),
z.date())

export type DateString = Opaque<string, 'IsoDateString'>
export const DateString = z.string().refine(arg => !Number.isNaN(Date.parse(arg))) as unknown as z.ZodType<DateString>
