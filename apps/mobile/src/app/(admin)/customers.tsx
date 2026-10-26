import { UserRole } from '@food-delivery/types';
import { UserListScreen } from '@/components/admin/user-list-screen';

export default function AdminCustomersScreen() {
  return <UserListScreen role={UserRole.CUSTOMER} />;
}
