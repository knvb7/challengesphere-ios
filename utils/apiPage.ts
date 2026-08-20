import type { SpringPage } from '../types/api';

type NestedPageMetadata = {
  size?: number;
  number?: number;
  totalElements?: number;
  totalPages?: number;
};

type PageResponse<T> = Partial<Omit<SpringPage<T>, 'content'>> & {
  content?: T[];
  page?: NestedPageMetadata;
};

const asNumber = (value: unknown, fallback: number): number => {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
};

export const normalizeSpringPage = <T>(response: PageResponse<T> | T[]): SpringPage<T> => {
  if (Array.isArray(response)) {
    return {
      content: response,
      totalElements: response.length,
      totalPages: 1,
      first: true,
      last: true,
      numberOfElements: response.length,
      size: response.length,
      number: 0,
      empty: response.length === 0,
    };
  }

  const content = response.content ?? [];
  const page = response.page ?? {};
  const number = asNumber(response.number, asNumber(page.number, 0));
  const size = asNumber(response.size, asNumber(page.size, content.length));
  const totalElements = asNumber(response.totalElements, asNumber(page.totalElements, content.length));
  const totalPages = asNumber(response.totalPages, asNumber(page.totalPages, totalElements > 0 ? 1 : 0));

  return {
    content,
    totalElements,
    totalPages,
    first: response.first ?? number === 0,
    last: response.last ?? totalPages <= number + 1,
    numberOfElements: asNumber(response.numberOfElements, content.length),
    size,
    number,
    empty: response.empty ?? content.length === 0,
  };
};
