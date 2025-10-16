# 🎨 Frontend - Formulário OtanPay

Interface da aplicação de formulários OtanPay - Gerência $IX.

## 📋 Tecnologias

- React 18
- Vite
- React Router
- Axios
- CSS Modules

## 🔧 Instalação Local

```bash
# Instalar dependências
npm install

# Criar arquivo .env (copie do exemplo abaixo)
# Cole as configurações no arquivo .env

# Rodar em desenvolvimento
npm run dev
```

## ⚙️ Variáveis de Ambiente (.env)

Crie um arquivo `.env` na raiz do frontend com:

```env
VITE_API_URL=http://localhost:5000/api
```

Para produção, use a URL do Railway:
```env
VITE_API_URL=https://sua-api.railway.app/api
```

## 🌐 Deploy no Netlify

### Método 1: Arrastar e Soltar

```bash
# Build do projeto
npm run build

# Arraste a pasta 'dist' no Netlify
```

### Método 2: GitHub (Recomendado)

1. Acesse: https://app.netlify.com
2. New site → Import from Git
3. Conecte com GitHub
4. Selecione este repositório
5. Configure:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
6. Adicione variável de ambiente:
   - `VITE_API_URL` = URL do backend no Railway
7. Deploy!

## 📱 Rotas

- `/` - Formulário público
- `/gerenciarform` - Login admin
- `/gerenciarform/dashboard` - Painel admin

## 🎨 Design

Paleta de cores:
- Preto: #000000
- Cinza escuro: #333333
- Cinza médio: #666666
- Cinza claro: #cccccc
- Branco: #ffffff

## 📂 Estrutura

```
frontend/
├── src/
│   ├── pages/           # Páginas React
│   │   ├── FormularioPage.jsx
│   │   ├── AdminLogin.jsx
│   │   └── AdminDashboard.jsx
│   ├── App.jsx          # Router
│   └── config.js        # Configuração da API
├── public/
│   └── favicon.ico
└── index.html
```

## 🐛 Troubleshooting

### Erro de conexão com API
- Verifique se o backend está rodando
- Verifique `VITE_API_URL` no `.env`
- Certifique-se que tem `/api` no final

### Build falha no Netlify
- Verifique se adicionou `VITE_API_URL`
- Certifique-se que o comando é `npm run build`
- Pasta de publicação deve ser `dist`

---

Desenvolvido para OtanPay - Gerência $IX

