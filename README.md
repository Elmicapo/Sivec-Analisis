# Backend de SIVEC

Copia .env.example como .env y ajusta la contraseña y los demás datos de MySQL.
Usa la base sivec_db que ya cargaste en DBeaver.

Ejecuta npm install, npm run build y npm run dev.
Abre http://localhost:3000/api/v1/facilities para consultar los escenarios.

La ruta local `POST /api/v1/enrollments` recibe `athleteId` y `scheduleId` y guarda en MySQL. Valida la disciplina activa, el cupo y los cruces de horario (RN-01). La ruta requiere autenticación antes de desplegarse públicamente.
