import { render, screen } from '@testing-library/react';
import App from './App';

const mockRows = [
  { title: 'Test project', body: 'A thing I made', link: 'https://example.com' },
];

jest.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        order: () => Promise.resolve({ data: mockRows, error: null }),
      }),
    }),
  }),
}));

test('renders the logo', async () => {
  render(<App />);
  expect(screen.getByText('AC')).toBeInTheDocument();
  expect(await screen.findByText('Test project')).toBeInTheDocument();
});
