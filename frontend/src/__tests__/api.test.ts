import api from '../lib/api';

function getRequestHandler() {
  const h = api.interceptors.request.handlers;
  return h?.[0] as NonNullable<typeof h[0]>;
}

function getResponseHandler() {
  const h = api.interceptors.response.handlers;
  return h?.[0] as NonNullable<typeof h[0]>;
}

beforeEach(() => {
  localStorage.clear();
});

it('injects Bearer token in requests when token exists', () => {
  localStorage.setItem('token', 'my-token');
  const handler = getRequestHandler();
  const config: any = { headers: {} };
  handler.fulfilled(config);
  expect(config.headers.Authorization).toBe('Bearer my-token');
});

it('does not inject Authorization header when no token', () => {
  const handler = getRequestHandler();
  const config: any = { headers: {} };
  handler.fulfilled(config);
  expect(config.headers.Authorization).toBeUndefined();
});

it('redirects to /login on 401 response', () => {
  const originalLocation = window.location;
  Object.defineProperty(window, 'location', { value: { ...originalLocation, href: '' }, writable: true });

  localStorage.setItem('token', 'expired');
  const handler = getResponseHandler();
  const error = { response: { status: 401 } };

  handler.rejected(error).catch(() => {});

  expect(localStorage.getItem('token')).toBeNull();
  expect(window.location.href).toBe('/login');
});
