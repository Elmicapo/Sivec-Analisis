-- SIVEC para MySQL 8.4. Ejecutar una vez en una base nueva o vacía.
-- CREATE DATABASE IF NOT EXISTS sivec_db CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE sivec_db;

-- 1. Tabla Base de Usuarios (Class Table Inheritance)
CREATE TABLE usuario (
    id_usuario CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY DEFAULT (UUID()),
    numero_identificacion VARCHAR(20) NOT NULL UNIQUE,
    nombre_completo VARCHAR(150) NOT NULL,
    correo_electronico VARCHAR(100) NOT NULL UNIQUE,
    numero_telefono VARCHAR(20) NOT NULL,
    direccion_residencia VARCHAR(200) NOT NULL,
    credenciales_login VARCHAR(50) NOT NULL UNIQUE,
    credenciales_password_hash VARCHAR(255) NOT NULL,
    tipo_rol VARCHAR(30) NOT NULL CHECK (tipo_rol IN ('ADMINISTRATIVO', 'ENTRENADOR', 'DEPORTISTA', 'CMJ'))
) ENGINE=InnoDB;

-- 2. Subtablas de Especialización
CREATE TABLE administrativo (
    id_usuario CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    cargo VARCHAR(100) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE entrenador (
    id_usuario CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    deporte_principal VARCHAR(100) NOT NULL,
    duracion_entrenamiento_min INTEGER NOT NULL CHECK (duracion_entrenamiento_min > 0),
    permite_multiples_deportes BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE=InnoDB;

CREATE TABLE deportista (
    id_usuario CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    genero VARCHAR(20) NOT NULL,
    edad INTEGER NOT NULL
) ENGINE=InnoDB;

CREATE TABLE representante_cmj (
    id_usuario CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    cargo_cmj VARCHAR(100) NOT NULL
) ENGINE=InnoDB;

-- 3. Tabla Comunidad en General (Acceso Anónimo / RNF-02)
CREATE TABLE usuario_comunidad (
    id_comunidad CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY DEFAULT (UUID()),
    numero_identificacion VARCHAR(20) NOT NULL,
    nombre_completo VARCHAR(150) NOT NULL,
    genero VARCHAR(20) NOT NULL,
    edad INTEGER NOT NULL,
    direccion_residencia VARCHAR(200) NOT NULL,
    correo_electronico VARCHAR(100) NOT NULL
) ENGINE=InnoDB;

-- 4. Oferta e Infraestructura
CREATE TABLE disciplina (
    id_disciplina CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY DEFAULT (UUID()),
    nombre VARCHAR(100) NOT NULL,
    categoria VARCHAR(20) NOT NULL CHECK (categoria IN ('DEPORTIVA', 'CULTURAL')),
    poblacion_objetivo VARCHAR(100) NOT NULL,
    estado VARCHAR(20) NOT NULL CHECK (estado IN ('ACTIVA', 'INACTIVA')),
    cupo_maximo INTEGER NOT NULL CHECK (cupo_maximo > 0)
) ENGINE=InnoDB;

CREATE TABLE escenario_deportivo (
    id_escenario CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY DEFAULT (UUID()),
    nombre VARCHAR(120) NOT NULL,
    ubicacion VARCHAR(200) NOT NULL,
    tipo VARCHAR(50) NOT NULL,
    capacidad_aforo INTEGER NOT NULL CHECK (capacidad_aforo > 0),
    estado_semaforo VARCHAR(20) NOT NULL CHECK (estado_semaforo IN ('VERDE', 'AMARILLO', 'ROJO')),
    fecha_ultima_actualizacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE entrenador_disciplina (
    id_entrenador CHAR(36) CHARACTER SET ascii COLLATE ascii_bin,
    FOREIGN KEY (id_entrenador) REFERENCES entrenador(id_usuario) ON DELETE CASCADE,
    id_disciplina CHAR(36) CHARACTER SET ascii COLLATE ascii_bin,
    FOREIGN KEY (id_disciplina) REFERENCES disciplina(id_disciplina) ON DELETE CASCADE,
    PRIMARY KEY (id_entrenador, id_disciplina)
) ENGINE=InnoDB;

CREATE TABLE cronograma_entrenamiento (
    id_cronograma CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY DEFAULT (UUID()),
    id_disciplina CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    FOREIGN KEY (id_disciplina) REFERENCES disciplina(id_disciplina) ON DELETE CASCADE,
    id_escenario CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    FOREIGN KEY (id_escenario) REFERENCES escenario_deportivo(id_escenario) ON DELETE CASCADE,
    id_entrenador CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    FOREIGN KEY (id_entrenador) REFERENCES entrenador(id_usuario) ON DELETE CASCADE,
    dias_semana VARCHAR(50) NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    fecha_inicio_vigencia DATE NOT NULL,
    fecha_fin_vigencia DATE NOT NULL,
    CHECK (hora_fin > hora_inicio),
    CHECK (fecha_fin_vigencia >= fecha_inicio_vigencia)
) ENGINE=InnoDB;

-- 5. Inscripciones
CREATE TABLE inscripcion (
    id_inscripcion CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY DEFAULT (UUID()),
    id_deportista CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    FOREIGN KEY (id_deportista) REFERENCES deportista(id_usuario) ON DELETE CASCADE,
    id_cronograma CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    FOREIGN KEY (id_cronograma) REFERENCES cronograma_entrenamiento(id_cronograma) ON DELETE CASCADE,
    fecha_inscripcion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    estado_inscripcion VARCHAR(20) NOT NULL CHECK (estado_inscripcion IN ('CONFIRMADA', 'CANCELADA'))
) ENGINE=InnoDB;

-- 6. Veeduría y Semáforo (RN-02, RN-03)
CREATE TABLE reporte_veeduria (
    id_reporte CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY DEFAULT (UUID()),
    id_escenario CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    FOREIGN KEY (id_escenario) REFERENCES escenario_deportivo(id_escenario) ON DELETE CASCADE,
    tipo_reportante VARCHAR(20) NOT NULL CHECK (tipo_reportante IN ('DEPORTISTA', 'COMUNIDAD')),
    id_reportante CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    descripcion_deterioro TEXT NOT NULL,
    evidencia_fotografica_url VARCHAR(255),
    estado_reporte VARCHAR(20) NOT NULL CHECK (estado_reporte IN ('PENDIENTE', 'VALIDADO', 'RECHAZADO')),
    fecha_reporte TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    id_revisor_cmj CHAR(36) CHARACTER SET ascii COLLATE ascii_bin,
    FOREIGN KEY (id_revisor_cmj) REFERENCES representante_cmj(id_usuario),
    fecha_revision TIMESTAMP,
    observaciones_cmj TEXT
) ENGINE=InnoDB;

CREATE TABLE historico_estado_semaforo (
    id_historico CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY DEFAULT (UUID()),
    id_escenario CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    FOREIGN KEY (id_escenario) REFERENCES escenario_deportivo(id_escenario) ON DELETE CASCADE,
    id_reporte_origen CHAR(36) CHARACTER SET ascii COLLATE ascii_bin,
    FOREIGN KEY (id_reporte_origen) REFERENCES reporte_veeduria(id_reporte),
    id_oficializador_cmj CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    FOREIGN KEY (id_oficializador_cmj) REFERENCES representante_cmj(id_usuario),
    estado_anterior VARCHAR(20) NOT NULL,
    estado_nuevo VARCHAR(20) NOT NULL CHECK (estado_nuevo IN ('VERDE', 'AMARILLO', 'ROJO')),
    fecha_cambio TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    observaciones_oficiales TEXT NOT NULL
) ENGINE=InnoDB;

-- Creación de Índices para Optimización de Consultas
CREATE INDEX idx_usuario_login ON usuario(credenciales_login);
CREATE INDEX idx_usuario_rol ON usuario(tipo_rol);
CREATE INDEX idx_cronograma_disciplina ON cronograma_entrenamiento(id_disciplina);
CREATE INDEX idx_cronograma_escenario ON cronograma_entrenamiento(id_escenario);
CREATE INDEX idx_inscripcion_deportista ON inscripcion(id_deportista);
CREATE INDEX idx_reporte_escenario ON reporte_veeduria(id_escenario);
CREATE INDEX idx_reporte_estado ON reporte_veeduria(estado_reporte);

DELIMITER $$
CREATE TRIGGER trg_validar_cruce_horarios
BEFORE INSERT ON inscripcion
FOR EACH ROW
BEGIN
    IF EXISTS (
        SELECT 1
        FROM inscripcion i
        JOIN cronograma_entrenamiento c ON c.id_cronograma = i.id_cronograma
        JOIN cronograma_entrenamiento nuevo ON nuevo.id_cronograma = NEW.id_cronograma
        WHERE i.id_deportista = NEW.id_deportista
          AND i.estado_inscripcion = 'CONFIRMADA'
          AND c.fecha_inicio_vigencia <= nuevo.fecha_fin_vigencia
          AND c.fecha_fin_vigencia >= nuevo.fecha_inicio_vigencia
          AND c.hora_inicio < nuevo.hora_fin
          AND c.hora_fin > nuevo.hora_inicio
          AND JSON_OVERLAPS(
              CONCAT('[', REPLACE(JSON_QUOTE(c.dias_semana), ',', '","'), ']'),
              CONCAT('[', REPLACE(JSON_QUOTE(nuevo.dias_semana), ',', '","'), ']')
          )
    ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'RN-01: El deportista ya tiene una inscripcion con cruce de horario.';
    END IF;
END$$
DELIMITER ;

DELIMITER $$
CREATE TRIGGER trg_oficializar_semaforo_cmj
BEFORE INSERT ON historico_estado_semaforo
FOR EACH ROW
BEGIN
    DECLARE estado_previo VARCHAR(20);

    IF NEW.id_reporte_origen IS NULL OR NOT EXISTS (
        SELECT 1
        FROM reporte_veeduria
        WHERE id_reporte = NEW.id_reporte_origen
          AND id_escenario = NEW.id_escenario
          AND estado_reporte = 'VALIDADO'
    ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'RN-03: Se requiere un reporte VALIDADO del mismo escenario.';
    END IF;

    SELECT estado_semaforo INTO estado_previo
    FROM escenario_deportivo
    WHERE id_escenario = NEW.id_escenario
    FOR UPDATE;

    SET NEW.estado_anterior = estado_previo;

    UPDATE escenario_deportivo
    SET estado_semaforo = NEW.estado_nuevo,
        fecha_ultima_actualizacion = NEW.fecha_cambio
    WHERE id_escenario = NEW.id_escenario;
END$$
DELIMITER ;

START TRANSACTION;
-- Insertar Cuentas Principales (Tabla base usuario)
INSERT INTO usuario (id_usuario, numero_identificacion, nombre_completo, correo_electronico, numero_telefono, direccion_residencia, credenciales_login, credenciales_password_hash, tipo_rol) VALUES
('11111111-1111-1111-1111-111111111111', '1090123456', 'Carlos Gomez', 'carlos.gomez@municipio.gov.co', '3101234567', 'Calle 10 # 15-20, Centro', 'admin_carlos', 'HASH_ADMIN', 'ADMINISTRATIVO'),
('22222222-2222-2222-2222-222222222222', '1090987654', 'Maria Rojas', 'maria.rojas@deportes.gov.co', '3129876543', 'Carrera 8 # 22-45, Bolivar', 'profe_maria', 'HASH_TRAINER', 'ENTRENADOR'),
('33333333-3333-3333-3333-333333333333', '1090555444', 'Jorge Martinez', 'jorge.martinez@deportes.gov.co', '3155554444', 'Avenida 4 # 11-08, La Vega', 'profe_jorge', 'HASH_TRAINER2', 'ENTRENADOR'),
('44444444-4444-4444-4444-444444444444', '1098111222', 'Andres Silva', 'andres.silva@email.com', '3181112222', 'Calle 45 # 12-30, San Jose', 'deportista_andres', 'HASH_ATHLETE', 'DEPORTISTA'),
('55555555-5555-5555-5555-555555555555', '1098333444', 'Valentina Mendoza', 'valentina.mendoza@email.com', '3193334444', 'Carrera 14 # 5-18, Los Pinos', 'deportista_vale', 'HASH_ATHLETE2', 'DEPORTISTA'),
('66666666-6666-6666-6666-666666666666', '1090777888', 'Laura Ramirez', 'laura.ramirez@cmj.gov.co', '3177778888', 'Calle 18 # 9-14, Esperanza', 'cmj_laura', 'HASH_CMJ', 'CMJ');

-- Insertar Especialización Administrativo
INSERT INTO administrativo (id_usuario, cargo) VALUES
('11111111-1111-1111-1111-111111111111', 'Director de Deportes y Recreacion');

-- Insertar Especialización Entrenadores
INSERT INTO entrenador (id_usuario, deporte_principal, duracion_entrenamiento_min, permite_multiples_deportes) VALUES
('22222222-2222-2222-2222-222222222222', 'Baloncesto', 90, true),
('33333333-3333-3333-3333-333333333333', 'Futbol', 120, false);

-- Insertar Especialización Deportistas
INSERT INTO deportista (id_usuario, genero, edad) VALUES
('44444444-4444-4444-4444-444444444444', 'Masculino', 20),
('55555555-5555-5555-5555-555555555555', 'Femenino', 22);

-- Insertar Especialización Representante CMJ
INSERT INTO representante_cmj (id_usuario, cargo_cmj) VALUES
('66666666-6666-6666-6666-666666666666', 'Presidenta de la Comision de Veeduria');

-- Insertar Usuarios de la Comunidad (Sin Cuenta)
INSERT INTO usuario_comunidad (id_comunidad, numero_identificacion, nombre_completo, genero, edad, direccion_residencia, correo_electronico) VALUES
('77777777-7777-7777-7777-777777777777', '63541289', 'Pedro Perez', 'Masculino', 54, 'Carrera 5 # 12-04, Prado', 'pedro.perez@comunidad.org'),
('88888888-8888-8888-8888-888888888888', '37895124', 'Ana Bermudez', 'Femenino', 42, 'Calle 30 # 8-12, Alarcon', 'ana.bermudez@comunidad.org');

-- =============================================================================

-- Insertar Disciplinas Deportivas y Culturales
INSERT INTO disciplina (id_disciplina, nombre, categoria, poblacion_objetivo, estado, cupo_maximo) VALUES
('a1111111-1111-1111-1111-111111111111', 'Baloncesto Formativo', 'DEPORTIVA', 'Categoria Abierta', 'ACTIVA', 25),
('a2222222-2222-2222-2222-222222222222', 'Futbol Municipal', 'DEPORTIVA', 'Categoria Abierta', 'ACTIVA', 30),
('a3333333-3333-3333-3333-333333333333', 'Danza Folclorica', 'CULTURAL', 'Todo Publico', 'ACTIVA', 20),
('a4444444-4444-4444-4444-444444444444', 'Teatro Abierto', 'CULTURAL', 'Jovenes y Adultos', 'INACTIVA', 15);

-- Insertar Escenarios Deportivos y Culturales (Semáforo Inicial RN-02)
INSERT INTO escenario_deportivo (id_escenario, nombre, ubicacion, tipo, capacidad_aforo, estado_semaforo, fecha_ultima_actualizacion) VALUES
('b1111111-1111-1111-1111-111111111111', 'Coliseo Cubierto Bicentenario', 'Calle 10 # 20-00, Barrio San Antonio', 'Coliseo Cerrado', 1500, 'VERDE', '2026-11-01 08:00:00'),
('b2222222-2222-2222-2222-222222222222', 'Cancha Sintetica La Libertad', 'Carrera 15 # 45-12, Sector Norte', 'Cancha Abierta', 300, 'AMARILLO', '2026-11-05 10:30:00'),
('b3333333-3333-3333-3333-333333333333', 'Teatro Municipal Manuela Beltran', 'Calle 5 # 8-30, Centro Historico', 'Teatro Auditorio', 450, 'VERDE', '2026-10-15 14:00:00'),
('b4444444-4444-4444-4444-444444444444', 'Polideportivo Comunal Los Pinos', 'Avenida 8 # 33-10, Barrio Los Pinos', 'Polideportivo', 200, 'AMARILLO', '2026-11-10 16:45:00');

-- Relacionar Disciplinas con Entrenadores (Tabla M:N)
INSERT INTO entrenador_disciplina (id_entrenador, id_disciplina) VALUES
('22222222-2222-2222-2222-222222222222', 'a1111111-1111-1111-1111-111111111111'),
('33333333-3333-3333-3333-333333333333', 'a2222222-2222-2222-2222-222222222222');

-- Insertar Cronogramas de Entrenamiento
INSERT INTO cronograma_entrenamiento (id_cronograma, id_disciplina, id_escenario, id_entrenador, dias_semana, hora_inicio, hora_fin, fecha_inicio_vigencia, fecha_fin_vigencia) VALUES
('c1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'LUNES,MIERCOLES,VIERNES', '14:00:00', '15:30:00', '2026-02-01', '2026-11-30'),
('c2222222-2222-2222-2222-222222222222', 'a2222222-2222-2222-2222-222222222222', 'b2222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', 'MARTES,JUEVES', '16:00:00', '18:00:00', '2026-02-01', '2026-11-30'),
('c3333333-3333-3333-3333-333333333333', 'a1111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'SABADO', '08:00:00', '10:00:00', '2026-02-01', '2026-11-30');

-- =============================================================================
INSERT INTO inscripcion (id_inscripcion, id_deportista, id_cronograma, fecha_inscripcion, estado_inscripcion) VALUES
('d1111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 'c1111111-1111-1111-1111-111111111111', '2026-02-05 09:15:00', 'CONFIRMADA'),
('d2222222-2222-2222-2222-222222222222', '44444444-4444-4444-4444-444444444444', 'c2222222-2222-2222-2222-222222222222', '2026-02-06 11:30:00', 'CONFIRMADA'),
('d3333333-3333-3333-3333-333333333333', '55555555-5555-5555-5555-555555555555', 'c3333333-3333-3333-3333-333333333333', '2026-02-07 14:20:00', 'CONFIRMADA');
INSERT INTO reporte_veeduria (id_reporte, id_escenario, tipo_reportante, id_reportante, descripcion_deterioro, evidencia_fotografica_url, estado_reporte, fecha_reporte) VALUES
('e1111111-1111-1111-1111-111111111111', 'b2222222-2222-2222-2222-222222222222', 'DEPORTISTA', '44444444-4444-4444-4444-444444444444', 'Grietas profundas en el cesped sintetico zona norte.', 'foto1.jpg', 'PENDIENTE', '2026-11-02 10:00:00');

INSERT INTO reporte_veeduria (id_reporte, id_escenario, tipo_reportante, id_reportante, descripcion_deterioro, evidencia_fotografica_url, estado_reporte, fecha_reporte, id_revisor_cmj, fecha_revision, observaciones_cmj) VALUES
('e2222222-2222-2222-2222-222222222222', 'b4444444-4444-4444-4444-444444444444', 'COMUNIDAD', '77777777-7777-7777-7777-777777777777', 'Tableros de baloncesto rotos e iluminacion nocturna fuera de servicio.', 'foto2.jpg', 'VALIDADO', '2026-11-08 15:30:00', '66666666-6666-6666-6666-666666666666', '2026-11-09 09:00:00', 'Inspeccion presencial realizada por el CMJ. Se confirma deterioro.');

INSERT INTO reporte_veeduria (id_reporte, id_escenario, tipo_reportante, id_reportante, descripcion_deterioro, evidencia_fotografica_url, estado_reporte, fecha_reporte, id_revisor_cmj, fecha_revision, observaciones_cmj) VALUES
('e3333333-3333-3333-3333-333333333333', 'b1111111-1111-1111-1111-111111111111', 'COMUNIDAD', '88888888-8888-8888-8888-888888888888', 'Basura en graderias tras evento del fin de semana.', NULL, 'RECHAZADO', '2026-11-11 11:15:00', '66666666-6666-6666-6666-666666666666', '2026-11-12 14:00:00', 'Limpieza efectuada. No compromete la estructura.');

INSERT INTO historico_estado_semaforo (id_historico, id_escenario, id_reporte_origen, id_oficializador_cmj, estado_anterior, estado_nuevo, fecha_cambio, observaciones_oficiales) VALUES
('f1111111-1111-1111-1111-111111111111', 'b4444444-4444-4444-4444-444444444444', 'e2222222-2222-2222-2222-222222222222', '66666666-6666-6666-6666-666666666666', 'AMARILLO', 'ROJO', '2026-11-10 16:45:00', 'Cambio oficializado a ROJO por riesgo de falla en aros e iluminacion deficiente.');
COMMIT;

-- RF-REP-01: Lista de Entrenadores Registrados
CREATE OR REPLACE VIEW vista_reporte_entrenadores AS
SELECT 
    u.numero_identificacion,
    u.nombre_completo,
    u.correo_electronico,
    u.numero_telefono,
    e.deporte_principal,
    e.duracion_entrenamiento_min,
    e.permite_multiples_deportes
FROM usuario u
JOIN entrenador e ON u.id_usuario = e.id_usuario
WHERE u.tipo_rol = 'ENTRENADOR';

-- RF-REP-02: Deportistas Registrados Agrupados por Disciplina
CREATE OR REPLACE VIEW vista_deportistas_por_disciplina AS
SELECT 
    d.nombre AS disciplina,
    d.categoria,
    u.numero_identificacion,
    u.nombre_completo AS deportista,
    dep.genero,
    dep.edad,
    i.fecha_inscripcion
FROM inscripcion i
JOIN deportista dep ON i.id_deportista = dep.id_usuario
JOIN usuario u ON dep.id_usuario = u.id_usuario
JOIN cronograma_entrenamiento c ON i.id_cronograma = c.id_cronograma
JOIN disciplina d ON c.id_disciplina = d.id_disciplina
WHERE i.estado_inscripcion = 'CONFIRMADA';

-- RF-REP-03: Escenarios Clasificados según Estado del Semáforo
CREATE OR REPLACE VIEW vista_escenarios_por_semaforo AS
SELECT 
    id_escenario,
    nombre,
    ubicacion,
    tipo,
    capacidad_aforo,
    estado_semaforo,
    fecha_ultima_actualizacion
FROM escenario_deportivo
ORDER BY 
    CASE estado_semaforo
        WHEN 'ROJO' THEN 1
        WHEN 'AMARILLO' THEN 2
        WHEN 'VERDE' THEN 3
    END;

-- RF-REP-04: Disciplinas Activas Clasificadas por Categoría
CREATE OR REPLACE VIEW vista_disciplinas_activas_categoria AS
SELECT 
    categoria,
    id_disciplina,
    nombre,
    poblacion_objetivo,
    cupo_maximo,
    estado
FROM disciplina
WHERE estado = 'ACTIVA';

-- RF-REP-05: Cronograma Consolidado por Escenario, Entrenador o Disciplina
CREATE OR REPLACE VIEW vista_cronograma_consolidado AS
SELECT 
    c.id_cronograma,
    d.nombre AS disciplina,
    d.categoria,
    e.nombre AS escenario,
    e.estado_semaforo,
    u.nombre_completo AS entrenador_responsable,
    c.dias_semana,
    c.hora_inicio,
    c.hora_fin,
    c.fecha_inicio_vigencia,
    c.fecha_fin_vigencia
FROM cronograma_entrenamiento c
JOIN disciplina d ON c.id_disciplina = d.id_disciplina
JOIN escenario_deportivo e ON c.id_escenario = e.id_escenario
JOIN usuario u ON c.id_entrenador = u.id_usuario;

-- RF-REP-06: Histórico de Veedurías por Escenario con Detalle de Validación CMJ
CREATE OR REPLACE VIEW vista_historico_veedurias_cmj AS
SELECT 
    esc.nombre AS escenario,
    r.id_reporte,
    r.tipo_reportante,
    r.descripcion_deterioro,
    r.estado_reporte,
    r.fecha_reporte,
    u_cmj.nombre_completo AS consejero_cmj_validador,
    r.fecha_revision,
    r.observaciones_cmj,
    h.estado_anterior,
    h.estado_nuevo AS estado_semaforo_resultante,
    h.fecha_cambio AS fecha_oficializacion
FROM reporte_veeduria r
JOIN escenario_deportivo esc ON r.id_escenario = esc.id_escenario
LEFT JOIN usuario u_cmj ON r.id_revisor_cmj = u_cmj.id_usuario
LEFT JOIN historico_estado_semaforo h ON r.id_reporte = h.id_reporte_origen;

-- RF-REP-07: Ranking de Disciplinas con Mayor Demanda / Participación
CREATE OR REPLACE VIEW vista_ranking_demanda_disciplinas AS
SELECT 
    d.id_disciplina,
    d.nombre AS disciplina,
    d.categoria,
    d.cupo_maximo,
    COUNT(i.id_inscripcion) AS total_inscritos,
    (d.cupo_maximo - CAST(COUNT(i.id_inscripcion) AS SIGNED)) AS cupos_disponibles,
    ROUND((COUNT(i.id_inscripcion) / d.cupo_maximo) * 100, 2) AS porcentaje_ocupacion
FROM disciplina d
LEFT JOIN cronograma_entrenamiento c ON d.id_disciplina = c.id_disciplina
LEFT JOIN inscripcion i ON c.id_cronograma = i.id_cronograma AND i.estado_inscripcion = 'CONFIRMADA'
GROUP BY d.id_disciplina, d.nombre, d.categoria, d.cupo_maximo
ORDER BY total_inscritos DESC;


