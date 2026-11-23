const login = document.querySelector('#login');
const enrollment = document.querySelector('#enrollment');
const schedule = document.querySelector('#schedule');
const enrollButton = document.querySelector('#enroll-button');
const loginStatus = document.querySelector('#login-status');
const enrollmentStatus = document.querySelector('#enrollment-status');
const reportForm = document.querySelector('#oversight-form');
const reportFacility = document.querySelector('#report-facility');
const reportStatus = document.querySelector('#oversight-status');
const reviewPanel = document.querySelector('#oversight-review');
const reviewList = document.querySelector('#oversight-list');
const communityFields = document.querySelector('#community-fields');
const officializationList = document.querySelector('#officialization-list');
const historyFacility = document.querySelector('#history-facility');
const historyList = document.querySelector('#history-list');
const historyStatus = document.querySelector('#history-status');
const dateFormat = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Bogota' });
let session = null;
let historyRequest = 0;
const athleteHistory = document.querySelector('#athlete-history');

async function api(path, options = {}) {
  const response = await fetch('/api/v1' + path, options);
  const result = await response.json();
  if (!response.ok) {
    const error = new Error(result.error || 'La solicitud no se pudo completar.');
    error.status = response.status;
    throw error;
  }
  return result.data;
}

function appendText(parent, tag, value, className = '') {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = value;
  parent.append(element);
}

async function loadFacilities() {
  const status = document.querySelector('#facility-status');
  try {
    const facilities = await api('/facilities');
    const list = document.querySelector('#facility-list');
    list.replaceChildren();
    for (const select of [reportFacility, historyFacility]) {
      const selected = select.value;
      select.replaceChildren(new Option('Selecciona un escenario', ''));
      for (const facility of facilities) select.add(new Option(facility.name, facility.id));
      select.value = facilities.some((facility) => facility.id === selected) ? selected : '';
      select.disabled = facilities.length === 0;
    }
    reportForm.querySelector('button').disabled = reportFacility.disabled;
    for (const facility of facilities) {
      const card = document.createElement('li');
      appendText(card, 'h3', facility.name);
      appendText(card, 'p', facility.location);
      appendText(card, 'p', 'Aforo: ' + facility.capacity);
      appendText(card, 'span', facility.trafficLight, 'badge ' + facility.trafficLight.toLowerCase());
      list.append(card);
    }
    status.textContent = facilities.length ? '' : 'No hay escenarios disponibles.';
  } catch {
    status.textContent = 'No se pudieron consultar los escenarios. Verifica la conexión con MySQL.';
  }
}

async function loadSchedules() {
  const status = document.querySelector('#schedule-status');
  const list = document.querySelector('#schedule-list');
  schedule.replaceChildren(new Option('Selecciona un cronograma', ''));
  try {
    const schedules = await api('/schedules');
    for (const row of schedules) {
      const card = document.createElement('li');
      const hours = row.days + ' · ' + row.startTime.slice(0, 5) + '–' + row.endTime.slice(0, 5);
      appendText(card, 'h3', row.discipline);
      appendText(card, 'p', row.facility);
      appendText(card, 'p', hours, 'schedule-time');
      appendText(card, 'p', 'Entrenador: ' + row.coach);
      appendText(card, 'p', 'Vigencia: ' + row.validFrom + ' a ' + row.validUntil);
      list.append(card);
      schedule.add(new Option(row.discipline + ' · ' + row.facility + ' · ' + hours, row.id));
    }
    schedule.disabled = !schedules.length;
    enrollButton.disabled = !schedules.length;
    status.textContent = schedules.length ? '' : 'No hay cronogramas disponibles.';
    filterCards('schedule');
  } catch {
    status.textContent = 'No se pudieron consultar los cronogramas. Verifica la conexión con MySQL.';
  }
}

function showSession() {
  login.hidden = Boolean(session);
  document.querySelector('#session').hidden = !session;
  document.querySelector('#profile').textContent = session
    ? session.usuario.nombreCompleto + ' · ' + session.usuario.tipoRol
    : '';
  const role = session?.usuario.tipoRol;
  enrollment.hidden = role !== 'DEPORTISTA';
  reportForm.hidden = role === 'CMJ';
  communityFields.hidden = role === 'DEPORTISTA';
  communityFields.disabled = communityFields.hidden;
  reviewPanel.hidden = role !== 'CMJ';
  document.querySelector('#oversight-access').hidden = role === 'DEPORTISTA' || role === 'CMJ';
  reportStatus.textContent = '';
  athleteHistory.hidden = role !== 'DEPORTISTA';
  document.querySelector('#athlete-history-list').replaceChildren();
  if (role === 'DEPORTISTA') loadAthleteHistory();
  reviewList.replaceChildren();
  officializationList.replaceChildren();
  if (role === 'CMJ') loadPendingReports();
}

login.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = event.submitter;
  button.disabled = true;
  loginStatus.textContent = 'Verificando credenciales…';
  try {
    session = await api('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.fromEntries(new FormData(login))),
    });
    login.reset();
    showSession();
    loginStatus.textContent = '';
    if (session.usuario.tipoRol === 'CMJ') {
      document.querySelector('#veeduria').scrollIntoView();
    }
  } catch (error) {
    loginStatus.textContent = error.message;
  } finally {
    button.disabled = false;
  }
});

document.querySelector('#logout').addEventListener('click', () => {
  session = null;
  showSession();
  loginStatus.textContent = 'Sesión cerrada.';
  enrollmentStatus.textContent = '';
});

enrollment.addEventListener('submit', async (event) => {
  event.preventDefault();
  const activeSession = session;
  if (!activeSession) return;
  enrollButton.disabled = true;
  enrollmentStatus.textContent = 'Guardando inscripción…';
  try {
    const result = await api('/enrollments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + activeSession.token,
      },
      body: JSON.stringify({ scheduleId: schedule.value }),
    });
    if (session === activeSession) {
      enrollmentStatus.textContent = 'Inscripción confirmada. Referencia: ' + result.id;
      loadAthleteHistory();
      loadCatalog('discipline', '/disciplinas', disciplineDetails);
    }
  } catch (error) {
    if (session !== activeSession) return;
    if (error.status === 401) {
      session = null;
      showSession();
      loginStatus.textContent = 'La sesión venció. Inicia sesión de nuevo.';
      enrollmentStatus.textContent = '';
    } else {
      enrollmentStatus.textContent = error.message;
    }
  } finally {
    enrollButton.disabled = schedule.disabled;
  }
});

function sessionHeaders(activeSession) {
  return {
    'Content-Type': 'application/json',
    Authorization: 'Bearer ' + activeSession.token,
  };
}

reportForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const activeSession = session;
  const athlete = activeSession?.usuario.tipoRol === 'DEPORTISTA';
  const { idEscenario, descripcionDeterioro, ...community } = Object.fromEntries(new FormData(reportForm));
  const payload = { idEscenario, descripcionDeterioro };
  if (!athlete) payload.usuarioComunidad = { ...community, edad: Number(community.edad) };
  const button = event.submitter;
  button.disabled = true;
  reportStatus.textContent = 'Enviando reporte…';
  try {
    const result = await api('/veedurias', {
      method: 'POST',
      headers: athlete ? sessionHeaders(activeSession) : { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (session !== activeSession) return;
    reportForm.reset();
    reportStatus.textContent = 'Reporte enviado para revisión del CMJ. Referencia: ' + result.idReporte;
  } catch (error) {
    if (session === activeSession) reportStatus.textContent = error.message;
  } finally {
    button.disabled = reportFacility.disabled;
  }
});

async function loadPendingReports(message) {
  const activeSession = session;
  reviewList.replaceChildren();
  reportStatus.textContent = message ?? 'Cargando reportes pendientes…';
  try {
    const headers = sessionHeaders(activeSession);
    const [rows, approved] = await Promise.all([
      api('/veedurias/pendientes', { headers }),
      api('/veedurias/por-oficializar', { headers }),
    ]);
    if (session !== activeSession) return;
    reviewList.replaceChildren(...rows.map((row) => createReviewCard(row, activeSession, false)));
    officializationList.replaceChildren(...approved.map((row) => createReviewCard(row, activeSession, true)));
    if (!rows.length) appendText(reviewList, 'li', 'No hay reportes pendientes.');
    if (!approved.length) appendText(officializationList, 'li', 'No hay reportes por oficializar.');
    reportStatus.textContent = message ?? '';
  } catch (error) {
    if (session === activeSession) reportStatus.textContent = error.message;
  }
}

function createReviewCard(row, activeSession, officializing) {
  const card = document.createElement('li');
  appendText(card, 'h3', row.escenario);
  appendText(card, 'p', row.descripcion);
  const form = document.createElement('form');
  const decision = document.createElement('select');
  decision.add(new Option('Validar reporte', 'VALIDADO'));
  decision.add(new Option('Rechazar reporte', 'RECHAZADO'));
  const color = document.createElement('select');
  for (const value of ['VERDE', 'AMARILLO', 'ROJO']) color.add(new Option(value, value));
  const observations = document.createElement('textarea');
  observations.required = true;
  observations.maxLength = 2000;
  observations.rows = 3;
  if (officializing) appendField(form, 'Color del semáforo', color);
  else appendField(form, 'Decisión', decision);
  appendField(form, 'Observaciones del CMJ', observations);
  const button = document.createElement('button');
  button.textContent = officializing ? 'Oficializar cambio' : 'Guardar revisión';
  form.append(button);
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    button.disabled = true;
    try {
      const action = officializing ? '/semaforo' : '/validacion';
      await api('/veedurias/' + encodeURIComponent(row.idReporte) + action, {
        method: officializing ? 'PATCH' : 'PUT',
        headers: sessionHeaders(activeSession),
        body: JSON.stringify({
          estado: decision.value,
          observaciones: observations.value,
          nuevoEstadoSemaforo: color.value,
        }),
      });
      if (session === activeSession) {
        loadPendingReports(officializing ? 'Cambio de semáforo oficializado.' : 'Revisión guardada.');
        if (officializing) loadFacilities();
        loadHistory();
      }
    } catch (error) {
      if (session === activeSession) reportStatus.textContent = error.message;
    } finally {
      button.disabled = false;
    }
  });
  card.append(form);
  return card;
}

function createLabel(text, input) {
  const label = document.createElement('label');
  label.append(text, input);
  return label;
}

function appendField(form, text, input) {
  const label = createLabel(text, input);
  form.append(label);
  return label;
}

async function loadHistory() {
  const request = ++historyRequest;
  const id = historyFacility.value;
  historyList.replaceChildren();
  historyStatus.textContent = id ? 'Cargando histórico…' : '';
  if (!id) return;
  try {
    const rows = await api('/veedurias/historico/' + encodeURIComponent(id));
    if (historyRequest !== request) return;
    for (const row of rows) {
      const card = document.createElement('li');
      appendText(card, 'h4', row.estado);
      appendText(card, 'p', 'Reporte: ' + dateFormat.format(new Date(row.fecha)));
      if (row.validador) {
        appendText(card, 'p', 'Revisión: ' + row.validador + ' · ' + dateFormat.format(new Date(row.fechaRevision)));
      }
      if (row.color) appendText(card, 'p', row.colorAnterior + ' → ' + row.color + ' · ' + dateFormat.format(new Date(row.fechaCambio)));
      historyList.append(card);
    }
    historyStatus.textContent = rows.length ? '' : 'Este escenario no tiene reportes.';
  } catch (error) {
    if (historyRequest === request) historyStatus.textContent = error.message;
  }
}

async function loadAthleteHistory() {
  const activeSession = session;
  const status = document.querySelector('#athlete-history-status');
  const list = document.querySelector('#athlete-history-list');
  status.textContent = 'Cargando inscripciones…';
  try {
    const rows = await api('/inscripciones/mi-historial', { headers: sessionHeaders(activeSession) });
    if (activeSession !== session) return;
    list.replaceChildren();
    for (const row of rows) {
      const card = document.createElement('li');
      appendText(card, 'h4', row.disciplina);
      appendText(card, 'p', row.escenario + ' · ' + row.dias + ' ' + row.inicio.slice(0, 5) + '–' + row.fin.slice(0, 5));
      appendText(card, 'p', row.estado + ' · ' + dateFormat.format(new Date(row.fecha)));
      list.append(card);
    }
    status.textContent = rows.length ? '' : 'Todavía no tienes inscripciones.';
  } catch (error) {
    if (activeSession === session) status.textContent = error.message;
  }
}

function filterCards(catalog) {
  const search = document.querySelector('#' + catalog + '-search');
  const cards = Array.from(document.querySelector('#' + catalog + '-list').children);
  const normalized = (text) => text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  const term = normalized(search.value.trim());
  for (const card of cards) card.hidden = !normalized(card.textContent).includes(term);
  const status = document.querySelector('#' + catalog + '-status');
  if (cards.length) status.textContent = cards.some((card) => !card.hidden) ? '' : 'No hay resultados para esta búsqueda.';
}

async function loadCatalog(catalog, route, details) {
  const status = document.querySelector('#' + catalog + '-status');
  const list = document.querySelector('#' + catalog + '-list');
  try {
    const rows = await api(route);
    list.replaceChildren();
    for (const row of rows) {
      const card = document.createElement('li');
      appendText(card, 'h3', row.nombre);
      for (const line of details(row)) appendText(card, 'p', line);
      list.append(card);
    }
    status.textContent = rows.length ? '' : 'No hay registros disponibles.';
    filterCards(catalog);
  } catch (error) {
    status.textContent = error.message;
  }
}

function disciplineDetails(row) {
  return [row.categoria + ' · ' + row.poblacion,
    'Ubicación: ' + (row.ubicaciones || 'Por definir'),
    'Entrenadores: ' + (row.entrenadores || 'Por definir'),
    'Cupo por cronograma: ' + row.cupo + ' · Deportistas inscritos: ' + row.inscritos];
}

for (const catalog of ['discipline', 'coach', 'schedule']) {
  document.querySelector('#' + catalog + '-search').addEventListener('input', () => filterCards(catalog));
}
loadCatalog('discipline', '/disciplinas', disciplineDetails);
loadCatalog('coach', '/entrenadores', (row) => [row.deporte, 'Sesiones de ' + row.duracion + ' min', row.multiples ? 'Entrena varias disciplinas' : 'Entrena una disciplina']);
historyFacility.addEventListener('change', loadHistory);
showSession();
loadFacilities();
loadSchedules();
