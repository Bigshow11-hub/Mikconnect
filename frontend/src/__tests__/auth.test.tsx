import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from '../lib/auth';
import api from '../lib/api';

vi.mock('../lib/api', () => {
  const mockApi = {
    get: vi.fn().mockResolvedValue({ data: {} }),
    post: vi.fn().mockResolvedValue({ data: {} }),
    interceptors: { request: { handlers: [] }, response: { handlers: [] } },
  };
  return { default: mockApi };
});
const mockedApi = api as unknown as vi.Mocked<typeof api>;

function TestConsumer() {
  const { user, isAuthenticated, login, register, logout } = useAuth();
  return (
    <div>
      <span data-testid="auth-status">{isAuthenticated ? 'logged-in' : 'logged-out'}</span>
      {user && <span data-testid="user-name">{user.name}</span>}
      <button data-testid="login-btn" onClick={() => login('a@b.com', 'pass')}>Login</button>
      <button data-testid="register-btn" onClick={() => register({ name: 'Test', email: 'a@b.com', password: 'pass' })}>Register</button>
      <button data-testid="logout-btn" onClick={logout}>Logout</button>
    </div>
  );
}

function renderWithAuth() {
  return render(
    <AuthProvider>
      <TestConsumer />
    </AuthProvider>
  );
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  mockedApi.get.mockResolvedValue({ data: {} });
  mockedApi.post.mockResolvedValue({ data: {} });
});

it('starts logged out', () => {
  renderWithAuth();
  expect(screen.getByTestId('auth-status')).toHaveTextContent('logged-out');
});

it('login sets token and user', async () => {
  mockedApi.post.mockResolvedValue({
    data: { token: 'jwt-token', user: { id: '1', name: 'John', email: 'a@b.com', role: 'admin' } },
  });
  mockedApi.get.mockResolvedValue({
    data: { id: '1', name: 'John', email: 'a@b.com', role: 'admin' },
  });

  renderWithAuth();
  await userEvent.click(screen.getByTestId('login-btn'));

  await waitFor(() => {
    expect(screen.getByTestId('auth-status')).toHaveTextContent('logged-in');
    expect(screen.getByTestId('user-name')).toHaveTextContent('John');
  });
  expect(localStorage.getItem('token')).toBe('jwt-token');
});

it('register sets token and user', async () => {
  mockedApi.post.mockResolvedValue({
    data: { token: 'reg-token', user: { id: '2', name: 'Jane', email: 'j@b.com', role: 'user' } },
  });
  mockedApi.get.mockResolvedValue({
    data: { id: '2', name: 'Jane', email: 'j@b.com', role: 'user' },
  });

  renderWithAuth();
  await userEvent.click(screen.getByTestId('register-btn'));

  await waitFor(() => {
    expect(screen.getByTestId('auth-status')).toHaveTextContent('logged-in');
    expect(screen.getByTestId('user-name')).toHaveTextContent('Jane');
  });
});

it('logout clears token and user', async () => {
  mockedApi.post.mockResolvedValue({
    data: { token: 'jwt-token', user: { id: '1', name: 'John', email: 'a@b.com', role: 'admin' } },
  });
  mockedApi.get.mockResolvedValue({
    data: { id: '1', name: 'John', email: 'a@b.com', role: 'admin' },
  });

  renderWithAuth();
  await userEvent.click(screen.getByTestId('login-btn'));
  await waitFor(() => expect(screen.getByTestId('auth-status')).toHaveTextContent('logged-in'));

  await userEvent.click(screen.getByTestId('logout-btn'));
  expect(screen.getByTestId('auth-status')).toHaveTextContent('logged-out');
  expect(localStorage.getItem('token')).toBeNull();
});

it('loads user from token on mount', async () => {
  localStorage.setItem('token', 'stored-token');
  mockedApi.get.mockResolvedValue({
    data: { id: '3', name: 'Stored', email: 's@c.com', role: 'admin' },
  });

  renderWithAuth();

  await waitFor(() => {
    expect(screen.getByTestId('auth-status')).toHaveTextContent('logged-in');
    expect(screen.getByTestId('user-name')).toHaveTextContent('Stored');
  });
});
