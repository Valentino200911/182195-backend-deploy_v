# Documentar la API con Swagger · paso a paso

> Escrito sobre **el código que tenemos en clase** (`182195-backend/15`).
> Al terminar, `http://localhost:3000/api-docs` muestra las **27 rutas** de la
> API, se pueden **probar desde el navegador**, y hay **13 tests** que vigilan
> que la documentación no mienta.

---

## Lo que vamos a conseguir

Hoy, para que alguien use nuestra API, hay que mandarle la colección de Postman,
explicarle qué usuario usar, explicarle que el token va en un header, y estar a
mano para cuando pregunte por qué el `PATCH` del carrito no suma sino que
reemplaza.

Al final de este documento, se le manda **un link**.

---

## El vocabulario (8 palabras)

| Palabra | Qué es |
|---|---|
| **OpenAPI** | el **estándar**: un formato para describir una API |
| **Swagger UI** | la **página web** que dibuja ese formato y deja probar las rutas |
| **swagger-jsdoc** | la **librería** que arma el OpenAPI leyendo comentarios del código |
| **especificación / spec** | el documento resultante (un JSON grande) |
| **`$ref`** | "esto es igual a aquello": evita repetir |
| **componente** | una pieza reutilizable (un schema, una respuesta, un parámetro) |
| **schema** | la forma de un dato: qué campos tiene y de qué tipo |
| **operación** | un verbo sobre una ruta: `get /api/libros` |

> ⭐ *OpenAPI* es el formato, *Swagger* son las herramientas. Se dice "la doc de
> Swagger", pero lo que uno escribe es OpenAPI.

---

## Paso 1 · Instalar

```bash
npm install swagger-jsdoc swagger-ui-express
```

- **swagger-jsdoc** lee comentarios `@openapi` y arma el documento.
- **swagger-ui-express** sirve la página de Swagger UI desde nuestro Express.

> Estas **no** van en `--save-dev`: se usan cuando el servidor corre de verdad.

---

## Paso 2 · El archivo de la definición

**[`src/docs/swagger.js`](src/docs/swagger.js)** (nuevo). Tiene las dos partes que **no** van por ruta:
la portada y los componentes reutilizables. Arrancamos con lo mínimo:

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
    apis: ["./src/routes/*.js"],      // ⭐ dónde buscar los comentarios @openapi
})
```

> ⚠️ El `apis` es un glob **relativo a donde corre `npm start`**, no a este
> archivo. Si después una ruta no aparece, lo primero que hay que mirar es si su
> archivo entra en ese patrón.

---

## Paso 3 · Montarlo en la app

En **[`src/app.js`](src/app.js)**, arriba:

```js
import swaggerUi from "swagger-ui-express"
import { especificacion } from './docs/swagger.js'
```

Y **antes** de las rutas de la API:

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

> ⚠️ Va **antes del 404**, como cualquier ruta. Si lo ponés después, `/api-docs`
> da 404 y parece que no se instaló nada.
>
> Y ojo con publicarla en producción sin pensarlo: le estás contando a todo el
> mundo que existe `POST /api/usuarios`.

**✅ Probar:** `npm start` → `http://localhost:3000/api-docs`

Tiene que verse el título y **"No operations defined in spec!"**. Está bien:
Swagger anda, todavía no documentamos nada.

---

## Paso 4 · La primera ruta

La documentación de cada ruta es un comentario **arriba de la ruta**, en el
mismo archivo. En **[`src/routes/libroRoutes.js`](src/routes/libroRoutes.js)**:

```js
/**
 * @openapi
 * /api/libros:
 *   get:
 *     tags: [Libros]
 *     summary: Listar el catálogo
 *     description: Es público, no hace falta token.
 *     parameters:
 *       - name: genero
 *         in: query
 *         description: Filtra por género
 *         schema: { type: string, enum: [novela, cuento, poesia] }
 *     responses:
 *       200:
 *         description: Los libros. Si no hay ninguno, un array vacío (no un 404)
 */
router.get("/", libroController.listarLibroController)
```

### Qué es cada cosa

| Línea | Qué hace |
|---|---|
| `/** ... */` | **comentario de bloque con dos asteriscos**. Con `/*` no lo lee |
| `@openapi` | la marca que busca swagger-jsdoc |
| `/api/libros` | la ruta **completa**, con el prefijo del `app.use`. No es `/` |
| `get:` | el verbo, en minúscula |
| `tags` | en qué grupo aparece en la pantalla |
| `summary` | el renglón que se ve plegado. Corto |
| `description` | el texto largo. Acepta **markdown** |
| `parameters` | `in:` puede ser `query`, `path`, `header` o `cookie` |
| `responses` | los códigos posibles. Cada uno **necesita** su `description` |

> ⚠️ **Es YAML dentro de un comentario:** la indentación es parte del lenguaje.
> Dos espacios de más y la ruta no aparece, **sin ningún error en la consola**.
> Si algo no sale, el 90% de las veces es esto. Para encontrarlo, pegá el bloque
> en **editor.swagger.io**, que sí te dice dónde está el problema.

**✅ Probar:** recargar `/api-docs` → aparece el grupo **Libros** →
**Try it out** → **Execute**.

⭐ La documentación **ejecutó la petición de verdad**. No es un papel: es un
cliente de la API.

---

## Paso 5 · Los componentes (dejar de repetirse)

El schema del libro va a aparecer en 5 rutas. Escribirlo 5 veces significa que
**4 van a quedar viejas**. Para eso están los componentes: se definen una vez en
[`src/docs/swagger.js`](src/docs/swagger.js) y se referencian con `$ref`.

### 5.1 · Los schemas

```js
    components: {
        schemas: {
            Autor: {
                type: "object",
                properties: {
                    _id: { type: "string" },
                    nombre: { type: "string", example: "julio cortázar" },
                    nacionalidad: { type: "string", example: "argentina" },
                },
            },

            Libro: {
                type: "object",
                properties: {
                    _id: { type: "string" },
                    titulo: { type: "string", example: "rayuela" },
                    isbn: { type: "string", example: "978-84-376-0494-7" },
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

Y en la ruta:

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
> documento: el `#` es "este archivo".

### 5.2 · ⭐ Dos schemas por recurso, no uno

Esto confunde siempre y es lo más importante del paso:

| Schema | Para qué | Cómo es |
|---|---|---|
| `Libro` | lo que la API **devuelve** | con `_id`, el autor **populado** |
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

**No son el mismo objeto visto dos veces: son dos contratos distintos.**

Y fijate que `required`, `minLength` y `minimum` son **el espejo del modelo de
Mongoose**: la doc cuenta las reglas que ya están en el código.

### 5.3 · Parámetros y respuestas reutilizables

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
            SinPermiso: { /* 403 */ },
            NoExiste: { /* 404 */ },
            DatosInvalidos: { /* 400 */ },
            Conflicto: { /* 409 */ },
        },
```

⭐ **Acá está el ahorro grande.** Una ruta entera se documenta así:

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

### 5.4 · Un detalle que muerde: el `example` se hereda

Si una respuesta referencia `schemas/Error` y **no** pone su propio `example`,
Swagger UI muestra el ejemplo **del schema**, que puede no tener nada que ver:

```js
 *       409:
 *         description: Ese ISBN ya está cargado en otro libro
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *             # sin esta línea, el ejemplo que se ve habla de ids
 *             example: { error: 'El ISBN 978-84-376-0494-7 ya está cargado en otro libro' }
```

> **Un ejemplo equivocado es peor que no poner ninguno.**

---

## Paso 6 · ⭐ El botón Authorize

La mitad de las rutas piden token. Esto es lo que permite probarlas.

### 6.1 · Declarar el esquema de seguridad

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

### 6.2 · Marcar las rutas protegidas

Una línea por ruta:

```js
 *   post:
 *     tags: [Libros]
 *     summary: Crear un libro (staff)
 *     security: [{ bearerAuth: [] }]        ← ⭐ esta
```

Hace dos cosas: le pone un **candado 🔒** a la ruta, y hace que Swagger UI le
mande el header `Authorization: Bearer <token>` al ejecutar.

> El `[]` de `bearerAuth: []` es para los *scopes* de OAuth. Con JWT va vacío,
> pero la sintaxis lo pide igual.
>
> ⚠️ **Si una ruta protegida se olvida el `security`**, Swagger UI no le manda
> el token: apretás Execute, ves un 401 y parece que la API está rota, cuando el
> que está mal es el comentario.

### ✅ El momento de la clase

1. `POST /api/auth/login` → **Try it out** → `carla.ruiz@mail.com` / `carla1234` → **Execute**
2. Copiar el `token` de la respuesta (sin las comillas)
3. **Authorize** 🔓 arriba → pegar → **Authorize** → **Close**
4. Los candados de toda la página pasan de 🔓 a 🔒
5. `GET /api/auth/perfil` → **Try it out** → **Execute**

Tiene que dar **200** con los datos de Carla. **Y sin la password**, que es la
otra promesa que hace la doc.

> ⭐ Acá se entiende todo: **reemplazamos Postman por la propia API**. Quien
> reciba el link puede probar todo sin instalar nada ni pedirnos una colección.

---

## Paso 7 · Subir archivos

`POST /api/libros` acepta **dos formatos de body**, y se documentan los dos:

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

- **`format: binary`** hace que Swagger UI muestre un **botón para elegir un
  archivo**: se puede subir una tapa desde la documentación.
- **`allOf`** significa "todo lo de aquel schema, **más** esto". Evita copiar
  los campos del libro otra vez.

Y la lista de errores, que es donde la doc se gana el sueldo:

```js
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
> feliz se adivina; que un ISBN repetido dé 409 y no 400, no.

---

## Paso 8 · Qué contar en cada router

Ya no hay nada nuevo que aprender: es aplicar lo mismo a los otros routers. Lo
que sí vale la pena pensar es **qué** contar:

| Router | Lo que la doc explica y el código no dice solo |
|---|---|
| `authRoutes` | que el registro **ya devuelve el token**; que el 401 del login no dice *cuál* de los dos está mal, a propósito |
| `autorRoutes` | que **no se puede borrar un autor con libros** (409) |
| `carritoRoutes` | que **no hay id de usuario en la URL** y por qué; que `POST` **suma** y `PATCH` **fija** |
| `pedidoRoutes` | que el checkout **no lleva body**; que el precio queda **congelado**; que cancelar **devuelve el stock**; que un pedido ajeno da **403 y no 404** |
| `usuarioRoutes` | que acá **sí** se puede elegir el rol, a diferencia de `/auth/registro` |

> ⭐ El patrón: **la documentación cuenta las decisiones**, no los campos. Los
> campos se ven en el schema; que cancelar devuelva el stock, no.

---

## Paso 9 · ⭐ Que la doc no se desactualice

**Acá se juntan las dos últimas clases.**

El problema de toda documentación es el mismo: **se desactualiza**. Y una
documentación que miente es **peor que no tener ninguna**, porque el que la lee
le cree.

Un comentario no se puede testear… pero la especificación **es un objeto de
JavaScript**. Y eso sí.

**[`tests/5-documentacion.test.js`](tests/5-documentacion.test.js)** (nuevo) · **13 tests**

### 9.1 · Que la especificación esté sana

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
todos los tags usados estén declarados (un typo en un tag crea un grupo nuevo y
vacío, al final de la página).

### 9.2 · 🏆 Que toda ruta de Express esté documentada

**Este es el test que vale la clase.**

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

**Probalo rompiéndolo:** agregá una ruta sin documentar

```js
router.get("/destacados", libroController.listarLibroController)
```

```
× Express y la documentación tienen las MISMAS rutas

  "sinDocumentar": Array [
    "get /api/libros/destacados",
  ],
```

El test te dice **exactamente** qué te olvidaste.

### 9.3 · Que la doc no mienta

Lo anterior comprueba que la doc **exista**. Esto, que diga **la verdad**:

```js
it("⭐ el schema Libro describe EXACTAMENTE lo que manda la API", async () => {
    const res = await request(app).get("/api/libros")
    const libro = res.body[0]

    const documentadas = Object.keys(especificacion.components.schemas.Libro.properties)

    // la API no manda nada que la doc no cuente
    expect(Object.keys(libro).filter((c) => !documentadas.includes(c))).toEqual([])
})
```

> 🔍 **Esto encontró algo de verdad.** La API mandaba dos campos que la doc no
> mencionaba: `creado` y `__v` (el *version key* que agrega Mongoose solo). No
> estaban mal — pero no estaban contados. Aparecieron también `nacimiento` en
> Autor y `createdAt`/`updatedAt` en Usuario.
>
> **Ese es el efecto secundario bueno de documentar:** te obliga a mirar lo que
> realmente estás mandando.
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

---

## La doc también es para máquinas

`/api-docs.json` no es un extra: es **el formato que entienden otras
herramientas**.

| Qué | Cómo |
|---|---|
| **Importarla en Postman** | Import → Link → `http://localhost:3000/api-docs.json`. Arma la colección sola, con carpetas y ejemplos |
| **Generar un cliente** | `openapi-generator` produce las funciones del front en TypeScript |
| **Validarla** | `npx @redocly/cli lint api-docs.json` |
| **Publicarla linda** | Redoc, Stoplight, Scalar: leen el mismo JSON |

> ⭐ Ya no hace falta mantener la colección de Postman a mano: **se genera**
> desde la doc, y la doc se genera desde el código.

---

## Si algo no anda

| Lo que ves | Qué pasa |
|---|---|
| `No operations defined in spec!` | swagger-jsdoc no encontró los comentarios: mirá el glob de `apis` y que el comentario empiece con `/**` (dos asteriscos) |
| la ruta no aparece, y no hay error | casi siempre **indentación**: es YAML. Pegá el bloque en editor.swagger.io |
| `Could not resolve reference` | un `$ref` con un typo. El test de `$ref` rotos lo caza |
| la ruta aparece en un grupo nuevo al final | un typo en el `tag`: no coincide con los declarados arriba |
| **Execute** da 401 en una ruta que debería andar | falta `security: [{ bearerAuth: [] }]`, o no apretaste Authorize |
| el ejemplo no tiene nada que ver | se heredó del schema: poné un `example` propio en esa respuesta |
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

**27 operaciones · 6 grupos · 15 schemas.**

### Tres ideas para llevarse

1. **La documentación vive con el código**, no en un Drive. Si no está en el
   repositorio, se desactualiza.
2. **Lo que vale documentar son las decisiones**, no los campos: que cancelar
   devuelve el stock, que un pedido ajeno da 403 y no 404.
3. **Una doc que miente es peor que no tener doc.** Por eso se testea.
