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
let session = null;

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
    const selected = reportFacility.value;
    reportFacility.replaceChildren(new Option('Selecciona un escenario', ''));
    for (const facility of facilities) reportFacility.add(new Option(facility.name, facility.id));
    reportFacility.value = facilities.some((facility) => facility.id === selected) ? selected : '';
    reportFacility.disabled = facilities.length === 0;
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
      list.append(card);
      schedule.add(new Option(row.discipline + ' · ' + row.facility + ' · ' + hours, row.id));
    }
    schedule.disabled = !schedules.length;
    enrollButton.disabled = !schedules.length;
    status.textContent = schedules.length ? '' : 'No hay cronogramas disponibles.';
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
  reportForm.hidden = role !== 'DEPORTISTA';
  reviewPanel.hidden = role !== 'CMJ';
  document.querySelector('#oversight-access').hidden = !reportForm.hidden || !reviewPanel.hidden;
  reportStatus.textContent = '';
  reviewList.replaceChildren();
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
  if (!activeSession) return;
  const button = event.submitter;
  button.disabled = true;
  reportStatus.textContent = 'Enviando reporte…';
  try {
    const result = await api('/veedurias', {
      method: 'POST',
      headers: sessionHeaders(activeSession),
      body: JSON.stringify(Object.fromEntries(new FormData(reportForm))),
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
    const rows = await api('/veedurias/pendientes', { headers: sessionHeaders(activeSession) });
    if (session !== activeSession) return;
    for (const row of rows) reviewList.append(createReviewCard(row, activeSession));
    reportStatus.textContent = message ?? (rows.length ? '' : 'No hay reportes pendientes.');
  } catch (error) {
    if (session === activeSession) reportStatus.textContent = error.message;
  }
}

function createReviewCard(row, activeSession) {
  const card = document.createElement('li');
  appendText(card, 'h3', row.escenario);
  appendText(card, 'p', row.descripcion);
  const form = document.createElement('form');
  const decision = document.createElement('select');
  decision.add(new Option('Validar y actualizar semáforo', 'VALIDADO'));
  decision.add(new Option('Rechazar reporte', 'RECHAZADO'));
  const color = document.createElement('select');
  for (const value of ['VERDE', 'AMARILLO', 'ROJO']) color.add(new Option(value, value));
  const observations = document.createElement('textarea');
  observations.required = true;
  observations.maxLength = 2000;
  observations.rows = 3;
  const colorLabel = appendField(form, 'Color del semáforo', color);
  form.prepend(createLabel('Decisión', decision));
  decision.addEventListener('change', () => { colorLabel.hidden = decision.value === 'RECHAZADO'; });
  appendField(form, 'Observaciones del CMJ', observations);
  const button = document.createElement('button');
  button.textContent = 'Guardar revisión';
  form.append(button);
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    button.disabled = true;
    try {
      await api('/veedurias/' + encodeURIComponent(row.idReporte) + '/validacion', {
        method: 'PUT',
        headers: sessionHeaders(activeSession),
        body: JSON.stringify({
          estado: decision.value,
          observaciones: observations.value,
          nuevoEstadoSemaforo: color.value,
        }),
      });
      if (session === activeSession) {
        loadPendingReports('Revisión guardada.');
        loadFacilities();
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

loadFacilities();
loadSchedules();
