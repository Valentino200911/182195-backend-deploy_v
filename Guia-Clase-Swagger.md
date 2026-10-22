# Unidad 25 · Documentación de APIs con Swagger (OpenAPI)

> Escrito sobre el código de clase (`182195-backend/15`).
>
> **Cómo leer esta guía:** está en el orden exacto en que se hacen las cosas.
> Cada paso dice **qué archivo se toca**, **el código completo** que va adentro,
> **por qué** va así, y termina en un **✅ checkpoint**: qué correr y qué tiene
> que salir. Si el checkpoint no da eso, no sigas: el problema está ahí.

---

## Índice

| | Paso | Archivo que se toca | Min |
|---|---|---|---|
| **0** | [Por qué documentar](#0--por-qué-documentar) | — | 15 |
| **1** | [Instalar y montar Swagger UI](#1--instalar-y-montar-swagger-ui) | [`package.json`](package.json) · [`src/docs/swagger.js`](src/docs/swagger.js) · [`src/app.js`](src/app.js) | 25 |
| **2** | [La primera ruta documentada](#2--la-primera-ruta-documentada) | [`src/routes/libroRoutes.js`](src/routes/libroRoutes.js) | 25 |
| **3** | [Los componentes: dejar de repetirse](#3--los-componentes-dejar-de-repetirse) | [`src/docs/swagger.js`](src/docs/swagger.js) | 35 |
| ☕ | recreo | | 10 |
| **4** | [El botón Authorize](#4--el-botón-authorize) | [`src/docs/swagger.js`](src/docs/swagger.js) + rutas | 25 |
| **5** | [Subir archivos y el resto del CRUD](#5--subir-archivos-y-el-resto-del-crud) | [`src/routes/libroRoutes.js`](src/routes/libroRoutes.js) | 25 |
| **6** | [Documentar el resto de la API](#6--documentar-el-resto-de-la-api) | los otros 5 routers | 25 |
| **7** | [⭐ Que la doc no se desactualice](#7--que-la-doc-no-se-desactualice) | [`tests/5-documentacion.test.js`](tests/5-documentacion.test.js) | 30 |
| **8** | [Cierre: exportar, publicar, lo que sigue](#8--cierre-exportar-publicar-y-lo-que-sigue) | — | 15 |

Con el recreo, 3 horas y media de contenido para 3 horas: el bloque 6 se puede
recortar y el 7 se puede dar leyendo los tests en vez de escribiéndolos.

> 🅱️ Si el tiempo no alcanza: **[Plan B · lo infaltable](#-plan-b--lo-infaltable)**

---

## 🅱️ Plan B · lo infaltable

Si quedan 60 minutos, esto es lo que no se puede dejar afuera:

| # | Qué | Por qué |
|---|---|---|
| 1 | **Instalar y montar** `/api-docs` (paso 1) | sin esto no hay nada que mirar |
| 2 | **Una ruta completa**: `GET /api/libros` (paso 2) | el formato se entiende con una |
| 3 | **Un `$ref` a un schema** (paso 3) | la idea de no repetirse |
| 4 | **El botón Authorize** (paso 4) | es el momento "ah, reemplaza a Postman" |
| 5 | **`Try it out` sobre una ruta protegida** | el cierre: la doc *se usa*, no se lee |

Lo que se cae primero, en orden: el bloque 6 (documentar los otros 5 routers,
es repetir), el 7 (los tests, quedan leídos), el `multipart` del 5.

> ⭐ **Y si solo te queda tiempo para una cosa:** el paso 4. Login → copiar
> token → Authorize → Execute sobre una ruta protegida. Ahí se entiende para
> qué sirve todo lo anterior.

---

## Antes de empezar

```bash
npm start        # el proyecto tiene que arrancar hoy, antes de tocar nada
npm run seed     # para tener libros y usuarios con los que probar
```

Vamos a usar los usuarios del seed:

| Email | Contraseña | Rol |
|---|---|---|
| `ana.gomez@mail.com` | `ana12345` | comprador |
| `carla.ruiz@mail.com` | `carla1234` | vendedor |
| `admin@mail.com` | `admin1234` | admin |

---

## 0 · ¿Por qué documentar?

Tenemos **27 endpoints**. Hoy, para que alguien use esta API, hay que mandarle:
la colección de Postman, un mensaje explicando qué usuario usar, otro explicando
que el token va en un header, y estar a mano para cuando pregunte por qué el
`PATCH` del carrito no suma sino que reemplaza.

### Las tres preguntas que no sabemos contestar

1. **¿Qué rutas tiene esta API?** La respuesta hoy es *"abrí `src/routes/` y
   fijate"*. Eso no se le puede decir a alguien del equipo de front.
2. **¿Qué devuelve exactamente `GET /api/libros`?** *"Probala y mirá."*
3. **¿Qué pasa si mando mal los datos?** *"Probá y vas a ver."*

### Las tres formas de documentar, y por qué elegimos la tercera

| | Cómo | Qué pasa en la realidad |
|---|---|---|
| ❌ | un `README` con las rutas | se desactualiza en una semana y nadie se entera |
| ❌ | exportar la colección de Postman | sirve para probar, no para *entender*. Y hay que reexportarla a mano |
| ✅ | **OpenAPI**, generado desde el código | vive al lado de la ruta, se puede **probar desde el navegador** y la pueden leer otras máquinas |

### Las palabras de hoy

| Palabra | Qué es |
|---|---|
| **OpenAPI** | el **estándar**: un formato para describir una API (antes se llamaba "Swagger 2.0") |
| **Swagger UI** | la **página web** que dibuja ese formato y deja probar las rutas |
| **swagger-jsdoc** | la **librería** que arma el OpenAPI leyendo comentarios del código |
| **especificación / spec** | el documento resultante (un JSON grande) |
| **`$ref`** | "esto es igual a aquello": evita repetir |
| **componente** | una pieza reutilizable (un schema, una respuesta, un parámetro) |
| **schema** | la forma de un dato (qué campos tiene y de qué tipo) |
| **operación** | un verbo sobre una ruta: `get /api/libros` |

> ⭐ **La distinción que importa:** *OpenAPI* es el formato, *Swagger* son las
> herramientas. Se dice "la doc de Swagger" pero lo que se escribe es OpenAPI.

---

## 1 · Instalar y montar Swagger UI

### 1.1 · Las dos dependencias

```bash
npm install swagger-jsdoc swagger-ui-express
```

- **swagger-jsdoc** lee comentarios `@openapi` y arma el documento.
- **swagger-ui-express** sirve la página de Swagger UI desde nuestro Express.

> Estas **no** van en `--save-dev`: se usan cuando el servidor corre.

### 1.2 · El archivo de la definición

**Archivo nuevo: [`src/docs/swagger.js`](src/docs/swagger.js).** Por ahora, lo mínimo:

```js
import swaggerJsdoc from "swagger-jsdoc"
import { PORT } from "../utils/config.js"

const definicion = {
    openapi: "3.0.3",                 // la versión del ESTÁNDAR, no la de nuestra API

    info: {
        title: "API Biblioteca",
        version: "1.0.0",
        description: "API de la cursada: libros, autores, carrito y pedidos.",
    },

    // Dónde está la API. Swagger UI usa el primero para el botón "Try it out"
    servers: [
        { url: `http://localhost:${PORT}`, description: "Desarrollo (tu máquina)" },
    ],
}

export const especificacion = swaggerJsdoc({
    definition: definicion,
    // ⭐ dónde buscar los comentarios @openapi
    apis: ["./src/routes/*.js"],
})
```

> ⚠️ El `apis` es un **glob relativo a donde se ejecuta `npm start`**, no a este
> archivo. Si una ruta no aparece después en la pantalla, lo primero que hay que
> mirar es si su archivo entra en ese patrón.

### 1.3 · Montarlo

En **[`src/app.js`](src/app.js)**, arriba:

```js
import swaggerUi from "swagger-ui-express"
import { especificacion } from './docs/swagger.js'
```

Y antes de las rutas de la API:

```js
// Dos direcciones, para dos públicos distintos:
//   /api-docs       la página linda, para una PERSONA
//   /api-docs.json  el JSON crudo, para una MÁQUINA (Postman, generadores de clientes)
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(especificacion, {
    customSiteTitle: "API Biblioteca · documentación",
    swaggerOptions: { persistAuthorization: true },   // el token sobrevive al F5
}))

app.get("/api-docs.json", (req, res) => {
    res.json(especificacion)
})
```

> ⚠️ Va **antes del 404**, como cualquier ruta. Y ojo con publicarla en
> producción sin pensarlo: le estás contando a todo el mundo que existe
> `POST /api/usuarios`. Lo normal es dejarla solo en desarrollo:
> ```js
> if (NODE_ENV !== "production") { app.use("/api-docs", ...) }
> ```

### ✅ Checkpoint 1

```bash
npm start
```

Abrir **http://localhost:3000/api-docs**.

Tiene que verse el título **API Biblioteca**, la versión, el selector de
servidor… y **"No operations defined in spec!"**.

**Está perfecto.** Swagger funciona; todavía no documentamos ninguna ruta.

---

## 2 · La primera ruta documentada

La documentación de cada ruta es un comentario **arriba de la ruta**. Y acá está
la decisión de diseño del día: **vive al lado del código que describe**.

En **[`src/routes/libroRoutes.js`](src/routes/libroRoutes.js)**, arriba de la primera ruta:

```js
/**
 * @openapi
 * /api/libros:
 *   get:
 *     tags: [Libros]
 *     summary: Listar el catálogo
 *     description: Es público, no hace falta token.
 *     responses:
 *       200:
 *         description: Los libros
 */
router.get("/", libroController.listarLibroController)
```

### Qué es cada cosa

| Línea | Qué hace |
|---|---|
| `/** ... */` | tiene que ser **comentario de bloque con dos asteriscos**. Con `/*` no lo lee |
| `@openapi` | la marca que busca swagger-jsdoc |
| `/api/libros` | la ruta **completa**, con el prefijo del `app.use`. No es `/` |
| `get:` | el verbo, en minúscula |
| `tags` | en qué grupo aparece |
| `summary` | el renglón que se ve plegado. Corto |
| `description` | el texto largo, cuando se despliega. Acepta **markdown** |
| `responses` | los códigos posibles. Cada uno **necesita** su `description` |

> ⚠️ **Es YAML dentro de un comentario**: la indentación es parte del lenguaje.
> Dos espacios de más y la ruta no aparece, sin ningún error en la consola.
> Si algo no sale, el 90% de las veces es esto.

### Agregarle el contenido de la respuesta

Un `200` sin decir *qué* devuelve sirve de poco:

```js
 *     responses:
 *       200:
 *         description: Los libros que coinciden. Si no hay ninguno, un array vacío (no un 404)
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:    { type: string }
 *                   titulo: { type: string }
 *                   precio: { type: number }
```

Ya se ve el problema: **esa descripción del libro la vamos a repetir en cinco
rutas**. Lo arreglamos en el paso 3.

### Y los query params

```js
 *     parameters:
 *       - name: genero
 *         in: query
 *         description: Filtra por género
 *         schema: { type: string, enum: [novela, cuento, poesia] }
 *       - name: disponible
 *         in: query
 *         description: "Solo los disponibles. ⚠️ Llega como texto: vale 'true'"
 *         schema: { type: string, enum: ['true', 'false'] }
```

`in` puede ser `query` (después del `?`), `path` (el `:id`), `header` o `cookie`.

### ✅ Checkpoint 2

Recargar **http://localhost:3000/api-docs**: aparece el grupo **Libros** con
`GET /api/libros`.

Apretar **Try it out** → **Execute**.

⭐ **Ese es el momento de la clase:** la documentación **ejecutó la petición de
verdad** y muestra la respuesta real del servidor. No es un papel: es un cliente
de la API.

---

## 3 · Los componentes: dejar de repetirse

El schema del libro va a aparecer en `GET /`, `GET /:id`, `POST`, `PATCH` y
`DELETE`. Escribirlo cinco veces significa que **cuatro van a quedar viejas**.

La solución de OpenAPI son los **componentes**: se definen una vez en
[`src/docs/swagger.js`](src/docs/swagger.js) y se referencian con `$ref`.

### 3.1 · Los schemas

Dentro de `definicion`, al lado de `info`:

```js
    components: {
        schemas: {
            Autor: {
                type: "object",
                properties: {
                    _id: { type: "string", example: "68f1a2b3c4d5e6f701234567" },
                    nombre: { type: "string", example: "julio cortázar" },
                    nacionalidad: { type: "string", example: "argentina" },
                },
            },

            Libro: {
                type: "object",
                properties: {
                    _id: { type: "string", example: "68f1a2b3c4d5e6f701234568" },
                    titulo: { type: "string", example: "rayuela" },
                    isbn: { type: "string", example: "978-84-376-0494-7" },
                    genero: { type: "string", enum: ["novela", "cuento", "poesia"] },
                    precio: { type: "number", example: 15000 },
                    stock: { type: "integer", example: 4 },
                    disponible: { type: "boolean", example: true },

                    // ⭐ el autor viene POPULADO: no es un id, es un objeto.
                    //    Documentarlo así es lo que le dice al front qué esperar.
                    autor: { $ref: "#/components/schemas/Autor" },

                    imagen: {
                        type: "string",
                        nullable: true,
                        description: "URL de la tapa. null si el libro no tiene imagen",
                    },
                },
            },
        },
    },
```

Y la ruta queda así:

```js
 *       200:
 *         description: Los libros, con su autor populado
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Libro' }
```

> `#/components/schemas/Libro` se lee como una ruta de carpetas dentro del mismo
> documento: `#` es "este archivo".

### 3.2 · Dos schemas por recurso, no uno

Esto confunde siempre y es importante:

| Schema | Para qué | Tiene |
|---|---|---|
| `Libro` | lo que la API **devuelve** | `_id`, el autor **populado**, `imagen` |
| `LibroNuevo` | lo que el cliente **manda** | sin `_id`, el autor es un **string** (el id), con `required` |

```js
            LibroNuevo: {
                type: "object",
                required: ["titulo", "isbn", "precio"],
                properties: {
                    titulo: { type: "string", minLength: 2, example: "Rayuela" },
                    isbn: { type: "string", example: "978-84-376-0494-7" },
                    precio: { type: "number", minimum: 0, example: 15000 },
                    stock: { type: "integer", minimum: 0, default: 0 },
                    autor: {
                        type: "string",
                        nullable: true,
                        description: "El _id de un autor que ya exista. Es opcional",
                    },
                },
            },
```

⭐ **No son el mismo objeto visto dos veces: son dos contratos distintos.** El
cliente no manda `_id` (lo pone Mongo) y manda el autor como id (no como objeto).

Fijate además que `required`, `minLength` y `minimum` son **el espejo del
modelo de Mongoose**. La doc cuenta las reglas que ya están en el código.

### 3.3 · Los parámetros y las respuestas, también

El `:id` aparece en 10 rutas; los errores, en todas:

```js
        parameters: {
            IdEnLaRuta: {
                name: "id",
                in: "path",
                required: true,
                description: "El _id de MongoDB (24 caracteres hexadecimales)",
                schema: { type: "string" },
            },
        },

        responses: {
            SinToken: {
                description: "Falta el token, o no es válido, o venció",
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/Error" },
                        example: { error: "Falta el token. Mandá el header Authorization: Bearer <token>" },
                    },
                },
            },
            SinPermiso: { /* 403... */ },
            NoExiste: { /* 404... */ },
            DatosInvalidos: { /* 400... */ },
            Conflicto: { /* 409... */ },
        },
```

⭐ **Acá está el ahorro grande.** Ahora una ruta entera se documenta así:

```js
 *     parameters:
 *       - $ref: '#/components/parameters/IdEnLaRuta'
 *     responses:
 *       200:
 *         description: El libro
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Libro' }
 *       400: { $ref: '#/components/responses/DatosInvalidos' }
 *       404: { $ref: '#/components/responses/NoExiste' }
```

Tres líneas para tres errores. Y **no hay dos rutas que expliquen el 401 de
forma distinta**, que es el problema real de documentar a mano.

### 3.4 · Un detalle que muerde: el `example` se hereda

Si una respuesta referencia `schemas/Error` y no pone su propio `example`,
Swagger UI muestra el ejemplo **del schema** — que puede no tener nada que ver:

```js
 *       409:
 *         description: Ese ISBN ya está cargado en otro libro
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *             # sin esta línea, el ejemplo que se ve es "Ese id no tiene un formato válido"
 *             example: { error: 'El ISBN 978-84-376-0494-7 ya está cargado en otro libro' }
```

> Nos pasó armando esta guía: el 401 del login mostraba un ejemplo sobre ids.
> **Un ejemplo equivocado es peor que no poner ninguno.**

### ✅ Checkpoint 3

Recargar. Abajo de todo aparece la sección **Schemas** con `Libro`, `LibroNuevo`
y `Autor`, desplegables. Y en cada ruta, la pestaña **Schema** al lado de
**Example Value**.

---

## 4 · El botón Authorize

La mitad de las rutas piden token. Hasta ahora, para probarlas desde Swagger,
no hay forma. Esto lo arregla.

### 4.1 · Declarar el esquema de seguridad

En `components`, al lado de `schemas`:

```js
        securitySchemes: {
            bearerAuth: {
                type: "http",
                scheme: "bearer",
                bearerFormat: "JWT",
                description: "Pegá acá el token que devuelve POST /api/auth/login",
            },
        },
```

Eso solo hace aparecer el botón **Authorize 🔓** arriba a la derecha.

### 4.2 · Marcar las rutas protegidas

Una línea por ruta:

```js
 *   post:
 *     tags: [Libros]
 *     summary: Crear un libro (staff)
 *     security: [{ bearerAuth: [] }]        ← ⭐ esta
```

Eso hace dos cosas: le pone un **candado 🔒** a la ruta, y hace que Swagger UI
le mande el header `Authorization: Bearer <token>` cuando ejecutes.

> El `[]` de `bearerAuth: []` es para los *scopes* de OAuth. Con JWT va vacío,
> pero la sintaxis lo pide igual.

> ⚠️ **Si una ruta protegida se olvida el `security`**, Swagger UI no le manda
> el token: el alumno aprieta Execute, ve un 401 y piensa que la API está rota,
> cuando el que está mal es el comentario. En el paso 7 hay un test para esto.

### 4.3 · El `description` general, que es donde nadie mira

En `info.description` conviene dejar las instrucciones, porque es lo primero
que se ve al entrar:

```js
        description:
            "API de la cursada: catálogo de libros, autores, carrito y pedidos.\n\n" +
            "**Para probar las rutas protegidas:** entrá a `POST /api/auth/login`, " +
            "copiá el `token` de la respuesta, apretá el botón **Authorize** 🔓 de " +
            "arriba a la derecha y pegalo. Queda puesto para todas las rutas.",
```

### ✅ Checkpoint 4 · ⭐ el momento de la clase

1. `POST /api/auth/login` → **Try it out** → con `carla.ruiz@mail.com` / `carla1234` → **Execute**
2. Copiar el `token` de la respuesta (sin las comillas)
3. **Authorize** 🔓 arriba → pegar → **Authorize** → **Close**
4. Los candados de toda la página pasan de 🔓 a 🔒
5. `GET /api/auth/perfil` → **Try it out** → **Execute**

Tiene que dar **200** con los datos de Carla. **Y sin la password**, que es la
otra promesa que hace la doc.

> ⭐ Acá es donde se entiende todo: **reemplazamos Postman por la propia API**.
> Quien reciba el link puede probar todo sin instalar nada ni pedirnos una
> colección.
>
> Y con `persistAuthorization: true`, el token sobrevive al F5.

---

## 5 · Subir archivos y el resto del CRUD

`POST /api/libros` acepta **dos formatos de body**. Y se documentan los dos:

```js
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/LibroNuevo' }
 *         multipart/form-data:
 *           schema:
 *             allOf:
 *               - $ref: '#/components/schemas/LibroNuevo'
 *               - type: object
 *                 properties:
 *                   imagen:
 *                     type: string
 *                     format: binary        ← ⭐ esto es "un archivo"
 *                     description: >
 *                       La tapa. Solo imágenes, hasta 4 MB. El campo tiene que
 *                       llamarse exactamente `imagen`.
```

Dos cosas nuevas:

- **`format: binary`** es lo que hace que Swagger UI muestre un **botón para
  elegir un archivo**. Con eso se puede subir una tapa desde la documentación.
- **`allOf`** significa "todo lo de aquel schema, **más** esto". Evita copiar
  los campos del libro otra vez.

Y la lista de errores, que es donde la doc se gana el sueldo:

```js
 *     responses:
 *       201: ...
 *       400:
 *         description: >
 *           Datos inválidos, o el archivo no es una imagen, o pesa más de 4 MB,
 *           o el campo del archivo no se llama `imagen`
 *       401: { $ref: '#/components/responses/SinToken' }
 *       403: { $ref: '#/components/responses/SinPermiso' }
 *       409:
 *         description: Ese ISBN ya está cargado en otro libro
 *       502:
 *         description: El storage de imágenes falló. No es culpa tuya ni nuestra
```

> ⭐ **Documentar los errores es la mitad del valor de todo esto.** El camino
> feliz se adivina; que un ISBN repetido da 409 y no 400, no.

### ✅ Checkpoint 5

En `POST /api/libros`, elegir `multipart/form-data` en el desplegable de
**Request body**: aparecen los campos uno por uno y el botón de archivo.
Con el token de Carla puesto, se puede crear un libro con tapa **desde la
documentación**.

---

## 6 · Documentar el resto de la API

Ya no hay nada nuevo que aprender: es aplicar lo mismo a los otros 5 routers.
Lo que sí vale la pena es **qué contar** en cada uno:

| Router | Lo que la doc tiene que explicar y el código no dice solo |
|---|---|
| [`authRoutes`](src/routes/authRoutes.js) | que el registro **ya devuelve el token**; que el 401 del login no dice *cuál* de los dos está mal, a propósito |
| [`autorRoutes`](src/routes/autorRoutes.js) | que **no se puede borrar un autor con libros** (409) |
| [`carritoRoutes`](src/routes/carritoRoutes.js) | que **no hay id de usuario en la URL** y por qué; que `POST` **suma** y `PATCH` **fija** |
| [`pedidoRoutes`](src/routes/pedidoRoutes.js) | que el checkout **no lleva body**; que el precio queda **congelado**; que cancelar **devuelve el stock**; que un pedido ajeno da **403 y no 404** |
| [`usuarioRoutes`](src/routes/usuarioRoutes.js) | que acá **sí** se puede elegir el rol, a diferencia de `/auth/registro` |

> ⭐ Fijate el patrón: **la documentación cuenta las decisiones**, no los
> campos. Los campos se ven en el schema; que cancelar devuelva el stock, no.

### El debate que conviene dar (5 min)

Las rutas quedaron con más comentario que código. Es real y tiene dos lados:

| A favor de tenerlo al lado del código | En contra |
|---|---|
| si cambiás la ruta, la doc está tres líneas arriba: la ves | el archivo se hace largo |
| no hay que acordarse de ir a otro archivo | mezcla dos lenguajes (JS y YAML) |
| el `git diff` muestra el cambio y su doc juntos | |

La alternativa es poner la documentación en archivos `.yaml` aparte y
apuntarlos desde `apis`:

```js
apis: ["./src/routes/*.js", "./src/docs/*.yaml"]
```

Las dos son válidas. **Lo que no se discute es que la doc tiene que estar en el
repositorio**, versionada con el código: una doc en Word en el Drive de alguien
no es documentación.

### ✅ Checkpoint 6

En `/api-docs` están los **6 grupos** y las **27 operaciones**. Y en
`/api-docs.json`, el documento entero.

---

## 7 · Que la doc no se desactualice

> ⭐ **Acá se juntan las dos últimas clases.**

El problema de toda documentación es el mismo: **se desactualiza**. Alguien
agrega una ruta y se olvida del comentario. Y una documentación que miente es
**peor que no tener ninguna**, porque el que la lee le cree.

Un comentario no se puede testear… pero la especificación **es un objeto de
JavaScript**. Y eso sí.

**Archivo nuevo: [`tests/5-documentacion.test.js`](tests/5-documentacion.test.js)** · 13 tests

### 7.1 · Que la especificación esté sana

```js
it("⭐ no hay ningún $ref roto", () => {
    // Un $ref mal escrito NO rompe el servidor: Swagger UI muestra
    // "Could not resolve reference" en un rinconcito y el resto parece andar.
    const rotos = []

    const revisar = (nodo, donde) => { /* recorre el árbol buscando $ref */ }

    revisar(especificacion.paths, "paths")
    expect(rotos).toEqual([])
})
```

Más: que toda operación tenga `tags`, `summary` y al menos una respuesta; que
todos los tags usados estén declarados (un typo en un tag crea un grupo nuevo
y vacío, al final de la página).

### 7.2 · 🏆 Que toda ruta de Express esté documentada

**Este es el test que vale la clase.** Le pregunta a Express qué rutas tiene y
lo compara con lo que dice la doc.

Hay un obstáculo: **Express 5 ya no deja leer el prefijo** de un router montado.
La solución es también mejor diseño — que los montajes vivan en una lista, en
[`src/app.js`](src/app.js):

```js
export const RUTAS = [
    ["/api/auth", authRoutes],
    ["/api/libros", libroRoutes],
    ["/api/autores", autorRoutes],
    ["/api/usuarios", usuarioRoutes],
    ["/api/carrito", carritoRoutes],
    ["/api/pedidos", pedidoRoutes],
]

for (const [prefijo, router] of RUTAS) {
    app.use(prefijo, router)
}
```

Hace exactamente lo mismo que los seis `app.use()` sueltos, pero ahora hay **una
sola fuente de verdad** sobre qué rutas tiene la API.

Y el test:

```js
it("Express y la documentación tienen las MISMAS rutas", () => {
    const enElCodigo = rutasDeExpress().map(normalizar)   // :id → {id}
    const enLaDoc = /* las operaciones de especificacion.paths */

    const sinDocumentar = enElCodigo.filter((r) => !enLaDoc.has(r))
    const documentadasDeMas = [...enLaDoc].filter((r) => !enElCodigo.includes(r))

    // ⚠️ LOS DOS LADOS IMPORTAN:
    //  · sin documentar     → existe y nadie sabe
    //  · documentada de más → la doc promete algo que NO existe (peor)
    expect({ sinDocumentar, documentadasDeMas })
        .toEqual({ sinDocumentar: [], documentadasDeMas: [] })
})
```

Si alguien agrega una ruta y se olvida del comentario, **el test se pone rojo
con el nombre de la ruta que falta**. La documentación deja de depender de que
alguien se acuerde.

> ⭐ Y fijate el `expect(enElCodigo.length).toBeGreaterThan(20)` que hay antes:
> si el recorrido de Express se rompiera y devolviera una lista vacía, el test
> pasaría siempre. Un test que no puede fallar es peor que no tenerlo.

### 7.3 · Que la doc no mienta

Lo anterior comprueba que la doc **exista**. Esto, que diga **la verdad**: se
corre la petición de verdad y se compara.

```js
it("⭐ el schema Libro describe EXACTAMENTE lo que manda la API", async () => {
    const res = await request(app).get("/api/libros")
    const libro = res.body[0]

    const documentadas = Object.keys(especificacion.components.schemas.Libro.properties)

    // la API no manda nada que la doc no cuente
    expect(Object.keys(libro).filter((c) => !documentadas.includes(c))).toEqual([])
})
```

> 🔍 **Esto encontró algo de verdad al escribir la guía.** La API mandaba dos
> campos que la documentación no mencionaba: `creado` y `__v` (el *version key*
> que agrega Mongoose solo). No estaban mal — pero no estaban contados.
>
> **Ese es el efecto secundario bueno de documentar:** te obliga a mirar lo que
> realmente estás mandando. Aparecieron también `nacimiento` en Autor y
> `createdAt`/`updatedAt` en Usuario.
>
> (Si `__v` molesta, se esconde con `toJSON: { versionKey: false }` en el schema.)

Y el que cuida al usuario:

```js
it("⭐ el schema Sesion NO promete la password, y la API tampoco la manda", async () => {
    expect(Object.keys(especificacion.components.schemas.Usuario.properties))
        .not.toContain("password")

    const res = await request(app).post("/api/auth/registro").send({ /* ... */ })
    expect(res.body.usuario.password).toBeUndefined()
})
```

**La documentación también es una promesa de lo que NO mandamos.**

### ✅ Checkpoint 7

```bash
npm test
```

```
PASS tests/5-documentacion.test.js
Tests:       93 passed, 93 total
```

### El sabotaje

Agregá una ruta nueva sin documentarla:

```js
// en libroRoutes.js
router.get("/destacados", libroController.listarLibroController)
```

```bash
npm test -- tests/5
```

```
× Express y la documentación tienen las MISMAS rutas

  "sinDocumentar": Array [
    "get /api/libros/destacados",
  ],
```

**El test te dice exactamente qué te olvidaste.** Sacala y volvé a verde.

---

## 8 · Cierre: exportar, publicar y lo que sigue

### La doc también es para máquinas

`/api-docs.json` no es un extra: es **el formato que entienden otras herramientas**.

| Qué | Cómo |
|---|---|
| **Importarla en Postman** | Import → Link → `http://localhost:3000/api-docs.json`. Arma la colección sola, con carpetas y ejemplos |
| **Generar un cliente** | `openapi-generator` produce las funciones del front en TypeScript |
| **Validarla** | `npx @redocly/cli lint api-docs.json` |
| **Publicarla linda** | Redoc, Stoplight, Scalar: leen el mismo JSON |

> ⭐ Ya no hace falta mantener la colección de Postman a mano. La colección
> **se genera** desde la doc, y la doc se genera desde el código.

### Lo que no hicimos y conviene saber que existe

- **`deprecated: true`** en una operación: la tacha en la pantalla. Es como se
  avisa que una ruta va a desaparecer, sin romperla todavía.
- **Versionado** (`/api/v1`): cuando la API cambia de forma, conviven las dos.
- **`examples`** (en plural): varios ejemplos con nombre para la misma respuesta.
- **Escribir primero la doc y después el código** (*design-first*): el equipo de
  front puede empezar con el contrato antes de que la API exista.

### Las tres ideas para llevarse

1. **La documentación vive con el código**, no en un Drive. Si no está en el
   repositorio, se desactualiza.
2. **Lo que vale documentar son las decisiones**, no los campos: que cancelar
   devuelve el stock, que un pedido ajeno da 403 y no 404.
3. **Una doc que miente es peor que no tener doc.** Por eso se testea.

---

## Si algo no anda

| Lo que ves | Qué pasa |
|---|---|
| `No operations defined in spec!` | swagger-jsdoc no encontró los comentarios: mirá el glob de `apis` y que el comentario empiece con `/**` (dos asteriscos) |
| la ruta no aparece, y no hay error | casi siempre **indentación**: es YAML. Pegá el bloque en editor.swagger.io para ver el error |
| `Could not resolve reference` | un `$ref` con un typo. El test de `$ref` rotos lo caza |
| la ruta aparece en un grupo nuevo al final | un typo en el `tag`: no coincide con los declarados en `tags` |
| **Execute** da 401 en una ruta que debería andar | falta `security: [{ bearerAuth: [] }]` en esa operación, o no apretaste Authorize |
| **Execute** da un error de CORS | el `servers` apunta a otro host que el que estás mirando |
| el ejemplo que muestra no tiene nada que ver | el `example` se heredó del schema: poné uno propio en esa respuesta |
| `/api-docs` da 404 | lo montaste **después** del middleware 404 de [`app.js`](src/app.js) |
| el token se pierde al recargar | falta `swaggerOptions: { persistAuthorization: true }` |

---

## El mapa final

```
15/
├── src/
│   ├── docs/
│   │   └── swagger.js            ⭐ nuevo · portada, schemas, seguridad, respuestas
│   ├── app.js                        + monta /api-docs y exporta RUTAS
│   └── routes/*.js                   + los comentarios @openapi (27 operaciones)
└── tests/
    └── 5-documentacion.test.js   ⭐ nuevo · 13 tests que cuidan la doc
```

**27 operaciones · 6 grupos · 15 schemas · 83 tests en verde.**
