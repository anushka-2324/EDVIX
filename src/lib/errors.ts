const MAX_ERROR_DEPTH = 4;

type UnknownRecord = Record<string, unknown>;

function pickMessage(value: unknown, depth: number): string | null {
  if (depth > MAX_ERROR_DEPTH || value == null) {
    return null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }

  if (value instanceof Error) {
    const message = value.message?.trim();
    return message?.length ? message : null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const candidate = pickMessage(item, depth + 1);
      if (candidate) {
        return candidate;
      }
    }

    return null;
  }

  if (typeof value === "object") {
    const record = value as UnknownRecord;

    for (const key of ["message", "error", "details", "hint"]) {
      const candidate = pickMessage(record[key], depth + 1);
      if (candidate) {
        return candidate;
      }
    }

    for (const nested of Object.values(record)) {
      const candidate = pickMessage(nested, depth + 1);
      if (candidate) {
        return candidate;
      }
    }

    try {
      const serialized = JSON.stringify(value);
      if (serialized && serialized !== "{}") {
        return serialized;
      }
    } catch {
      return null;
    }
  }

  return null;
}

export function getErrorMessage(error: unknown, fallback: string) {
  return pickMessage(error, 0) ?? fallback;
}
