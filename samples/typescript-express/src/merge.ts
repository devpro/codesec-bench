/**
 * Preference merging for the reporting service.
 *
 * Intentionally vulnerable, see cases/prototype-pollution-merge.
 */

export interface Preferences {
  [key: string]: unknown;
}

/**
 * Recursively copy every own key of source onto target.
 *
 * The recursion is where the defect lives: nothing excludes __proto__, so a source of
 * {"__proto__": {"isAdmin": true}} walks into the prototype of target and assigns there.
 * Every object in the process then inherits isAdmin.
 */
function deepMerge(target: Preferences, source: Preferences): Preferences {
  for (const key of Object.keys(source)) {
    const value = source[key];

    if (value && typeof value === "object" && !Array.isArray(value)) {
      // VULN: key is never checked against __proto__, constructor or prototype.
      target[key] = deepMerge((target[key] as Preferences) ?? {}, value as Preferences);
    } else {
      target[key] = value;
    }
  }

  return target;
}

const defaults: Preferences = { theme: "light", pageSize: 25 };

export function applyPreferences(submitted: Preferences): Preferences {
  return deepMerge({ ...defaults }, submitted);
}
