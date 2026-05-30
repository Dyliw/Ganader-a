import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null); 
  const [cargando, setCargando] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setCargando(true);

    try {
      await login(usuario, password);
      navigate('/'); // Redirigir al dashboard
    } catch (err) {
      const detail = err.response?.data?.detail;
      
      if (Array.isArray(detail)) {
        const mensajes = detail.map(d => d.msg).join(', ');
        setError(mensajes);
      } else if (typeof detail === 'string') {
        setError(detail);
      } else {
        setError('Error al iniciar sesión. Verifique sus credenciales.');
      }
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🐄</div>
          <h1 className="text-3xl font-bold text-gray-800">Sistema Ganadero</h1>
          <p className="text-gray-500 mt-2">Inicie sesión para continuar</p>
        </div>

        {/* Mensaje de error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            <div className="flex items-center">
              <span className="text-xl mr-2">⚠️</span>
              <span className="text-sm">{error}</span> {/* ← Ahora sí es string */}
            </div>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Usuario */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              👤 Usuario
            </label>
            <input
              type="text"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg 
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent
                         transition-all"
              placeholder="Ingrese su usuario"
              required
              autoFocus
            />
          </div>

          {/* Contraseña */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              🔒 Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg 
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent
                         transition-all"
              placeholder="Ingrese su contraseña"
              required
            />
          </div>

          <button
            type="submit"
            disabled={cargando}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold
                       hover:bg-blue-700 focus:ring-4 focus:ring-blue-200
                       disabled:opacity-50 disabled:cursor-not-allowed
                       transition-all"
          >
            {cargando ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Iniciando sesión...
              </span>
            ) : (
              '🚀 Iniciar Sesión'
            )}
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-gray-400 text-xs mt-8">
          © 2024 Sistema Ganadero - v1.0
        </p>
      </div>
    </div>
  );
}