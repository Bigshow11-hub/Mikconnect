import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../lib/auth';
import { I18nProvider } from '../lib/i18n';
import Login from '../pages/Login';
import api from '../lib/api';

vi.mock('../lib/api', () => {
  const mockApi = {
    get: vi.fn().mockResolvedValue({ data: {} }),
    post: vi.fn().mockResolvedValue({ data: {} }),
    interceptors: { request: { handlers: [] }, response: { handlers: [] } },
  };
  return { default: mockApi };
});

function renderLogin() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <I18nProvider>
          <Login />
        </I18nProvider>
      </AuthProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

it('renders login form', () => {
  renderLogin();
  expect(screen.getByRole('heading', { name: /connexion/i })).toBeInTheDocument();
  expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/mot de passe/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /se connecter/i })).toBeInTheDocument();
});

it('shows error on failed login', async () => {
  const mockedApi = api as unknown as vi.Mocked<typeof api>;
  mockedApi.post.mockRejectedValue({
    response: { data: { error: 'Identifiants invalides' } },
  });

  renderLogin();
  await userEvent.type(screen.getByLabelText(/email/i), 'test@test.com');
  await userEvent.type(screen.getByLabelText(/mot de passe/i), 'wrong');
  await userEvent.click(screen.getByRole('button', { name: /se connecter/i }));

  await waitFor(() => {
    expect(screen.getByText(/identifiants invalides/i)).toBeInTheDocument();
  });
});

it('calls login and navigates on success', async () => {
  const mockedApi = api as unknown as vi.Mocked<typeof api>;
  mockedApi.post.mockResolvedValue({
    data: { token: 'jwt', user: { id: '1', name: 'Test', email: 'test@test.com', role: 'user' } },
  });

  renderLogin();
  await userEvent.type(screen.getByLabelText(/email/i), 'test@test.com');
  await userEvent.type(screen.getByLabelText(/mot de passe/i), 'password');
  await userEvent.click(screen.getByRole('button', { name: /se connecter/i }));

  await waitFor(() => {
    expect(localStorage.getItem('token')).toBe('jwt');
  });
});
