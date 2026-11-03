import { Transform } from 'class-transformer';

/**
 * `enableImplicitConversion` inabadilisha `"false"` kuwa `true`
 * (Boolean('false') === true). Hii ni hatari kwa `multipart/form-data`
 * na query strings, kwa hiyo tunatumia transform hii kwa booleans
 * zinazoweza kuja kama string.
 */
export function ToBoolean(): PropertyDecorator {
  return Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) return true;
      if (['false', '0', 'no', 'n', 'off'].includes(normalized)) return false;
    }
    return value;
  });
}
