# Sistema Inmobiliario

Aplicación de gestión inmobiliaria (Next.js 16 App Router + Prisma 7 + PostgreSQL) para administrar inmuebles, contratos, clientes, pagos, averías, mantenimiento y notificaciones.

## Requisitos

- Node.js 20+
- PostgreSQL 15+
- npm

## Puesta en marcha

```bash
npm install
cp .env.example .env   # o edita .env con tus valores
npx prisma migrate deploy
npm run db:seed        # datos de ejemplo + usuario administrador
npm run dev
```

Acceso inicial (seed): `admin@tuinmobiliaria.com` / `admin123` (cambia `SEED_ADMIN_PASSWORD`).

## Scripts

| Comando | Descripción |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Genera Prisma Client y compila |
| `npm start` | Servidor de producción |
| `npm run lint` | ESLint |
| `npm test` | Pruebas unitarias (Vitest) |
| `npm run db:migrate` | Crea/aplica migraciones en desarrollo |
| `npm run db:seed` | Reejecuta el seed |
| `npm run db:studio` | Prisma Studio |

## Autenticación y roles

- Autenticación por credenciales con NextAuth (`src/lib/auth.ts`).
- Sesión JWT; el `middleware.ts` protege `/dashboard/**` y `/api/**` (excepto `/api/auth` y `/api/cron`).
- Roles: `ADMIN`, `AGENT`, `ASSISTANT`, `ACCOUNTANT`, `MAINTENANCE`.
- La gestión de usuarios (`/dashboard/usuarios`) y las operaciones de alta/edición/baja de usuarios están restringidas a `ADMIN`.

## Archivos

El almacenamiento es configurable mediante `STORAGE_DRIVER`:

- `local` (por defecto): guarda en `UPLOAD_ROOT` o `./storage`.
- `supabase`: usa Supabase Storage con `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` (bucket `SUPABASE_STORAGE_BUCKET`).

Las descargas pasan por rutas autenticadas (`/api/properties/[id]/media/[filename]`, `/api/clients/[id]/media/[filename]`).

## Alertas y correo

- `GET /api/cron/alerts` genera notificaciones de vencimiento. Requiere `Authorization: Bearer $CRON_SECRET` cuando `CRON_SECRET` está definido. Programado en `vercel.json`.
- El envío de cartas por correo (`POST /api/notices/[id]/send`) requiere configurar `SMTP_HOST`, `SMTP_FROM` y, si aplica, `SMTP_USER` / `SMTP_PASSWORD`.

## Variables de entorno

Ver `.env` / `.env.example`. Claves principales: `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `CRON_SECRET`, `AGENCY_NAME`, `STORAGE_DRIVER`, `UPLOAD_ROOT`, `SUPABASE_*`, `SMTP_*`, `SEED_ADMIN_PASSWORD`.

## Estructura

```
prisma/            schema, migraciones y seed
src/app/dashboard/ páginas de la aplicación
src/app/api/       endpoints REST
src/lib/           lógica de dominio (audit, storage, mailer, account-statement, task-schedule)
src/components/    UI y paneles
```
