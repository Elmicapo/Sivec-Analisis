const login = document.querySelector('#login');
const enrollment = document.querySelector('#enrollment');
const schedule = document.querySelector('#schedule');
const enrollButton = document.querySelector('#enroll-button');
const loginStatus = document.querySelector('#login-status');
const enrollmentStatus = document.querySelector('#enrollment-status');
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
  enrollmentStatus.textContent = 'Cargando cronogramas…';
  enrollButton.disabled = true;
  schedule.replaceChildren(new Option('Selecciona un cronograma', ''));
  try {
    const schedules = await api('/schedules');
    for (const row of schedules) {
      schedule.add(new Option(
        row.discipline + ' · ' + row.facility + ' · ' + row.days + ' ' + row.startTime.slice(0, 5),
        row.id,
      ));
    }
    enrollButton.disabled = !schedules.length;
    enrollmentStatus.textContent = schedules.length ? '' : 'No hay cronogramas disponibles.';
  } catch {
    enrollmentStatus.textContent = 'No se pudieron cargar los cronogramas.';
  }
}

function showSession() {
  login.hidden = Boolean(session);
  document.querySelector('#session').hidden = !session;
  document.querySelector('#profile').textContent = session
    ? session.usuario.nombreCompleto + ' · ' + session.usuario.tipoRol
    : '';
  enrollment.hidden = session?.usuario.tipoRol !== 'DEPORTISTA';
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
    loginStatus.textContent = enrollment.hidden ? 'Las inscripciones requieren el rol Deportista.' : '';
    if (!enrollment.hidden) await loadSchedules();
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
      enrollmentStatus.textContent = 'Inscripción confirmada en MySQL. Referencia: ' + result.id;
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
    if (session === activeSession) enrollButton.disabled = false;
  }
});

loadFacilities();
