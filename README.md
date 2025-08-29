# choiz-tecnica
## Instrucciones de instalación

El repositorio se encuentra publicado en GitHub en https://github.com/cgarros33/choiz-tecnica. Para tenerlo en funcionamiento de manera local se deberán ejecutar los siguientes comandos.
```
git clone https://github.com/cgarros33/choiz-tecnica.git
cd choiz-tecnica
npm install
npm run dev
```
La base de datos y el sistema de autenticación utilizan Supabase, para lo cual se deberá rellenar el .env con las credenciales que se muestran en .env-example. A saber:

```
NEXT_PUBLIC_SUPABASE_URL=<URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<ANON KEY>
SUPABASE_SERVICE_ROLE_KEY=<ADMIN KEY>
```
Una vez en ejecución el proyecto, los endpoints de la api se encuentran en /api, y se detalla la especificación en /swagger. El dashboard de información de usuario se encuentra en el home, mientras que el historial médico está en /history. 

El esquema de base de datos utilizado es el siguiente:

```
create table public.rol (
  rol character varying not null,
  constraint rol_pkey primary key (rol)
) TABLESPACE pg_default;

create table public.usuario (
  email character varying not null,
  nombre character varying not null,
  apellido character varying not null,
  id_usuario uuid not null,
  rol character varying not null default 'USER'::character varying,
  fecha_nacimiento date not null,
  direccion character varying not null,
  doctor_id uuid null,
  constraint usuario_pkey primary key (id_usuario),
  constraint app_user_email_key unique (email),
  constraint usuario_medico_asignado_fkey foreign KEY (doctor_id) references usuario (id_usuario),
  constraint usuario_rol_fkey foreign KEY (rol) references rol (rol) on delete RESTRICT
) TABLESPACE pg_default;

create table public.preguntas (
  pregunta character varying not null,
  value character varying null,
  pregunta_id uuid not null default gen_random_uuid (),
  id_usuario uuid not null,
  constraint preguntas_pkey primary key (pregunta_id),
  constraint preguntas_id_usuario_fkey foreign KEY (id_usuario) references usuario (id_usuario) on delete CASCADE
) TABLESPACE pg_default;
```
