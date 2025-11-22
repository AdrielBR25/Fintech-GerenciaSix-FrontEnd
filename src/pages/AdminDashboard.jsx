import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_URL from '../config';
import './AdminDashboard.css';

function AdminDashboard() {
  const [formularios, setFormularios] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [afiliados, setAfiliados] = useState([]);
  const [fintechs, setFintechs] = useState([]);
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
  const [filterStatus, setFilterStatus] = useState(localStorage.getItem('filterStatus') || 'todos');
  const [filterFintech, setFilterFintech] = useState(localStorage.getItem('filterFintech') || 'todos');
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [editForm, setEditForm] = useState({ email: '', password: '' });
  const [showFormModal, setShowFormModal] = useState(false);
  const [formMode, setFormMode] = useState('create'); // 'create' ou 'edit'
  const [editingFormId, setEditingFormId] = useState(null);
  const [formData, setFormData] = useState({ nome: '', email: '', cpf: '', telefone: '', senha: '', fintechIds: [] });
  const [importMode, setImportMode] = useState('manual'); // 'manual' ou 'import'
  const [importText, setImportText] = useState('');
  // Estados para afiliados
  const [showAfiliadoModal, setShowAfiliadoModal] = useState(false);
  const [afiliadoNome, setAfiliadoNome] = useState('');
  const [showAfiliadoFormsModal, setShowAfiliadoFormsModal] = useState(false);
  const [afiliadoFormsData, setAfiliadoFormsData] = useState({ nome: '', formularios: [] });
  const [showExportModal, setShowExportModal] = useState(false);
  // Estados para fintechs
  const [showFintechModal, setShowFintechModal] = useState(false);
  const [fintechForm, setFintechForm] = useState({ nome: '', cor: '#666666' });
  const [editingFintech, setEditingFintech] = useState(null);
  // Estados para configurações
  const [config, setConfig] = useState({ tituloPrincipal: '', subtitulo: '', descricao: '' });
  const [configForm, setConfigForm] = useState({ tituloPrincipal: '', subtitulo: '', descricao: '' });
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

  const fetchAfiliados = async () => {
    try {
      const response = await axios.get(`${API_URL}/afiliado`, getAuthHeaders());
      setAfiliados(response.data);
    } catch (error) {
      console.error('Erro ao buscar afiliados:', error);
    }
  };

  const fetchFintechs = async () => {
    try {
      const response = await axios.get(`${API_URL}/fintech/admin`, getAuthHeaders());
      setFintechs(response.data);
    } catch (error) {
      console.error('Erro ao buscar fintechs:', error);
    }
  };

  const fetchConfig = async () => {
    try {
      const response = await axios.get(`${API_URL}/config/admin`, getAuthHeaders());
      setConfig(response.data);
      setConfigForm({
        tituloPrincipal: response.data.tituloPrincipal || 'CADASTRO DO PAINEL OPERACIONAL OTANPAY',
        subtitulo: response.data.subtitulo || 'GERÊNCIA $IX',
        descricao: response.data.descricao || 'PREENCHA O FORMULÁRIO ABAIXO COM OS SEUS DADOS'
      });
    } catch (error) {
      console.error('Erro ao buscar configurações:', error);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      navigate('/gerenciarform');
      return;
    }

    const loadData = async () => {
      await Promise.all([fetchFormularios(), fetchAdmins(), fetchAfiliados(), fetchFintechs(), fetchConfig()]);
      setLoading(false);
    };

    loadData();

    // Atualizar formulários, afiliados e fintechs a cada 5 segundos
    const interval = setInterval(() => {
      fetchFormularios();
      fetchAfiliados();
      fetchFintechs();
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

  const toggleFormularioFintech = async (formId, fintechId) => {
    try {
      // Buscar o formulário atual para manter os outros dados
      const form = formularios.find(f => f._id === formId);
      if (!form) return;

      const currentIds = getFormularioFintechIds(form);
      const fintechIdStr = String(fintechId);
      const isSelected = currentIds.includes(fintechIdStr);

      // Toggle: se está selecionado, remove; se não está, adiciona
      let newIds;
      if (isSelected) {
        newIds = currentIds.filter(id => id !== fintechIdStr);
      } else {
        newIds = [...currentIds, fintechIdStr];
      }

      const updateData = {
        nome: form.nome,
        email: form.email,
        cpf: form.cpf,
        telefone: form.telefone,
        senha: form.senha,
        fintechIds: newIds
      };

      // Atualizar otimisticamente primeiro para feedback imediato
      const selectedFintechs = newIds.map(id => {
        const fintech = fintechs.find(ft => String(ft._id) === id);
        return fintech || id;
      });

      setFormularios(prev =>
        prev.map(f => {
          if (f._id === formId) {
            return { ...f, fintechIds: selectedFintechs };
          }
          return f;
        })
      );

      await axios.put(`${API_URL}/formulario/${formId}`, updateData, getAuthHeaders());
      
      const fintech = fintechs.find(ft => String(ft._id) === fintechIdStr);
      const action = isSelected ? 'removida' : 'adicionada';
      showMessage('success', `Fintech ${fintech?.nome || ''} ${action} com sucesso!`);
    } catch (error) {
      // Reverter em caso de erro
      fetchFormularios();
      showMessage('error', 'Erro ao atualizar fintech');
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

  // Funções para afiliados
  const openAfiliadoModal = () => {
    setAfiliadoNome('');
    setShowAfiliadoModal(true);
  };

  const closeAfiliadoModal = () => {
    setAfiliadoNome('');
    setShowAfiliadoModal(false);
  };

  const createAfiliado = async (e) => {
    e.preventDefault();
    
    if (!afiliadoNome.trim()) {
      showMessage('error', 'Digite o nome do afiliado');
      return;
    }

    try {
      await axios.post(`${API_URL}/afiliado`, { nome: afiliadoNome }, getAuthHeaders());
      
      await fetchAfiliados();
      closeAfiliadoModal();
      showMessage('success', 'Afiliado criado com sucesso!');
    } catch (error) {
      showMessage('error', error.response?.data?.message || 'Erro ao criar afiliado');
    }
  };

  const deleteAfiliado = async (id) => {
    if (!window.confirm('Tem certeza que deseja deletar este afiliado? Os formulários associados não serão deletados.')) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/afiliado/${id}`, getAuthHeaders());
      
      await fetchAfiliados();
      showMessage('success', 'Afiliado deletado com sucesso!');
    } catch (error) {
      showMessage('error', 'Erro ao deletar afiliado');
    }
  };

  const viewAfiliadoForms = async (afiliado) => {
    try {
      const response = await axios.get(`${API_URL}/afiliado/${afiliado._id}/formularios`, getAuthHeaders());
      setAfiliadoFormsData({
        nome: afiliado.nome,
        codigo: afiliado.codigo,
        formularios: response.data
      });
      setShowAfiliadoFormsModal(true);
    } catch (error) {
      showMessage('error', 'Erro ao buscar formulários do afiliado');
      console.error('Erro:', error);
    }
  };

  const closeAfiliadoFormsModal = () => {
    setShowAfiliadoFormsModal(false);
    setAfiliadoFormsData({ nome: '', codigo: '', formularios: [] });
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    showMessage('success', 'Link copiado!');
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

  const handleStatusFilterChange = (value) => {
    setFilterStatus(value);
    localStorage.setItem('filterStatus', value);
  };

  const handleFintechFilterChange = (value) => {
    setFilterFintech(value);
    localStorage.setItem('filterFintech', value);
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
    setFormData({ nome: '', email: '', cpf: '', telefone: '', senha: '', fintechIds: [] });
    setImportText('');
    setImportMode('manual');
    setShowFormModal(true);
  };

  const openEditFormModal = (form) => {
    setFormMode('edit');
    setEditingFormId(form._id);
    const fintechIds = (form.fintechIds || []).map(id => {
      if (typeof id === 'object' && id._id) {
        return String(id._id);
      }
      return String(id);
    });
    setFormData({
      nome: form.nome,
      email: form.email,
      cpf: form.cpf,
      telefone: form.telefone,
      senha: form.senha,
      fintechIds: fintechIds
    });
    setShowFormModal(true);
  };

  const closeFormModal = () => {
    setShowFormModal(false);
    setFormData({ nome: '', email: '', cpf: '', telefone: '', senha: '', fintechIds: [] });
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
      const dataToSend = { ...formData };
      // Garantir que fintechIds seja um array
      if (!dataToSend.fintechIds || !Array.isArray(dataToSend.fintechIds)) {
        dataToSend.fintechIds = [];
      }

      if (formMode === 'create') {
        await axios.post(`${API_URL}/formulario/admin-create`, dataToSend, getAuthHeaders());
        showMessage('success', 'Formulário criado com sucesso!');
      } else {
        await axios.put(`${API_URL}/formulario/${editingFormId}`, dataToSend, getAuthHeaders());
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

  // Função para contar quantos formulários têm o mesmo valor
  const countFormsWithValue = (field, value) => {
    if (!value || !formularios.length) return 0;
    return formularios.filter(f => f[field] && f[field] === value).length;
  };

  // Função para encontrar o primeiro formulário (original) com um valor específico
  const getOriginalForm = (field, value) => {
    if (!value || !formularios.length) return null;
    // Filtra formulários com o mesmo valor e ordena por data de criação
    const formsWithValue = formularios
      .filter(f => f[field] && f[field] === value)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    return formsWithValue.length > 0 ? formsWithValue[0] : null;
  };

  // Verificar se um campo específico tem duplicatas e é o original (primeiro criado)
  const isOriginal = (form, field) => {
    if (!form[field]) return false;
    // Só é original se há mais de 1 formulário com esse valor
    if (countFormsWithValue(field, form[field]) <= 1) return false;
    const original = getOriginalForm(field, form[field]);
    return original && original._id === form._id;
  };

  // Verificar se um campo específico é duplicata
  const isDuplicate = (form, field) => {
    if (!form[field]) return false;
    // Só é duplicata se há mais de 1 formulário com esse valor
    if (countFormsWithValue(field, form[field]) <= 1) return false;
    const original = getOriginalForm(field, form[field]);
    // É duplicata se existe um original e não é o próprio formulário
    return original && original._id !== form._id;
  };

  // Função para detectar duplicatas (mantida para filtro)
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

  // Função auxiliar para obter nome do afiliado
  const getAfiliadoNome = (afiliadoId) => {
    if (!afiliadoId) return 'N/A';
    // Converter para string para comparação
    const afiliadoIdStr = String(afiliadoId);
    const afiliado = afiliados.find(a => String(a._id) === afiliadoIdStr);
    return afiliado ? afiliado.nome : 'N/A';
  };

  const getFintechNome = (fintechId) => {
    if (!fintechId) return null;
    // Pode ser objeto populado ou apenas ID
    if (typeof fintechId === 'object' && fintechId.nome) {
      return fintechId;
    }
    const fintechIdStr = String(fintechId);
    const fintech = fintechs.find(f => String(f._id) === fintechIdStr);
    return fintech || null;
  };

  const getFormularioFintechIds = (form) => {
    if (!form.fintechIds || !Array.isArray(form.fintechIds)) {
      return [];
    }
    return form.fintechIds.map(id => {
      if (typeof id === 'object' && id._id) {
        return String(id._id);
      }
      return String(id);
    });
  };

  const isFintechSelected = (form, fintechId) => {
    const selectedIds = getFormularioFintechIds(form);
    return selectedIds.includes(String(fintechId));
  };

  // Funções para gerenciar fintechs
  const openFintechModal = () => {
    setFintechForm({ nome: '', cor: '#666666' });
    setEditingFintech(null);
    setShowFintechModal(true);
  };

  const closeFintechModal = () => {
    setShowFintechModal(false);
    setFintechForm({ nome: '', cor: '#666666' });
    setEditingFintech(null);
  };

  const startEditFintech = (fintech) => {
    setEditingFintech(fintech._id);
    setFintechForm({ nome: fintech.nome, cor: fintech.cor || '#666666' });
    setShowFintechModal(true);
  };

  const createFintech = async (e) => {
    e.preventDefault();
    
    if (!fintechForm.nome.trim()) {
      showMessage('error', 'Digite o nome da fintech');
      return;
    }

    try {
      await axios.post(`${API_URL}/fintech`, fintechForm, getAuthHeaders());
      await fetchFintechs();
      closeFintechModal();
      showMessage('success', 'Fintech criada com sucesso!');
    } catch (error) {
      showMessage('error', error.response?.data?.message || 'Erro ao criar fintech');
    }
  };

  const updateFintech = async (e) => {
    e.preventDefault();
    
    if (!fintechForm.nome.trim()) {
      showMessage('error', 'Digite o nome da fintech');
      return;
    }

    try {
      await axios.put(`${API_URL}/fintech/${editingFintech}`, fintechForm, getAuthHeaders());
      await fetchFintechs();
      closeFintechModal();
      showMessage('success', 'Fintech atualizada com sucesso!');
    } catch (error) {
      showMessage('error', error.response?.data?.message || 'Erro ao atualizar fintech');
    }
  };

  const deleteFintech = async (id) => {
    if (!window.confirm('Tem certeza que deseja deletar esta fintech? Os formulários associados não serão deletados.')) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/fintech/${id}`, getAuthHeaders());
      await fetchFintechs();
      showMessage('success', 'Fintech deletada com sucesso!');
    } catch (error) {
      showMessage('error', 'Erro ao deletar fintech');
    }
  };

  const toggleFintechStatus = async (fintech) => {
    try {
      await axios.put(`${API_URL}/fintech/${fintech._id}`, {
        ...fintech,
        ativo: !fintech.ativo
      }, getAuthHeaders());
      await fetchFintechs();
      showMessage('success', `Fintech ${fintech.ativo ? 'desativada' : 'ativada'} com sucesso!`);
    } catch (error) {
      showMessage('error', 'Erro ao alterar status da fintech');
    }
  };

  // Função para atualizar configurações
  const updateConfig = async (e) => {
    e.preventDefault();
    
    if (!configForm.tituloPrincipal.trim() || !configForm.subtitulo.trim() || !configForm.descricao.trim()) {
      showMessage('error', 'Preencha todos os campos');
      return;
    }

    try {
      await axios.put(`${API_URL}/config`, configForm, getAuthHeaders());
      await fetchConfig();
      showMessage('success', 'Configurações atualizadas com sucesso!');
    } catch (error) {
      showMessage('error', error.response?.data?.message || 'Erro ao atualizar configurações');
    }
  };

  // Funções de exportação
  const exportToCSV = () => {
    const dataToExport = filteredFormularios.length > 0 ? filteredFormularios : formularios;
    
    if (dataToExport.length === 0) {
      showMessage('error', 'Não há formulários para exportar');
      return;
    }

    // Cabeçalhos do CSV
    const headers = ['Nome', 'E-mail', 'CPF', 'Telefone', 'Senha', 'Status', 'Data de Criação', 'Afiliado', 'Fintechs'];
    
    // Criar linhas do CSV
    const rows = dataToExport.map(form => {
      const date = new Date(form.createdAt).toLocaleString('pt-BR');
      const statusMap = {
        'pendente': 'Pendente',
        'concluido': 'Concluído',
        'jaCadastrado': 'Já Cadastrado'
      };
      const status = statusMap[form.status] || 'Pendente';
      const afiliadoNome = getAfiliadoNome(form.afiliadoId);
      const fintechsNomes = (form.fintechIds || []).map(id => {
        const fintech = getFintechNome(id);
        return fintech ? fintech.nome : '';
      }).filter(n => n).join('; ') || 'N/A';
      
      // Escapar vírgulas e aspas nos valores
      const escapeCSV = (value) => {
        if (value === null || value === undefined) return '';
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      };

      return [
        escapeCSV(form.nome),
        escapeCSV(form.email),
        escapeCSV(form.cpf),
        escapeCSV(form.telefone),
        escapeCSV(form.senha),
        escapeCSV(status),
        escapeCSV(date),
        escapeCSV(afiliadoNome),
        escapeCSV(fintechsNomes)
      ].join(',');
    });

    // Combinar cabeçalhos e linhas
    const csvContent = [headers.join(','), ...rows].join('\n');
    
    // Adicionar BOM para Excel reconhecer UTF-8
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `formularios_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showMessage('success', 'Formulários exportados em CSV com sucesso!');
    setShowExportModal(false);
  };

  const exportToJSON = () => {
    const dataToExport = filteredFormularios.length > 0 ? filteredFormularios : formularios;
    
    if (dataToExport.length === 0) {
      showMessage('error', 'Não há formulários para exportar');
      return;
    }

    // Preparar dados para exportação
    const exportData = dataToExport.map(form => {
      const fintechsList = (form.fintechIds || []).map(id => {
        const fintech = getFintechNome(id);
        return fintech ? { nome: fintech.nome, cor: fintech.cor } : null;
      }).filter(f => f);
      
      return {
        nome: form.nome,
        email: form.email,
        cpf: form.cpf,
        telefone: form.telefone,
        senha: form.senha,
        status: statusMap[form.status] || 'Pendente',
        dataCriacao: new Date(form.createdAt).toISOString(),
        dataCriacaoFormatada: new Date(form.createdAt).toLocaleString('pt-BR'),
        afiliado: getAfiliadoNome(form.afiliadoId),
        temAfiliado: !!form.afiliadoId,
        fintechs: fintechsList,
        fintechsNomes: fintechsList.map(f => f.nome).join(', ') || 'Nenhuma'
      };
    });

    const jsonContent = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `formularios_${new Date().toISOString().split('T')[0]}.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showMessage('success', 'Formulários exportados em JSON com sucesso!');
    setShowExportModal(false);
  };

  // Filtrar formulários por busca, data, status, fintech e duplicatas
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

    // Filtro de status
    const matchesStatus = filterStatus === 'todos' || form.status === filterStatus;

    // Filtro de fintech
    const formFintechIds = form.fintechIds || [];
    const matchesFintech = filterFintech === 'todos' || 
      (filterFintech === 'sem-fintech' && (!formFintechIds || formFintechIds.length === 0)) ||
      (formFintechIds.length > 0 && formFintechIds.some(id => {
        const fintechId = typeof id === 'object' ? id._id : id;
        return String(fintechId) === filterFintech;
      }));

    // Filtro de duplicatas
    const matchesDuplicates = !showDuplicates || hasDuplicates(form);

    return matchesSearch && matchesDate && matchesStatus && matchesFintech && matchesDuplicates;
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
          className={`tab ${activeTab === 'afiliados' ? 'active' : ''}`}
          onClick={() => setActiveTab('afiliados')}
        >
          Afiliados ({afiliados.length})
        </button>
        <button
          className={`tab ${activeTab === 'admins' ? 'active' : ''}`}
          onClick={() => setActiveTab('admins')}
        >
          Administradores ({admins.length})
        </button>
        <button
          className={`tab ${activeTab === 'configuracoes' ? 'active' : ''}`}
          onClick={() => setActiveTab('configuracoes')}
        >
          ⚙️ Configurações
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
                <button onClick={() => setShowExportModal(true)} className="export-button">
                  📥 Exportar
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
                  <span className="legend-item">
                    <span className="status-badge jaCadastrado">Já Cadastrado</span>
                    {formularios.filter(f => f.status === 'jaCadastrado').length}
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
              <div className="status-filter">
                <label htmlFor="status-filter">📊 Status:</label>
                <select
                  id="status-filter"
                  value={filterStatus}
                  onChange={(e) => handleStatusFilterChange(e.target.value)}
                  className="filter-select"
                >
                  <option value="todos">Todos</option>
                  <option value="pendente">Pendente</option>
                  <option value="concluido">Concluído</option>
                  <option value="jaCadastrado">Já Cadastrado</option>
                </select>
              </div>
              <div className="fintech-filter">
                <label htmlFor="fintech-filter">🏦 Fintech:</label>
                <select
                  id="fintech-filter"
                  value={filterFintech}
                  onChange={(e) => handleFintechFilterChange(e.target.value)}
                  className="filter-select"
                >
                  <option value="todos">Todas</option>
                  <option value="sem-fintech">Sem Fintech</option>
                  {fintechs.filter(f => f.ativo).map(fintech => (
                    <option key={fintech._id} value={fintech._id}>
                      {fintech.nome}
                    </option>
                  ))}
                </select>
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
                    handleStatusFilterChange('todos');
                    handleFintechFilterChange('todos');
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
                      </div>
                      <span className={`status-badge ${form.status}`}>
                        {form.status === 'pendente' ? 'Pendente' : form.status === 'concluido' ? 'Concluído' : 'Já Cadastrado'}
                      </span>
                    </div>
                    
                    <div className="card-body">
                      <div className="info-row">
                        <span className="label">E-mail:</span>
                        <span className={`value ${isOriginal(form, 'email') ? 'field-original' : isDuplicate(form, 'email') ? 'field-duplicate' : ''}`}>
                          {form.email}
                        </span>
                      </div>
                      <div className="info-row">
                        <span className="label">CPF:</span>
                        <span className={`value ${isOriginal(form, 'cpf') ? 'field-original' : isDuplicate(form, 'cpf') ? 'field-duplicate' : ''}`}>
                          {form.cpf}
                        </span>
                      </div>
                      <div className="info-row">
                        <span className="label">Telefone:</span>
                        <span className={`value ${isOriginal(form, 'telefone') ? 'field-original' : isDuplicate(form, 'telefone') ? 'field-duplicate' : ''}`}>
                          {form.telefone}
                        </span>
                      </div>
                      <div className="info-row">
                        <span className="label">Senha:</span>
                        <span className="value">{form.senha}</span>
                      </div>
                      <div className="info-row">
                        <span className="label">Data:</span>
                        <span className="value">{formatDate(form.createdAt)}</span>
                      </div>
                      <div className="info-row fintech-checkboxes-row">
                        <span className="label">🏦 Fintechs:</span>
                        <div className="fintech-checkboxes-container">
                          {fintechs.filter(f => f.ativo).length > 0 ? (
                            fintechs.filter(f => f.ativo).map(fintech => {
                              const isSelected = isFintechSelected(form, fintech._id);
                              const fintechColor = fintech.cor ? fintech.cor.trim() : '#666666';
                              return (
                                <label
                                  key={fintech._id}
                                  className={`fintech-checkbox-item ${isSelected ? 'selected' : ''}`}
                                  style={{ 
                                    backgroundColor: isSelected ? `${fintechColor}30` : `${fintechColor}15`,
                                    borderColor: fintechColor
                                  }}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    toggleFormularioFintech(form._id, fintech._id);
                                  }}
                                >
                                  <span className="fintech-checkbox-name">{fintech.nome}</span>
                                  <div className="fintech-checkbox-circle-wrapper">
                                    <div
                                      className={`fintech-checkbox-circle ${isSelected ? 'checked' : ''}`}
                                      style={{ backgroundColor: fintechColor }}
                                    >
                                      {isSelected && <span className="check-mark">✓</span>}
                                    </div>
                                  </div>
                                </label>
                              );
                            })
                          ) : (
                            <span className="no-fintechs-message">Nenhuma fintech cadastrada</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="card-actions">
                      <button
                        onClick={() => openEditFormModal(form)}
                        className="action-button edit"
                      >
                        ✏️ Editar
                      </button>
                      {form.status === 'pendente' && (
                        <button
                          onClick={() => updateStatus(form._id, 'concluido')}
                          className="action-button concluir"
                        >
                          ✓ Concluir
                        </button>
                      )}
                      {(form.status === 'concluido' || form.status === 'jaCadastrado') && (
                        <button
                          onClick={() => updateStatus(form._id, 'pendente')}
                          className="action-button pendente"
                        >
                          ← Pendente
                        </button>
                      )}
                      {form.status !== 'jaCadastrado' && (
                        <button
                          onClick={() => updateStatus(form._id, 'jaCadastrado')}
                          className="action-button jaCadastrado"
                        >
                          📋 Já Cadastrado
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

        {activeTab === 'afiliados' && (
          <div className="afiliados-section">
            <div className="section-header">
              <h2>Gerenciar Afiliados</h2>
              <button onClick={openAfiliadoModal} className="create-form-button">
                + Novo Afiliado
              </button>
            </div>

            {afiliados.length === 0 ? (
              <div className="empty-state">
                <p>Nenhum afiliado cadastrado ainda</p>
                <p className="empty-subtitle">Crie seu primeiro afiliado para gerar links personalizados</p>
              </div>
            ) : (
              <div className="afiliados-grid">
                {afiliados.map((afiliado) => (
                  <div key={afiliado._id} className="afiliado-card">
                    <div className="afiliado-header">
                      <div className="afiliado-info">
                        <h3>{afiliado.nome}</h3>
                        <p className="afiliado-date">Criado em: {formatDate(afiliado.createdAt)}</p>
                      </div>
                    </div>

                    <div className="afiliado-stats">
                      <div className="stat-item">
                        <span className="stat-label">Código:</span>
                        <span className="stat-value codigo">{afiliado.codigo}</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">Formulários:</span>
                        <span className="stat-value">{afiliado.totalFormularios || 0}</span>
                      </div>
                    </div>

                    <div className="afiliado-link">
                      <label>Link do Afiliado:</label>
                      <div className="link-container">
                        <input
                          type="text"
                          value={`${window.location.origin}/?ref=${afiliado.codigo}`}
                          readOnly
                          className="link-input"
                        />
                        <button
                          onClick={() => copyToClipboard(`${window.location.origin}/?ref=${afiliado.codigo}`)}
                          className="copy-button"
                          title="Copiar link"
                        >
                          Copiar
                        </button>
                      </div>
                    </div>

                    <div className="afiliado-actions">
                      <button
                        onClick={() => viewAfiliadoForms(afiliado)}
                        className="view-forms-button"
                        disabled={afiliado.totalFormularios === 0}
                      >
                        Ver Formulários ({afiliado.totalFormularios || 0})
                      </button>
                      <button
                        onClick={() => deleteAfiliado(afiliado._id)}
                        className="delete-afiliado-button"
                      >
                        Deletar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'configuracoes' && (
          <div className="configuracoes-section">
            <div className="section-header">
              <h2>⚙️ Configurações</h2>
            </div>

            <div className="config-section">
              <div className="config-section-header">
                <h3>📝 Títulos do Formulário</h3>
              </div>
              
              <form onSubmit={updateConfig} className="config-form">
                <div className="config-form-group">
                  <label htmlFor="tituloPrincipal">Título Principal:</label>
                  <input
                    type="text"
                    id="tituloPrincipal"
                    value={configForm.tituloPrincipal}
                    onChange={(e) => setConfigForm({ ...configForm, tituloPrincipal: e.target.value })}
                    placeholder="CADASTRO DO PAINEL OPERACIONAL OTANPAY"
                    className="config-input"
                    required
                  />
                </div>

                <div className="config-form-group">
                  <label htmlFor="subtitulo">Subtítulo:</label>
                  <input
                    type="text"
                    id="subtitulo"
                    value={configForm.subtitulo}
                    onChange={(e) => setConfigForm({ ...configForm, subtitulo: e.target.value })}
                    placeholder="GERÊNCIA $IX"
                    className="config-input"
                    required
                  />
                </div>

                <div className="config-form-group">
                  <label htmlFor="descricao">Descrição:</label>
                  <textarea
                    id="descricao"
                    value={configForm.descricao}
                    onChange={(e) => setConfigForm({ ...configForm, descricao: e.target.value })}
                    placeholder="PREENCHA O FORMULÁRIO ABAIXO COM OS SEUS DADOS"
                    className="config-textarea"
                    rows="3"
                    required
                  />
                </div>

                <button type="submit" className="config-save-button">
                  💾 Salvar Configurações
                </button>
              </form>
            </div>

            <div className="config-section">
              <div className="config-section-header">
                <h3>🏦 Gerenciar Fintechs</h3>
                <button onClick={openFintechModal} className="create-form-button">
                  + Nova Fintech
                </button>
              </div>

              {fintechs.length === 0 ? (
                <div className="empty-state">
                  <p>Nenhuma fintech cadastrada ainda</p>
                  <p className="empty-subtitle">Crie sua primeira fintech para associar aos formulários</p>
                </div>
              ) : (
                <div className="fintechs-grid">
                  {fintechs.map((fintech) => (
                    <div key={fintech._id} className="fintech-card">
                      <div className="fintech-header">
                        <div className="fintech-info">
                          <div 
                            className="fintech-color-indicator" 
                            style={{ backgroundColor: fintech.cor ? fintech.cor.trim() : '#666666' }}
                          ></div>
                          <div>
                            <h3>{fintech.nome}</h3>
                            <p className="fintech-status">
                              {fintech.ativo ? (
                                <span className="status-active">✓ Ativa</span>
                              ) : (
                                <span className="status-inactive">✕ Inativa</span>
                              )}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="fintech-actions">
                        <button
                          onClick={() => toggleFintechStatus(fintech)}
                          className={`toggle-status-button ${fintech.ativo ? 'active' : 'inactive'}`}
                          title={fintech.ativo ? 'Desativar fintech' : 'Ativar fintech'}
                        >
                          {fintech.ativo ? '🔒 Desativar' : '🔓 Ativar'}
                        </button>
                        <button
                          onClick={() => startEditFintech(fintech)}
                          className="edit-fintech-button"
                          title="Editar fintech"
                        >
                          ✏️ Editar
                        </button>
                        <button
                          onClick={() => deleteFintech(fintech._id)}
                          className="delete-fintech-button"
                          title="Deletar fintech"
                        >
                          🗑 Deletar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal de Criar/Editar Fintech */}
      {showFintechModal && (
        <div className="modal-overlay" onClick={closeFintechModal}>
          <div className="modal-content fintech-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingFintech ? '✏️ Editar Fintech' : '➕ Nova Fintech'}</h2>
              <button onClick={closeFintechModal} className="modal-close">✕</button>
            </div>
            <form onSubmit={editingFintech ? updateFintech : createFintech} className="modal-body">
              <div className="modal-form-group">
                <label>Nome da Fintech:</label>
                <input
                  type="text"
                  value={fintechForm.nome}
                  onChange={(e) => setFintechForm({ ...fintechForm, nome: e.target.value })}
                  placeholder="Ex: Nubank, Inter, PicPay..."
                  autoFocus
                  required
                />
              </div>
              <div className="modal-form-group">
                <label>Cor (opcional):</label>
                <div className="color-palette-container">
                  <div className="color-palette">
                    {[
                      '#8B5CF6', '#EC4899', '#EF4444', '#F59E0B', '#10B981',
                      '#3B82F6', '#6366F1', '#14B8A6', '#F97316', '#84CC16',
                      '#06B6D4', '#A855F7', '#E11D48', '#DC2626', '#059669',
                      '#2563EB', '#7C3AED', '#0891B2', '#BE185D', '#B91C1C',
                      '#1E40AF', '#5B21B6', '#0D9488', '#C2410C', '#166534',
                      '#666666', '#9CA3AF', '#374151', '#111827', '#FFFFFF'
                    ].map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={`color-option ${fintechForm.cor === color ? 'selected' : ''}`}
                        style={{ backgroundColor: color }}
                        onClick={() => setFintechForm({ ...fintechForm, cor: color })}
                        title={color}
                      >
                        {fintechForm.cor === color && <span className="check-icon">✓</span>}
                      </button>
                    ))}
                  </div>
                  <div className="color-picker-group">
                    <input
                      type="color"
                      value={fintechForm.cor}
                      onChange={(e) => setFintechForm({ ...fintechForm, cor: e.target.value })}
                      className="color-picker"
                      title="Cor personalizada"
                    />
                    <input
                      type="text"
                      value={fintechForm.cor}
                      onChange={(e) => setFintechForm({ ...fintechForm, cor: e.target.value })}
                      placeholder="#666666"
                      className="color-input"
                      maxLength="7"
                    />
                  </div>
                </div>
                <small className="form-hint">Selecione uma cor da paleta ou escolha uma cor personalizada</small>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={closeFintechModal} className="cancel-button">
                  Cancelar
                </button>
                <button type="submit" className="save-button">
                  {editingFintech ? '✓ Salvar Alterações' : '✓ Criar Fintech'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Criar Afiliado */}
      {showAfiliadoModal && (
        <div className="modal-overlay" onClick={closeAfiliadoModal}>
          <div className="modal-content afiliado-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>➕ Novo Afiliado</h2>
              <button onClick={closeAfiliadoModal} className="modal-close">✕</button>
            </div>
            <form onSubmit={createAfiliado} className="modal-body">
              <div className="modal-form-group">
                <label>Nome do Afiliado:</label>
                <input
                  type="text"
                  value={afiliadoNome}
                  onChange={(e) => setAfiliadoNome(e.target.value)}
                  placeholder="Ex: João Silva, Parceiro X, etc."
                  autoFocus
                  required
                />
              </div>
              <div className="modal-footer">
                <button type="button" onClick={closeAfiliadoModal} className="cancel-button">
                  Cancelar
                </button>
                <button type="submit" className="save-button">
                  Criar Afiliado
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Formulários do Afiliado */}
      {showAfiliadoFormsModal && (
        <div className="modal-overlay" onClick={closeAfiliadoFormsModal}>
          <div className="modal-content afiliado-forms-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📋 Formulários - {afiliadoFormsData.nome}</h2>
              <button onClick={closeAfiliadoFormsModal} className="modal-close">✕</button>
            </div>
            <div className="modal-body">
              <div className="modal-info">
                <p><strong>Código:</strong> {afiliadoFormsData.codigo}</p>
                <p><strong>Total de Formulários:</strong> {afiliadoFormsData.formularios.length}</p>
              </div>
              {afiliadoFormsData.formularios.length === 0 ? (
                <div className="empty-state">
                  <p>Nenhum formulário recebido ainda deste afiliado</p>
                </div>
              ) : (
                <div className="forms-list">
                  {afiliadoFormsData.formularios.map((form) => (
                    <div key={form._id} className="form-mini-card">
                      <div className="form-mini-header">
                        <h4>{form.nome}</h4>
                        <span className={`status-badge ${form.status}`}>
                          {form.status === 'pendente' ? 'Pendente' : form.status === 'concluido' ? 'Concluído' : 'Já Cadastrado'}
                        </span>
                      </div>
                      <div className="form-mini-details">
                        <p>
                          <strong>E-mail:</strong>{' '}
                          <span className={isOriginal(form, 'email') ? 'field-original' : isDuplicate(form, 'email') ? 'field-duplicate' : ''}>
                            {form.email}
                          </span>
                        </p>
                        <p>
                          <strong>CPF:</strong>{' '}
                          <span className={isOriginal(form, 'cpf') ? 'field-original' : isDuplicate(form, 'cpf') ? 'field-duplicate' : ''}>
                            {form.cpf}
                          </span>
                        </p>
                        <p>
                          <strong>Telefone:</strong>{' '}
                          <span className={isOriginal(form, 'telefone') ? 'field-original' : isDuplicate(form, 'telefone') ? 'field-duplicate' : ''}>
                            {form.telefone}
                          </span>
                        </p>
                        <p><strong>Data:</strong> {formatDate(form.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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

                  <div className="modal-form-group">
                    <label>Fintechs (opcional):</label>
                    <div className="modal-fintech-checkboxes">
                      {fintechs.filter(f => f.ativo).map(fintech => {
                        const isSelected = formData.fintechIds && formData.fintechIds.includes(String(fintech._id));
                        const fintechColor = fintech.cor ? fintech.cor.trim() : '#666666';
                        return (
                          <label
                            key={fintech._id}
                            className={`modal-fintech-checkbox-item ${isSelected ? 'selected' : ''}`}
                            style={{ 
                              backgroundColor: isSelected ? `${fintechColor}30` : `${fintechColor}15`,
                              borderColor: fintechColor
                            }}
                            onClick={(e) => {
                              e.preventDefault();
                              const currentIds = formData.fintechIds || [];
                              if (isSelected) {
                                setFormData({
                                  ...formData,
                                  fintechIds: currentIds.filter(id => id !== String(fintech._id))
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  fintechIds: [...currentIds, String(fintech._id)]
                                });
                              }
                            }}
                          >
                            <span className="modal-fintech-checkbox-name">{fintech.nome}</span>
                            <div className="modal-fintech-checkbox-circle-wrapper">
                              <div
                                className={`modal-fintech-checkbox-circle ${isSelected ? 'checked' : ''}`}
                                style={{ backgroundColor: fintechColor }}
                              >
                                {isSelected && <span className="check-mark">✓</span>}
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
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

      {/* Modal de Exportação */}
      {showExportModal && (
        <div className="modal-overlay" onClick={() => setShowExportModal(false)}>
          <div className="modal-content export-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📥 Exportar Formulários</h2>
              <button onClick={() => setShowExportModal(false)} className="modal-close">✕</button>
            </div>
            <div className="modal-body">
              <p className="export-info">
                {filteredFormularios.length > 0 
                  ? `Exportar ${filteredFormularios.length} formulário(s) (com filtros aplicados)`
                  : `Exportar ${formularios.length} formulário(s) (todos)`
                }
              </p>
              <div className="export-options">
                <button onClick={exportToCSV} className="export-option-button csv-button">
                  <span className="export-icon">📊</span>
                  <div>
                    <strong>Exportar como CSV</strong>
                    <p>Formato compatível com Excel</p>
                  </div>
                </button>
                <button onClick={exportToJSON} className="export-option-button json-button">
                  <span className="export-icon">📄</span>
                  <div>
                    <strong>Exportar como JSON</strong>
                    <p>Formato estruturado para desenvolvimento</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;

