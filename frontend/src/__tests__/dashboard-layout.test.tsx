import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from '../lib/auth';
import { I18nProvider } from '../lib/i18n';
import DashboardLayout from '../components/DashboardLayout';
import api from '../lib/api';

vi.mock('../lib/api', () => {
  const mockApi = {
    get: vi.fn().mockResolvedValue({ data: {} }),
    post: vi.fn().mockResolvedValue({ data: {} }),
    interceptors: { request: { handlers: [] }, response: { handlers: [] } },
  };
  return { default: mockApi };
});

function renderDashboard(token: string | null) {
  if (token) localStorage.setItem('token', token);
  else localStorage.removeItem('token');

  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <AuthProvider>
        <I18nProvider>
          <DashboardLayout />
        </I18nProvider>
      </AuthProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

it('shows sidebar navigation items', async () => {
  const mockedApi = api as unknown as vi.Mocked<typeof api>;
  mockedApi.get.mockResolvedValue({
    data: { id: '1', name: 'Admin', email: 'admin@test.com', role: 'ADMIN' },
  });

  renderDashboard('valid-token');

  const navLinks = await screen.findAllByText(/Vue d'ensemble|Hotspots|Offres|Tickets|Transactions|Revendeurs|Roaming|Utilisateurs|Partenaires|Paramètres/);
  expect(navLinks.length).toBeGreaterThanOrEqual(10);
});

it('shows user name in sidebar', async () => {
  const mockedApi = api as unknown as vi.Mocked<typeof api>;
  mockedApi.get.mockResolvedValue({
    data: { id: '1', name: 'John Doe', email: 'john@test.com', role: 'user' },
  });

  renderDashboard('valid-token');

  await screen.findByText('John Doe');
  expect(screen.getByText('J')).toBeInTheDocument();
});
