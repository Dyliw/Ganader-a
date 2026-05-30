
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import './navbar.css';

const Navbar = ({ logo, menuItems }) => {
  const { user, logout, tienePermiso } = useAuth();

  // Solo mostrar items donde el usuario tenga permiso de LEER
  const itemsFiltrados = menuItems?.filter(item => {
    if (!item.modulo) return true; 
    return tienePermiso(item.modulo, 'leer');
  }) || [];

  return (
    <div className='container'>
      <aside className="navbar">
        <div className='nav-logo'>
          {logo || <span className="logo-text">🐄 Sistema Ganadero</span>}
        </div>

        <div className='nav-menu'>
          {itemsFiltrados.map((item, index) => (
            <Link key={index} to={item.path} className="nav-link">
              {item.icon && <span className="mr-2">{item.icon}</span>}
              {item.label}
            </Link>
          ))}
        </div>

        {/* Info del usuario y botón de salir */}
        {user && (
          <div className='nav-footer'>
            <div className="user-info">
              <p className="text-sm font-medium">{user.usuario}</p>
              <p className="text-xs text-gray-400">{user.puesto}</p>
            </div>
            <button onClick={logout} className="btn-logout">
              🚪 Salir
            </button>
          </div>
        )}
      </aside>
    </div>
  );
};

export default Navbar;