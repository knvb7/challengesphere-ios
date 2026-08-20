import type { User } from '../types/api';

type UserDisplayFields = Pick<User, 'username'> & Partial<Pick<User,
  'displayName' | 'realName' | 'fullName' | 'firstName' | 'lastName' | 'name'
>>;

export function getUserDisplayName(user: UserDisplayFields) {
  const composedName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  const candidates = [
    user.displayName,
    user.realName,
    user.fullName,
    composedName,
    user.name,
  ];

  return candidates.find((value) => typeof value === 'string' && value.trim().length > 0)?.trim() || '';
}

export function getProfileDisplayName(user: UserDisplayFields) {
  const displayName = getUserDisplayName(user);
  if (!displayName) return '';

  const normalizedUsername = user.username.trim().replace(/^@+/, '').toLowerCase();
  const normalizedDisplayName = displayName.trim().replace(/^@+/, '').toLowerCase();

  return normalizedDisplayName && normalizedDisplayName !== normalizedUsername ? displayName : '';
}

export function matchesUserSearch(user: UserDisplayFields, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;

  return user.username.toLowerCase().includes(normalizedQuery)
    || getUserDisplayName(user).toLowerCase().includes(normalizedQuery);
}
