/**
 * Correct counterpart of src/merge.ts.
 *
 * Same recursive merge, same signature, same names.
 * The dangerous keys are excluded and the target is created without a prototype, so there is nothing to pollute.
 *
 * Any finding reported in this file is a false positive.
 */

export interface Preferences {
  [key: string]: unknown;
}

const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);

function deepMerge(target: Preferences, source: Preferences): Preferences {
  for (const key of Object.keys(source)) {
    if (FORBIDDEN_KEYS.has(key)) {
      continue;
    }

    const value = source[key];

    if (value && typeof value === "object" && !Array.isArray(value)) {
      target[key] = deepMerge((target[key] as Preferences) ?? Object.create(null), value as Preferences);
    } else {
      target[key] = value;
    }
  }

  return target;
}

const defaults: Preferences = { theme: "light", pageSize: 25 };

export function applyPreferences(submitted: Preferences): Preferences {
  return deepMerge(Object.assign(Object.create(null), defaults), submitted);
}
