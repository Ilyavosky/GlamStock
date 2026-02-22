# GLAMSTOCK

Sistema de gestión de inventario para empresas del secotro retail y accesorios de lujo. Permite administrar productos, variantes, stock por sucursal, ventas y reportes desde una interfaz web moderna.

---

## Tecnologías

- **Frontend / Backend:** Next.js 16 (App Router, TypeScript)
- **Base de datos:** PostgreSQL 16
- **Contenedores:** Docker + Docker Compose
- **Autenticación:** JWT via Cookie HttpOnly
- **ORM:** `pg` (driver nativo de PostgreSQL)

---

## Requisitos previos

Antes de comenzar asegúrate de tener instalado:

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (incluye Docker Compose)
- [Git](https://git-scm.com/)
- [Node.js 20+](https://nodejs.org/) *(solo para desarrollo local, no necesario para Docker)*

---

## Estructura del proyecto

```
glamstock-project/
├── db/
│   ├── 01_schema.sql        # Definición de tablas y triggers
│   ├── 02_index.sql         # Índices de optimización
│   ├── 03_seed.sql          # Datos iniciales (sucursales, productos, etc.)
│   └── init-seed.sh         # Script de inicialización del seed
├── glamstock/               # Proyecto Next.js
│   ├── src/
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
└── .env                     
```

---

## Configuración inicial

### 1. Clonar el repositorio

```bash
git clone https://github.com/Ilyavosky/GlamStock.git
cd glamstock-project
```

### 2. Crear el archivo `.env` en la raíz del proyecto y en el proyecto de Next.js

### 3. (Solo Windows) Verificar saltos de línea del script de seed por incompatibilidad

```bash
sed -i 's/\r//' db/init-seed.sh
```

## Levantar el proyecto con Docker

### Primera vez (o al cambiar el schema de la base de datos)

```bash
docker compose down -v
docker compose up --build
```

### Inicios posteriores

```bash
docker compose up -d
```

### Verificar que todo está corriendo

```bash
docker compose ps
```

Deberías ver dos contenedores en estado `healthy` / `running`:

| Contenedor | Puerto | Descripción |
|---|---|---|
| `glamstock-postgres` | 5432 | Base de datos PostgreSQL |
| `glamstock-nextjs` | 3000 | Aplicación web |

---

## Acceder a la aplicación

Una vez levantados los contenedores, abre en tu navegador:

```
http://localhost:3000
```

Ingresa con las credenciales que definiste en el `.env`:

## Comandos útiles

### Ver logs en tiempo real

```bash
# Todos los contenedores
docker compose logs -f

# Solo la aplicación Next.js
docker compose logs -f nextjs

# Solo la base de datos
docker compose logs -f postgres
```

### Detener los contenedores

```bash
# Detener sin eliminar datos
docker compose down

# Detener y eliminar todos los datos (reinicio completo)
docker compose down -v
```

### Reiniciar solo un servicio

```bash
docker compose restart nextjs
```

### Acceder a la base de datos directamente

```bash
docker exec -it glamstock-postgres psql -U $POSTGRES_USER -d $POSTGRES_DB
```

---

## Datos de prueba

Al iniciar el proyecto por primera vez, el seed carga automáticamente:

- 4 sucursales (Tienda Centro, Bodega Principal, Tienda Plaza, Tienda Terán)
- 15 productos maestros con ~42 variantes (bolsas, carteras, mochilas, etc.)
- Inventario distribuido en todas las sucursales
- Historial de ventas de los últimos 30 días para visualizar el dashboard
- 2 usuarios: uno ADMIN (definido en `.env`) y uno GERENTE de ejemplo

---

## Módulos del sistema

| Módulo | Descripción |
|---|---|
| **Dashboard** | Resumen general: productos, variantes, valor del inventario y ventas por sucursal |
| **Inventario** | Vista y gestión de todos los productos y sus variantes |
| **Sucursales** | Stock detallado por cada sucursal |
| **Ventas** | Registro de transacciones y filtros por fecha y sucursal |

---

## Roles de usuario

| Rol | Acceso |
|---|---|
| `ADMIN` | Acceso completo al sistema |
| `GERENTE` | Acceso a vistas y registro de ventas |

---

## Solución de problemas comunes

**El contenedor de Postgres no pasa a `healthy`**
Revisa los logs con `docker compose logs -f postgres`. Generalmente es un error en el `.env` o un problema de permisos en el script de seed.

**Error `/bin/bash^M: bad interpreter`**
Estás en Windows y el script de seed tiene saltos de línea incorrectos. Ejecuta:
```bash
sed -i 's/\r//' db/init-seed.sh
```

**La aplicación no conecta a la base de datos**
Verifica que `DATABASE_URL` en el `docker-compose.yml` use el nombre del servicio `postgres` (no `localhost`) como host. Esto ya está configurado por defecto.

**Quiero reiniciar la base de datos desde cero**
```bash
docker compose down -v
docker compose up --build
```

---

## Seguridad

- Las contraseñas se almacenan con hash `bcrypt` (10 rondas).
- La autenticación usa tokens JWT almacenados en cookies `HttpOnly`.
- El archivo `.env` nunca debe subirse al repositorio. Está incluido en `.gitignore`.
- Para producción, genera un `JWT_SECRET` seguro con `openssl rand -base64 32`.
