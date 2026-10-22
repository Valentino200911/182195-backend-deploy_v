# Unidad 24 · Testing de APIs con Jest y Supertest

> **Cómo leer esta guía:** está en el orden exacto en que se hacen las cosas.
> Cada paso dice **qué archivo se toca**, **el código completo** que va adentro,
> **por qué** va así, y termina en un **✅ checkpoint**: un comando y lo que
> tiene que salir. Si el checkpoint no da eso, no sigas: el problema está ahí.
>
> Escrito sobre el código de clase (`182195-backend/15`).
> 📋 El listado de los 70 tests, con a qué apunta cada uno:
> [LISTADO-DE-TESTS.md](LISTADO-DE-TESTS.md)

---

## Índice

| | Paso | Archivo que se toca | Min |
|---|---|---|---|
| **0** | [Por qué testear](#0--por-qué-testear) | — | 15 |
| **1** | [Partir la app en dos](#1--partir-la-app-en-dos) | [src/app.js](src/app.js) (nuevo) + [src/index.js](src/index.js) | 20 |
| **2** | [Instalar Jest y Supertest](#2--instalar-jest-y-supertest) | [`package.json`](package.json) | 10 |
| **3** | [Configurar Jest](#3--configurar-jest) | [jest.config.js](jest.config.js) (nuevo) | 10 |
| **4** | [⚠️ La base de los tests es otra](#4--la-base-de-los-tests-es-otra-base) | [tests/setup.js](tests/setup.js) (nuevo) | 10 |
| **5** | [Las ayudas](#5--las-ayudas-factories-y-red-de-seguridad) | [tests/ayudas.js](tests/ayudas.js) (nuevo) | 15 |
| **6** | [El vocabulario de Jest](#6--el-vocabulario-de-jest) | — | 10 |
| **7** | [Nivel 1 · unitarios](#7--nivel-1--tests-unitarios) | [tests/1-unitarios.test.js](tests/1-unitarios.test.js) | 25 |
| **8** | [Nivel 2 · services ⭐](#8--nivel-2--services) | [tests/2-services.test.js](tests/2-services.test.js) | 45 |
| **9** | [Nivel 3 · endpoints](#9--nivel-3--endpoints-con-supertest) | [tests/3-endpoints.test.js](tests/3-endpoints.test.js) | 40 |
| **10** | [Extra · middlewares y storage](#10--extra--middlewares-y-storage) | [tests/4-middlewares-y-storage.test.js](tests/4-middlewares-y-storage.test.js) | 15 |
| **11** | [Romperlo a propósito](#11--romperlo-a-propósito-los-3-sabotajes) | — | 15 |
| **12** | [Coverage y cierre](#12--coverage-y-cierre) | — | 20 |

Con el recreo, son 3 horas. **Los pasos 1 a 6 son una sola vez en la vida del
proyecto**: después, agregar un test es escribir un `it()`.

> 🅱️ Si el tiempo no alcanza: **[Plan B · los 9 infaltables](#-plan-b--los-9-infaltables-si-el-tiempo-no-alcanza)**

---

## 🅱️ Plan B · los 9 infaltables (si el tiempo no alcanza)

Si quedan 60 minutos y falta la mitad de la clase, **esto es lo que no se puede
dejar afuera**. Son 9 tests que entre todos enseñan cada idea del día **una sola
vez**, sin repetir.

Para correr solo esos:

```bash
npm test -- -t "nunca devuelve dos veces|NO borra un autor que tiene libros|tampoco si se llega al límite|descuenta el stock, congela|si falla a mitad de camino|otra persona recibe 403|responde 200 y un array|con token de compradora|todos es del staff"
```

```
Tests: 61 skipped, 9 passed, 70 total
Time:  1.5 s
```

| # | Test | Archivo | Qué es lo único que enseña |
|---|---|---|---|
| 1 | `nunca devuelve dos veces el mismo nombre` | [1-unitarios](tests/1-unitarios.test.js) | `describe/it/expect` · que un test sin base corre en 2 ms |
| 2 | `NO borra un autor que tiene libros, y avisa con 409` | [2-services](tests/2-services.test.js) | una regla del negocio · `rejects.toThrow` · **y que no quedó nada a medias** |
| 3 | `tampoco si se llega al límite de a poco` | [2-services](tests/2-services.test.js) | el test que un `if` mal escrito **no pasa** |
| 4 | `descuenta el stock, congela el precio y vacía el carrito` | [2-services](tests/2-services.test.js) | las 4 consecuencias de una operación · el precio congelado |
| 5 | `si falla a mitad de camino, NO deja stock descontado a medias` | [2-services](tests/2-services.test.js) | ⭐⭐ **el argumento de la clase:** esto a mano es imposible |
| 6 | `otra persona recibe 403, NO 404` | [2-services](tests/2-services.test.js) | los permisos se testean · 403 ≠ 404 |
| 7 | `responde 200 y un array` | [3-endpoints](tests/3-endpoints.test.js) | `request(app)` · que no hace falta levantar el server |
| 8 | `con token de compradora → 403` | [3-endpoints](tests/3-endpoints.test.js) | `.set("Authorization", ...)` · 401 ≠ 403 |
| 9 | `/todos es del staff y NO se confunde con /:id` | [3-endpoints](tests/3-endpoints.test.js) | el orden de las rutas, y de paso **el sabotaje 1** |

### Lo que NO se puede saltear, aunque no sea un test

Los pasos 1 a 5 son infraestructura: sin ellos **no corre nada**.

| Paso | Por qué es obligatorio |
|---|---|
| **1 · partir la app** | sin [`src/app.js`](src/app.js) no hay Supertest (tests 7, 8 y 9) |
| **2 · los scripts** | sin el flag, Jest no arranca |
| **3 · [`jest.config.js`](jest.config.js)** | sin `setupFiles` no se lee el paso 4 |
| **4 · [`tests/setup.js`](tests/setup.js)** | ⚠️ **lo único que puede hacer daño.** Nunca se saltea |
| **5 · [`tests/ayudas.js`](tests/ayudas.js)** | los 9 usan `conectarBaseDeTest`, `limpiarBase`, `cerrarBaseDeTest`, `crearAutor`, `crearLibro`, `crearComprador`, `crearVendedor` y `tokenDe`. Si hay que recortar, `tokenFalso`, `tokenVencido` y las dos de la carpeta de imágenes pueden esperar |

### El orden en que se cae lo demás

De lo primero que se suelta a lo último:

1. **el bloque 10** (middlewares y adaptador) — el nivel 3 ya los cruza
2. **los sabotajes 2 y 3** — con el 1 alcanza para que se entienda
3. **el coverage** — queda como lectura en el resumen
4. **los 6 tests de Multer** — son la clase pasada, no la de hoy
5. **el recorrido completo** ⚠️ este dolería: es el que cierra con el bloque 0

### Si llegás, estos cuatro son los siguientes

| Test | Qué agrega |
|---|---|
| `un libro sin título no es válido` | `validate()` sin Mongo · `error.errors.titulo` |
| `una persona se registra, compra y ve su pedido` | los 7 pasos del bloque 0, en 100 ms |
| `un PDF → 400 (lo frena el fileFilter)` | `.attach()` · que Multer solo se prueba por HTTP |
| `si el ISBN está repetido, la imagen subida se borra` | cierra la compensación de la clase 23 |

> ⭐ **Y si solo te queda tiempo para UNO:** el **5**. Mostrás el escenario
> (otra persona se lleva el último ejemplar), corrés, y preguntás cómo probarían
> eso a mano. Ese test solo justifica la clase entera.

---

## Antes de empezar

Tres cosas que tienen que estar:

```bash
node --version      # 20 o más
mongod --version    # y que esté PRENDIDO
npm start           # el proyecto tiene que arrancar HOY, antes de tocar nada
```

Si `npm start` no arranca, eso se arregla **primero**. Testear un proyecto roto
no tiene sentido.

> ⚠️ Un detalle del `.env`: si tenés `STORAGE=supabase` y el proyecto de Supabase
> se pausó (el plan free pausa a la semana sin uso), subir una imagen puede
> fallar. **A los tests no les afecta**: en el paso 4 los forzamos a `local`.
> Pero si vas a mostrar el server andando, chequealo antes.

---

## 0 · ¿Por qué testear?

Hasta hoy probamos **a mano, con Postman**. Funciona… hasta que el proyecto crece.

Contemos lo que hace falta para estar seguros de que el checkout anda:

1. registrarse · 2. loguearse · 3. copiar el token · 4. crear un autor ·
5. crear un libro con stock · 6. agregarlo al carrito · 7. confirmar el pedido ·
8. mirar que el stock bajó · 9. cancelar · 10. mirar que el stock volvió

**Diez pasos, cinco minutos, y hay que acordarse de todos.** Y eso es **un solo**
caso: falta el carrito vacío, el stock que no alcanza, el pedido de otro, el
ISBN repetido, el PDF…

> **La pregunta que importa:** cuando toques `pedidoService` la semana que viene,
> ¿vas a volver a hacer esos diez pasos a mano? ¿Y los otros veinte casos?
>
> Nadie lo hace. Por eso el software se rompe en lugares que *ya funcionaban*.
> Eso tiene nombre: **regresión**.

Un test es eso mismo, **escrito una vez y ejecutado en 3 segundos**.

Y hay un segundo motivo, menos obvio y más importante: **un test es
documentación que no puede mentir**. Un comentario que dice "esto devuelve 409"
puede quedar viejo. Un `expect(error.status).toBe(409)` no: si deja de ser
verdad, se pone rojo.

### El glosario de hoy (diez palabras)

| Palabra | Qué es |
|---|---|
| **suite** | el conjunto de todos los tests del proyecto |
| **test unitario** | prueba una función sola, sin base ni servidor |
| **test de integración** | prueba varias piezas juntas (service + base) |
| **test end-to-end (e2e)** | prueba todo el camino, por HTTP |
| **assertion** | la comprobación: `expect(x).toBe(y)` |
| **fixture / factory** | datos de prueba armados por nosotros (paso 5) |
| **test double** | un objeto de juguete que reemplaza a uno real |
| **spy / mock** | un doble que se acuerda de si lo llamaron (`jest.fn()`) |
| **coverage** | qué porcentaje del código tocaron los tests |
| **regresión** | algo que funcionaba y se rompió sin que nadie se diera cuenta |

---

## 1 · Partir la app en dos

**Esto es lo primero, y es lo que habilita todo lo demás.**

### El problema

Mirá [src/index.js](src/index.js) como estaba. Hacía **tres cosas juntas**:

```js
await conectarDB()        // 1. conectarse a Mongo
const app = express()     // 2. armar la app (rutas, middlewares)
app.listen(PORT, ...)     // 3. ponerse a escuchar en el 3000
```

Con las tres juntas **no se puede testear**: el solo hecho de escribir
`import app from "./index.js"` levantaría un servidor en el puerto 3000 y se
conectaría a la base de la cursada. Un test no puede hacer eso.

### 1.1 · Crear [`src/app.js`](src/app.js)

**Archivo nuevo.** Se le pasa **todo** lo que tenía [`index.js`](src/index.js) **menos**
`conectarDB()` y `app.listen()`, y termina exportando la app:

```js
import express from 'express'
import cors from "cors"
import libroRoutes from "./routes/libroRoutes.js"
import autorRoutes from "./routes/autorRoutes.js"
import usuarioRoutes from "./routes/usuarioRoutes.js"
import carritoRoutes from "./routes/carritoRoutes.js"
import authRoutes from "./routes/authRoutes.js"
import pedidoRoutes from "./routes/pedidoRoutes.js"
import { manejarErrores } from './middleware/manejarErrores.js'
import { CARPETA_IMAGENES } from './utils/config.js'

const app = express()

app.use(cors())
app.use(express.json())

// clase 23 · servir las imágenes guardadas en disco (solo hace falta con STORAGE=local)
app.use(`/${CARPETA_IMAGENES}`, express.static(CARPETA_IMAGENES))

app.use("/api/auth", authRoutes)
app.use("/api/libros", libroRoutes)
app.use("/api/autores", autorRoutes)
app.use("/api/usuarios", usuarioRoutes)
app.use("/api/carrito", carritoRoutes)
app.use("/api/pedidos", pedidoRoutes)

// el 404 va DESPUÉS de todas las rutas: si llegó hasta acá, no matcheó ninguna
app.use((req, res) => {
    res.status(404).json({ error: "Esa dirección no existe" })
})

// y el middleware de errores va ÚLTIMO, siempre
app.use(manejarErrores)

export default app        // ⭐ no hay listen ni conectarDB
```

> ⚠️ El orden importa, y es el mismo que tenía [`index.js`](src/index.js): primero los parsers,
> después las rutas, después el 404, y `manejarErrores` al final. Si el 404
> estuviera arriba, se comería todo.

### 1.2 · Vaciar [`src/index.js`](src/index.js)

**Archivo que ya existía.** Queda así, completo:

```js
import app from "./app.js"
import { conectarDB } from "./db.js"
import { PORT } from "./utils/config.js"

await conectarDB()

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`)
})
```

Pasó de 56 líneas a 19 con comentarios. **Para el que usa la API no cambió
nada**: `npm start` hace exactamente lo mismo.

### ✅ Checkpoint 1

```bash
npm start
```

Tiene que salir, igual que siempre:

```
MongoDB conectado . base "biblioteca"
Servidor corriendo en http://localhost:3000
```

Y `GET http://localhost:3000/api/libros` en Postman tiene que devolver los
libros. **Si esto no da, no sigas**: algo quedó afuera al mover el archivo
(casi siempre un `import`).

> ⭐ **El punto de la clase, dicho una vez:** testear te **obligó** a separar
> *"qué es la app"* de *"cómo se arranca"*. Y esa separación es mejor diseño
> por sí sola, sin tests de por medio. Por eso se dice que escribir tests
> mejora el código: no por los tests, sino por lo que te fuerzan a ordenar.

---

## 2 · Instalar Jest y Supertest

### 2.1 · Las dependencias

En la raíz del proyecto (donde está [`package.json`](package.json)):

```bash
npm install --save-dev jest supertest
```

- **Jest** corre los tests y trae `describe`, `it` y `expect`.
- **Supertest** hace peticiones HTTP a nuestra app **sin levantar un servidor**.

`--save-dev` porque son herramientas de desarrollo: en el servidor de producción
no hacen falta y solo sumarían peso.

### 2.2 · Los scripts

En [package.json](package.json), dentro de `"scripts"`, agregar tres líneas:

```json
"scripts": {
    "start": "node --watch src/index.js",
    "seed": "node src/seed.js",
    "test": "node --experimental-vm-modules node_modules/jest/bin/jest.js",
    "test:watch": "node --experimental-vm-modules node_modules/jest/bin/jest.js --watch",
    "test:coverage": "node --experimental-vm-modules node_modules/jest/bin/jest.js --coverage"
}
```

> ⚠️ **¿Por qué no el clásico `"test": "jest"`?**
> Porque nuestro proyecto es `"type": "module"`: usamos `import`/`export`, y Jest
> todavía necesita el flag `--experimental-vm-modules` para eso. Escrito así
> funciona igual en Windows, Mac y Linux, sin instalar nada más.
>
> **La única consecuencia práctica en todo el día:** `jest` **no** es una
> variable global. Si vas a usar `jest.fn()`, hay que importarlo:
> ```js
> import { jest } from "@jest/globals"
> ```
> No hay nada más raro que eso, y lo vamos a necesitar una sola vez (paso 10).

### ✅ Checkpoint 2

```bash
npm test
```

Tiene que decir, y está **perfecto** que lo diga:

```
No tests found, exiting with code 1
```

Jest está instalado y corriendo; todavía no hay tests. **Si en cambio dice
`Cannot use import statement outside a module`, el flag no quedó en el script.**

---

## 3 · Configurar Jest

**Archivo nuevo: [`jest.config.js`](jest.config.js), en la RAÍZ** (al lado de [`package.json`](package.json), no
dentro de `tests/`).

```js
export default {
    // Node y no "jsdom": estamos testeando una API, no una página web.
    // jsdom simula un navegador (document, window) y acá no hace falta.
    testEnvironment: "node",

    // Corre ANTES de todo, incluso antes de importar los archivos del test.
    // Ahí se define a qué base apuntan los tests. Lo creamos en el paso 4.
    setupFiles: ["<rootDir>/tests/setup.js"],

    // Dónde buscar los tests. Jest ya busca *.test.js solo, pero dejarlo
    // escrito evita que mañana intente correr algo de node_modules.
    testMatch: ["<rootDir>/tests/**/*.test.js"],

    // ⚠️ Los tests tocan Mongo de verdad: 5 segundos (el default) a veces
    //    no alcanza la primera vez que se conecta.
    testTimeout: 15000,

    // ⭐ Los archivos de test corren en PARALELO, cada uno en su proceso.
    //    Pero todos usan la MISMA base, y cada uno la vacía entre tests:
    //    si corrieran a la vez, uno le borraría los datos al otro.
    //    maxWorkers: 1 los pone en fila. Es más lento y es correcto.
    maxWorkers: 1,

    // Para npm run test:coverage: qué archivos contar.
    collectCoverageFrom: ["src/**/*.js", "!src/seed.js", "!src/index.js"],
}
```

`<rootDir>` es una variable de Jest: la carpeta donde está este archivo.

> **¿Por qué se excluyen [`seed.js`](src/seed.js) e [`index.js`](src/index.js) del coverage?** Porque ninguno de
> los dos se importa en los tests (uno arranca el server, el otro llena la base),
> y aparecerían siempre en 0% ensuciando el número.

### ✅ Checkpoint 3

```bash
npm test
```

Ahora tiene que fallar **distinto**:

```
Module <rootDir>/tests/setup.js in the setupFiles option was not found.
```

Perfecto: la config se está leyendo. Falta el archivo, que es el paso siguiente.

---

## 4 · La base de los tests es OTRA base

> ⚠️ **Esto es lo único de la clase que puede hacer daño. Leelo dos veces.**

Los tests **vacían colecciones enteras** entre un test y el siguiente (lo vas a
ver en el paso 5). Si apuntaran a `biblioteca`, **el primer `npm test` te borra
la base con la que venís trabajando toda la cursada.**

**Archivo nuevo: [`tests/setup.js`](tests/setup.js).** Creá la carpeta `tests/` en la raíz, al
lado de `src/`. Va completo:

```js
// =====================================================================
//  ESTE ARCHIVO CORRE ANTES QUE CUALQUIER TEST
//  (lo configura jest.config.js con "setupFiles")
// =====================================================================

// ⭐ LA BASE DE LOS TESTS ES OTRA BASE.
process.env.MONGO_URI = "mongodb://localhost:27017/biblioteca_test"

// El JWT_SECRET de los tests es propio: los tokens de los tests no tienen
// que servir en el servidor de verdad, ni al revés.
process.env.JWT_SECRET = "secreto-solo-para-los-tests"

// ⭐ Las imágenes se guardan en una carpeta, NO en Supabase.
process.env.STORAGE = "local"
process.env.CARPETA_IMAGENES = "uploads-test"
```

Cuatro líneas, y cada una tiene su motivo:

**1 · `MONGO_URI`** — la base aparte. Se crea sola la primera vez.

**2 · `JWT_SECRET`** — propio de los tests. Un token firmado en un test no sirve
en el servidor real, ni al revés: así no hay forma de confundirlos.

**3 y 4 · `STORAGE` y `CARPETA_IMAGENES`** — los tests **no suben nada a
Supabase**. Un test no puede depender de internet ni de la cuenta de nadie:
tiene que dar el mismo resultado siempre, en cualquier máquina, y en
milisegundos. Y nos sale **gratis**: una variable, gracias al adaptador de la
clase 23.

### ¿Y por qué funciona esto, si tenemos un `.env`?

Dos razones, y las dos importan:

1. **`setupFiles` corre antes de que se importe un solo archivo del proyecto.**
   [`config.js`](src/utils/config.js) lee el `.env` una sola vez, cuando alguien lo importa. Si
   pusiéramos esto dentro de un test, [`config.js`](src/utils/config.js) ya habría leído el `.env` y
   sería tarde.

2. **dotenv NO pisa una variable que ya existe.** Por eso alcanza con
   escribirla acá: gana esta, y la del `.env` queda ignorada.

### ✅ Checkpoint 4

```bash
npm test
```

```
No tests found, exiting with code 1
```

Volvimos al mensaje del checkpoint 2, pero ahora con todo configurado. **Si dice
que no encuentra [`setup.js`](tests/setup.js), el archivo está en otra carpeta o con otro nombre.**

---

## 5 · Las ayudas (factories y red de seguridad)

**Archivo nuevo: [`tests/ayudas.js`](tests/ayudas.js).** Nada de esto es magia de Jest: son
funciones **nuestras**, y existen para que cada test se lea en 4 líneas en vez
de 40.

> La regla que seguimos: **un test tiene que decir QUÉ se prueba.** Todo el
> "preparar el escenario" se esconde acá.

Va completo, por partes, pero **es un solo archivo**.

### 5.1 · Los imports

```js
import mongoose from "mongoose"
import jwt from "jsonwebtoken"
import fs from "fs"
import path from "path"
import { MONGO_URI, JWT_SECRET, CARPETA_IMAGENES } from "../src/utils/config.js"
import Autor from "../src/models/autor.js"
import Libro from "../src/models/libro.js"
import Usuario from "../src/models/usuario.js"
import Carrito from "../src/models/carrito.js"
import Pedido from "../src/models/pedido.js"
```

> Fijate que importa `MONGO_URI` **de nuestro [`config.js`](src/utils/config.js)**, no de
> `process.env` directo. Así lee exactamente el mismo valor que va a usar el
> proyecto: si [`setup.js`](tests/setup.js) no funcionara, lo descubrimos acá.

### 5.2 · La red de seguridad

```js
const nombreDeLaBase = () => MONGO_URI.split("/").pop().split("?")[0]

export const conectarBaseDeTest = async () => {
    const nombre = nombreDeLaBase()

    if (!nombre.endsWith("_test")) {
        throw new Error(
            `🛑 Los tests NO corren contra "${nombre}". ` +
            `La base de los tests tiene que terminar en "_test" (mirá tests/setup.js)`
        )
    }

    await mongoose.connect(MONGO_URI)
}

export const cerrarBaseDeTest = async () => {
    // ⚠️ Si no se cierra, Jest termina los tests pero el proceso queda colgado
    //    y aparece el famoso "Jest did not exit one second after...".
    await mongoose.connection.close()
}
```

Si alguien se confunde la URI, los tests **abortan antes de conectarse**, con un
mensaje que dice exactamente qué revisar. Es el cinturón de seguridad: molesta
cero y un día te salva.

### 5.3 · Limpiar entre tests

```js
// Se vacía antes de CADA test. Así un test no puede dejarle datos al
// siguiente: cada uno arranca de cero y el orden en que corren no importa.
export const limpiarBase = async () => {
    await Promise.all([
        Pedido.deleteMany({}),
        Carrito.deleteMany({}),
        Libro.deleteMany({}),
        Autor.deleteMany({}),
        Usuario.deleteMany({}),
    ])
}
```

> ⭐ **Un test que necesita que otro haya corrido antes es un test que un día va
> a fallar solo** — cuando alguien los reordene, o cuando uno quede en `.only`.
> Vaciar la base antes de cada uno lo hace imposible.

### 5.4 · Las fábricas (factories)

```js
let contador = 0
const unico = () => `${Date.now()}-${++contador}`

export const crearAutor = (datos = {}) =>
    Autor.create({ nombre: "Autora de prueba", nacionalidad: "argentina", ...datos })

export const crearLibro = (datos = {}) =>
    Libro.create({
        titulo: "Libro de prueba",
        isbn: `ISBN-${unico()}`,     // el isbn es unique: NO puede repetirse
        precio: 1000,
        stock: 5,
        ...datos,                     // ⭐ lo que mande el test gana
    })

// El modelo hashea la contraseña solo, en su hook pre("save"): acá se pasa
// en texto plano y queda guardada hasheada, igual que en el seed.
export const crearUsuario = ({ password = "test1234", ...datos } = {}) =>
    Usuario.create({
        nombre: "Persona",
        apellido: "De Prueba",
        email: `test-${unico()}@mail.com`,
        password,
        rol: "comprador",
        ...datos,
    })

export const crearComprador = (datos = {}) => crearUsuario({ rol: "comprador", ...datos })
export const crearVendedor = (datos = {}) => crearUsuario({ rol: "vendedor", ...datos })
```

El truco está en el `...datos` **al final**: pisa los valores por defecto. En el
test se lee así:

```js
const libro = await crearLibro({ stock: 0 })    // "un libro sin stock", y nada más
```

Y el `unico()` está porque `isbn` y `email` son `unique`: si todos los tests
crearan `"ISBN-1"`, el segundo explotaría con un error 11000 que **no tiene nada
que ver** con lo que se está probando.

> Si mañana el modelo pide un campo nuevo, se agrega **acá una vez** y no en los
> treinta tests. Eso es todo el valor de las factories.

### 5.5 · Los tokens

```js
export const tokenDe = (usuario) =>
    jwt.sign({ id: usuario._id, rol: usuario.rol }, JWT_SECRET, { expiresIn: "1h" })

// Un token firmado con OTRO secreto: sirve para probar que el servidor
// rechaza los tokens que no firmó él.
export const tokenFalso = (usuario) =>
    jwt.sign({ id: usuario._id, rol: usuario.rol }, "otro-secreto-cualquiera")

// Un token nuestro pero ya vencido (expiresIn negativo = venció hace un segundo)
export const tokenVencido = (usuario) =>
    jwt.sign({ id: usuario._id, rol: usuario.rol }, JWT_SECRET, { expiresIn: "-1s" })
```

El payload es **el mismo** que arma `authService`: `{ id, rol }`. No pasamos por
`POST /api/auth/login` en cada test porque sería testear el login treinta veces
de paso.

> ⭐ `tokenFalso` y `tokenVencido` son dos casos que **a mano no se prueban
> nunca**, porque son incómodos de armar en Postman. Acá son una línea.

### 5.6 · La carpeta de imágenes

```js
export const imagenesEnLaCarpeta = () => {
    const carpeta = path.resolve(CARPETA_IMAGENES)
    return fs.existsSync(carpeta) ? fs.readdirSync(carpeta) : []
}

export const vaciarCarpetaDeImagenes = () => {
    const carpeta = path.resolve(CARPETA_IMAGENES)
    // force: true -> no se queja si la carpeta no existe todavía
    fs.rmSync(carpeta, { recursive: true, force: true })
}
```

Los tests de subida escriben archivos **de verdad** en `uploads-test`. Hay que
barrer esa carpeta entre tests, igual que la base: si no, un test ve las
imágenes del anterior y cuenta mal.

### 5.7 · Y agregar al [`.gitignore`](.gitignore)

```
uploads-test
coverage
```

Son cosas que **generan** los tests. No van al repo.

### ✅ Checkpoint 5

Todavía no hay tests, así que `npm test` sigue diciendo `No tests found`.
Lo que sí podés comprobar es que el archivo no tiene errores:

```bash
node --input-type=module -e "import('./tests/ayudas.js').then(() => console.log('ayudas.js OK'))"
```

---

## 6 · El vocabulario de Jest

Es casi todo lo que hay que saber. No hay mucho más.

```js
describe("un grupo de tests", () => {        // solo ordena la salida

    it("hace tal cosa", () => {              // UN test. Se lee "it should...": "debería..."
        expect(2 + 2).toBe(4)                // la assertion
    })
})
```

### Los matchers que vamos a usar

| Matcher | Para qué |
|---|---|
| `.toBe(x)` | `===` · números, strings, booleanos |
| `.toEqual(x)` | mismo **contenido** · objetos y arrays |
| `.toBeNull()` `.toBeUndefined()` `.toBeDefined()` | |
| `.toHaveLength(n)` | arrays y strings |
| `.toMatch(/regex/)` | el texto **contiene** eso |
| `.toContain(x)` | el array contiene ese elemento |
| `.toBeInstanceOf(Clase)` | |
| `.not` | invierte: `expect(a).not.toBe(b)` |
| `.rejects.toThrow(/x/)` | una promesa que **falla** |
| `.resolves.toBeUndefined()` | una promesa que **se cumple** |

> `.toBe` vs `.toEqual`: `expect({a:1}).toBe({a:1})` **falla** (son dos objetos
> distintos en memoria). `.toEqual` compara el contenido. Para números y strings
> da igual cuál uses.

### Los cuatro ganchos

```js
beforeAll(conectarBaseDeTest)    // una vez, antes de todos los tests del archivo
beforeEach(limpiarBase)          // antes de CADA test
afterEach(...)                   // después de cada test
afterAll(cerrarBaseDeTest)       // una vez, al final
```

**La regla:** conectar en `beforeAll` (es caro, una vez) y **vaciar en
`beforeEach`** (es barato).

### La forma de un test: 1-2-3

Siempre la misma, y conviene escribirla siempre así:

```js
it("no deja poner en el carrito más de lo que hay en stock", async () => {
    // 1 · PREPARAR el escenario
    const comprador = await crearComprador()
    const libro = await crearLibro({ stock: 3 })

    // 2 · EJECUTAR una sola cosa
    const error = await agregarItemService(comprador._id, { libro: libro._id, cantidad: 4 })
        .catch((e) => e)

    // 3 · COMPROBAR
    expect(error.status).toBe(409)
})
```

> ⭐ **Un test, una cosa.** Si un test comprueba cinco cosas sin relación y se
> pone rojo, hay que leerlo entero para saber qué se rompió.

### Cómo se testea un error (las dos formas)

Esto confunde siempre, así que acá va completo:

```js
// A · solo me importa que falle, y con qué mensaje
await expect(eliminarAutorService(autor._id)).rejects.toThrow(/No se puede eliminar/)

// B · necesito mirar el status (o cualquier otra propiedad)
const error = await eliminarAutorService(autor._id).catch((e) => e)
expect(error.status).toBe(409)
```

> ⚠️ Lo que **no** funciona es `expect(await loQueFalla())`: el error explota
> antes de llegar a `expect`, y el test **muere** en vez de fallar prolijo.
>
> `.catch(e => e)` es el truco de la forma B: convierte el rechazo en un valor
> normal, para poder mirarlo con calma.

### Cómo correr los tests

```bash
npm test                        # todos
npm test -- tests/2             # solo los archivos cuyo nombre contenga "tests/2"
npm test -- -t "stock"          # solo los tests cuyo TÍTULO contenga "stock"
npm test -- --verbose           # con el nombre de cada test, uno por línea
npm run test:watch              # se queda corriendo y repite al guardar
npm run test:coverage           # + la tabla de cobertura
```

> El `--` extra es de npm: todo lo que va después se le pasa a Jest.
>
> Y para enfocarse en uno mientras lo escribís: `it.only(...)` corre **solo
> ese**, `it.skip(...)` lo saltea. ⚠️ Acordate de sacarlos antes de terminar.

---

## 7 · Nivel 1 · Tests unitarios

**Archivo nuevo: [`tests/1-unitarios.test.js`](tests/1-unitarios.test.js)** · 12 tests · corre en **medio segundo**

Sin base, sin servidor, sin internet. Para entrar en confianza con el vocabulario.

📄 El archivo tiene 3 `describe` y 12 `it`. Acá explicamos 6; los otros son
variantes del mismo patrón y están comentados en el archivo.

### 7.1 · La estructura

```js
import { nombreUnico } from "../src/services/storage/nombreUnico.js"
import { ErrorApp } from "../src/utils/ErrorApp.js"
import Libro from "../src/models/libro.js"

describe("nombreUnico", () => { /* 4 tests */ })
describe("ErrorApp", () => { /* 2 tests */ })
describe("el modelo Libro valida antes de llegar a la base", () => { /* 6 tests */ })
```

Fijate que **no hay `beforeAll` ni `beforeEach`**: este archivo no toca la base.
Por eso corre en medio segundo.

### 7.2 · El test que vale de verdad

```js
it("nunca devuelve dos veces el mismo nombre", () => {
    const nombres = new Set()

    for (let i = 0; i < 500; i++) {
        nombres.add(nombreUnico("tapa.jpg"))
    }

    // un Set no guarda repetidos: si hay 500, no hubo ninguno repetido
    expect(nombres.size).toBe(500)
})
```

Mirá **qué** está probando: si esto fallara, al subir dos tapas la segunda
pisaría a la primera y **perderíamos una imagen**. No es un test de adorno.

Y el de seguridad:

```js
it("no deja pasar el nombre que mandó el cliente", () => {
    // alguien podría mandar un archivo llamado "../../src/index.js"
    const nombre = nombreUnico("../../src/index.js")

    expect(nombre).not.toContain("..")
    expect(nombre).not.toContain("/")
})
```

### 7.3 · Validaciones de modelo, sin Mongo prendido

`libro.validate()` corre **todas** las validaciones del schema **sin tocar la
base**. Devuelve una promesa: se cumple si está todo bien, se rechaza con el
`ValidationError` si algo falla.

```js
it("un libro sin título no es válido", async () => {
    const libro = new Libro({ isbn: "123", precio: 100 })

    const error = await libro.validate().catch((e) => e)

    // errors está indexado por el NOMBRE del campo
    expect(error.errors.titulo).toBeDefined()
    expect(error.errors.titulo.message).toMatch(/obligatorio/i)
})
```

> `new Libro({...})` **no guarda nada**: construye el documento en memoria. Por
> eso este test anda incluso con Mongo apagado.

Y los `default` y los setters se ven **sin `await`**, porque se aplican al
construir:

```js
it("stock arranca en 0 y disponible en true sin que nadie los mande", () => {
    const libro = new Libro({ titulo: "Rayuela", isbn: "978-2", precio: 100 })

    expect(libro.stock).toBe(0)            // default del schema
    expect(libro.disponible).toBe(true)    // default
    expect(libro.imagen).toBeNull()        // default (clase 23)
})

it("el título se guarda en minúsculas (lo hace el schema, no nosotros)", () => {
    const libro = new Libro({ titulo: "  RAYUELA  ", isbn: "978-3", precio: 100 })

    expect(libro.titulo).toBe("rayuela")   // trim + lowercase son setters
})
```

> ⚠️ **`unique` NO se prueba así.** `unique` no es una validación de Mongoose:
> es un **índice de MongoDB**. `validate()` ni lo mira. Para probarlo hace falta
> la base → nivel 2.

### ✅ Checkpoint 7

```bash
npm test
```

```
PASS tests/1-unitarios.test.js

Tests:       12 passed, 12 total
Time:        0.5 s
```

**El primer verde.** Y fijate que no hizo falta ni Mongo ni el servidor.

---

## 8 · Nivel 2 · Services

> ⭐ **Este es el bloque importante de la clase.**

**Archivo nuevo: [`tests/2-services.test.js`](tests/2-services.test.js)** · 26 tests

**Acá está el valor de verdad de la clase.** Los services son donde viven las
reglas del negocio que escribimos nosotros, y es donde un test te salva.

Se toca la base, pero **no** el servidor HTTP: se llama a la función directo,
como lo haría el controller.

📄 El archivo tiene 6 `describe` y 26 `it`. Acá explicamos 9: los que enseñan
algo nuevo. Los otros 17 son más casos del mismo tipo.

### 8.1 · El encabezado del archivo

**Esto va una vez, arriba, y es lo que hace que todo lo demás funcione:**

```js
import mongoose from "mongoose"
import Libro from "../src/models/libro.js"
import Autor from "../src/models/autor.js"
import Pedido from "../src/models/pedido.js"
import {
    conectarBaseDeTest, cerrarBaseDeTest, limpiarBase,
    crearAutor, crearLibro, crearComprador,
} from "./ayudas.js"

import { eliminarAutorService } from "../src/services/autorService.js"
import { crearLibroService } from "../src/services/libroService.js"
import { agregarItemService, obtenerCarritoService } from "../src/services/carritoService.js"
import {
    crearPedidoService, obtenerMiPedidoService,
    cancelarPedidoService, pagarPedidoService,
} from "../src/services/pedidoService.js"

beforeAll(conectarBaseDeTest)
beforeEach(limpiarBase)
afterAll(cerrarBaseDeTest)
```

Esas tres últimas líneas son **todo** el manejo de la base. No hay más.

### 8.2 · No alcanza con que falle

Esta es la parte que la gente olvida:

```js
it("NO borra un autor que tiene libros, y avisa con 409", async () => {
    const autor = await crearAutor({ nombre: "Con Libros" })
    await crearLibro({ autor: autor._id })

    await expect(eliminarAutorService(autor._id)).rejects.toThrow(/No se puede eliminar/)

    // ⭐ y el autor SIGUE AHÍ: el error no dejó nada a medio hacer
    expect(await Autor.findById(autor._id)).not.toBeNull()
})
```

Un error puede tirar la excepción correcta **y haber borrado medio registro
antes**. El segundo `expect` es el que de verdad protege.

Y el status, con la forma B:

```js
it("el error trae status 409, no 500", async () => {
    const error = await eliminarAutorService(autor._id).catch((e) => e)

    // 409 = "el pedido está bien escrito, pero el estado del sistema no lo permite"
    expect(error.status).toBe(409)
})
```

### 8.3 · El mismo patrón, en `crearLibroService`

```js
it("no deja crear un libro con un autor que no existe", async () => {
    const idInventado = new mongoose.Types.ObjectId()

    await expect(
        crearLibroService({ titulo: "Fantasma", isbn: "F-1", precio: 100, autor: idInventado })
    ).rejects.toThrow(/No existe ningún autor/)

    // ⭐ y no quedó un libro suelto en la base
    expect(await Libro.countDocuments()).toBe(0)
})
```

> `new mongoose.Types.ObjectId()` fabrica un id con **formato válido** que no
> existe en la base. Es distinto de mandar `"abc"`, que da un `CastError` 400.
> Son dos casos diferentes y conviene probar los dos.

### 8.4 · El control de stock que un `if` mal escrito no pasa

```js
it("tampoco si se llega al límite de a poco", async () => {
    const comprador = await crearComprador()
    const libro = await crearLibro({ stock: 3 })

    await agregarItemService(comprador._id, { libro: libro._id, cantidad: 2 })

    await expect(
        agregarItemService(comprador._id, { libro: libro._id, cantidad: 2 })
    ).rejects.toThrow(/Stock insuficiente/)
})
```

⭐ **2 + 2 = 4 > 3**, aunque **ninguna de las dos cantidades sola** supere el
stock. El control tiene que mirar *la cantidad que va a quedar*, no la que se
agrega ahora. Un `if (cantidad > libro.stock)` pasa el test anterior y falla este.

### 8.5 · El checkout: las cuatro consecuencias

```js
it("descuenta el stock, congela el precio y vacía el carrito", async () => {
    const comprador = await crearComprador()
    const libro = await crearLibro({ titulo: "Rayuela", precio: 10000, stock: 5 })
    await agregarItemService(comprador._id, { libro: libro._id, cantidad: 2 })

    const pedido = await crearPedidoService(comprador._id.toString())

    // 1 · el total lo calcula el SERVIDOR
    expect(pedido.total).toBe(20000)

    // 2 · ⭐ la línea guarda una FOTO del libro, no una referencia viva
    expect(pedido.items[0].precioUnitario).toBe(10000)
    expect(pedido.items[0].titulo).toBe("rayuela")   // el schema lo pasa a minúsculas

    // 3 · el stock bajó
    expect((await Libro.findById(libro._id)).stock).toBe(3)

    // 4 · el carrito quedó vacío
    expect((await obtenerCarritoService(comprador._id)).items).toHaveLength(0)
})
```

> Este es el caso en que **sí** van cuatro `expect`: no son cuatro cosas
> distintas, son las cuatro consecuencias de **una sola** operación. Si se
> rompiera una, el título del test sigue describiendo bien el problema.

Y el que justifica haber copiado el precio en la línea del pedido:

```js
it("⭐ el precio del pedido NO cambia si después cambia el del libro", async () => {
    const pedido = await crearPedidoService(comprador._id.toString())

    await Libro.updateOne({ _id: libro._id }, { precio: 15000 })   // el libro aumenta 50%

    const guardado = await Pedido.findById(pedido._id)
    expect(guardado.total).toBe(10000)                   // la factura NO cambia
    expect(guardado.items[0].precioUnitario).toBe(10000)
})
```

### 8.6 · 🏆 El test más importante de la clase

```js
it("si falla a mitad de camino, NO deja stock descontado a medias", async () => {
    const comprador = await crearComprador()
    const primero = await crearLibro({ titulo: "Primero", precio: 1000, stock: 5 })
    const segundo = await crearLibro({ titulo: "Segundo", precio: 1000, stock: 1 })

    await agregarItemService(comprador._id, { libro: primero._id, cantidad: 2 })
    await agregarItemService(comprador._id, { libro: segundo._id, cantidad: 1 })

    // ⬅️ otra persona compra el último ejemplar del segundo libro
    await Libro.updateOne({ _id: segundo._id }, { stock: 0 })

    await expect(crearPedidoService(comprador._id.toString()))
        .rejects.toThrow(/No hay stock suficiente/)

    // ⭐ el stock del PRIMERO volvió a 5: la compensación del catch funcionó
    expect((await Libro.findById(primero._id)).stock).toBe(5)

    // y no se creó ningún pedido a medio hacer
    expect(await Pedido.countDocuments()).toBe(0)
})
```

**Leé el escenario con atención.** La compradora pone dos libros en el carrito
cuando hay stock de los dos. Mientras duda, otra persona se lleva el último
ejemplar del segundo. Al confirmar, el primero ya se descontó y el segundo falla.

**Esto es imposible de probar a mano**: habría que comprar desde dos navegadores
en el momento justo. Acá es **una línea** (`updateOne`).

Y es exactamente el bug que un cliente nunca te reporta, porque nadie se entera:
simplemente, con el tiempo, el stock del sistema deja de coincidir con el del
depósito.

### 8.7 · Las reglas de quién es dueño de qué

```js
it("⭐ otra persona recibe 403, NO 404", async () => {
    const { pedido } = await pedidoListo()
    const intrusa = await crearComprador({ email: "intrusa@mail.com" })

    const error = await obtenerMiPedidoService(pedido._id, intrusa._id.toString())
        .catch((e) => e)

    expect(error.status).toBe(403)
})
```

Es el **BOLA / IDOR** de la clase de roles, ahora con un test que lo cuida.

> `pedidoListo()` es una ayuda **local del `describe`**: deja un pedido armado y
> devuelve con qué se armó. Cuando una preparación se repite en 4 tests del mismo
> grupo, se extrae ahí nomás y no a [`ayudas.js`](tests/ayudas.js).

Y el otro lado de la cancelación, que es el más sutil del archivo:

```js
it("no se puede cancelar un pedido ya pagado", async () => {
    const { comprador, libro, pedido } = await pedidoListo()
    await pagarPedidoService(pedido._id, comprador._id.toString())

    await expect(cancelarPedidoService(pedido._id, comprador._id.toString()))
        .rejects.toThrow(/pagado/)

    // ⭐ y el stock NO se devolvió: el error cortó ANTES de tocarlo.
    //    Si esto fallara, cada intento de cancelar INVENTARÍA stock.
    expect((await Libro.findById(libro._id)).stock).toBe(3)
})
```

### ✅ Checkpoint 8

```bash
npm test
```

```
PASS tests/1-unitarios.test.js
PASS tests/2-services.test.js

Tests:       38 passed, 38 total
Time:        2 s
```

Y abrí **Compass**: tiene que haber aparecido una base nueva, `biblioteca_test`,
y `biblioteca` tiene que estar **intacta**.

---

## 9 · Nivel 3 · Endpoints con Supertest

**Archivo nuevo: [`tests/3-endpoints.test.js`](tests/3-endpoints.test.js)** · 23 tests

Acá se prueba **todo junto**: ruta → middlewares → controller → service →
modelo → middleware de errores.

📄 El archivo tiene 5 `describe` y 23 `it`. Acá explicamos 10.

### 9.1 · ¿Y el servidor? No se levanta

```js
import request from "supertest"
import app from "../src/app.js"

const res = await request(app).get("/api/libros")

expect(res.status).toBe(200)
expect(Array.isArray(res.body)).toBe(true)
```

Supertest toma la app, la pone a escuchar **en un puerto libre al azar**, hace la
petición de verdad por HTTP y la apaga.

> ⭐ Por eso [`app.js`](src/app.js) tenía que exportar la app **sin** `listen`. Y por eso
> podés tener `npm start` corriendo **y** los tests corriendo al mismo tiempo:
> no chocan nunca.

El encabezado del archivo:

```js
import request from "supertest"
import app from "../src/app.js"
import Libro from "../src/models/libro.js"
import {
    conectarBaseDeTest, cerrarBaseDeTest, limpiarBase,
    crearLibro, crearAutor, crearComprador, crearVendedor,
    tokenDe, tokenFalso, tokenVencido,
    imagenesEnLaCarpeta, vaciarCarpetaDeImagenes,
} from "./ayudas.js"

beforeAll(conectarBaseDeTest)
afterAll(cerrarBaseDeTest)

// Acá hay que limpiar DOS cosas: la base y la carpeta de imágenes,
// porque estos tests suben archivos de verdad.
beforeEach(async () => {
    await limpiarBase()
    vaciarCarpetaDeImagenes()
})
```

### 9.2 · Lo público

```js
it("responde 200 y un array", async () => {
    await crearLibro({ titulo: "Uno" })
    await crearLibro({ titulo: "Dos" })

    const res = await request(app).get("/api/libros")

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
})

it("sin libros devuelve un array vacío, no un 404", async () => {
    const res = await request(app).get("/api/libros")

    expect(res.status).toBe(200)
    expect(res.body).toEqual([])        // "vacío" NO es "no existe"
})

it("no hace falta token: el catálogo es público", async () => {
    // si un día alguien le pone verificarToken a esta ruta, este test lo avisa
    expect((await request(app).get("/api/libros")).status).toBe(200)
})
```

### 9.3 · El contrato con el front

```js
it("el autor viene POPULADO, no como un id suelto", async () => {
    const autora = await crearAutor({ nombre: "Ursula K. Le Guin" })
    await crearLibro({ autor: autora._id })

    const res = await request(app).get("/api/libros")

    expect(res.body[0].autor.nombre).toBe("ursula k. le guin")
})
```

Si alguien saca el `.populate()`, el front deja de mostrar el autor. **Este test
lo avisa antes de que lo note un usuario.**

Y los errores traducidos por `manejarErrores`:

```js
it("un id con formato inválido da 400, no 500", async () => {
    const res = await request(app).get("/api/libros/esto-no-es-un-id")

    expect(res.status).toBe(400)                  // CastError traducido
    expect(res.body.error).toMatch(/formato/i)
})

it("una dirección que no existe da 404 con nuestro mensaje", async () => {
    const res = await request(app).get("/api/pizzas")

    expect(res.body.error).toBe("Esa dirección no existe")   // el 404 de app.js
})
```

### 9.4 · 401 vs 403 vs 400

La distinción de la clase de roles, ahora con tests:

```js
const libroNuevo = { titulo: "Nuevo", isbn: "N-1", precio: 5000, stock: 2 }

it("sin token → 401", async () => {
    const res = await request(app).post("/api/libros").send(libroNuevo)
    expect(res.status).toBe(401)
})

it("con un token firmado por otro → 401", async () => {
    const res = await request(app)
        .post("/api/libros")
        .set("Authorization", `Bearer ${tokenFalso(vendedora)}`)
        .send(libroNuevo)

    expect(res.body.error).toMatch(/inválido/i)
})

it("con un token vencido → 401 y un mensaje distinto", async () => {
    const res = await request(app)
        .post("/api/libros")
        .set("Authorization", `Bearer ${tokenVencido(vendedora)}`)
        .send(libroNuevo)

    expect(res.body.error).toMatch(/venció/i)
})

it("⭐ con token de compradora → 403", async () => {
    const res = await request(app)
        .post("/api/libros")
        .set("Authorization", `Bearer ${tokenDe(compradora)}`)
        .send(libroNuevo)

    expect(res.status).toBe(403)
})
```

> **401** = *"no sé quién sos"* · **403** = *"sé quién sos y no te alcanza"*

Y la validación:

```js
it("sin título → 400 con el detalle de qué falta", async () => {
    const res = await request(app)
        .post("/api/libros")
        .set("Authorization", `Bearer ${tokenDe(vendedora)}`)
        .send({ isbn: "SIN-TITULO", precio: 100 })

    expect(res.status).toBe(400)
    expect(res.body.detalles.join(" ")).toMatch(/titulo|título/i)   // los arma manejarErrores

    // ⭐ y no se guardó nada
    expect(await Libro.countDocuments()).toBe(0)
})
```

### 9.5 · Multer: solo se puede probar por HTTP

`req.file` **no existe** fuera de una petición. `.attach()` de Supertest arma el
`multipart/form-data` por nosotros, igual que Postman o el navegador:

```js
const unPng = Buffer.from("no-es-un-png-real-pero-alcanza")

it("sube la tapa y guarda la URL en el libro", async () => {
    const res = await request(app)
        .post("/api/libros")
        .set("Authorization", `Bearer ${tokenDe(vendedora)}`)
        .field("titulo", "Con tapa")            // .field() para los campos de texto
        .field("isbn", "CT-1")
        .field("precio", "9000")
        .attach("imagen", unPng, "tapa.png")    // .attach() para el archivo

    expect(res.status).toBe(201)
    expect(res.body.imagen).toMatch(/^http/)
    expect(res.body.imagen).toMatch(/\.png$/)
})
```

> ⭐ Un `Buffer` alcanza: **no hace falta un archivo de verdad en el disco**.
> Es el "test double" de un archivo.
>
> ⚠️ El nombre del campo (`"imagen"`) tiene que ser **exactamente** el de
> `upload.single("imagen")`.

Lo que cierra la clase pasada:

```js
it("⚠️ con form-data todo llega como TEXTO, y el schema lo convierte", async () => {
    // ... .field("precio", "25000") ...        ← un STRING

    expect(res.body.precio).toBe(25000)         // y sale NÚMERO
    expect(typeof res.body.precio).toBe("number")
})

it("un PDF → 400 (lo frena el fileFilter)", async () => {
    // ... .attach("imagen", pdf, { filename: "cosa.pdf", contentType: "application/pdf" })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/Solo se permiten imágenes/)
    expect(await Libro.countDocuments()).toBe(0)     // ⭐ no se creó el libro
})
```

> La forma larga de `.attach()` —con `{ filename, contentType }`— es necesaria
> cuando querés controlar el **mimetype**, que es justo lo que mira el
> `fileFilter`.

Los otros tres de Multer: **más de 4 MB** → 400 (con
`Buffer.alloc(5 * 1024 * 1024)`), **el campo mal nombrado** (`.attach("foto", …)`)
→ 400, y el de la compensación:

```js
it("⭐ si el ISBN está repetido, la imagen subida se borra", async () => {
    await crearLibro({ isbn: "YA-EXISTE" })

    // ... POST con isbn "YA-EXISTE" y una imagen ...

    expect(res.status).toBe(409)

    // la imagen que se subió antes de fallar ya no está: si no, cada intento
    // fallido dejaría un archivo huérfano para siempre
    expect(imagenesEnLaCarpeta()).toHaveLength(0)
})
```

Eso cierra el círculo del `catch` de `libroService` de la clase 23.

### 9.6 · ⭐ El test que cuida el orden de las rutas

```js
it("/todos es del staff y NO se confunde con /:id", async () => {
    const vendedora = await crearVendedor()

    const res = await request(app)
        .get("/api/pedidos/todos")
        .set("Authorization", `Bearer ${tokenDe(vendedora)}`)

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
})
```

En [src/routes/pedidoRoutes.js](src/routes/pedidoRoutes.js), `/todos` está
declarado **antes** de `/:id`. Si alguien los da vuelta, Express toma `"todos"`
como un id y esta ruta **deja de existir**: la vendedora recibiría un **403**
("ese pedido no es tuyo") en vez de la lista.

Eso es un bug rarísimo de diagnosticar a mano. El test lo agarra en el acto
(lo vas a ver en el paso 11).

### 9.7 · Y el orden de los middlewares

```js
it("la compradora recibe 403 ANTES de subir nada", async () => {
    const res = await request(app)
        .post("/api/libros")
        .set("Authorization", `Bearer ${tokenDe(compradora)}`)
        .field("titulo", "No deberia entrar")
        .attach("imagen", unPng, "tapa.png")

    expect(res.status).toBe(403)
    expect(await Libro.countDocuments()).toBe(0)
})
```

`soloStaff` va **antes** que Multer a propósito: si fuera al revés, el servidor
recibiría los 4 MB de alguien que no puede subirlos.

### 9.8 · El recorrido completo

El último test del archivo hace, de punta a punta:

```js
it("una persona se registra, compra y ve su pedido", async () => {
    // 1 · hay un libro en el catálogo (stock 3, precio 12000)
    // 2 · se registra  → POST /api/auth/registro   (201, y trae token)
    //     ⭐ y la password NO viene en la respuesta
    // 3 · agrega 2 al carrito → POST /api/carrito  (200, total 24000)
    // 4 · confirma → POST /api/pedidos             (201, estado "pendiente")
    // 5 · el stock bajó de 3 a 1
    // 6 · lo ve en GET /api/pedidos
    // 7 · la vendedora lo ve en GET /api/pedidos/todos, con el nombre
})
```

**Siete pasos, un test, 100 milisegundos.** Es el mismo recorrido del bloque 0,
el que a mano tardaba cinco minutos.

> Este es el único test del archivo que pasa por `POST /api/auth/registro` en
> vez de usar la factory: acá **sí** queremos probar el registro.

### ✅ Checkpoint 9

```bash
npm test
```

```
Tests:       61 passed, 61 total
Time:        3 s
```

Y mirá la carpeta del proyecto: apareció `uploads-test/` con las imágenes que
subieron los tests. Por eso está en el [`.gitignore`](.gitignore).

---

## 10 · Extra · middlewares y storage

**Archivo nuevo: [`tests/4-middlewares-y-storage.test.js`](tests/4-middlewares-y-storage.test.js)** · 9 tests

No son imprescindibles —el nivel 3 ya los cruza de punta a punta— pero muestran
dos cosas que vale la pena ver.

### 10.1 · Un middleware es una función común

```js
// ⚠️ con ESM, "jest" NO es global: hay que importarlo
import { jest } from "@jest/globals"

import { verificarToken } from "../src/middleware/verificarToken.js"
import { tokenDe } from "./ayudas.js"

it("con un token válido llama a next() y deja req.usuario", () => {
    const usuario = { _id: "507f1f77bcf86cd799439011", rol: "vendedor" }

    const req = { headers: { authorization: `Bearer ${tokenDe(usuario)}` } }
    const next = jest.fn()        // una función espía: se acuerda de si la llamaron

    verificarToken(req, {}, next)

    expect(next).toHaveBeenCalled()
    expect(req.usuario.rol).toBe("vendedor")
})
```

El `req` es un objeto **hecho a mano**: el middleware solo mira `req.headers`,
entonces eso alcanza. Y el `res` es `{}` porque este middleware no lo usa.

> ⭐ **Ese es el "test double" más simple que existe:** un objeto que se parece
> lo suficiente.

Y el caso que corta la petición:

```js
it("sin header tira un ErrorApp 401 y NO llama a next()", () => {
    const next = jest.fn()

    const error = (() => {
        try { verificarToken({ headers: {} }, {}, next) } catch (e) { return e }
    })()

    expect(error.status).toBe(401)
    expect(next).not.toHaveBeenCalled()     // ⭐ la petición se corta acá
})
```

De paso se ve algo que siempre confunde:

```js
permitirRoles("vendedor", "admin")   // ⭐ NO es un middleware: es una FÁBRICA
                                     //   de middlewares. Por eso va con
                                     //   paréntesis en las rutas, y
                                     //   verificarToken va SIN.
```

### 10.2 · El adaptador de storage, sin internet

Se testea el de **disco**, no el de Supabase:

```js
import { subir, borrar } from "../src/services/storage/local.js"
import { imagenesEnLaCarpeta, vaciarCarpetaDeImagenes } from "./ayudas.js"

beforeEach(vaciarCarpetaDeImagenes)

// un req.file de juguete: el adaptador solo usa estas tres cosas
const archivoFalso = (nombre = "tapa.png") => ({
    originalname: nombre,
    mimetype: "image/png",
    buffer: Buffer.from("contenido-de-la-imagen"),
})

it("subir() escribe el archivo y devuelve una URL que lo apunta", async () => {
    const url = await subir(archivoFalso())

    expect(url).toMatch(/^http/)

    const archivos = imagenesEnLaCarpeta()
    expect(archivos).toHaveLength(1)
    expect(url).toContain(archivos[0])      // la URL termina con el nombre real
})

it("borrar() una URL que ya no existe no explota", async () => {
    // Importa: borrar es LIMPIEZA. Si reventara, un libro no se podría
    // actualizar solo porque su tapa vieja ya no estaba.
    await expect(borrar("http://localhost:3000/uploads-test/no-existe.png"))
        .resolves.not.toThrow()
})
```

> ⚠️ **NO se testea Supabase, y es a propósito:**
> el test dependería de internet y de la cuenta de alguien, tardaría segundos en
> vez de milisegundos, y si fallara **no nos diría nada de NUESTRO código**.
>
> **No se testea la biblioteca de otro. Se testea lo nuestro.**

Que esto se pueda probar sin tocar una línea es, otra vez, el premio del
adaptador de la clase 23.

### ✅ Checkpoint 10 — la suite completa

```bash
npm test
```

```
PASS tests/2-services.test.js
PASS tests/3-endpoints.test.js
PASS tests/4-middlewares-y-storage.test.js
PASS tests/1-unitarios.test.js

Test Suites: 4 passed, 4 total
Tests:       70 passed, 70 total
Time:        3 s
```

Con `npm test -- --verbose` los ves uno por uno, con su nombre.

---

## 11 · Romperlo a propósito (los 3 sabotajes)

Un test que nunca se puso rojo no sirve para nada: no sabés si funciona. Vamos
a romper el código **a propósito** y ver que los tests lo agarran.

### Sabotaje 1 · Dar vuelta las rutas

En [`src/routes/pedidoRoutes.js`](src/routes/pedidoRoutes.js), poné `/:id` **antes** de `/todos`:

```js
router.get("/:id", soloComprador, pedidoController.obtenerMiPedidoController)
router.get("/todos", soloStaff, pedidoController.listarTodosPedidosController)
```

```bash
npm test -- tests/3
```

```
× ⭐ /todos es del staff y NO se confunde con /:id
× una compradora no puede ver los pedidos de todos → 403
× una persona se registra, compra y ve su pedido

Tests: 3 failed, 20 passed
```

**Tres tests rojos por mover una línea.** Volvelo a dejar como estaba.

### Sabotaje 2 · Sacar el `populate`

En [`src/services/libroService.js`](src/services/libroService.js), borrá el `.populate("autor", ...)` de
`listarLibroService`:

```
× el autor viene POPULADO, no como un id suelto

Tests: 1 failed, 22 passed
```

Eso rompe el front. El test lo avisó **antes** que un usuario.

### Sabotaje 3 · Desconectar el manejo de errores de Multer

En [`src/routes/libroRoutes.js`](src/routes/libroRoutes.js), comentá la última línea:

```js
// router.use(manejarErroresDeMulter)
```

```
× un PDF → 400 (lo frena el fileFilter)            Received: 500
× más de 4 MB → 400 (lo frena limits.fileSize)     Received: 500
× el campo mal nombrado → 400                      Received: 500

Tests: 3 failed, 20 passed
```

**Los tres dicen `Received: 500` donde esperaban 400.** Es exactamente el bug
que tuvimos la clase pasada: el error existía, pero el cliente veía un 500
genérico y no tenía forma de saber qué hizo mal.

> ⭐ **La moraleja de los tres:** ninguno de estos bugs rompe el arranque del
> servidor. Los tres pasan desapercibidos hasta que alguien se queja.

---

## 12 · Coverage y cierre

### El número y la trampa

```bash
npm run test:coverage
```

```
All files              |   66.92 |    48.27 |   58.16 |   67.73
 src/controllers       |   43.29 |        0 |   29.62 |   43.29
 src/middleware        |      86 |       80 |     100 |      86
 src/models            |   88.88 |       50 |      75 |   94.11
 src/routes            |     100 |      100 |     100 |     100
 src/services          |   70.12 |    51.11 |   69.38 |   70.37
 src/config            |       0 |        0 |     100 |       0
```

**67%. Y está bien.** Tres cosas que leer de esa tabla:

- **`routes` 100%** — lógico: los tests de endpoints pasan por todas.
- **`controllers` 43%** — también lógico. Casi no tienen lógica: traducen y nada
  más. Probamos los que importan y listo.
- **`config` 0%** — ahí vive el cliente de Supabase, que **a propósito nunca se
  importa en los tests**. Un 0% que es exactamente lo que queríamos.

> ⚠️ **El 100% de coverage es una mala meta.** Es fácil de conseguir y no quiere
> decir nada. Este test da coverage y no prueba **absolutamente nada**:
>
> ```js
> it("anda", async () => { await crearPedidoService(id) })   // sin un solo expect
> ```
>
> El coverage sirve para **encontrar lo que te olvidaste de probar**, no como
> nota. Mirá la columna **% Branch**: ahí se ven los `if` que ningún test
> recorrió. Esos sí valen la pena.

### Qué NO se testea

Tan importante como lo otro:

- **Mongoose, Express, Supabase, bcrypt.** No es tu código: ya tienen sus tests.
- **Los controllers que solo traducen.** Si no hay una decisión, no hay nada que probar.
- **Que un `console.log` imprima.**
- **El panel de Supabase.**

### Qué sí vale un test, siempre

1. **Una regla del negocio** ("no se puede borrar un autor con libros").
2. **Un cálculo** (el total del pedido).
3. **Un permiso** (403 vs 404).
4. **Un caso raro que ya nos rompió una vez** ⭐ — el mejor momento para
   escribir un test es **justo después de arreglar un bug**: así no vuelve.

### Ahora ustedes

📄 [tests/5-para-completar.test.js.txt](tests/5-para-completar.test.js.txt) —
siete tests a medio escribir, con el título puesto y los pasos comentados.

```bash
# 1. renombrarlo:  5-para-completar.test.js.txt → 5-para-completar.test.js
# 2. npm test -- tests/5
# 3. completar un it() y volver a correr
```

Termina en `.txt` a propósito, para que Jest no lo corra y la suite siga verde.

Las soluciones están en
📄 [tests/5-soluciones.test.js.txt](tests/5-soluciones.test.js.txt) — mirarlas
**después** de intentarlo.

---

## Si algo no anda

| Lo que ves | Qué pasa |
|---|---|
| `Cannot use import statement outside a module` | falta el flag: usá `npm test`, **no `npx jest`** |
| `jest is not defined` | con ESM hay que importarlo: `import { jest } from "@jest/globals"` |
| `Module <rootDir>/tests/setup.js ... was not found` | [`setup.js`](tests/setup.js) no está en `tests/`, o se llama distinto |
| `Jest did not exit one second after...` | falta cerrar la conexión: `afterAll(cerrarBaseDeTest)` |
| `🛑 Los tests NO corren contra "biblioteca"` | la red de seguridad **funcionando**: revisá [`tests/setup.js`](tests/setup.js) |
| `MongooseServerSelectionError` | Mongo no está prendido |
| un test pasa solo y falla con los demás | se quedó con datos del anterior: falta `beforeEach(limpiarBase)` |
| todos los tests de un archivo fallan igual | casi siempre un `import` mal escrito: mirá la primera línea del error |
| `EADDRINUSE` | no debería pasar: Supertest usa un puerto al azar. Si pasa, quedó un `app.listen` colado en [`app.js`](src/app.js) |
| se borró la base de la cursada | `npm run seed` |
| un `expect` que nunca falla | ¿te olvidaste el `await`? Una promesa siempre es "truthy" |

---

## El mapa final

```
15/
├── jest.config.js                ⭐ nuevo · paso 3
├── package.json                      los 3 scripts · paso 2
├── .gitignore                        + uploads-test, coverage · paso 5
├── src/
│   ├── app.js                    ⭐ nuevo · arma la app y la EXPORTA · paso 1
│   ├── index.js                      solo conecta y escucha · paso 1
│   └── (todo lo demás, sin tocar)
└── tests/
    ├── setup.js                  ⚠️  a qué base apuntan los tests · paso 4
    ├── ayudas.js                     factories y red de seguridad · paso 5
    ├── 1-unitarios.test.js           sin base ni servidor         · 12 tests
    ├── 2-services.test.js        ⭐  las reglas del negocio       · 26 tests
    ├── 3-endpoints.test.js           la API por HTTP (Supertest)  · 23 tests
    ├── 4-middlewares-y-storage.test.js  middlewares y adaptador   ·  9 tests
    ├── 5-para-completar.test.js.txt  para escribir
    └── 5-soluciones.test.js.txt      las respuestas
                                                              ─────────────
                                                                  70 tests
```

**Lo que NO se tocó en toda la clase:** `src/models/`, `src/controllers/`,
`src/services/`, `src/routes/`, [`src/db.js`](src/db.js), `src/middleware/`, el `.env`.

> ⭐ Y ese es el punto: **los tests se agregan sin modificar el código que
> prueban.** Lo único que se movió fue partir [`index.js`](src/index.js) en dos, y eso ni
> siquiera cambia el comportamiento.

### Tres ideas para llevarse

1. **Testear te obliga a desacoplar.** [`app.js`](src/app.js) / [`index.js`](src/index.js) es la prueba.
2. **El valor está en las reglas del negocio**, no en el porcentaje de coverage.
3. **Un test es documentación que no puede mentir.** Un comentario que dice
   "esto devuelve 409" puede quedar viejo. Un `expect(error.status).toBe(409)`
   no: si deja de ser verdad, se pone rojo.
