import type { ExcludeFilter } from "../state";

export const buildFilterOptionName = (filter: ExcludeFilter) => {
  return `${filter.enabled ? "[x]" : "[ ]"} ${filter.pattern || "(empty)"}`;
};

export const toggleFilter = (filters: ExcludeFilter[], index: number) => {
  return filters.map((filter, idx) =>
    idx === index ? { ...filter, enabled: !filter.enabled } : filter,
  );
};

export const deleteFilter = (filters: ExcludeFilter[], index: number) => {
  return filters.filter((_, idx) => idx !== index);
};

export const addFilter = (filters: ExcludeFilter[], value: string) => {
  const pattern = value.trim();
  if (!pattern) return filters;
  return [...filters, { pattern, enabled: true }];
};

export const editFilter = (filters: ExcludeFilter[], index: number, value: string) => {
  const pattern = value.trim();
  if (!pattern) return filters;
  return filters.map((filter, idx) => (idx === index ? { ...filter, pattern } : filter));
};
