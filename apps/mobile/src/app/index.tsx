import { Redirect } from 'expo-router';
import { useAuth } from '@/context/auth-context';
import { UserRole } from '@food-delivery/types';

export default function Index() {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;

  if (!user) return <Redirect href="/login" />;

  if (user.role === UserRole.CUSTOMER)
    return <Redirect href={'/(customer)' as any} />;
  if (user.role === UserRole.RESTAURANT_OWNER)
    return <Redirect href={'/(owner)' as any} />;
  if (user.role === UserRole.DRIVER)
    return <Redirect href={'/(driver)' as any} />;
  if (user.role === UserRole.ADMIN)
    return <Redirect href={'/(admin)' as any} />;

  return <Redirect href="/login" />;
}
