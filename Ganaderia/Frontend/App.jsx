import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/common/navbar';
import LoginPage from './pages/auth/LoginPage';
import RecepcionPage from './pages/recepcion/RecepcionPage';
import CorralesPage from './pages/corrales/CorralesPage';
import AnimalesPage from './pages/animales/AnimalesPage';
import FichaAnimal from './pages/animales/FichaAnimal';
import DietasPage from './pages/dietas/DietasPage';
import AlimentacionPage from './pages/alimentacion/AlimentacionPage';
import VeterinarioPage from './pages/veterinario/VeterinarioPage';
import ReportesPage from './pages/reportes/ReportesPage';
import MainPage from './pages/Mainpage';
import ContactosPage from './pages/admin/ContactoPage';
import VentasPage from './pages/ventas/VentasPage';
import AlmacenPage from './pages/alamacen/AlmacenPage';
import PrivateRoute from './components/PrivateRoute';
import DetalleCorral from './pages/corrales/DetalleCorral';
import DetalleMedicamento from './pages/veterinario/DetalleMedicamento';
import './App.css';

const Logo = () => {
  return (
    <div style={{display: 'flex', alignItems:'center', gap:'10px'}}>
      <span style={{
        fontFamily: '-apple-system',
        fontSize:'24px',
        fontWeight:'bold',
        color:'#ffff'
      }}>
        Ganaderia
      </span>
    </div>
  );
};

function AppContent() {
  const { loading } = useAuth();
  const [menuItems] = useState([
    {id: 1, path:'/', label: 'Inicio', modulo: 'dashboar'},
    {id: 2, path: '/recepcion', label: 'Recepción', modulo: 'recepcion'},
    {id: 3, path: '/corrales', label:'Corrales', modulo: 'corrales'},
    {id: 4, path: '/animales', label: "Animales", modulo: 'animales'},
    {id: 5, path: '/alimentacion', label: "Alimentación", modulo: 'alimentacion'},
    {id: 6, path: '/dietas', label: "Dietas", modulo: 'dietas'},
    {id: 7, path: '/medicamentos', label: "Medicamentos", modulo: 'veterinario'},
    {id: 8, path: '/almacen', label:'Almacén', modulo: 'almacen'},
    {id: 9, path: '/ventas', label: 'Ventas', modulo: 'ventas'},
    {id: 10, path: '/contactos', label: 'Contactos', modulo: 'contactos'},
    {id: 11, path: '/reportes', label: 'Reportes', modulo: 'reportes'}
  ]);

  if (loading) {
    return <div>Cargando aplicación...</div>;
  }

  return (
    <div className='App'>
      <Navbar logo={<Logo/>} menuItems={menuItems}/>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={
          <PrivateRoute>
            <MainPage />
          </PrivateRoute>
        } />
        <Route path='/recepcion' element={
          <PrivateRoute modulo="recepcion" accion="leer">
            <RecepcionPage />
          </PrivateRoute>
        }/>
        <Route path='/corrales' element={
          <PrivateRoute modulo="corrales" accion="leer">
            <CorralesPage/>
          </PrivateRoute>
        }/>
          <Route path='/corrales/:id' element={
          <PrivateRoute modulo="corrales" accion="leer">
            <DetalleCorral/>
          </PrivateRoute>
        }/>
        <Route path='/animales' element={
          <PrivateRoute modulo="animales" accion="leer">
            <AnimalesPage/>
          </PrivateRoute>
        }/>
        <Route path='/animales/:arete' element={
          <PrivateRoute modulo="animales" accion="leer">
            <FichaAnimal />
          </PrivateRoute>
        }/>
        <Route path='/alimentacion' element={
          <PrivateRoute modulo="alimentacion" accion="leer">
            <AlimentacionPage />
          </PrivateRoute>
        }/>
        <Route path="/dietas" element={
          <PrivateRoute modulo="dietas" accion="leer">
            <DietasPage />
          </PrivateRoute>
        }/>
        <Route path="/medicamentos" element={
          <PrivateRoute modulo="veterinario" accion="leer">
            <VeterinarioPage />
          </PrivateRoute>
        }/>
        <Route path="/medicamentos/:id" element={<DetalleMedicamento />} />
        <Route path="/almacen" element={
          <PrivateRoute modulo="almacen" accion="leer">
            <AlmacenPage />
          </PrivateRoute>
        }/>
        <Route path="/ventas" element={
          <PrivateRoute modulo="ventas" accion="leer">
            <VentasPage />
          </PrivateRoute>
        }/>
        <Route path="/contactos" element={
          <PrivateRoute modulo="contactos" accion="leer">
            <ContactosPage />
          </PrivateRoute>
        }/>
        <Route path="/reportes" element={
          <PrivateRoute modulo="reportes" accion="leer">
            <ReportesPage />
          </PrivateRoute>
        }/>
      </Routes>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;