import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import FormularioPage from './pages/FormularioPage';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<FormularioPage />} />
        <Route path="/gerenciarform" element={<AdminLogin />} />
        <Route path="/gerenciarform/dashboard" element={<AdminDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;

