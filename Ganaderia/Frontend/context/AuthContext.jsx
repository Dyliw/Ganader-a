import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axiosConfig';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [permisos, setPermisos] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setLoading(true);
      api.get('/auth/me')
        .then(res => {
          setUser(res.data);
          // Solo cargar permisos si el usuario es válido
          return api.get('/auth/permisos');
        })
        .then(res => {
          setPermisos(res.data);
        })
        .catch((error) => {
          console.error('Error al validar token:', error);
          localStorage.removeItem('token');
          setUser(null);
          setPermisos(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (usuario, contrasena) => {
    try {
      const res = await api.post('/auth/login', {
        usuario: usuario,
        contrasena: contrasena
      });
      
      // Guardar token
      localStorage.setItem('token', res.data.access_token);
      
      // Guardar usuario
      setUser({
        id_empleado: res.data.id_empleado,
        usuario: res.data.usuario,
        puesto: res.data.puesto
      });
      
      // Cargar permisos
      const permRes = await api.get('/auth/permisos');
      setPermisos(permRes.data);
      
      return res.data;
    } catch (error) {
      console.error('Error en login:', error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setPermisos(null);
  };

  const tienePermiso = (modulo, accion = 'leer') => {
    if (!permisos || !permisos[modulo]) return false;
    return permisos[modulo][accion] === true;
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, tienePermiso }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);