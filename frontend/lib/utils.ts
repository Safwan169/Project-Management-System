import clsx, { type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

/** Normalize a Mongo ref field that may be an id string or a populated document. */
export function toRefId(ref: string | { _id: string } | undefined | null): string {
  if (!ref) return '';
  return typeof ref === 'string' ? ref : ref._id;
}

export function toRefIds(refs: (string | { _id: string })[] | undefined): string[] {
  if (!refs?.length) return [];
  return refs.map((r) => (typeof r === 'string' ? r : r._id));
}
