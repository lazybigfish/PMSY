import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Login from './Login';
import { api } from '../lib/api';
import { vi } from 'vitest';

// Mock the AuthContext
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    session: null, // Initial state: not logged in
  }),
}));

// Wrap component with Router
const renderWithRouter = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe('Login Component', () => {
  it('renders login form correctly', () => {
    renderWithRouter(<Login />);
    expect(screen.getByText('登录系统')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('邮箱地址')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('密码')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /登录/i })).toBeInTheDocument();
  });

  it('handles input changes', () => {
    renderWithRouter(<Login />);
    const emailInput = screen.getByPlaceholderText('邮箱地址');
    const passwordInput = screen.getByPlaceholderText('密码');

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    expect(emailInput).toHaveValue('test@example.com');
    expect(passwordInput).toHaveValue('password123');
  });

  it('calls api auth signIn on form submission', async () => {
    // Mock the api function
    const signInMock = vi.fn().mockResolvedValue({ access_token: 'token', user: { id: '1', email: 'test@example.com' } });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (api.auth.signIn as any) = signInMock;

    renderWithRouter(<Login />);

    fireEvent.change(screen.getByPlaceholderText('邮箱地址'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('密码'), { target: { value: 'password123' } });

    fireEvent.click(screen.getByRole('button', { name: /登录/i }));

    await waitFor(() => {
      expect(signInMock).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });

  it('shows error message on failed login', async () => {
    const signInMock = vi.fn().mockRejectedValue(new Error('Invalid credentials'));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (api.auth.signIn as any) = signInMock;

    renderWithRouter(<Login />);

    fireEvent.change(screen.getByPlaceholderText('邮箱地址'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('密码'), { target: { value: 'wrongpassword' } });

    fireEvent.click(screen.getByRole('button', { name: /登录/i }));

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });
  });
});
