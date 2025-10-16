import { useState, useEffect } from 'react';
import axios from 'axios';
import API_URL from '../config';
import './FormularioPage.css';

function FormularioPage() {
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    cpf: '',
    telefone: '',
    senha: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [isRateLimitError, setIsRateLimitError] = useState(false);
  const [codigoAfiliado, setCodigoAfiliado] = useState(null);

  // Capturar código de afiliado da URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
      setCodigoAfiliado(ref);
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Formatação automática
    let formattedValue = value;
    if (name === 'cpf') {
      formattedValue = value.replace(/\D/g, '').slice(0, 11);
      formattedValue = formattedValue.replace(/(\d{3})(\d)/, '$1.$2');
      formattedValue = formattedValue.replace(/(\d{3})(\d)/, '$1.$2');
      formattedValue = formattedValue.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    } else if (name === 'telefone') {
      formattedValue = value.replace(/\D/g, '').slice(0, 11);
      formattedValue = formattedValue.replace(/(\d{2})(\d)/, '($1) $2');
      formattedValue = formattedValue.replace(/(\d{5})(\d)/, '$1-$2');
    }

    setFormData(prev => ({
      ...prev,
      [name]: formattedValue
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validações básicas
    if (!formData.nome || !formData.email || !formData.cpf || !formData.telefone || !formData.senha) {
      setError('Todos os campos são obrigatórios');
      setLoading(false);
      return;
    }

    if (formData.senha.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres');
      setLoading(false);
      return;
    }

    try {
      const cpfLimpo = formData.cpf.replace(/\D/g, '');
      const telefoneLimpo = formData.telefone.replace(/\D/g, '');

      const dataToSend = {
        ...formData,
        cpf: cpfLimpo,
        telefone: telefoneLimpo
      };

      // Adicionar código de afiliado se existir
      if (codigoAfiliado) {
        dataToSend.codigoAfiliado = codigoAfiliado;
      }

      await axios.post(`${API_URL}/formulario`, dataToSend);

      setSuccess(true);
      setFormData({
        nome: '',
        email: '',
        cpf: '',
        telefone: '',
        senha: ''
      });
    } catch (err) {
      const errorCode = err.response?.data?.code;
      if (errorCode === 'RATE_LIMIT_EXCEEDED') {
        setIsRateLimitError(true);
        setError('Ocorreu um erro, fale com o Gerente para obter ajuda');
      } else {
        setIsRateLimitError(false);
        setError(err.response?.data?.message || 'Erro ao enviar formulário');
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="form-container success-animation">
        <div className="success-box">
          <div className="success-icon">✓</div>
          <h1>Formulário Enviado!</h1>
          <p className="success-message">
            Para mais informações entre no grupo da Gerência $IX
          </p>
          <a 
            href="https://chat.whatsapp.com/FjtGTxiOb1kHBfBXzQadqc" 
            target="_blank" 
            rel="noopener noreferrer"
            className="whatsapp-button"
          >
            Entrar no Grupo
          </a>
          <button 
            onClick={() => setSuccess(false)} 
            className="back-button"
          >
            Enviar Outro Formulário
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="form-container fade-in">
      <div className="form-box">
        <h1 className="main-title">CADASTRO DO PAINEL OPERACIONAL FINTECH</h1>
        <h2 className="subtitle">GERÊNCIA $IX</h2>
        <p className="description">PREENCHA O FORMULÁRIO ABAIXO COM OS SEUS DADOS</p>

        {error && (
          <div className="error-message">
            {error}
            {isRateLimitError && (
              <a 
                href="http://wa.me/+556899202093" 
                target="_blank" 
                rel="noopener noreferrer"
                className="contact-manager-button"
              >
                Falar com o Gerente
              </a>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="form">
          <div className="form-group">
            <label htmlFor="nome">Nome Completo:</label>
            <input
              type="text"
              id="nome"
              name="nome"
              value={formData.nome}
              onChange={handleChange}
              placeholder="Digite seu nome completo"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">E-mail:</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="seuemail@exemplo.com"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="cpf">CPF:</label>
            <input
              type="text"
              id="cpf"
              name="cpf"
              value={formData.cpf}
              onChange={handleChange}
              placeholder="000.000.000-00"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="telefone">Telefone (WhatsApp):</label>
            <input
              type="tel"
              id="telefone"
              name="telefone"
              value={formData.telefone}
              onChange={handleChange}
              placeholder="(00) 00000-0000"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="senha">Senha (mínimo 6 caracteres):</label>
            <input
              type="password"
              id="senha"
              name="senha"
              value={formData.senha}
              onChange={handleChange}
              placeholder="Mínimo 6 caracteres"
              minLength="6"
              required
            />
          </div>

          <button type="submit" className="submit-button" disabled={loading}>
            {loading ? 'Enviando...' : 'Enviar Formulário'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default FormularioPage;

