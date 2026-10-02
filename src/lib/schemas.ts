  import { z } from "zod";

export function requiredDate(message = "Fecha requerida") {
  return z
    .string({ required_error: message })
    .min(1, message)
    .refine((value) => !Number.isNaN(Date.parse(value)), "Fecha inválida")
    .transform((value) => new Date(value));
}

export function optionalDate(message = "Fecha inválida") {
  return z
    .string()
    .refine((value) => value === "" || !Number.isNaN(Date.parse(value)), message)
    .transform((value) => (value ? new Date(value) : null))
    .optional()
    .nullable();
}

export function spanishEnum<T extends readonly [string, ...string[]]>(values: T, message: string) {
  return z.enum(values as unknown as [string, ...string[]], { errorMap: () => ({ message }) });
}
