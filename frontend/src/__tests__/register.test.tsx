import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../lib/auth';
import { I18nProvider } from '../lib/i18n';
import Register from '../pages/Register';
import api from '../lib/api';

vi.mock('../lib/api', () => {
  const mockApi = {
    get: vi.fn().mockResolvedValue({ data: {} }),
    post: vi.fn().mockResolvedValue({ data: {} }),
    interceptors: { request: { handlers: [] }, response: { handlers: [] } },
  };
  return { default: mockApi };
});

function renderRegister() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <I18nProvider>
          <Register />
        </I18nProvider>
      </AuthProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

it('renders registration form', () => {
  renderRegister();
  expect(screen.getByRole('heading', { name: /essai gratuit/i })).toBeInTheDocument();
  expect(screen.getByLabelText(/nom complet/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/t.l.phone/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/entreprise/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/pays/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/mot de passe/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /cr.er mon compte/i })).toBeInTheDocument();
});

it('submits registration form successfully', async () => {
  const mockedApi = api as unknown as vi.Mocked<typeof api>;
  mockedApi.post.mockResolvedValue({
    data: { token: 'reg-token', user: { id: '1', name: 'Jane', email: 'j@b.com', role: 'user' } },
  });

  renderRegister();
  await userEvent.type(screen.getByLabelText(/nom complet/i), 'Jane Doe');
  await userEvent.type(screen.getByLabelText(/email/i), 'j@b.com');
  await userEvent.type(screen.getByLabelText(/mot de passe/i), '123456');
  await userEvent.click(screen.getByRole('button', { name: /cr.er mon compte/i }));

  await waitFor(() => {
    expect(localStorage.getItem('token')).toBe('reg-token');
  });
});

it('shows error on failed registration', async () => {
  const mockedApi = api as unknown as vi.Mocked<typeof api>;
  mockedApi.post.mockRejectedValue({
    response: { data: { error: 'Email already exists' } },
  });

  renderRegister();
  await userEvent.type(screen.getByLabelText(/nom complet/i), 'Jane');
  await userEvent.type(screen.getByLabelText(/email/i), 'dup@b.com');
  await userEvent.type(screen.getByLabelText(/mot de passe/i), '123456');
  await userEvent.click(screen.getByRole('button', { name: /cr.er mon compte/i }));

  await waitFor(() => {
    expect(screen.getByText(/email already exists/i)).toBeInTheDocument();
  });
});
