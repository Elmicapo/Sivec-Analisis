import app from './app';
import { ENV } from './config/env.config';

app.listen(ENV.PORT, () => {
  console.log(`=================================================`);
  console.log(`🚀 SIVEC Backend corriendo en puerto ${ENV.PORT}`);
  console.log(`📌 Entorno: ${ENV.NODE_ENV}`);
  console.log(`=================================================`);
});
