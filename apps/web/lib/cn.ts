/** Join class names, dropping falsy values. A dependency-free `clsx`. */
export type ClassValue = string | false | null | undefined;

export function cn(...values: ClassValue[]): string {
  return values.filter(Boolean).join(' ');
}
