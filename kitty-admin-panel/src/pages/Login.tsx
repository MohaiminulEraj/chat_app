import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { adminService } from '../services/adminService';
import { useAuthStore } from '../store/authStore';
import { UserTypes } from '../types/admin';

interface LoginForm {
  emailOrPhone: string;
  password: string;
}

export function Login() {
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>();

  const onSubmit = async (data: LoginForm) => {
    setError('');
    setIsLoading(true);

    try {
      const response = await adminService.login(data.emailOrPhone, data.password);
      
      // Check if user is admin
      if (response.data.userType !== UserTypes.ADMIN) {
        setError('Access denied. Only admin users can access this panel.');
        setIsLoading(false);
        return;
      }

      login(response.data as any, response.data.token);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-full flex-col justify-center bg-gray-900 px-6 py-12 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-indigo-500">
          <span className="text-3xl font-bold text-white">K</span>
        </div>
        <h2 className="mt-10 text-center text-2xl/9 font-bold tracking-tight text-white">
          Sign in to your account
        </h2>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {error && (
            <div className="rounded-md bg-red-500/10 px-4 py-3 text-sm text-red-400" role="alert">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="emailOrPhone" className="block text-sm/6 font-medium text-gray-100">
              Email or phone
            </label>
            <div className="mt-2">
              <input
                {...register('emailOrPhone', { required: 'Email or phone is required' })}
                id="emailOrPhone"
                type="text"
                autoComplete="username"
                className="block w-full rounded-md bg-white/5 px-3 py-1.5 text-base text-white outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500 sm:text-sm/6"
              />
              {errors.emailOrPhone && (
                <p className="mt-1 text-sm text-red-400">{errors.emailOrPhone.message}</p>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="block text-sm/6 font-medium text-gray-100">
                Password
              </label>
            </div>
            <div className="mt-2">
              <input
                {...register('password', { required: 'Password is required' })}
                id="password"
                type="password"
                autoComplete="current-password"
                className="block w-full rounded-md bg-white/5 px-3 py-1.5 text-base text-white outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500 sm:text-sm/6"
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-400">{errors.password.message}</p>
              )}
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full justify-center rounded-md bg-indigo-500 px-3 py-1.5 text-sm/6 font-semibold text-white hover:bg-indigo-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>

        <p className="mt-10 text-center text-sm/6 text-gray-400">
          Admin access only
        </p>
      </div>
    </div>
  );
}
