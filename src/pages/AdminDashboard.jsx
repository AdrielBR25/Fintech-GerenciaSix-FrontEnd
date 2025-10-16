import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_URL from '../config';
import './AdminDashboard.css';

function AdminDashboard() {
  const [formularios, setFormularios] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('formularios');
  const [newAdmin, setNewAdmin] = useState({ email: '', password: '' });
  const [message, setMessage] = useState({ type: '', text: '' });
  const [searchTerm, setSearchTerm] = useState(localStorage.getItem('filterSearch') || '');
  const [selectedDate, setSelectedDate] = useState(() => {
    const saved = localStorage.getItem('filterDate');
    // Se nunca foi salvo (null), usa data de hoje. Se foi salvo vazio (''), mantém vazio
    return saved !== null ? saved : new Date().toISOString().split('T')[0];
  });
  const [showDuplicates, setShowDuplicates] = useState(localStorage.getItem('filterDuplicates') === 'true');
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [editForm, setEditForm] = useState({ email: '', password: '' });
  const [showFormModal, setShowFormModal] = useState(false);
  const [formMode, setFormMode] = useState('create'); // 'create' ou 'edit'
  const [editingFormId, setEditingFormId] = useState(null);
  const [formData, setFormData] = useState({ nome: '', email: '', cpf: '', telefone: '', senha: '' });
  const [importMode, setImportMode] = useState('manual'); // 'manual' ou 'import'
  const [importText, setImportText] = useState('');
  const navigate = useNavigate();

  const getAuthHeaders = () => {
    const token = localStorage.getItem('adminToken');
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  const fetchFormularios = async () => {
    try {
      const response = await axios.get(`${API_URL}/formulario`, getAuthHeaders());
      setFormularios(response.data);
    } catch (error) {
      if (error.response?.status === 401) {
        handleLogout();
      }
      console.error('Erro ao buscar formulários:', error);
    }
  };

  const fetchAdmins = async () => {
    try {
      const response = await axios.get(`${API_URL}/admin`, getAuthHeaders());
      setAdmins(response.data);
    } catch (error) {
      console.error('Erro ao buscar admins:', error);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      navigate('/gerenciarform');
      return;
    }

    const loadData = async () => {
      await Promise.all([fetchFormularios(), fetchAdmins()]);
      setLoading(false);
    };

    loadData();

    // Atualizar formulários a cada 5 segundos
    const interval = setInterval(() => {
      fetchFormularios();
    }, 5000);

    return () => clearInterval(interval);
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminEmail');
    navigate('/gerenciarform');
  };

  const updateStatus = async (id, newStatus) => {
    try {
      await axios.patch(
        `${API_URL}/formulario/${id}/status`,
        { status: newStatus },
        getAuthHeaders()
      );
      
      // Atualizar localmente sem recarregar página
      setFormularios(prev =>
        prev.map(form =>
          form._id === id ? { ...form, status: newStatus } : form
        )
      );
      
      showMessage('success', 'Status atualizado com sucesso!');
    } catch (error) {
      showMessage('error', 'Erro ao atualizar status');
      console.error('Erro:', error);
    }
  };

  const deleteFormulario = async (id) => {
    if (!window.confirm('Tem certeza que deseja deletar este formulário?')) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/formulario/${id}`, getAuthHeaders());
      
      // Remover localmente sem recarregar página
      setFormularios(prev => prev.filter(form => form._id !== id));
      
      showMessage('success', 'Formulário deletado com sucesso!');
    } catch (error) {
      showMessage('error', 'Erro ao deletar formulário');
      console.error('Erro:', error);
    }
  };

  const createAdmin = async (e) => {
    e.preventDefault();
    
    if (!newAdmin.email || !newAdmin.password) {
      showMessage('error', 'Preencha todos os campos');
      return;
    }

    try {
      await axios.post(`${API_URL}/admin`, newAdmin, getAuthHeaders());
      
      await fetchAdmins();
      setNewAdmin({ email: '', password: '' });
      showMessage('success', 'Administrador criado com sucesso!');
    } catch (error) {
      showMessage('error', error.response?.data?.message || 'Erro ao criar administrador');
    }
  };

  const startEditAdmin = (admin) => {
    setEditingAdmin(admin._id);
    setEditForm({ email: admin.email, password: '' });
  };

  const cancelEditAdmin = () => {
    setEditingAdmin(null);
    setEditForm({ email: '', password: '' });
  };

  const updateAdmin = async (id) => {
    if (!editForm.email) {
      showMessage('error', 'O e-mail é obrigatório');
      return;
    }

    try {
      await axios.put(`${API_URL}/admin/${id}`, editForm, getAuthHeaders());
      
      await fetchAdmins();
      setEditingAdmin(null);
      setEditForm({ email: '', password: '' });
      showMessage('success', 'Administrador atualizado com sucesso!');
    } catch (error) {
      showMessage('error', error.response?.data?.message || 'Erro ao atualizar administrador');
    }
  };

  const deleteAdmin = async (id) => {
    if (!window.confirm('Tem certeza que deseja deletar este administrador?')) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/admin/${id}`, getAuthHeaders());
      
      await fetchAdmins();
      showMessage('success', 'Administrador deletado com sucesso!');
    } catch (error) {
      showMessage('error', 'Erro ao deletar administrador');
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  // Funções para gerenciar filtros com persistência
  const handleSearchChange = (value) => {
    setSearchTerm(value);
    localStorage.setItem('filterSearch', value);
  };

  const handleDateChange = (value) => {
    setSelectedDate(value);
    localStorage.setItem('filterDate', value);
  };

  const handleDuplicatesChange = (value) => {
    setShowDuplicates(value);
    localStorage.setItem('filterDuplicates', value.toString());
  };

  const setToday = () => {
    const today = new Date().toISOString().split('T')[0];
    setSelectedDate(today);
    localStorage.setItem('filterDate', today);
  };

  const clearDateFilter = () => {
    setSelectedDate('');
    localStorage.setItem('filterDate', '');
  };

  // Funções para gerenciar formulários
  const openCreateFormModal = () => {
    setFormMode('create');
    setFormData({ nome: '', email: '', cpf: '', telefone: '', senha: '' });
    setImportText('');
    setImportMode('manual');
    setShowFormModal(true);
  };

  const openEditFormModal = (form) => {
    setFormMode('edit');
    setEditingFormId(form._id);
    setFormData({
      nome: form.nome,
      email: form.email,
      cpf: form.cpf,
      telefone: form.telefone,
      senha: form.senha
    });
    setShowFormModal(true);
  };

  const closeFormModal = () => {
    setShowFormModal(false);
    setFormData({ nome: '', email: '', cpf: '', telefone: '', senha: '' });
    setImportText('');
    setEditingFormId(null);
  };

  const parseImportText = (text) => {
    const entries = [];
    const blocks = text.trim().split(/\n\s*\n/); // Separa por linha em branco

    for (const block of blocks) {
      const lines = block.trim().split('\n');
      const entry = {};

      for (const line of lines) {
        if (line.includes(':')) {
          const [key, ...valueParts] = line.split(':');
          const value = valueParts.join(':').trim();
          const keyLower = key.trim().toLowerCase();

          if (keyLower.includes('nome')) {
            entry.nome = value;
          } else if (keyLower.includes('e-mail') || keyLower.includes('email')) {
            entry.email = value;
          } else if (keyLower.includes('cpf')) {
            entry.cpf = value.replace(/\D/g, ''); // Remove formatação
          } else if (keyLower.includes('telefone')) {
            if (value !== 'N/A' && value.trim() !== '') {
              entry.telefone = value.replace(/\D/g, '');
            }
          } else if (keyLower.includes('senha')) {
            entry.senha = value;
          } else if (keyLower.includes('data')) {
            // Parse da data no formato: 2025/10/09 5:41:04 PM GMT-3
            try {
              entry.createdAt = new Date(value).toISOString();
            } catch (e) {
              // Se falhar, ignora a data (usa a atual)
            }
          }
        }
      }

      if (entry.nome && entry.email && entry.cpf && entry.senha) {
        entries.push(entry);
      }
    }

    return entries;
  };

  const handleImportForms = async () => {
    if (!importText.trim()) {
      showMessage('error', 'Cole o texto para importar');
      return;
    }

    const entries = parseImportText(importText);

    if (entries.length === 0) {
      showMessage('error', 'Nenhum formulário válido encontrado no texto');
      return;
    }

    let success = 0;
    let errors = [];

    for (const entry of entries) {
      try {
        await axios.post(`${API_URL}/formulario/admin-create`, entry, getAuthHeaders());
        success++;
      } catch (error) {
        errors.push(`${entry.nome}: ${error.response?.data?.message || 'Erro'}`);
      }
    }

    await fetchFormularios();
    
    if (success > 0) {
      showMessage('success', `${success} formulário(s) importado(s) com sucesso!`);
    }
    if (errors.length > 0) {
      showMessage('error', `Erros: ${errors.join('; ')}`);
    }

    if (success > 0) {
      closeFormModal();
    }
  };

  const handleSaveForm = async () => {
    if (!formData.nome || !formData.email || !formData.cpf || !formData.telefone || !formData.senha) {
      showMessage('error', 'Preencha todos os campos');
      return;
    }

    if (formData.senha.length < 6) {
      showMessage('error', 'A senha deve ter no mínimo 6 caracteres');
      return;
    }

    try {
      if (formMode === 'create') {
        await axios.post(`${API_URL}/formulario/admin-create`, formData, getAuthHeaders());
        showMessage('success', 'Formulário criado com sucesso!');
      } else {
        await axios.put(`${API_URL}/formulario/${editingFormId}`, formData, getAuthHeaders());
        showMessage('success', 'Formulário atualizado com sucesso!');
      }

      await fetchFormularios();
      closeFormModal();
    } catch (error) {
      showMessage('error', error.response?.data?.message || 'Erro ao salvar formulário');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR');
  };

  const formatDateOnly = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  // Função para detectar duplicatas
  const getDuplicates = (form) => {
    const duplicates = [];
    
    formularios.forEach(f => {
      if (f._id !== form._id) {
        if (f.email === form.email) {
          duplicates.push('E-mail');
        }
        if (f.cpf === form.cpf) {
          duplicates.push('CPF');
        }
        if (f.telefone === form.telefone) {
          duplicates.push('Telefone');
        }
      }
    });
    
    return [...new Set(duplicates)]; // Remove duplicatas do array
  };

  const hasDuplicates = (form) => {
    return getDuplicates(form).length > 0;
  };

  // Filtrar formulários por busca e data
  const filteredFormularios = formularios.filter((form) => {
    // Filtro de pesquisa
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = searchTerm === '' || 
      form.nome.toLowerCase().includes(searchLower) ||
      form.email.toLowerCase().includes(searchLower) ||
      form.cpf.includes(searchTerm) ||
      form.telefone.includes(searchTerm);

    // Filtro de data
    const formDate = new Date(form.createdAt).toISOString().split('T')[0];
    const matchesDate = selectedDate === '' || formDate === selectedDate;

    // Filtro de duplicatas
    const matchesDuplicates = !showDuplicates || hasDuplicates(form);

    return matchesSearch && matchesDate && matchesDuplicates;
  });

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-container fade-in">
      <header className="dashboard-header">
        <div>
          <h1>Painel Administrativo</h1>
          <p>Fintech - Gerência $IX</p>
        </div>
        <div className="header-actions">
          <span className="admin-email">{localStorage.getItem('adminEmail')}</span>
          <button onClick={handleLogout} className="logout-button">Sair</button>
        </div>
      </header>

      {message.text && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="dashboard-tabs">
        <button
          className={`tab ${activeTab === 'formularios' ? 'active' : ''}`}
          onClick={() => setActiveTab('formularios')}
        >
          Formulários ({formularios.length})
        </button>
        <button
          className={`tab ${activeTab === 'admins' ? 'active' : ''}`}
          onClick={() => setActiveTab('admins')}
        >
          Administradores ({admins.length})
        </button>
      </div>

      <div className="dashboard-content">
        {activeTab === 'formularios' && (
          <div className="formularios-section">
            <div className="section-header">
              <h2>Formulários Enviados</h2>
              <div className="header-actions-section">
                <button onClick={openCreateFormModal} className="create-form-button">
                  + Criar Form
                </button>
                <div className="status-legend">
                  <span className="legend-item">
                    <span className="status-badge pendente">Pendente</span>
                    {formularios.filter(f => f.status === 'pendente').length}
                  </span>
                  <span className="legend-item">
                    <span className="status-badge concluido">Concluído</span>
                    {formularios.filter(f => f.status === 'concluido').length}
                  </span>
                </div>
              </div>
            </div>

            <div className="filters-section">
              <div className="search-box">
                <input
                  type="text"
                  placeholder="🔍 Buscar por nome, e-mail, CPF ou telefone..."
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="search-input"
                />
              </div>
              <div className="date-filter">
                <label htmlFor="date-filter">📅 Filtrar por data:</label>
                <input
                  type="date"
                  id="date-filter"
                  value={selectedDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="date-input"
                />
                <button 
                  onClick={setToday}
                  className="today-button"
                  title="Selecionar data de hoje"
                >
                  📅 Hoje
                </button>
                <button 
                  onClick={clearDateFilter}
                  className="clear-date-button"
                  title="Limpar filtro de data"
                >
                  ✕ Todas
                </button>
              </div>
              <div className="duplicates-filter">
                <label className="duplicates-checkbox">
                  <input
                    type="checkbox"
                    checked={showDuplicates}
                    onChange={(e) => handleDuplicatesChange(e.target.checked)}
                  />
                  <span>🔍 Mostrar apenas duplicatas</span>
                </label>
              </div>
            </div>

            <div className="results-info">
              Mostrando <strong>{filteredFormularios.length}</strong> de <strong>{formularios.length}</strong> formulários
            </div>

            {formularios.length === 0 ? (
              <div className="empty-state">
                <p>Nenhum formulário enviado ainda</p>
              </div>
            ) : filteredFormularios.length === 0 ? (
              <div className="empty-state">
                <p>Nenhum formulário encontrado com os filtros aplicados</p>
                <button 
                  onClick={() => {
                    handleSearchChange('');
                    setToday();
                    handleDuplicatesChange(false);
                  }}
                  className="reset-filters-button"
                >
                  Limpar Filtros
                </button>
              </div>
            ) : (
              <div className="formularios-grid">
                {filteredFormularios.map((form) => (
                  <div key={form._id} className="formulario-card">
                    <div className="card-header">
                      <div className="card-title-section">
                        <h3>{form.nome}</h3>
                        {hasDuplicates(form) && (
                          <div className="duplicate-badges">
                            {getDuplicates(form).map((dup, idx) => (
                              <span key={idx} className="duplicate-badge" title={`${dup} duplicado`}>
                                ⚠️ {dup}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <span className={`status-badge ${form.status}`}>
                        {form.status === 'pendente' ? 'Pendente' : 'Concluído'}
                      </span>
                    </div>
                    
                    <div className="card-body">
                      <div className="info-row">
                        <span className="label">E-mail:</span>
                        <span className="value">{form.email}</span>
                      </div>
                      <div className="info-row">
                        <span className="label">CPF:</span>
                        <span className="value">{form.cpf}</span>
                      </div>
                      <div className="info-row">
                        <span className="label">Telefone:</span>
                        <span className="value">{form.telefone}</span>
                      </div>
                      <div className="info-row">
                        <span className="label">Senha:</span>
                        <span className="value">{form.senha}</span>
                      </div>
                      <div className="info-row">
                        <span className="label">Data:</span>
                        <span className="value">{formatDate(form.createdAt)}</span>
                      </div>
                    </div>

                    <div className="card-actions">
                      <button
                        onClick={() => openEditFormModal(form)}
                        className="action-button edit"
                      >
                        ✏️ Editar
                      </button>
                      {form.status === 'pendente' ? (
                        <button
                          onClick={() => updateStatus(form._id, 'concluido')}
                          className="action-button concluir"
                        >
                          ✓ Concluir
                        </button>
                      ) : (
                        <button
                          onClick={() => updateStatus(form._id, 'pendente')}
                          className="action-button pendente"
                        >
                          ← Pendente
                        </button>
                      )}
                      <button
                        onClick={() => deleteFormulario(form._id)}
                        className="action-button delete"
                      >
                        🗑 Deletar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'admins' && (
          <div className="admins-section">
            <div className="section-header">
              <h2>Gerenciar Administradores</h2>
            </div>

            <div className="create-admin-form">
              <h3>Adicionar Novo Administrador</h3>
              <form onSubmit={createAdmin} className="admin-form-inline">
                <input
                  type="email"
                  placeholder="E-mail"
                  value={newAdmin.email}
                  onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                  required
                />
                <input
                  type="password"
                  placeholder="Senha"
                  value={newAdmin.password}
                  onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                  required
                />
                <button type="submit" className="add-button">+ Adicionar</button>
              </form>
            </div>

            <div className="admins-list">
              {admins.map((admin) => (
                <div key={admin._id} className="admin-card">
                  {editingAdmin === admin._id ? (
                    // Modo de edição
                    <div className="admin-edit-form">
                      <div className="edit-form-inputs">
                        <input
                          type="email"
                          placeholder="E-mail"
                          value={editForm.email}
                          onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                          className="edit-input"
                        />
                        <input
                          type="password"
                          placeholder="Nova senha (deixe vazio para manter)"
                          value={editForm.password}
                          onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                          className="edit-input"
                        />
                      </div>
                      <div className="edit-form-actions">
                        <button
                          onClick={() => updateAdmin(admin._id)}
                          className="save-admin-button"
                        >
                          ✓ Salvar
                        </button>
                        <button
                          onClick={cancelEditAdmin}
                          className="cancel-admin-button"
                        >
                          ✕ Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    // Modo de visualização
                    <>
                      <div className="admin-info">
                        <span className="admin-icon">👤</span>
                        <div>
                          <p className="admin-email-text">{admin.email}</p>
                          <p className="admin-date">Criado em: {formatDate(admin.createdAt)}</p>
                        </div>
                      </div>
                      <div className="admin-actions">
                        <button
                          onClick={() => startEditAdmin(admin)}
                          className="edit-admin-button"
                          title="Editar administrador"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => deleteAdmin(admin._id)}
                          className="delete-admin-button"
                          disabled={admin.email === 'admin@admin.com'}
                          title={admin.email === 'admin@admin.com' ? 'Admin padrão não pode ser deletado' : 'Deletar'}
                        >
                          🗑
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal de Criar/Editar Formulário */}
      {showFormModal && (
        <div className="modal-overlay" onClick={closeFormModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{formMode === 'create' ? '➕ Criar Formulário' : '✏️ Editar Formulário'}</h2>
              <button onClick={closeFormModal} className="modal-close">✕</button>
            </div>

            {formMode === 'create' && (
              <div className="modal-tabs">
                <button
                  className={`modal-tab ${importMode === 'manual' ? 'active' : ''}`}
                  onClick={() => setImportMode('manual')}
                >
                  📝 Manual
                </button>
                <button
                  className={`modal-tab ${importMode === 'import' ? 'active' : ''}`}
                  onClick={() => setImportMode('import')}
                >
                  📋 Importar
                </button>
              </div>
            )}

            <div className="modal-body">
              {importMode === 'manual' || formMode === 'edit' ? (
                <div className="form-modal-fields">
                  <div className="modal-form-group">
                    <label>Nome:</label>
                    <input
                      type="text"
                      value={formData.nome}
                      onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                      placeholder="Nome completo"
                    />
                  </div>

                  <div className="modal-form-group">
                    <label>E-mail:</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="email@exemplo.com"
                    />
                  </div>

                  <div className="modal-form-group">
                    <label>CPF:</label>
                    <input
                      type="text"
                      value={formData.cpf}
                      onChange={(e) => setFormData({ ...formData, cpf: e.target.value.replace(/\D/g, '') })}
                      placeholder="Apenas números"
                      maxLength="11"
                    />
                  </div>

                  <div className="modal-form-group">
                    <label>Telefone:</label>
                    <input
                      type="text"
                      value={formData.telefone}
                      onChange={(e) => setFormData({ ...formData, telefone: e.target.value.replace(/\D/g, '') })}
                      placeholder="Apenas números"
                      maxLength="11"
                    />
                  </div>

                  <div className="modal-form-group">
                    <label>Senha:</label>
                    <input
                      type="text"
                      value={formData.senha}
                      onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                      placeholder="Mínimo 6 caracteres"
                    />
                  </div>

                  <button onClick={handleSaveForm} className="modal-save-button">
                    {formMode === 'create' ? '✓ Criar Formulário' : '✓ Salvar Alterações'}
                  </button>
                </div>
              ) : (
                <div className="import-section">
                  <p className="import-instructions">
                    Cole abaixo o texto com os formulários no formato:
                  </p>
                  <div className="import-example">
                    <code>
                      53:<br/>
                      Nome: Kethelin Juliana Perini<br/>
                      E-mail: kethelinjulianaperini@gmail.com<br/>
                      CPF: 05919418214<br/>
                      Telefone: 69984466998<br/>
                      Senha: Segredo123@<br/>
                      Data: 2025/10/09 5:41:04 PM GMT-3
                    </code>
                  </div>

                  <textarea
                    className="import-textarea"
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    placeholder="Cole aqui o texto com os formulários..."
                    rows="15"
                  />

                  <button onClick={handleImportForms} className="modal-save-button">
                    📥 Importar Formulários
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;

