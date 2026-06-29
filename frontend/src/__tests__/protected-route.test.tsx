import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../lib/auth';
import ProtectedRoute from '../components/ProtectedRoute';

function renderWithRoute(initialRoute: string, token: string | null) {
  if (token) localStorage.setItem('token', token);
  else localStorage.removeItem('token');

  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<div data-testid="login-page" />} />
          <Route element={<ProtectedRoute><div data-testid="protected-content" /></ProtectedRoute>}>
            <Route path="/dashboard" element={null} />
          </Route>
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
}

beforeEach(() => localStorage.clear());

it('redirects to /login when not authenticated', () => {
  renderWithRoute('/dashboard', null);
  expect(screen.getByTestId('login-page')).toBeInTheDocument();
  expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
});

it('renders children when authenticated', () => {
  renderWithRoute('/dashboard', 'fake-token');
  expect(screen.getByTestId('protected-content')).toBeInTheDocument();
  expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();
});
