BEGIN;

INSERT INTO sucursales (nombre_lugar, ubicacion, activo) VALUES
('Tienda Centro', 'Av. Central 123, Tuxtla', TRUE),
('Bodega Principal', 'Libramiento Sur, Bodega 4', TRUE)
ON CONFLICT (nombre_lugar) DO NOTHING;

INSERT INTO motivos_transaccion (descripcion) VALUES
('Venta directa al cliente'),
('Baja por merma / daño'),
('Ajuste de inventario (Sobrante)'),
('Ajuste de inventario (Faltante)')
ON CONFLICT (descripcion) DO NOTHING;


-- Usamos pgcrypto: crypt(texto_plano, gen_salt('bf')) donde 'bf' es bcrypt.
INSERT INTO usuarios (nombre, email, password_hash, rol, activo) VALUES
(
  'Arturo', 
  :'admin_email', 
  crypt(:'admin_password', gen_salt('bf')), 
  'ADMIN', 
  TRUE
)
ON CONFLICT (email) DO NOTHING;

COMMIT;