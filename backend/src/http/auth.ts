import {
  APIGatewayProxyEventV2,
  APIGatewayProxyEventV2WithJWTAuthorizer,
} from 'aws-lambda';

type JwtClaims = Record<string, unknown>;

const getClaims = (event: APIGatewayProxyEventV2): JwtClaims => {
  const requestContext =
    event.requestContext as APIGatewayProxyEventV2WithJWTAuthorizer['requestContext'];
  const authorizer = requestContext.authorizer;
  if (!authorizer || typeof authorizer !== 'object') {
    return {};
  }

  const jwt = (authorizer as { jwt?: { claims?: unknown } }).jwt;
  if (!jwt || typeof jwt !== 'object') {
    return {};
  }

  const claims = jwt.claims;
  if (!claims || typeof claims !== 'object') {
    return {};
  }

  return claims as JwtClaims;
};

const parseGroups = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === 'string');
  }

  if (typeof value !== 'string') {
    return [];
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return [];
  }

  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.filter((entry): entry is string => typeof entry === 'string');
      }
    } catch {
      return trimmed
        .slice(1, -1)
        .split(',')
        .map((entry) => entry.trim().replace(/^['"]|['"]$/g, ''))
        .filter(Boolean);
    }
  }

  return trimmed
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
};

export const getAuthenticatedUserId = (
  event: APIGatewayProxyEventV2,
): string | null => {
  const claims = getClaims(event);
  const subject = claims.sub;
  if (typeof subject !== 'string' || !subject.trim()) {
    return null;
  }

  return subject;
};

export const hasAdminRole = (event: APIGatewayProxyEventV2): boolean => {
  const claims = getClaims(event);

  const systemRole = claims['custom:system_role'];
  if (typeof systemRole === 'string') {
    const normalized = systemRole.trim().toLowerCase();
    if (normalized && normalized !== 'user') {
      return true;
    }
  }

  const groups = parseGroups(claims['cognito:groups']);
  const allowedAdminGroups = new Set(['admin', 'super_admin', 'ops', 'support']);
  return groups.some((group) => allowedAdminGroups.has(group.toLowerCase()));
};
