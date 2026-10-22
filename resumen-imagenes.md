# La tapa de los libros · paso a paso

**Para quién es esto:** para vos, si faltaste, si te perdiste en algún momento de la clase,
o si querés rehacerlo tranquilo en tu casa.

Está escrito sobre **el código que escribimos en clase**, el de esta misma carpeta:
cada fragmento es el que está en tus archivos.

Al final de este documento, tu API va a poder **recibir una imagen y guardarla en internet**.

---

## El problema, en dos frases

Hasta hoy, todo lo que mandábamos al back era **JSON**: texto. Un archivo no es texto, y
`express.json()` no lo sabe leer. Si mandás un formulario con una imagen, **`req.body` llega
vacío** y la petición falla diciendo que falta el título, aunque lo hayas mandado.

Y una vez que podamos leer el archivo, hay una segunda pregunta: **¿dónde lo guardamos?**
Spoiler: no en MongoDB.

---

## Los 8 pasos

| | Paso | Archivo |
|---|---|---|
| 1 | Instalar lo que falta | — |
| 2 | Que el libro tenga un campo para la tapa | `models/libro.js` |
| 3 | Que Express sepa leer archivos | `middleware/subirImagen.js` |
| 4 | Decidir con qué nombre se guarda | `services/storage/nombreUnico.js` |
| 5 | El primer lugar donde guardar: el disco | `services/storage/local.js` |
| 6 | El que elige el lugar | `services/storageService.js` |
| 7 | Conectarlo con el libro | `services/libroService.js` + controller + rutas |
| 8 | Cambiar el disco por Supabase | `config/supabase.js` + `services/storage/supabase.js` |

---

## Paso 1 · Instalar

```bash
npm install multer
```

**Multer** es el único que sabe leer un formulario con archivos. Nada más por ahora:
Supabase lo instalamos en el paso 8, cuando lo necesitemos.

---

## Paso 2 · El campo en el modelo

En `src/models/libro.js`, un campo más:

```js
    imagen: {
        type: String,
        default: null       // un libro puede no tener tapa
    }
```

### ⚠️ Lo más importante de este paso

**Es un `String`, no la imagen.** Guardamos **la dirección** (`https://...../tapa.png`),
no el archivo.

¿Por qué? Una imagen **no se guarda en MongoDB**:

- un documento de Mongo no puede pasar de **16 MB**;
- cada vez que pidieras un libro te traerías la imagen entera, aunque no la quisieras;
- y la base no sabe **servir** archivos por HTTP: no hay forma de poner eso en un `<img src>`.

El archivo va a un lugar preparado para archivos. La base guarda un texto de 200 caracteres.

---

## Paso 3 · Que Express sepa leer archivos

Un formulario con archivos no viaja como JSON: viaja como **`multipart/form-data`**, que son
bloques separados por una línea inventada (la **frontera** o *boundary*), con el archivo en
binario adentro.

**`src/middleware/subirImagen.js`** (nuevo)

```js
import multer from "multer"

// el archivo queda en memoria, en req.file.buffer
const storage = multer.memoryStorage()

// qué archivos se aceptan. Esto es VALIDAR, igual que el required del modelo
const soloImagenes = (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
        cb(null, true)                                        // aceptado
    } else {
        cb(new Error("Solo se permiten imágenes"), false)     // rechazado
    }
}

const upload = multer({
    storage,
    fileFilter: soloImagenes,
    limits: {
        fileSize: 4 * 1024 * 1024    // 4 MB
    }
})

export const subirImagen = upload.single("imagen")
```

### Qué hace cada cosa

**`memoryStorage()`** · el archivo queda **en la RAM**, en `req.file.buffer`. La alternativa
es `diskStorage`, que lo escribe en una carpeta. Elegimos memoria porque el archivo dura un
suspiro: lo recibimos y lo mandamos a Supabase. La contra es que entra entero en la memoria
del servidor, y por eso el límite de tamaño **no es un detalle**.

**`fileFilter`** · acepta o rechaza. El `cb` es un *callback* al estilo viejo de Node:
`cb(error, aceptado)`.

**`limits`** · 4 MB. Si se pasa, Multer corta la petición solo.

**`upload.single("imagen")`** · **un** archivo, que viene en un campo llamado `"imagen"`.

> ⚠️ Ese nombre tiene que coincidir **exactamente** con el que manda el cliente. Si el front
> manda `"foto"` y acá dice `"imagen"`, `req.file` queda `undefined` y no te vas a dar cuenta
> por qué.

### Los errores de Multer

Multer tira sus propios errores, y nuestro `manejarErrores` no los conoce: respondería **500**
a una imagen de 5 MB, cuando en realidad es culpa de quien la mandó (400). Por eso, en el mismo
archivo, los traducimos:

```js
export const manejarErroresDeMulter = (error, req, res, next) => {
    if (error?.name === "MulterError") {
        if (error.code === "LIMIT_FILE_SIZE") {
            return res.status(400).json({ error: "La imagen no puede pesar mas de 4 MB" })
        }
        if (error.code === "LIMIT_UNEXPECTED_FILE") {
            return res.status(400).json({ error: `No esperaba un archivo en el campo "${error.field}". El campo tiene que llamarse "imagen"` })
        }
        return res.status(400).json({ error: "No se pudo procesar el archivo" })
    }

    // el error de nuestro filtro de archivos
    if (error?.message === "Solo se permiten imágenes") {
        return res.status(400).json({ error: error.message })
    }

    // alguien escribió el header Content-Type a mano en Postman
    if (error?.message?.includes("Boundary not found")) {
        return res.status(400).json({
            error: "No pongas el header Content-Type a mano: dejá que postman lo arme con la frontera del multipart"
        })
    }

    next(error)    // cualquier otro error sigue al middleware general
}
```

Después, en **`src/routes/libroRoutes.js`**:

```js
router.post("/", soloStaff, subirImagen, libroController.crearLibroController)
router.patch("/:id", soloStaff, subirImagen, libroController.actualizarLibroController)
```

Y al final de ese mismo archivo, **antes del `export default`**:

```js
// los errores de Multer se traducen ACÁ, al final de este router:
// un middleware de errores puesto en un router solo atrapa lo que pasó en ESE router
router.use(manejarErroresDeMulter)
```

acordándose de importarlo arriba:

```js
import { subirImagen, manejarErroresDeMulter } from '../middleware/subirImagen.js'
```

> ⚠️ **Esta parte quedó sin hacer en el código de la clase.** `manejarErroresDeMulter` está
> escrito pero nadie lo usa, así que hoy una imagen de 5 MB responde **500 "Error interno del
> servidor"** en vez del 400 con el mensaje. Agregá esas dos líneas y se arregla.

> **El orden importa.** Primero `soloStaff` (*¿quién sos y podés?*) y recién después Multer.
> Al revés, estaríamos recibiendo 4 MB de alguien que no tiene permiso para subir nada.

Desde acá, en el controller tenés **`req.file`**, con esta forma:

```js
{ originalname: "tapa.png", mimetype: "image/png", size: 23456, buffer: <Buffer ...> }
```

> `req.file` lo pone Multer, igual que `req.usuario` lo pone `verificarToken`. **Un middleware
> prepara algo y lo deja en `req` para el que venga después.** Es siempre el mismo patrón.

---

## Paso 4 · Con qué nombre se guarda

**`src/services/storage/nombreUnico.js`** (nuevo)

```js
import path from "path"

export const nombreUnico = (originalname = "archivo") => {
    const extension = path.extname(originalname).toLowerCase() || ".jpg"
    const azar = Math.random().toString(36).slice(2, 8)

    return `${Date.now()}-${azar}${extension}`
}
```

**¿Por qué no usamos el nombre que mandó el usuario?** Por dos razones distintas:

1. **Se pisan.** Si dos personas suben `tapa.jpg`, la segunda borra la primera.
2. **Es texto que elige un desconocido.** Podría mandar `../../index.js` y, según cómo lo
   uses, escribir donde no debe.

---

## Paso 5 · El primer lugar: el disco

**`src/services/storage/local.js`** (nuevo)

```js
import fs from "fs/promises"
import path from "path"
import { CARPETA_IMAGENES, API_URL } from "../../utils/config.js"
import { nombreUnico } from "./nombreUnico.js"

export const subir = async (file) => {
    const nombre = nombreUnico(file.originalname)
    const carpeta = path.resolve(CARPETA_IMAGENES)

    await fs.mkdir(carpeta, { recursive: true })
    await fs.writeFile(path.join(carpeta, nombre), file.buffer)

    return `${API_URL}/${CARPETA_IMAGENES}/${nombre}`
}

export const borrar = async (url) => {
    const nombre = path.basename(new URL(url).pathname)

    await fs.rm(path.join(path.resolve(CARPETA_IMAGENES), nombre), { force: true })
}
```

Este adaptador necesita dos cosas más.

**Una variable**, en `src/utils/config.js` (y en el `export` de abajo):

```js
// la dirección pública de ESTA API. Solo la usa el storage local, para armar la URL
const API_URL = process.env.API_URL || `http://localhost:${PORT}`
```

**Y que el servidor sirva esa carpeta**, en `src/index.js`, debajo de `app.use(express.json())`:

```js
app.use(`/${CARPETA_IMAGENES}`, express.static(CARPETA_IMAGENES))
```

> `express.static` sirve archivos tal cual están: lo que esté en `uploads/tapa.png` se puede
> pedir en `http://localhost:3000/uploads/tapa.png`.
> ⚠️ Esta línea **solo hace falta con el disco**. Con Supabase las imágenes las sirve Supabase.

> ⚠️ **Las dos faltan en el código de la clase.** Hoy, si ponés `STORAGE=local`, el proyecto
> **ni siquiera arranca**: tira
> `SyntaxError: The requested module '../../utils/config.js' does not provide an export named 'API_URL'`.
> Con `STORAGE=supabase` no se nota, porque `local.js` nunca se carga.

### Fijate en algo

Este archivo exporta **exactamente dos funciones**: `subir(file)` y `borrar(url)`.
Acordate de eso, porque el del paso 8 va a exportar **las mismas dos**.

---

## Paso 6 · El que elige el lugar

**`src/services/storageService.js`** (nuevo)

```js
import { STORAGE } from "../utils/config.js"
import { ErrorApp } from "../utils/ErrorApp.js"

const PROVEEDORES = ["local", "supabase"]

if (!PROVEEDORES.includes(STORAGE)) {
    throw new Error(`STORAGE="${STORAGE}" no existe. Tiene que ser uno de: ${PROVEEDORES.join(", ")}`)
}

const adaptador = await import(`./storage/${STORAGE}.js`)

export const subirImagenService = async (file) => {
    if (!file) return null          // la imagen es opcional

    try {
        return await adaptador.subir(file)
    } catch (error) {
        console.error("Error subiendo la imagen:", error)
        throw new ErrorApp("No se pudo guardar la imagen. Probá de nuevo.", 502)
    }
}

export const borrarImagenService = async (url) => {
    if (!url) return

    try {
        await adaptador.borrar(url)
    } catch (error) {
        console.error("No se pudo borrar la imagen:", url, error.message)
    }
}
```

### ⭐ Esto es un ADAPTADOR, y es la idea central de la clase

Mirá lo que acaba de pasar:

```
                       libroService
                            │
                   "guardá esto y dame la URL"
                            │
                     storageService.js          ← el único que sabe quién guarda
                       ╱          ╲
              storage/local.js   storage/supabase.js
                  (disco)            (internet)
```

Los dos proveedores tienen **la misma forma**: `subir(file)` y `borrar(url)`. Son
**dos cajas distintas que entran en el mismo agujero**. `libroService` pide "guardá esto"
y **nunca se entera** de quién lo guardó.

> Ya usan esta idea en el front, en `utils/adaptadores.js`: ahí traducen los datos del back
> para que los componentes no dependan de cómo los nombra la API. Es lo mismo, con proveedores
> en lugar de datos.

### Dos detalles que valen la pena

**El `import()` con paréntesis** carga el archivo **en tiempo de ejecución**, y solo el
elegido. Si fuera un `import` normal arriba, el proyecto no arrancaría sin las credenciales
de **todos** los proveedores, aunque uses uno solo.

**El `catch` de `borrar` no relanza, a propósito.** Si no se pudo borrar una imagen vieja,
el libro igual se guardó bien: que falle la limpieza no puede romperle la operación al
usuario. Queda un archivo de más y se registra en el log.
En cambio el de `subir` **sí** corta: si la imagen no se guardó, no queremos un libro con
una tapa que no existe.

---

## Paso 7 · Conectarlo con el libro

En **`src/services/libroService.js`**:

```js
import { subirImagenService, borrarImagenService } from "./storageService.js"

export const crearLibroService = async (datos, file) => {
    await verificarAutorService(datos.autor)

    const imagen = await subirImagenService(file)      // sin archivo, devuelve null

    try {
        const libro = await Libro.create({ ...datos, imagen })
        return await libro.populate("autor", "nombre nacionalidad")
    } catch (error) {
        // ⭐ COMPENSAR: la imagen ya se subió, pero el libro no se creó
        await borrarImagenService(imagen)

        if (error.code === 11000) { /* ...lo que ya estaba... */ }
        throw error
    }
}
```

Y en **`src/controllers/libroController.js`**, una línea:

```js
const libro = await crearLibroService(req.body, req.file)
```

### Dos cosas para entender bien

**¿Por qué la subida va en el service y no en el controller?** Porque *guardar la tapa* es
parte de *crear un libro*: es una regla del negocio. El controller solo traduce la petición.
Es la misma regla que venimos usando desde el principio.

**El `catch` que borra la imagen** es el mismo movimiento que hicimos en pedidos cuando
devolvíamos el stock: **deshacer lo que quedó a medias**. Si el ISBN está repetido, el libro
no se crea… pero la imagen ya se subió. Si no la borrás, queda ahí para siempre y nadie se
entera nunca.

---

## Probalo con el disco

En el `.env`:

```
STORAGE=local
CARPETA_IMAGENES=uploads
API_URL=http://localhost:3000
```

En Postman, importá `postman/imagenes-multer.postman_collection.json` (son los 13 requests
de hoy) y el environment de siempre. Después, **request 51**: Body → **form-data** → en la fila
`imagen` cambiá el tipo de *Text* a **File** → **Select Files**.

> Las imágenes para probar están en [`postman/archivos-de-prueba/`](postman/archivos-de-prueba):
> `tapa-ejemplo.png` para subir, `tapa-nueva.png` para el cambio de tapa, `no-es-imagen.pdf` y
> `pesada-6mb.png` para los dos rechazos.

> ⚠️ **No agregues el header `Content-Type` a mano.** Postman lo arma solo y le pone la
> frontera del multipart. Si lo escribís vos, va sin frontera y el back no puede leer nada.

Tiene que pasar esto: respuesta **201**, un campo `imagen` con una URL, el archivo aparece
en la carpeta `uploads/`, y si abrís esa URL en el navegador **ves la imagen**.

**Ya funciona.** Y sin embargo lo vamos a cambiar.

---

## Paso 8 · Del disco a Supabase

### Por qué el disco no alcanza

1. **Se borra en cada deploy.** El servidor se reconstruye de cero y las imágenes no están.
2. **Con dos servidores, la imagen está en uno solo.** La mitad de las peticiones no la encuentra.
3. **Tu servidor gasta tiempo y ancho de banda** sirviendo archivos en vez de responder la API.

### Preparar Supabase

1. [supabase.com](https://supabase.com) → **New project** (gratis, sin tarjeta).
2. **Storage → New bucket** → nombre `tapas` → ⚠️ marcar **Public bucket**.
3. **Project Settings → Data API** → copiar el **Project URL**.
4. **Project Settings → API Keys → Secret keys** → *Reveal* → la que empieza con `sb_secret_`.

```bash
npm install @supabase/supabase-js
```

En el `.env` (**valores pelados: sin comillas y sin comas**):

```
STORAGE=supabase
CARPETA_IMAGENES=tapas
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=sb_secret_...
```

> **¿Por qué la clave secreta y no la otra?** Supabase te da dos. La **publicable** es para el
> front y está sujeta a las políticas de seguridad: si la usás desde el back, la subida falla
> con *"new row violates row-level security policy"*. La **secreta** es de servidor y se saltea
> esas políticas — que es lo correcto acá, porque **quién puede subir una tapa lo decide
> nuestro `permitirRoles("vendedor", "admin")`**, no Supabase.
>
> Y por eso mismo: esa clave **nunca** va al front ni al repositorio.

### La conexión

**`src/config/supabase.js`** (nuevo)

```js
import { createClient } from "@supabase/supabase-js"
import { SUPABASE_URL, SUPABASE_KEY } from "../utils/config.js"

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
```

### El adaptador nuevo

**`src/services/storage/supabase.js`** (nuevo) · **las mismas dos funciones** que `local.js`

```js
import { supabase } from "../../config/supabase.js"
import { CARPETA_IMAGENES } from "../../utils/config.js"
import { nombreUnico } from "./nombreUnico.js"

// en Supabase, CARPETA_IMAGENES es el nombre del BUCKET
const bucket = () => supabase.storage.from(CARPETA_IMAGENES)

export const subir = async (file) => {
    const nombre = nombreUnico(file.originalname)

    const { error } = await bucket().upload(nombre, file.buffer, {
        contentType: file.mimetype,
        upsert: false
    })

    if (error) throw error

    const { data } = bucket().getPublicUrl(nombre)

    return data.publicUrl
}

export const borrar = async (url) => {
    const nombre = url.split(`/${CARPETA_IMAGENES}/`).pop()

    if (!nombre || nombre === url) return

    const { error } = await bucket().remove([nombre])

    if (error) throw error
}
```

### Lo que hay que mirar de este archivo

**`file.buffer`** · son los bytes que dejó Multer en memoria. Es lo mismo que le pasábamos a
`fs.writeFile` en el adaptador del disco.

**`contentType: file.mimetype`** · si no lo mandás, el navegador **descarga** la imagen en
lugar de mostrarla.

**`upsert: false`** · si ya existiera un archivo con ese nombre, falla en vez de pisarlo.
Como el nombre es único, que exista significaría que algo anda mal.

**`const { error } = ...` · ojo con esto** · el SDK de Supabase **no lanza excepciones**:
devuelve siempre `{ data, error }`. Si no mirás el `error`, el código sigue como si todo
hubiera salido bien y terminás guardando en Mongo **la URL de un archivo que no existe**:
libro creado, 201, y la tapa es un enlace roto.
Por eso el `if (error) throw error`.

> El SDK de Firebase, en cambio, **sí** lanza excepciones. Dos librerías que hacen lo mismo
> con convenciones opuestas: esto se **mira en la documentación**, no se adivina.

**`remove([nombre])`** · espera un **array**, aunque borres uno solo.

### El cambio

En el `.env`, **una línea**:

```
STORAGE=local   →   STORAGE=supabase
```

**Y no se toca ningún archivo más.** Ni el service, ni el controller, ni las rutas, ni el
modelo. Eso es lo que compraste cuando escribiste el adaptador.

---

## Cómo sabés que está bien

| Probá | Tiene que pasar |
|---|---|
| Crear un libro **con** imagen | 201, y `imagen` tiene una URL de Supabase |
| Abrir esa URL | se ve la imagen |
| Crear un libro **sin** imagen | 201 igual, `imagen: null` |
| Subir un PDF | 400 · *"Solo se permiten imágenes"* |
| Subir algo de más de 4 MB | 400 · *"La imagen no puede pesar mas de 4 MB"* |
| Subir como **comprador** | 403 |
| Repetir un ISBN **con** imagen | 409, y en el bucket **no** quedó una imagen nueva |
| Cambiar la tapa | la URL cambia y la vieja desaparece del bucket |
| Borrar el libro | su tapa desaparece del bucket |

---

## Si algo no anda

| Pasa esto | Es esto |
|---|---|
| `El titulo es obligatorio` y sí lo mandaste | Falta `subirImagen` en la ruta, o estás mandando JSON en vez de form-data |
| `req.file` es `undefined` | El campo del form-data no se llama `imagen` |
| `supabaseUrl is required` | Faltan `SUPABASE_URL` / `SUPABASE_KEY` en el `.env` |
| `404 Not Found` del bucket | Los valores del `.env` quedaron **con comillas**, o el bucket no existe |
| `new row violates row-level security policy` | Estás usando la clave publicable. Va la `sb_secret_` |
| Sube bien pero **la URL no abre** | El bucket quedó **privado**: Storage → Make public |
| **Borraste la imagen y la URL todavía la muestra** | Es el **CDN**, que la cacheó. En el bucket ya no está: miralo en el panel |
| El navegador **descarga** la imagen en vez de mostrarla | Falta `contentType: file.mimetype` |
| 400 diciendo que no pongas el Content-Type | Justamente eso: borrá ese header en Postman |

---

## ⚠️ Lo que quedó pendiente en el código de la clase

Tres cosas que no llegamos a conectar. Ninguna rompe lo que anda hoy con Supabase, pero
conviene cerrarlas:

| Falta | Dónde | Qué pasa hoy |
|---|---|---|
| `router.use(manejarErroresDeMulter)` | `routes/libroRoutes.js` | una imagen de 5 MB responde **500** en vez de 400 |
| exportar `API_URL` | `utils/config.js` | con `STORAGE=local` el proyecto **no arranca** |
| `express.static` | `index.js` | con `STORAGE=local`, la URL de la imagen daría 404 |

Las tres están explicadas arriba, en los pasos 3 y 5.

---

## Lo que hay que llevarse

1. **Un archivo no es JSON.** Viaja como `multipart/form-data`, y hace falta Multer para leerlo.
2. **Las imágenes no van en la base.** Van a un storage; en la base se guarda la URL.
3. **Validar el archivo es validar entrada**, igual que el `required` de un modelo: tipo y tamaño.
4. **El adaptador**: cuando dos cosas hacen lo mismo de formas distintas, les ponés la misma
   forma por fuera y el resto del programa deja de tener que elegir.
5. **Si subiste algo y después falló, borralo.** Lo mismo que devolver el stock en pedidos.
