'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { User, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Brand } from '@/components/shared/Brand';
import { registerSchema, type RegisterValues } from '@/lib/validators';
import { registerRequest } from '@/lib/auth-api';

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    // Role is fixed to 'member' here — elevated roles are granted later
    // through team management by an admin.
    defaultValues: { name: '', email: '', password: '', confirmPassword: '', role: 'member' },
  });

  const onSubmit = async (values: RegisterValues) => {
    try {
      await registerRequest({
        name: values.name,
        email: values.email,
        password: values.password,
        role: values.role,
      });
      toast.success('Account created! Please sign in.');
      router.replace('/login');
    } catch {
      // axios interceptor already surfaces the error toast.
    }
  };

  return (
    <Card padding="lg">
      <Brand withTagline className="mb-8" />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Input
          label="Full name"
          placeholder="Jane Cooper"
          autoComplete="name"
          leftIcon={<User className="h-4 w-4" />}
          error={errors.name?.message}
          {...register('name')}
        />

        <Input
          label="Email"
          type="email"
          placeholder="you@company.com"
          autoComplete="email"
          leftIcon={<Mail className="h-4 w-4" />}
          error={errors.email?.message}
          {...register('email')}
        />

        <Input
          label="Password"
          type={showPassword ? 'text' : 'password'}
          placeholder="At least 8 characters"
          autoComplete="new-password"
          leftIcon={<Lock className="h-4 w-4" />}
          rightIcon={
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="pointer-events-auto text-muted-foreground transition-colors hover:text-foreground"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          }
          error={errors.password?.message}
          {...register('password')}
        />

        <Input
          label="Confirm password"
          type={showPassword ? 'text' : 'password'}
          placeholder="Re-enter your password"
          autoComplete="new-password"
          leftIcon={<Lock className="h-4 w-4" />}
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        <div>
          <label htmlFor="role" className="mb-1.5 block text-sm font-medium text-foreground">
            Role
          </label>
          <select
            id="role"
            className="h-10 w-full rounded-lg border border-surface-border bg-white px-3 text-sm text-foreground focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
            {...register('role')}
          >
            <option value="member">Member</option>
          </select>
          <p className="mt-1.5 text-xs text-muted-foreground">
            New accounts join as members. Admins can adjust roles later.
          </p>
        </div>

        <Button type="submit" fullWidth size="lg" isLoading={isSubmitting}>
          Create account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-primary-600 hover:text-primary-700">
          Sign in
        </Link>
      </p>
    </Card>
  );
}
