export type ApiFieldErrors = Record<string, string>;

export type ParsedApiError = {
  message: string;
  fields: ApiFieldErrors;
};

export function getApiError(payload: unknown, fallback = "Ocurrió un error"): ParsedApiError {
  const data = (payload ?? {}) as { error?: unknown; fields?: unknown };

  const fields: ApiFieldErrors =
    data.fields && typeof data.fields === "object" ? (data.fields as ApiFieldErrors) : {};

  let message = "";
  const error = data.error;

  if (typeof error === "string") {
    message = error;
  } else if (Array.isArray(error)) {
    message = error
      .map((item) =>
        typeof item === "string" ? item : (item as { message?: string })?.message,
      )
      .filter(Boolean)
      .join(", ");
  } else if (error && typeof error === "object") {
    message = (error as { message?: string }).message ?? "";
  }

  if (!message) {
    const values = Object.values(fields);
    message = values.length > 0 ? values.join(", ") : fallback;
  }

  return { message, fields };
}

export function fieldError(fields: ApiFieldErrors, key: string): string | undefined {
  return fields[key];
}

export const parseApiError = getApiError;
