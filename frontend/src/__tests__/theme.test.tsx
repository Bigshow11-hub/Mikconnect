import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, useTheme } from '../lib/theme';

function TestConsumer() {
  const { isDark, toggle } = useTheme();
  return (
    <div>
      <span data-testid="theme-value">{isDark ? 'dark' : 'light'}</span>
      <button data-testid="toggle-btn" onClick={toggle}>Toggle</button>
    </div>
  );
}

function renderWithTheme() {
  return render(
    <ThemeProvider>
      <TestConsumer />
    </ThemeProvider>
  );
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove('dark');
});

it('default theme is dark', () => {
  renderWithTheme();
  expect(screen.getByTestId('theme-value')).toHaveTextContent('dark');
  expect(document.documentElement.classList.contains('dark')).toBe(true);
});

it('reads light theme from localStorage', () => {
  localStorage.setItem('theme', 'light');
  renderWithTheme();
  expect(screen.getByTestId('theme-value')).toHaveTextContent('light');
  expect(document.documentElement.classList.contains('dark')).toBe(false);
});

it('toggles theme on button click', () => {
  renderWithTheme();
  const btn = screen.getByTestId('toggle-btn');
  expect(screen.getByTestId('theme-value')).toHaveTextContent('dark');

  fireEvent.click(btn);
  expect(screen.getByTestId('theme-value')).toHaveTextContent('light');
  expect(localStorage.getItem('theme')).toBe('light');

  fireEvent.click(btn);
  expect(screen.getByTestId('theme-value')).toHaveTextContent('dark');
  expect(localStorage.getItem('theme')).toBe('dark');
});
