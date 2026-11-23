# Backend de SIVEC

Copia .env.example como .env y ajusta la contraseña y los demás datos de MySQL.
Usa la base sivec_db que ya cargaste en DBeaver.

Ejecuta npm install, npm run build y npm run dev.
Abre http://localhost:3000/api/v1/facilities para consultar los escenarios.

Genera una clave JWT con `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` y guarda la salida en `JWT_SECRET` dentro de `.env`.

Los usuarios del SQL tienen hashes de ejemplo. Después de compilar, configura una contraseña local para un deportista con estos comandos de PowerShell.

```powershell
$clave = Read-Host 'Contrasena nueva (minimo 12 caracteres)' -AsSecureString
$env:SIVEC_NEW_PASSWORD = [System.Net.NetworkCredential]::new('', $clave).Password
try { node .\dist\scripts\set-password.js deportista_andres } finally { Remove-Item Env:SIVEC_NEW_PASSWORD }
```

Inicia sesión con `POST /api/v1/auth/login` y un objeto JSON con `credencialesLogin` y `credencialesClave`. Luego llama a `POST /api/v1/enrollments` con la cabecera `Authorization: Bearer TOKEN` y un objeto JSON con `scheduleId`. MySQL guarda la inscripción del deportista autenticado y comprueba el cruce de horarios.

## Interfaz web

Abre http://localhost:3000 después de iniciar el servidor. La pantalla consulta escenarios y cronogramas en MySQL. Puedes iniciar sesión con el deportista configurado arriba, seleccionar un cronograma y confirmar la inscripción. El mismo servidor Express sirve la página y la API.

## Veeduría y demostración

La comunidad puede reportar sin cuenta completando sus datos y el deportista puede reportar desde su sesión. Para revisar con el rol CMJ, configura la contraseña de `cmj_laura` con el mismo procedimiento de `set-password.js`.

1. En la página, crea un reporte desde Veeduría.
2. Entra como CMJ, abre Veeduría y valida el reporte pendiente. El semáforo mantiene su color hasta la oficialización.
3. En «Reportes validados por oficializar», selecciona un color y guarda el cambio. El semáforo y el histórico por escenario se actualizan.

El diseño, los permisos por rol y la cobertura de los requisitos están en [Diseño de SIVEC](docs/diseno-sivec.md).
