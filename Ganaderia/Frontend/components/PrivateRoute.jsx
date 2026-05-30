import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function PrivateRoute({ children, modulo, accion = 'leer' }) {
  const { user, loading, tienePermiso } = useAuth();
  
  if (loading) return <div>Cargando...</div>;
  if (!user) return <Navigate to="/login" />;
  
  if (modulo && !tienePermiso(modulo, accion)) {
    return <div className="p-10 text-center text-red-600">Acceso denegado</div>;
  }
  
  return children;
}