# 🔗 Otrelink

Clon modular de Linktree: un dashboard para crear páginas de links súper personalizables y una página pública ligera en JavaScript vanilla.

```
otrelink/
├── packages/core/     ← TODO lo modular vive aquí (bloques, temas, paletas, fondos, botones, fuentes, redes, plantillas, planes…)
├── packages/mcp/      ← Herramientas MCP (las sirve apps/web en /api/mcp): un asistente de IA crea y edita páginas con un API token
├── apps/web/          ← Next.js: API + dashboard + docs (/docs)
├── apps/page/         ← Página pública (vanilla JS + Vite), publicada en Cloudflare Pages
└── functions/         ← Cloudflare Pages Functions de la página pública (vista previa al compartir, archivos de R2, manifest)

../Otrelink-Admin/     ← Dashboard de administración (repo aparte)
```

El dashboard (vista previa en vivo) y la página pública usan **el mismo renderer** de `@otrelink/core`, así que lo que ves en el editor es exactamente lo que ven tus visitantes.

---

## 🚀 Puesta en marcha

Requisitos: **Node.js 22**.

```bash
npm install
cp apps/web/.env.example apps/web/.env     # en Windows: copy apps\web\.env.example apps\web\.env
npm run dev
```

- Dashboard + API → http://localhost:3000
- Página pública → http://localhost:5173/tu-usuario

**Base de datos:** si `MONGODB_URI` está vacío, se usa automáticamente un archivo JSON local (`apps/web/data/`) — ideal para desarrollar sin instalar nada. Con `MONGODB_URI` se usa MongoDB.

| Comando | Qué hace |
|---|---|
| `npm run dev` | Levanta dashboard y página pública a la vez |
| `npm run build` | Compila ambas apps |
| `npm test` | Pruebas del núcleo (renderiza todos los bloques/temas/fondos/plantillas, XSS, planes, paletas…) y del servidor MCP |

### Variables de entorno

`apps/web/.env` (ver `.env.example`)

| Variable | Descripción |
|---|---|
| `DB_DRIVER` | `mongo` o `file` (vacío = automático) |
| `MONGODB_URI` / `MONGODB_DB` | Conexión a MongoDB |
| `JWT_SECRET` | Secreto para las sesiones (obligatorio en producción) |
| `NEXT_PUBLIC_PAGE_URL` | URL donde se sirve la página pública |
| `APP_URL` | URL pública de esta app (detrás de un proxy; se usa en enlaces de archivos subidos y en la pantalla API) |
| `PUBLIC_CORS_ORIGINS` | Orígenes que pueden llamar a la API pública (`*` o lista separada por comas) |
| `ADMIN_API_KEY` | Clave de 24+ caracteres para Otrelink-Admin (vacío = API de admin apagada) |
| `VAPID_*` · `CRON_SECRET` · `RESEND_API_KEY` · `EMAIL_FROM` | Push, cron y correos → ver **Agenda y reservas** |
| `STRIPE_*` · `PAYPAL_*` · `BUSINESS_CONTACT_EMAIL` | Pagos → ver **Planes y pagos** |
| `R2_ACCOUNT_ID` · `R2_ACCESS_KEY_ID` · `R2_SECRET_ACCESS_KEY` · `R2_BUCKET` · `MEDIA_URL` | Archivos subidos en Cloudflare R2 → ver **Archivos (Cloudflare R2)**. Vacías = se guardan en la base de datos |
| `LEGAL_ENTITY_NAME` · `LEGAL_ADDRESS` · `LEGAL_CONTACT_EMAIL` · `LEGAL_DMCA_EMAIL` | Quién opera el servicio en Términos y Privacidad; `LEGAL_CONTACT_EMAIL` también recibe las denuncias de páginas → ver **Legal y moderación** |
| `BILLING_COMPANY_NAME` · `BILLING_COMPANY_DETAILS` | Tu empresa en las facturas PDF de suscripción (detalles en varias líneas con `\n`) |
| `BILLING_INVOICE_PREFIX` · `BILLING_INVOICE_FOOTER` | Prefijo del número (p. ej. `OTR-`) y pie de esas facturas |
| `STRIPE_API_BASE` · `PAYPAL_API_BASE` | Solo para pruebas: apuntar Stripe/PayPal a un servidor simulado (no definir en producción) |

`apps/page/.env` (en producción: variables del proyecto de Cloudflare Pages)

| Variable | Descripción |
|---|---|
| `VITE_API_URL` | URL de la app Next.js (obligatoria para el build; las Functions también la usan) |
| `VITE_HOME_URL` | A dónde lleva el botón “Create your own Otrelink” del pie |
| `VITE_BASE` | Sub-ruta donde se sirve. Vacía = `/` (Cloudflare Pages o dominio propio); `/otrelink/` en GitHub Pages |

En Cloudflare Pages además: `NODE_VERSION=22` y el binding R2 **`MEDIA`** (ver **Despliegue**).

---

## 🧩 Sistema modular

Todo lo personalizable es un **registro**: una lista de módulos. Para **agregar** algo, creas el módulo y lo añades a la lista. Para **quitarlo**, lo borras de la lista. No hay que tocar el dashboard, la API ni la página pública: los formularios, la validación y el render salen de la declaración del módulo.

| Qué | Dónde | Notas |
|---|---|---|
| Tipos de bloque | `packages/core/src/blocks/` → `index.js` | 31 bloques: link, copy, collection, header, text, image, banner, gallery, pdf, video, embed, html, code, music, map, contact, catalog, events, status, location, route, loyalty, booking, survey, reviews, notify, vcard, faq, countdown, divider, share |
| Fondos (wallpapers) | `packages/core/src/wallpapers/` → `index.js` | solid, gradient, image, pattern, aurora, grain, video |
| Estilos de botón y hover | `packages/core/src/buttons/index.js` | 16 estilos (fill, outline, glass, neon, 3d, cel, pop, punk, sticker…) y 12 efectos de hover |
| Temas | `packages/core/src/themes.js` | 24 presets que combinan todo lo anterior |
| Paletas de color | `packages/core/src/palettes.js` | 20 paletas (claras y oscuras) que recolorean sin cambiar fuentes ni formas |
| Plantillas | `packages/core/src/templates-v1.js` · `templates.js` | 24 páginas listas (restaurante, food truck, tarjeta de presentación…) en dos versiones: **Classic** (por defecto, ids `<id>-v1`) y **v2 · Experimental** (rediseño para móvil, ids sin sufijo). `family` une las dos versiones de cada plantilla |
| Fuentes | `packages/core/src/fonts.js` | 39 Google Fonts |
| Redes sociales | `packages/core/src/socials.js` | 39 plataformas (iconos de simple-icons) |
| Animaciones | `packages/core/src/animations.js` | 14 de atención (por bloque), 14 de entrada (página o bloque) y 5 movimientos de fondo |
| Planes | `packages/core/src/plans.js` | Qué incluye cada plan (`PLAN_FEATURES`, `PLANS`) |
| Opciones del panel Style | `packages/core/src/design.js` | Grupos de campos → tarjetas automáticas en el dashboard |
| Tipos de campo | `packages/core/src/fields.js` + `apps/web/components/fields/index.js` | text, url, color, image, list, font, date, geoPoint… |
| Secciones del dashboard | `apps/web/sections/index.js` | Links, Profile, Today, Templates, Theme, Wallpaper, Style, Orders, Invoices, Agenda, Reviews, Loyalty, Responses, Notifications, Analytics, Settings |
| Base de datos | `apps/web/lib/db/` | Drivers `mongo` y `file`; agrega el tuyo con la misma interfaz. Con R2 configurado, `with-r2.js` envuelve el driver para guardar los archivos en Cloudflare |

### Ejemplo: crear un tipo de bloque nuevo

`packages/core/src/blocks/quote.js`

```js
import { esc } from '../util/html.js';

export default {
  type: 'quote',                       // id guardado en la base de datos
  label: 'Quote',
  description: 'A highlighted quote.',
  icon: 'text',                        // ver icons.js
  category: 'Content',                 // agrupa en el modal "Add block"
  fields: [                            // → formulario + validación automáticos
    { key: 'text', type: 'textarea', label: 'Quote', required: true },
    { key: 'author', type: 'text', label: 'Author' },
  ],
  summary: (d) => d.author,            // línea secundaria en el dashboard
  render: (d) => `<blockquote class="ol-card ol-quote">“${esc(d.text)}”<cite>${esc(d.author)}</cite></blockquote>`,
  css: `.ol-root .ol-quote{font-style:italic}.ol-root .ol-quote cite{display:block;margin-top:8px;opacity:.7}`,
  // hydrate(el, data) { … }           // opcional: comportamiento en el navegador
};
```

Y en `packages/core/src/blocks/index.js`:

```js
import quote from './quote.js';
export const blockTypes = createRegistry('blockTypes', [link, header, /* … */ quote], 'type');
```

Listo: aparece en el modal “Add block”, tiene su formulario, se valida en la API y se renderiza en la vista previa y en la página pública.

> **Seguridad:** el renderer construye HTML como texto. Todo valor que venga del usuario debe pasar por `esc()` o `safeUrl()`.

Si quitas un tipo de bloque del registro, los bloques existentes de ese tipo **no se borran**: se ocultan en la página pública y el dashboard los marca como “not installed”. Si vuelves a agregar el módulo, reaparecen.

### Ejemplo: nueva opción de estilo

En `packages/core/src/design.js` agrega un campo a un grupo y úsalo en `designCss()`:

```js
{ key: 'letterSpacing', type: 'range', label: 'Letter spacing', min: 0, max: 4, default: 0, unit: 'px' },
// …
+ `--ol-letter-spacing:${d.letterSpacing}px;`
```

El control aparece solo en el panel Style.

---

## ✨ Funcionalidades

- **Editor** con vista previa en vivo, deshacer/rehacer (`Ctrl+Z`, `Ctrl+Shift+Z`), guardar con `Ctrl+S` y aviso de cambios sin guardar.
- **Bloques** que se arrastran para reordenar, se activan o desactivan, se duplican, se agrupan en colecciones y se pueden programar (mostrar desde / ocultar después). Cada uno puede llevar su propio estilo, animación de atención y animación de entrada.
- **Plantillas**: 24 páginas listas con vista previa, en versión **Classic** (por defecto) y **v2 · Experimental**; se cambia de versión con el selector de la galería o desde la vista previa de cada plantilla.
- **Perfil**: avatar (subida con redimensionado automático), insignia de verificado y 39 redes sociales que también se arrastran para reordenar.
- **Personalización**: 24 temas, 20 paletas de color (y paletas propias guardadas en la cuenta), 7 tipos de fondo, 16 estilos de botón, 12 efectos de hover, 39 fuentes, color de acento, colores con transparencia, 3 layouts de cabecera, formas de avatar, CSS personalizado y aviso cuando el texto no se lee bien sobre el fondo.
- **Movimiento**: 14 animaciones de entrada (con velocidad, retraso entre bloques y opción de animar al hacer scroll), 14 animaciones de atención, 5 movimientos de fondo (incluido parallax) y efecto al tocar los botones. Respeta “reducir movimiento” del sistema.
- **Contenido**: catálogo de productos, calendario de eventos (banners, carrusel, grilla o mes), mapas con estilos, bloque de código con resaltado, bloque HTML (Pro), PDF, galerías, FAQ, cuenta regresiva, vCard y más.
- **Negocio de comida**: estado abierto/cerrado, ruta semanal, “dónde estamos hoy” (pestaña *Today*), menú con categorías, pedidos para recoger con seguimiento y tarjetas de fidelidad con QR.
- **Facturas**: el dueño crea facturas para sus clientes y las descarga en PDF; las suscripciones a Otrelink también generan su factura.
- **Ajustes**: cambiar el usuario (comprueba disponibilidad), SEO y Open Graph, menú de navegación para páginas largas, segundo idioma ES/EN escrito por el dueño (cada bloque tiene su sección *Translation*; el visitante cambia con el botón ES/EN, sin Google), ocultar el botón de Otrelink del pie, aparecer en **Explore**, bloquear selección y clic derecho, aviso de contenido sensible, página privada, código QR, y exportar (sitio estático) o importar en JSON.
- **Pie de página** (como Linktree): botón “Create your own Otrelink”, **Cookies · Report · Privacy** (siempre enlazan a la app) y **Explore · About this account**, en inglés o español. Ver **Pie de página y Explore**.
- **Vista previa al compartir**: cada página tiene su título, descripción e imagen en WhatsApp, X, Facebook, LinkedIn… (Cloudflare Pages Function, ver **Despliegue**).
- **Notificaciones push a visitantes** (plan Business): botón, enlace o QR para suscribirse; mensajes ahora o programados. Ver **Notificaciones push a visitantes**.
- **Analíticas**: visitas, visitantes únicos, clics, CTR, gráfico diario, bloques y redes más clicados, referrers, dispositivos, países, ciudades y horas/días con más visitas.
- **API tokens y MCP** (plan Business): scripts y asistentes de IA pueden crear y editar páginas.
- **Legal**: Términos, Privacidad, Cookies y Reembolsos; aceptación obligatoria al registrarse, guardada en la base de datos y renovada cuando cambia una versión. Ver **Legal y moderación**.
- **Cuenta** (`/dashboard/account`, menú con las iniciales arriba a la derecha): plan y facturación, nombre, cambio de correo (con enlace de confirmación a la nueva dirección), contraseña (cierra las otras sesiones), cerrar sesión en otros dispositivos y eliminar la cuenta (cancela la suscripción).
- **Referidos**: cada cuenta tiene su link de invitación; el admin crea campañas con fechas y recompensa (ver **Referidos**).
- **Varias páginas** por cuenta según el plan (Free 1, Pro 10, Business lo que asigne el admin).
- **Docs** para usuarios en `/docs` (bloques, CSS personalizado con variables y clases, planes, API…).

## 📱 PWA (dashboard instalable)

El dashboard se puede instalar como app (Chrome/Edge en escritorio y Android; en iOS: Compartir → “Añadir a pantalla de inicio”).

- `app/manifest.js` → nombre, colores, íconos y atajos (`/manifest.webmanifest`)
- `public/sw.js` → service worker: cachea JS/CSS/fuentes/íconos e imágenes subidas; las páginas y la API siempre van a la red; sin conexión muestra `/offline`
- `components/Pwa.js` → registro del worker y botón **Install app** (aparece en “Your pages” cuando el navegador lo permite)
- `public/icons/` → íconos (normal, maskable y Apple)

El service worker **solo se registra en producción** (`npm run build && npm start`), para no interferir con la recarga en caliente de `npm run dev`. Requiere HTTPS en producción (localhost está permitido). Si cambias `sw.js`, sube `VERSION` para que los clientes descarten la caché vieja.

## 📅 Agenda y reservas

Bloque **Booking** + sección **Agenda** del dashboard: servicios, horario semanal en una zona horaria IANA, confirmación automática o manual, recordatorios, notificaciones push (PWA), feed de calendario `.ics` y correos opcionales al visitante.

Variables de entorno (en `apps/web`):

| Variable | Para qué |
|---|---|
| `VAPID_PUBLIC_KEY` · `VAPID_PRIVATE_KEY` | Notificaciones push. Generar con `npx web-push generate-vapid-keys` |
| `VAPID_SUBJECT` | `mailto:tu@correo.com` |
| `CRON_SECRET` | Clave larga aleatoria que protege `/api/cron/reminders` |
| `RESEND_API_KEY` · `EMAIL_FROM` | Opcional: correos al visitante vía [Resend](https://resend.com) |

**Cron con cron-job.org:** crea un job que llame **cada minuto** a `https://TU-APP/api/cron/reminders` (GET) con la cabecera `Authorization: Bearer <CRON_SECRET>` (o `?key=<CRON_SECRET>`). Envía los recordatorios de reservas y las **notificaciones push programadas** (cada 5 min funciona, pero salen hasta 5 min tarde). Responde `{ ok, checked, reminded, downgraded, trialsEnded, broadcasts }`. En Render gratis, además mantiene el servicio despierto.

Notas: las reservas se guardan en UTC y un índice único (`slotKey`) evita reservas dobles. Push solo funciona en el build de producción (el service worker no se registra en `dev`); en iOS hay que instalar la app en la pantalla de inicio (16.4+).

## 📝 Encuestas

Bloque **Survey** (categoría Contact): un botón que despliega un formulario con tus preguntas. Tipos de respuesta: texto corto, párrafo, una opción, varias opciones (checkboxes), desplegable, estrellas 1–5, escala 0–10, sí/no, email, número y fecha. Cada pregunta puede ser obligatoria.

- Las respuestas se validan en el servidor contra las preguntas actuales y se guardan en la colección `survey_responses` (con el texto de la pregunta, así no se pierden si la editas).
- Sección **Responses** del dashboard: resumen por pregunta (barras, promedio, últimas respuestas), respuestas individuales, **Download CSV** y borrar.
- Notificación push al dueño en cada respuesta (opción del bloque). Opción “una respuesta por dispositivo” (localStorage).
- En la vista previa y en sitios exportados no se puede enviar: el bloque enlaza a la página en vivo.

## ⭐ Reseñas

Bloque **Reviews** (categoría Contact): el botón muestra el promedio (★ 4.8 · 23 reviews). Al abrirlo se ven el resumen por estrellas, las reseñas publicadas (con “Show more”) y el botón **Write a review** (1–5 estrellas, comentario y nombre opcional).

- Moderación: publicar al instante o aprobar cada una. Desde la sección **Reviews** del dashboard: aprobar, ocultar, borrar y **responder** (la respuesta se ve en la página).
- Badge con reseñas por aprobar y notificación push en cada reseña nueva.
- Colección `reviews`; las ocultas y pendientes no cuentan en el promedio. Rate limit de 10 reseñas/hora por IP + honeypot.

## 🔔 Notificaciones push a visitantes (plan Business)

Bloque **Notifications** (categoría Contact) + sección **Notifications** del dashboard.

- **Suscripción**: el visitante toca el botón, abre el **enlace** `tu-página?subscribe` o escanea el **QR** (`?subscribe=qr`, descargable en PNG/SVG). Acepta las condiciones (casilla obligatoria, guardada con fecha y versión `NOTIFY_CONSENT_VERSION`), elige temas (hasta 6) y da permiso al navegador. En iPhone se le explica que primero debe añadir la página a la pantalla de inicio (iOS 16.4+; manifest por página en `functions/manifest/[slug].js`).
- **Mensajes**: plantillas (descuento, evento, novedad…), título, texto, imagen, enlace, 2 botones de acción, versión en español, `{page}` = nombre de la página, envío de prueba a tus dispositivos. **Enviar ahora** o **programar**: una vez o cada día/semana/mes en tu zona horaria, hasta una fecha; se pueden editar y cancelar.
- **Estadísticas**: suscriptores por tema, origen (botón/enlace/QR) e idioma; por envío: alcanzados, enviados, fallidos, dados de baja y clics.
- Límites: 10 envíos al día por página, título 60 y texto 180 caracteres. Los dispositivos que se dan de baja (404/410) se borran solos.
- Código: reglas en `packages/core/src/notify.js`; envío en `apps/web/lib/broadcast.js` (lotes con VAPID web push); hoja de suscripción en `apps/page/src/notify.js`; service worker `apps/page/public/sw.js`. Colecciones `notify_subscribers` y `notify_broadcasts`.
- Requiere `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` y el cron cada minuto (ver **Agenda y reservas**). Sin claves VAPID el bloque no se muestra.
- Feature `notifications` solo en Business; el admin la puede apagar por usuario.

## 🧭 Pie de página y Explore

Lo dibuja `renderFooter()` en `packages/core/src/render.js`; las hojas viven en `apps/page/src/footer.js`.

- **Create your own Otrelink** → `VITE_HOME_URL`.
- **Cookies · Report · Privacy**: Cookies y Privacy apuntan siempre a la app (`legalUrl` = `VITE_API_URL`). **Report** abre un formulario (9 motivos, comentario y correo opcional) → `POST /api/public/report`: se guarda en `page_reports` y se avisa por correo a `LEGAL_CONTACT_EMAIL` (si hay Resend). Máximo 5 por hora por conexión.
- **Explore**: las **10 páginas más visitadas** de los últimos 30 días **que activaron** *Settings → Show my page in Explore* (apagado por defecto). Nunca salen páginas sensibles, sin publicar ni de cuentas baneadas o sin confirmar. Se recalcula cada 10 min (`GET /api/public/explore`).
- **About this account**: foto, nombre, @, insignia de verificado y “En Otrelink desde <mes año>”.
- *Hide the Otrelink button* (Settings) oculta el botón y Explore; Cookies, Report y Privacy se quedan siempre. En los sitios exportados solo quedan los enlaces.

## ⚖️ Legal y moderación

- Páginas `/terms`, `/privacy`, `/cookies` y `/refunds` en la app (`apps/web/app/…`); versiones en `apps/web/lib/legal.js` (`LEGAL_VERSIONS`). Al registrarse hay que aceptar Términos y Privacidad (dos casillas); cada aceptación se guarda en `consents` (versión, fecha, IP) y se conserva aunque se borre la cuenta. Si cambia una versión, el dashboard pide aceptar de nuevo (`POST /api/legal/accept`).
- La página pública no guarda el ID de visitante ni consulta la geolocalización para visitantes de la UE/Reino Unido/Suiza o con **Global Privacy Control** (`apps/page/src/geo.js`).
- **Denuncias**: los visitantes denuncian desde el pie de cada página; el admin las revisa en **Otrelink-Admin → Reports**: descartar, marcar resuelta, **quitar la página** (la despublica y resuelve todas sus denuncias abiertas) o volver a publicarla, con notas internas.

## 🗂️ Archivos (Cloudflare R2)

Con las variables `R2_*` y `MEDIA_URL`, las imágenes y PDFs subidos van a un bucket de **Cloudflare R2** y en la base de datos solo queda su ficha (`storage: 'r2'`). La página pública los sirve en `MEDIA_URL/<id>` (p. ej. `https://otrelink.pages.dev/media/<id>`) con `functions/media/[id].js`: caché de un año, ETag y rangos (PDF). Sin esas variables, todo sigue guardándose en la base de datos como antes.

- Cliente S3 firmado con `node:crypto` (sin SDK): `apps/web/lib/storage.js`; el envoltorio del driver: `apps/web/lib/db/with-r2.js`. Al borrar una cuenta se borran sus archivos en R2; la exportación estática y los logos de facturas los leen de R2.
- `/api/assets/<id>` solo sirve los archivos que siguen en la base de datos (para los de R2 responde 404 cuando hay `MEDIA_URL`).
- Pasar a R2 los archivos guardados antes: `node --env-file=.env scripts/migrate-assets-to-r2.mjs` (desde `apps/web`; `--dry-run` solo cuenta, `--keep` conserva una copia en Mongo).
- Configuración: bucket privado (sin `r2.dev`), binding **`MEDIA`** en el proyecto de Pages y un token de R2 **Object Read & Write** limitado al bucket (Access Key ID + Secret). Plan gratuito: 10 GB, 1 M escrituras y 10 M lecturas al mes; la salida de datos es gratis.

## 🔑 API tokens y MCP (plan Business)

- **Dashboard → API** (`/dashboard/api`): crear tokens `otl_…` (lectura y escritura o solo lectura, con vencimiento), copiarlo una sola vez y revocarlo. Se guarda solo el hash SHA-256.
- Se envían como `Authorization: Bearer otl_…`. `proxy.js` solo los deja pasar a las rutas de `apps/web/lib/tokens.js` (páginas, today, analytics, slug-check, subida de archivos y lectura de pedidos); cuenta, facturación, admin y los propios tokens siguen necesitando la sesión del navegador. Límite: 120 peticiones/min por token.
- La feature `api` solo existe en Business y se puede apagar por usuario en el admin.
- **Servidor MCP** en línea (`https://TU-APP/api/mcp`, Streamable HTTP; herramientas en `packages/mcp`): 29 herramientas para Claude, Claude Code, Cursor… (crear páginas desde plantillas, añadir y mover bloques, temas, paletas, traducciones del segundo idioma, analíticas, pedidos, “Today”, subir archivos en base64). Nada que instalar: en claude.ai → *Customize → Connectors → Add custom connector* con la URL, *No sign in* y la cabecera `Authorization: Bearer otl_…` (funciona en web, móvil y escritorio); Claude Code con `claude mcp add --transport http`; Cursor y similares con el puente `mcp-remote`. La pantalla **API** del dashboard tiene todo listo para copiar. `MCP_INTERNAL_URL` (opcional) cambia la dirección interna a la que llaman las herramientas (por defecto `http://127.0.0.1:$PORT`). Ver `packages/mcp/README.md`.

## 💳 Planes y pagos

| Plan | Qué incluye |
|---|---|
| **Free** | 1 página con los bloques básicos. |
| **Pro** · $10/mes | 10 páginas y todas las funciones de página: bloque de código, calendario de eventos, embeds, bloque HTML, reservas, reseñas, encuestas, catálogo, pedidos, ubicación/ruta/estado, fidelidad, facturas, segundo idioma (ES/EN) y fondos de foto/video. |
| **Business** | Personalizado: páginas y funciones que asignas en **Otrelink-Admin**, más **API tokens y MCP** y **notificaciones push a visitantes**. |

- Lo que permite cada plan está en `packages/core/src/plans.js` (`PLAN_FEATURES`, `PLANS`). Las features con `business: true` (`api`, `notifications`) solo existen en Business; el dashboard muestra el candado con el plan que las desbloquea.
- Las cuentas creadas antes de los planes (sin campo `plan`) funcionan como Pro hasta que las cambies en el admin.
- El servidor hace cumplir los límites: páginas por plan, no deja añadir bloques o fondos bloqueados, y en la página pública oculta lo que el plan del dueño no incluye (tras bajar de plan, nada se borra).
- Página de planes: `/dashboard/plan`.

### Stripe
1. Crea el producto **Otrelink Pro** con un precio mensual de $10 → `STRIPE_PRICE_ID` (`price_…`).
2. `STRIPE_SECRET_KEY` (`sk_…`).
3. Webhook → `https://TU-APP/api/billing/stripe/webhook` con los eventos `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted` e `invoice.paid` (este último crea las facturas PDF del historial de pagos) → `STRIPE_WEBHOOK_SECRET` (`whsec_…`).
4. Activa el **Customer portal** en Stripe (Settings → Billing → Customer portal) para que puedan cambiar tarjeta o cancelar.

### PayPal
1. En developer.paypal.com crea una app (sandbox primero) → `PAYPAL_CLIENT_ID` y `PAYPAL_CLIENT_SECRET`.
2. Crea un producto y un plan mensual de $10 → `PAYPAL_PLAN_ID` (`P-…`).
3. Webhook → `https://TU-APP/api/billing/paypal/webhook` con los eventos `BILLING.SUBSCRIPTION.*` y `PAYMENT.SALE.COMPLETED` → `PAYPAL_WEBHOOK_ID`.
4. `PAYPAL_MODE=sandbox` para probar, `live` en producción.

Si el usuario vuelve a Free (botón *Switch to Free* en `/dashboard/plan`, `POST /api/billing/cancel`), la suscripción deja de renovarse sin reembolso: conserva Pro hasta el final del periodo pagado y luego pasa a Free (Stripe avisa por webhook al terminar; con PayPal lo hace el cron `/api/cron/reminders`). Si el admin pasa a **Business** a alguien que paga Pro, su suscripción se cancela al momento (Business se cobra aparte); si la cancelación falla, el plan no cambia. `BUSINESS_CONTACT_EMAIL` es el correo del botón "Contact us".

## 🎁 Referidos

- Cada usuario (Free, Pro o Business) tiene un link `https://TU-APP/register?ref=CÓDIGO` en **Dashboard → Invite** (`/dashboard/referrals`). El registro guarda el código 30 días en el navegador.
- Un referido **cuenta** cuando el invitado hace su **primer pago de Pro** (webhook `invoice.paid` de Stripe o `PAYMENT.SALE.COMPLETED` de PayPal) o cuando el admin lo pasa a **Business**.
- Solo hay recompensa si se registró mientras corría una **campaña** (Otrelink-Admin → *Referrals*: fechas de inicio y fin, meses, máximo por persona, activar/apagar):
  - **Pro** → `freeMonths` meses gratis. Stripe: crédito en el saldo del cliente (precio × meses). PayPal: se reembolsan sus próximos pagos. Sin suscripción, esperan a que se suscriba.
  - **Free** → `freeUserMonths` meses de Pro gratis (1 por defecto, se acumulan). El cron lo devuelve a Free al terminar, salvo que se haya suscrito.
  - **Business** → se cuenta, sin recompensa automática.
- No cuentan las auto-invitaciones (mismo correo, con puntos o `+tag`) y cada cuenta solo puede ser invitada una vez.
- Reglas en `packages/core/src/referrals.js`; lado servidor en `apps/web/lib/referrals.js`.
- ⚠️ Para que el crédito de Stripe y los reembolsos de PayPal funcionen hacen falta las claves reales (la de PayPal debe permitir reembolsos). Probar primero en sandbox / modo test.

## 🛡️ Administración (Otrelink-Admin)

Dashboard aparte en la carpeta `../Otrelink-Admin`: usuarios, planes y features de Business (incluidas API y notificaciones push), baneos, referidos y **denuncias de páginas**. Usa la API `/api/admin/*` de esta app, protegida con `ADMIN_API_KEY` (24+ caracteres; vacío = API apagada). La lista de features la lee de esta app, así que las nuevas aparecen solas. Ver su README.

## 🛰️ API

✔ = sesión del navegador o, en las rutas permitidas, un API token (`Authorization: Bearer otl_…`).

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/api/auth/register` | — | `{ email, password, slug, name }` crea la cuenta y la primera página |
| POST | `/api/auth/login` · `/api/auth/logout` | — | Sesión en cookie httpOnly |
| GET | `/api/auth/me` | ✔ | Usuario actual (y `pageUrl`) |
| GET · POST | `/api/pages` | ✔ | Listar · crear páginas |
| GET · PUT · DELETE | `/api/pages/:id` | ✔ | Leer · guardar todo · borrar |
| GET | `/api/pages/:id/analytics?days=30` | ✔ | Resumen de analíticas |
| GET | `/api/slug-check?slug=` | — | Disponibilidad del usuario |
| POST | `/api/assets` | ✔ | Subir imagen (máx. 3 MB) o PDF (máx. 10 MB), multipart `file` |
| GET | `/api/assets/:id` | — | Servir un archivo guardado en la base de datos (los de R2 se sirven en `MEDIA_URL/:id`) |
| GET | `/api/public/:slug` | — | Datos públicos de una página (CORS) |
| GET | `/api/public/explore?exclude=` | — | Explore: las 10 páginas más visitadas que lo activaron (CORS, caché 10 min) |
| POST | `/api/public/report` | — | Denunciar una página `{ pageId, reason, message?, email? }` (CORS, 5/hora) |
| POST | `/api/public/notify/subscribe` · `manage` · `click` | — | Suscribirse a las notificaciones de una página · ver/cambiar temas/darse de baja · contar un toque (CORS) |
| POST | `/api/public/track` | — | Beacon de visita/clic (CORS) |
| GET | `/api/public/booking/slots?pageId&blockId&serviceId&date` | — | Horas libres (CORS) |
| POST | `/api/public/booking` | — | Crear reserva (CORS, rate limit) |
| GET | `/api/bookings?pageId&view=` · `&count=1` | ✔ | Listar reservas · contar pendientes |
| PATCH | `/api/bookings/:id` | ✔ | `{ status }` o `{ start }` (confirmar, cancelar, reprogramar) |
| GET · POST | `/api/bookings/calendar` | ✔ | Link privado del calendario · regenerarlo |
| GET | `/api/calendar/:token` | — | Feed `.ics` |
| POST | `/api/push/subscribe` · `unsubscribe` · `test` | ✔ | Notificaciones push al dueño (reservas, pedidos…) |
| GET · PUT | `/api/pages/:id/notify` | ✔ | Notificaciones a visitantes: ajustes de suscripción, estadísticas y envíos |
| POST | `/api/pages/:id/notify/broadcasts` · `/notify/test` | ✔ | Enviar ahora o programar (Business) · prueba en tus dispositivos |
| PATCH · DELETE | `/api/pages/:id/notify/broadcasts/:bid` | ✔ | Editar o cancelar uno programado · quitarlo de la lista |
| POST | `/api/legal/accept` | ✔ sesión | Aceptar las versiones actuales de Términos y Privacidad |
| GET · POST | `/api/cron/reminders` | `CRON_SECRET` | Enviar recordatorios pendientes, bajar de plan suscripciones terminadas y terminar el Pro gratis de referidos |
| POST | `/api/billing/stripe/checkout` · `portal` | ✔ | Pagar Pro con tarjeta · gestionar suscripción |
| POST | `/api/billing/paypal/checkout` · `cancel` | ✔ | Pagar Pro con PayPal · cancelar |
| POST | `/api/billing/cancel` | ✔ | Volver a Free: no renovar (Stripe o PayPal), Pro hasta fin del periodo |
| POST | `/api/billing/stripe/webhook` · `/api/billing/paypal/webhook` | firma | Avisos de Stripe / PayPal |
| GET | `/api/admin/stats` · `/api/admin/users` | `ADMIN_API_KEY` | Admin: estadísticas · usuarios |
| GET · PATCH · DELETE | `/api/admin/users/:id` | `ADMIN_API_KEY` | Admin: ver, cambiar plan/límites, banear, borrar |
| GET | `/api/admin/reports?status=` | `ADMIN_API_KEY` | Admin: denuncias (open/resolved/dismissed/all) con página, dueño y contadores |
| PATCH | `/api/admin/reports/:id` | `ADMIN_API_KEY` | Admin: `{ action: dismiss \| resolve \| reopen \| unpublish \| republish, note? }` |
| POST | `/api/mcp` | token `otl_` | Servidor MCP remoto (Streamable HTTP) para claude.ai y apps |
| GET · PATCH · DELETE | `/api/account` | ✔ sesión | Datos de la cuenta · cambiar nombre · eliminar cuenta (`{ password, confirmEmail }`) |
| POST | `/api/account/password` | ✔ sesión | `{ current, next }`; cierra las demás sesiones |
| POST · DELETE | `/api/account/email` | ✔ sesión | Pedir cambio de correo `{ email, password }` · cancelarlo |
| GET | `/api/account/email/confirm?token=` | — | Enlace del correo de confirmación |
| DELETE | `/api/account/sessions` | ✔ sesión | Cerrar sesión en los demás dispositivos |
| GET | `/api/referrals` | ✔ | Link, campaña activa e invitados del usuario |
| GET | `/api/admin/referrals` | `ADMIN_API_KEY` | Admin: campañas con estadísticas y últimos referidos |
| POST | `/api/admin/referrals/campaigns` | `ADMIN_API_KEY` | Admin: crear campaña |
| PATCH · DELETE | `/api/admin/referrals/campaigns/:id` | `ADMIN_API_KEY` | Admin: editar · borrar campaña |
| POST | `/api/public/survey` | — | Enviar respuestas de una encuesta (CORS, rate limit) |
| GET · DELETE | `/api/responses?pageId&blockId` · `&format=csv` | ✔ | Conteos · listar · CSV · borrar todas |
| DELETE | `/api/responses/:id` | ✔ | Borrar una respuesta |
| GET · POST | `/api/public/reviews?pageId&blockId&limit&before` | — | Reseñas publicadas + estadísticas · escribir una reseña (CORS) |
| GET | `/api/reviews?pageId&blockId&status=` · `&count=1` | ✔ | Reseñas del dueño · pendientes por aprobar |
| PATCH · DELETE | `/api/reviews/:id` | ✔ | `{ status }` (published/hidden) o `{ reply }` · borrar |
| GET · POST | `/api/auth/verify?token=` · `/api/auth/verify/resend` | — · ✔ | Confirmar el email (enlace del correo) · reenviar el enlace |
| GET | `/api/pages/:id/export` | ✔ | Descargar la página como sitio estático (.zip) |
| GET · PATCH | `/api/pages/:id/today` | ✔ | Estado “Today”: abierto/cerrado, ubicación, agotados, pedidos pausados |
| GET · PUT | `/api/pages/:id/invoicing` | ✔ | Datos del negocio para las facturas |
| GET · PUT | `/api/palettes` | ✔ | Paletas de color guardadas en la cuenta |
| POST · GET | `/api/public/orders` · `/api/public/orders/:id` | — | Hacer un pedido para recoger · seguir su estado (CORS) |
| GET · PATCH | `/api/orders?pageId&scope=` · `/api/orders/:id` | ✔ | Pedidos del dueño · cambiar estado (los tokens solo pueden leer) |
| POST · GET | `/api/public/loyalty` · `/api/public/loyalty/:id` | — | Crear la tarjeta de fidelidad del visitante · verla (CORS) |
| GET · POST | `/api/loyalty?pageId` · `/api/loyalty/:id` | ✔ | Tarjetas del dueño · sellar, canjear o deshacer (escáner QR) |
| GET · POST | `/api/invoices` | ✔ | Facturas del dueño · crear |
| GET · PUT · POST · DELETE | `/api/invoices/:id` | ✔ | Ver · guardar · nuevo enlace para el cliente · borrar |
| GET | `/api/invoices/:id/pdf` · `/api/public/invoices/:id` | ✔ · enlace | PDF de la factura · enlace público para el cliente |
| GET | `/api/billing/invoices` · `/api/billing/invoices/:id` | ✔ | Pagos a Otrelink y su factura PDF |
| GET · POST | `/api/tokens` · DELETE `/api/tokens/:id` | ✔ (sesión) | API tokens (Business) |

---

## 🌍 Despliegue

- **apps/web** → hoy en **Render** (se planea pasar a **Railway Hobby**, siempre encendido: no activar *Serverless*, misma región que Atlas, límite de gasto). Cualquier hosting de Node sirve (`npm run build && npm start`). Define `JWT_SECRET`, `MONGODB_URI`, `NEXT_PUBLIC_PAGE_URL` (`https://otrelink.pages.dev`), `PUBLIC_CORS_ORIGINS` (el mismo origen) y, si usas R2, `R2_*` y `MEDIA_URL`. Usa Mongo: el driver `file` necesita disco persistente. Al cambiar de hosting, actualiza `VITE_API_URL` en Cloudflare y los webhooks de Stripe/PayPal.
- **apps/page** → **Cloudflare Pages** (`https://otrelink.pages.dev`), conectado al repo de GitHub:
  - Framework *None* · Root directory: la raíz del repo (es un monorepo) · Build command `npm run build:page` · Output `apps/page/dist`.
  - Variables: `VITE_API_URL`, `VITE_HOME_URL`, `NODE_VERSION=22` (sin `VITE_BASE`).
  - Binding R2 `MEDIA` → el bucket de archivos (Settings → Bindings); se aplica en el siguiente despliegue.
  - Sin `404.html` (el build no lo genera cuando `CF_PAGES=1`), Cloudflare sirve `index.html` con 200 en cualquier ruta (modo SPA).
  - `apps/page/public/_headers`: cabeceras de seguridad (anti-clickjacking, nosniff, referrer y permissions policy, HTTPS) y caché de un año para `/assets/*`.
  - **Functions** (`functions/`): `[slug].js` escribe en el HTML el título, la descripción, la imagen y la URL canónica de cada página antes de enviarla (vista previa al compartir; páginas inexistentes → 404 real; las sensibles sin imagen); `media/[id].js` sirve los archivos de R2; `manifest/[slug].webmanifest` permite instalar una página como app (push en iPhone). Plan gratis: 100 000 ejecuciones/día.
  - El workflow de GitHub Pages (`.github/workflows/static.yml`) se puede seguir usando para otra copia (`VITE_BASE` o la ruta de Pages; ahí sí se genera `404.html`).
- **packages/mcp** → no se despliega aparte: va dentro de `apps/web` (ruta `/api/mcp`).
- **Otrelink-Admin** → app Next.js aparte; apunta a esta app con `OTRELINK_API_URL` y `OTRELINK_ADMIN_API_KEY`.


## 📌 Pendientes importantes (tener en mente)

### 1. ✅ Vista previa al compartir — resuelto
La resuelve `functions/[slug].js` en Cloudflare Pages (ver **Despliegue**). WhatsApp y Facebook guardan su propia copia de la vista previa: tras cambiar el SEO o la imagen, refrescarla con el [Sharing Debugger de Facebook](https://developers.facebook.com/tools/debug/). Imagen recomendada: 1200×630, PNG/JPG, < 300 KB.

### 2. Dominios personalizados / subdominios por página
Ejemplo: `links.miempresa.com` → la página de ese cliente. Como la página pública ya está en Cloudflare, lo natural es **Cloudflare for SaaS** (requiere un dominio propio de Otrelink en Cloudflare, p. ej. `otrelink.com`). Opciones:

| Opción | Costo | Nota |
|---|---|---|
| **Cloudflare for SaaS** (recomendada) | 100 dominios gratis, luego $0.10/mes c/u | Solo subdominios (`links.cliente.com`); dominios raíz solo en Enterprise |
| Vercel Pro | ~$20/mes, dominios ilimitados | Admite dominio raíz |
| Render | 2–25 incluidos según plan, luego $0.25/mes c/u | Caro a escala |
| VPS + Caddy (on-demand TLS) | Solo el VPS | Tú mantienes el servidor |

Qué hay que construir en Otrelink:
- Colección `domains` `{ host, pageId, userId, status, verifyToken }` y feature de plan `customDomain` (Pro/Business, límite por plan desde el admin).
- Dashboard → Settings → *Custom domain*: el usuario escribe el dominio, ve el registro DNS a crear (`CNAME links → pages.otrelink…`) y un TXT `_otrelink.<dominio>` para verificar que es suyo; botón *Verificar* y estado (pendiente / activo / error).
- Alta y baja del dominio en el proveedor por API; cron para revisar los pendientes.
- `GET /api/public/by-host?host=…` y la página pública buscando por dominio cuando `location.hostname` no es el de Otrelink; CORS para dominios activos.
- Canonical, QR, botón de compartir y `og:url` con el dominio propio; 301 desde `otrelink/slug`.
- La Function `[slug].js` ya escribe las etiquetas de cada página; habría que buscar la página por dominio en vez de por slug.


## 🗺️ Próximos pasos

- [ ] Login social (Google / GitHub)
- [ ] Bloques con integraciones (YouTube/Spotify/Instagram feed)
- [ ] Notificaciones por email al alcanzar N clics
- [ ] Dominios personalizados (ver *Pendientes importantes*)
- [ ] Sistema de mensajes ( de owner a admin y de usuarios a owners)
