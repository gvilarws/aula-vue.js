require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseKey || 'placeholder'
);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Middleware para verificar se a configuração do Supabase está presente
const checkSupabase = (req, res, next) => {
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({
      error: 'Supabase não configurado. Verifique as variáveis de ambiente.'
    });
  }

  next();
};

app.use('/api', checkSupabase);

// ---------------- CLIENTES ----------------

// Listar clientes
app.get('/api/clientes', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .order('nome');

    if (error) throw error;

    res.json(data);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Criar cliente
app.post('/api/clientes', async (req, res) => {
  try {
    const { nome, telefone, email } = req.body;

    if (!nome || !telefone) {
      return res.status(400).json({
        error: 'Nome e telefone são obrigatórios.'
      });
    }

    const { data, error } = await supabase
      .from('clientes')
      .insert([{ nome, telefone, email }])
      .select();

    if (error) throw error;

    res.status(201).json(data[0]);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Atualizar cliente
app.put('/api/clientes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, telefone, email } = req.body;

    const { data, error } = await supabase
      .from('clientes')
      .update({ nome, telefone, email })
      .eq('id', id)
      .select();

    if (error) throw error;

    res.json(data[0]);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Excluir cliente
app.delete('/api/clientes/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('clientes')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({
      message: 'Cliente excluído com sucesso.'
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ---------------- AGENDAMENTOS ----------------

// Listar agendamentos
app.get('/api/agendamentos', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('agendamentos')
      .select('*, clientes(nome)')
      .order('data', { ascending: true })
      .order('hora', { ascending: true });

    if (error) throw error;

    res.json(data);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Criar agendamento
app.post('/api/agendamentos', async (req, res) => {
  try {
    const {
      cliente_id,
      servico,
      data,
      hora,
      observacoes,
      status
    } = req.body;

    // Verificar duplicidade
    const { data: existing, error: checkError } = await supabase
      .from('agendamentos')
      .select('*')
      .eq('cliente_id', cliente_id)
      .eq('data', data)
      .eq('hora', hora);

    if (checkError) throw checkError;

    if (existing.length > 0) {
      return res.status(400).json({
        error: 'Este cliente já possui um agendamento nesta data e horário.'
      });
    }

    const { data: newAgendamento, error } = await supabase
      .from('agendamentos')
      .insert([
        {
          cliente_id,
          servico,
          data,
          hora,
          observacoes,
          status
        }
      ])
      .select();

    if (error) throw error;

    res.status(201).json(newAgendamento[0]);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Atualizar agendamento
app.put('/api/agendamentos/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const {
      cliente_id,
      servico,
      data,
      hora,
      observacoes,
      status
    } = req.body;

    const { data: updated, error } = await supabase
      .from('agendamentos')
      .update({
        cliente_id,
        servico,
        data,
        hora,
        observacoes,
        status
      })
      .eq('id', id)
      .select();

    if (error) throw error;

    res.json(updated[0]);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Excluir agendamento
app.delete('/api/agendamentos/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('agendamentos')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({
      message: 'Agendamento excluído com sucesso.'
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ---------------- DASHBOARD ----------------

app.get('/api/dashboard', async (req, res) => {
  try {
    const hoje = new Date().toISOString().split('T')[0];

    const { count: agendamentosHoje } = await supabase
      .from('agendamentos')
      .select('*', { count: 'exact', head: true })
      .eq('data', hoje);

    const { count: totalClientes } = await supabase
      .from('clientes')
      .select('*', { count: 'exact', head: true });

    res.json({
      agendamentosHoje: agendamentosHoje || 0,
      totalClientes: totalClientes || 0
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ---------------- ESTATÍSTICAS ----------------

app.get('/api/estatisticas', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('agendamentos')
      .select('*');

    if (error) throw error;

    res.json(data);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ---------------- FRONTEND ----------------

// Corrigido aqui ↓↓↓
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ---------------- SERVIDOR ----------------

app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});