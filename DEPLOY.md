# Cómo subir esto a GitHub y Vercel

## Antes de empezar — validación que TÚ debes hacer

Yo (Claude) construí este proyecto completo, pero mi entorno no tiene acceso a internet para instalar paquetes npm, así que **nunca pude correr el build real**. Validé manualmente que todo el código esté bien formado (sintaxis, imports), pero la primera vez que alguien con una máquina real lo compile podría aparecer algún error que yo no pude ver. Sigue estos pasos en orden y no te saltes el paso 2.

## Paso 1 — Tener Node.js instalado

Necesitas Node.js 18 o superior. Verifica con:
```bash
node --version
```
Si no lo tienes, descárgalo de [nodejs.org](https://nodejs.org) (la versión LTS).

## Paso 2 — Probar que compila ANTES de subir nada

Descomprime el proyecto en una carpeta, abre una terminal ahí, y corre:

```bash
npm install
npm run build
```

Si `npm install` o `npm run build` fallan, copia el error completo y pégamelo en el chat — lo arreglo de inmediato. No avances al paso 3 hasta que `npm run build` termine sin errores.

Para verlo funcionando en tu navegador antes de publicarlo:
```bash
npm run dev
```
Y abre la URL que te muestre (normalmente `http://localhost:5173`).

## Paso 3 — Crear el repositorio en GitHub

1. Ve a [github.com](https://github.com) e inicia sesión (o crea una cuenta, es gratis).
2. Click en el botón verde **"New"** (o el ícono `+` arriba a la derecha → "New repository").
3. Nombre del repositorio: `sala-de-momios` (o el que prefieras).
4. Déjalo en **Public** (Vercel funciona gratis con repos públicos) o **Private** si prefieres.
5. **No marques** ninguna casilla de "Add a README" ni ".gitignore" — ya los tienes en el proyecto.
6. Click **"Create repository"**.

GitHub te va a mostrar una página con comandos. Vas a usar la sección que dice "…or push an existing repository from the command line".

## Paso 4 — Subir el código desde tu computadora

En la terminal, dentro de la carpeta del proyecto (donde corriste `npm install`):

```bash
git init
git add .
git commit -m "Primera versión de Sala de Momios"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/sala-de-momios.git
git push -u origin main
```

Reemplaza `TU_USUARIO` con tu nombre de usuario real de GitHub (lo ves en la página que te mostró en el paso 3).

Si te pide usuario/contraseña y la contraseña normal no funciona, GitHub ahora requiere un "Personal Access Token" en vez de contraseña — te lo pedirá la primera vez, sigue las instrucciones en pantalla o créalo en GitHub → Settings → Developer settings → Personal access tokens.

## Paso 5 — Conectar con Vercel

1. Ve a [vercel.com](https://vercel.com) e inicia sesión con tu cuenta de GitHub (botón "Continue with GitHub").
2. Click **"Add New..."** → **"Project"**.
3. Busca y selecciona el repositorio `sala-de-momios` que acabas de subir → **"Import"**.
4. **Antes de hacer click en Deploy**, despliega la sección "Environment Variables" y agrega:
   - `ODDS_API_KEY` → tu clave real de The Odds API
   - `FOOTBALL_API_KEY` → tu clave real de API-Football
   
   Estas claves NUNCA van en el código ni en GitHub — viven solo aquí, en el servidor de Vercel. Las funciones en `/api` las leen del entorno, nunca están escritas en ningún archivo del repo.
5. Vercel debería detectar automáticamente: Framework Preset = **Vite**, Build Command = `npm run build`, Output Directory = `dist`. Si no lo detecta solo, ponlo manualmente así.
6. Click **"Deploy"**.

En 1-2 minutos tendrás una URL pública como `sala-de-momios.vercel.app`.

## Paso 6 — Activar el calendario en vivo (¡importante, no te lo saltes!)

El sitio va a cargar pero la pestaña "Partidos" estará vacía hasta que el calendario se genere por primera vez:

1. En GitHub, ve a tu repositorio → pestaña **"Actions"** (arriba).
2. Si GitHub te pregunta si quieres habilitar Actions, dile que sí.
3. Verás un workflow llamado **"Actualizar calendario Mundial 2026"**. Click en él.
4. Click en el botón **"Run workflow"** (lado derecho) → confirma con otro click en **"Run workflow"**.
5. Espera 30-60 segundos, recarga la página, y deberías ver una marca verde ✓.
6. Eso genera `public/data/matches.json` con el calendario real y hace commit automático — Vercel detecta ese commit y redeploya solo.

A partir de ahí, el mismo workflow corre solo cada 15 minutos durante el horario típico de partidos, y una vez al día el resto del tiempo — no tienes que hacer nada más.

## Si algo falla

- **`npm install` falla**: pégame el error exacto.
- **`npm run build` falla**: pégame el error exacto — es información valiosa porque yo no pude correrlo antes de entregarte el código.
- **El workflow de GitHub Actions falla** (marca roja ✗ en la pestaña Actions): click en el workflow fallido para ver el log y pégamelo.
- **El sitio carga pero "Partidos" sigue vacío** después del paso 6: revisa que el workflow haya terminado con ✓ verde, y que haya un archivo `public/data/matches.json` en tu repo de GitHub (búscalo en la pestaña "Code").
