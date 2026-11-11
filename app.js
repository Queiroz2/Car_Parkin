const TOTAL_VAGAS = 12;

const db = JSON.parse(localStorage.getItem('carparkin_db')) || {
  users: [
    { nome: 'Gestor Principal', email: 'gestor@carparkin.com', tel: '', senha: 'admin123', role: 'gestor' }
  ],
  veiculos: [],
  vagas: Array.from({ length: TOTAL_VAGAS }, (_, i) => ({ num: i + 1, ocupada: null })),
  historico: [],
  viradas: [],
  turnoAtual: ''
};

let userLogado = null;
let vagaSelecionada = null;

const $ = id => document.getElementById(id);

function salvar() {
  localStorage.setItem('carparkin_db', JSON.stringify(db));
}

function toast(msg) {
  const el = $('toast');
  el.textContent = msg;
  el.hidden = false;
  setTimeout(() => (el.hidden = true), 3500);
}

function getTurno(hora) {
  if (hora >= 6 && hora < 12) return 'Manhã';
  if (hora >= 12 && hora < 18) return 'Tarde';
  return 'Noite';
}

function atualizarRelogio() {
  const agora = new Date();
  const turno = getTurno(agora.getHours());
  $('relogio').textContent = agora.toLocaleTimeString('pt-BR');
  $('turno').textContent = `Turno: ${turno}`;

  if (db.turnoAtual && db.turnoAtual !== turno) {
    db.viradas.unshift(`${agora.toLocaleString('pt-BR')} — Virou para ${turno}`);
    db.turnoAtual = turno;
    salvar();
    if (userLogado) render();
  } else if (!db.turnoAtual) {
    db.turnoAtual = turno;
    salvar();
  }
}
setInterval(atualizarRelogio, 1000);
atualizarRelogio();

// ALTERNAR ENTRE LOGIN E CADASTRO
$('irCadastro').addEventListener('click', e => {
  e.preventDefault();
  $('formLogin').hidden = true;
  $('formCadastro').hidden = false;
  $('authMsg').textContent = '';
});

$('irLogin').addEventListener('click', e => {
  e.preventDefault();
  $('formCadastro').hidden = true;
  $('formLogin').hidden = false;
  $('cadMsg').textContent = '';
});

function entrarNoSistema(user) {
  userLogado = user;
  document.body.classList.add('logado');
  $('auth').hidden = true;
  $('app').hidden = false;
  $('topo-user').hidden = false;
  $('nomeUser').textContent = `${user.nome} (${user.role})`;
  $('gestor').hidden = user.role !== 'gestor';
  $('areaProf').hidden = user.role !== 'professor';
  render();
}

// CADASTRO PÚBLICO DO PROFESSOR
$('formCadastro').addEventListener('submit', e => {
  e.preventDefault();
  const nome = $('cNome').value.trim();
  const email = $('cEmail').value.trim().toLowerCase();
  const tel = $('cTel').value.trim();
  const senha = $('cSenha').value;

  if (db.users.some(u => u.email === email)) {
    $('cadMsg').textContent = 'Este e-mail já está cadastrado. Tente fazer login.';
    return;
  }

  const novoProf = { nome, email, tel, senha, role: 'professor' };
  db.users.push(novoProf);
  salvar();
  e.target.reset();
  $('cadMsg').textContent = '';
  entrarNoSistema(novoProf);
  toast('Cadastro realizado! Cadastre seu veículo abaixo para estacionar.');
});

// LOGIN
$('formLogin').addEventListener('submit', e => {
  e.preventDefault();
  const email = $('lEmail').value.trim().toLowerCase();
  const senha = $('lSenha').value;
  const user = db.users.find(u => u.email === email && u.senha === senha);

  if (!user) {
    $('authMsg').textContent = 'E-mail ou senha incorretos.';
    return;
  }

  $('authMsg').textContent = '';
  entrarNoSistema(user);
});

// LOGOUT
$('btnSair').addEventListener('click', () => {
  userLogado = null;
  document.body.classList.remove('logado');
  $('auth').hidden = false;
  $('app').hidden = true;
  $('topo-user').hidden = true;
  $('formLogin').hidden = false;
  $('formCadastro').hidden = true;
  $('formLogin').reset();
});

// CADASTRO DE VEÍCULO PELO PRÓPRIO PROFESSOR
$('formMeuVeic').addEventListener('submit', e => {
  e.preventDefault();
  const placa = $('mvPlaca').value.trim().toUpperCase();
  const modelo = $('mvModelo').value.trim();

  if (db.veiculos.some(v => v.placa === placa)) {
    toast('Esta placa já está cadastrada no sistema.');
    return;
  }

  db.veiculos.push({ profEmail: userLogado.email, placa, modelo });
  salvar();
  e.target.reset();
  render();
  toast('Veículo adicionado! Agora clique em uma vaga livre.');
});

// CADASTROS PELO GESTOR
$('formProf').addEventListener('submit', e => {
  e.preventDefault();
  const nome = $('pNome').value.trim();
  const email = $('pEmail').value.trim().toLowerCase();
  const tel = $('pTel').value.trim();
  const senha = $('pSenha').value;

  if (db.users.some(u => u.email === email)) {
    toast('Este e-mail já está cadastrado.');
    return;
  }

  db.users.push({ nome, email, tel, senha, role: 'professor' });
  salvar();
  e.target.reset();
  render();
  toast('Professor cadastrado!');
});

$('formVeic').addEventListener('submit', e => {
  e.preventDefault();
  const profEmail = $('vProf').value;
  const placa = $('vPlaca').value.trim().toUpperCase();
  const modelo = $('vModelo').value.trim();

  if (db.veiculos.some(v => v.placa === placa)) {
    toast('Esta placa já está cadastrada.');
    return;
  }

  db.veiculos.push({ profEmail, placa, modelo });
  salvar();
  e.target.reset();
  render();
  toast('Veículo cadastrado!');
});

// VAGAS E JANELA DE ESTACIONAR
function abrirVaga(num) {
  if (userLogado.role === 'professor') {
    const jaEstacionado = db.vagas.find(v => v.ocupada && v.ocupada.profEmail === userLogado.email);
    if (jaEstacionado) {
      toast(`Você já possui um carro estacionado na Vaga ${jaEstacionado.num}.`);
      return;
    }
  }

  const meusVeiculos = userLogado.role === 'gestor'
    ? db.veiculos
    : db.veiculos.filter(v => v.profEmail === userLogado.email);

  const placasEstacionadas = db.vagas.filter(v => v.ocupada).map(v => v.ocupada.placa);
  const disponiveis = meusVeiculos.filter(v => !placasEstacionadas.includes(v.placa));

  if (disponiveis.length === 0) {
    toast('Cadastre um veículo primeiro na área abaixo das vagas.');
    return;
  }

  vagaSelecionada = num;
  $('dlgTitulo').textContent = `Vaga ${num}`;
  $('dlgInfo').textContent = 'Selecione o veículo que vai ocupar esta vaga:';
  $('selVeic').innerHTML = disponiveis
    .map(v => `<option value="${v.placa}">${v.placa} - ${v.modelo}</option>`)
    .join('');
  $('dlg').showModal();
}

$('dlgCancel').addEventListener('click', () => $('dlg').close());

$('formDlg').addEventListener('submit', e => {
  e.preventDefault();
  const placa = $('selVeic').value;
  const veic = db.veiculos.find(v => v.placa === placa);
  const prof = db.users.find(u => u.email === veic.profEmail);
  const vaga = db.vagas.find(v => v.num === vagaSelecionada);

  vaga.ocupada = {
    placa: veic.placa,
    modelo: veic.modelo,
    profNome: prof ? prof.nome : veic.profEmail,
    profEmail: veic.profEmail,
    entrada: Date.now()
  };

  salvar();
  $('dlg').close();
  render();
  toast(`Veículo ${placa} estacionado na Vaga ${vagaSelecionada}!`);
});

function liberarVaga(num) {
  const vaga = db.vagas.find(v => v.num === num);
  if (!vaga || !vaga.ocupada) return;

  const info = vaga.ocupada;
  const saida = Date.now();
  const mins = Math.max(1, Math.round((saida - info.entrada) / 60000));

  db.historico.unshift({
    placa: info.placa,
    prof: info.profNome,
    vaga: num,
    entrada: new Date(info.entrada).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    saida: new Date(saida).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    tempo: `${mins} min`
  });

  vaga.ocupada = null;
  salvar();
  render();
  toast(`Vaga ${num} liberada!`);
}

// RENDERIZAÇÃO DA TELA
function render() {
  const livres = db.vagas.filter(v => !v.ocupada).length;
  $('resumo').textContent = `${livres} livres de ${TOTAL_VAGAS}`;

  // Aviso destacado mostrando onde está o carro do professor logado
  const minhaVaga = db.vagas.find(v => v.ocupada && v.ocupada.profEmail === userLogado.email);
  if (minhaVaga) {
    $('aviso').hidden = false;
    $('aviso').textContent = `Seu veículo (${minhaVaga.ocupada.placa} - ${minhaVaga.ocupada.modelo}) está estacionado na Vaga ${minhaVaga.num}.`;
  } else {
    $('aviso').hidden = true;
  }

  $('grid').innerHTML = db.vagas.map(v => {
    if (!v.ocupada) {
      return `<div class="vaga livre" onclick="abrirVaga(${v.num})">
        <strong>Vaga ${v.num}</strong>
        <span>Livre</span>
      </div>`;
    }
    const eMeuCarro = v.ocupada.profEmail === userLogado.email;
    const podeSair = userLogado.role === 'gestor' || eMeuCarro;
    return `<div class="vaga ocupada ${eMeuCarro ? 'minha' : ''}">
      <strong>Vaga ${v.num} ${eMeuCarro ? '(Seu carro)' : ''}</strong>
      <div>${v.ocupada.placa} (${v.ocupada.modelo})</div>
      <small>${v.ocupada.profNome}</small>
      ${podeSair ? `<br><button class="sec" style="margin-top:.5rem;width:100%" onclick="liberarVaga(${v.num})">Registrar saída</button>` : ''}
    </div>`;
  }).join('');

  if (userLogado.role === 'professor') {
    const meus = db.veiculos.filter(v => v.profEmail === userLogado.email);
    $('listaMeusVeic').innerHTML = meus.length
      ? meus.map(v => `<li><span><strong>${v.placa}</strong> — ${v.modelo}</span></li>`).join('')
      : '<li><span>Nenhum veículo cadastrado ainda. Adicione acima.</span></li>';
  }

  if (userLogado.role === 'gestor') {
    const profs = db.users.filter(u => u.role === 'professor');
    $('vProf').innerHTML = profs.length
      ? profs.map(p => `<option value="${p.email}">${p.nome}</option>`).join('')
      : '<option value="">Cadastre um professor primeiro</option>';

    $('listaProf').innerHTML = profs.map(p => `<li><span>${p.nome} (${p.email}${p.tel ? ' • ' + p.tel : ''})</span></li>`).join('');
    $('listaVeic').innerHTML = db.veiculos.map(v => `<li><span>${v.placa} - ${v.modelo} (${v.profEmail})</span></li>`).join('');
  }

  $('hist').innerHTML = db.historico.map(h => `
    <tr>
      <td>${h.placa}</td><td>${h.prof}</td><td>Vaga ${h.vaga}</td>
      <td>${h.entrada}</td><td>${h.saida}</td><td>${h.tempo}</td>
    </tr>
  `).join('');

  $('viradas').innerHTML = db.viradas.map(v => `<li>${v}</li>`).join('');
}
