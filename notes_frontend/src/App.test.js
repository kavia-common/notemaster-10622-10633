import { render, screen } from '@testing-library/react';
import App from './App';

// PUBLIC_INTERFACE
test('application renders', () => {
  render(<App />);
  expect(screen.getByText(/notemaster/i)).toBeInTheDocument();
});
