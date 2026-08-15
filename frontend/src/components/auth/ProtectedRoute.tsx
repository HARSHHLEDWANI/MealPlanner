import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import Loading from '@/components/common/Loading';

/**
 * Gates the authenticated section of the app.
 *
 * LOADING is handled explicitly. Without that case this fell through to
 * <Outlet />, so protected pages mounted and started fetching before the
 * session was known — every one of those requests went out unauthenticated
 * and came back 401.
 */
const ProtectedRoute = () => {
  const { authState } = useAuthStore();

  if (authState === 'LOADING') {
    return <Loading />;
  }

  if (authState === 'UNAUTHENTICATED') {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
