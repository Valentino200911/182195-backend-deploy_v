# Testing de la API · paso a paso

> Escrito sobre **el código que tenemos en clase** (`182195-backend/15`).
> Todo lo que está acá se corre con `npm test` y hoy da **70 tests verdes**.

---

> 📋 **El listado completo de los 70 tests, con a qué apunta cada uno:**
> [LISTADO-DE-TESTS.md](LISTADO-DE-TESTS.md)

## 🧭 El paso a paso, en orden

Lo que hay que hacer, de arriba a abajo. Cada paso tiene su explicación más
abajo en este documento; esto es para no perderse.

### 1 · Instalar (terminal, en la raíz del proyecto)

```bash
npm install --save-dev jest supertest
```

### 2 · Tocar [`package.json`](package.json) — los scripts

➡️ **[package.json](package.json)** · agregar tres líneas en `"scripts"`

```json
"test": "node --experimental-vm-modules node_modules/jest/bin/jest.js",
"test:watch": "node --experimental-vm-modules node_modules/jest/bin/jest.js --watch",
"test:coverage": "node --experimental-vm-modules node_modules/jest/bin/jest.js --coverage"
```

### 3 · Partir la app en dos

➡️ **crear [src/app.js](src/app.js)** · se le pasa TODO lo que tenía [`index.js`](src/index.js)
menos `conectarDB()` y `app.listen()`, y termina en `export default app`

➡️ **editar [src/index.js](src/index.js)** · queda en 6 líneas: importa la app,
conecta y escucha

🔎 **Probar que no rompimos nada:** `npm start` tiene que seguir andando igual.

### 4 · Crear la carpeta de los tests

Carpeta nueva `tests/` en la raíz (al lado de `src/`), y dentro:

| Orden | Archivo | Qué es |
|---|---|---|
| 4.1 | **[tests/setup.js](tests/setup.js)** | ⚠️ a qué base apuntan los tests. **Va primero** |
| 4.2 | **[tests/ayudas.js](tests/ayudas.js)** | las factories (`crearLibro`, `tokenDe`...) y la red de seguridad |
| 4.3 | **[jest.config.js](jest.config.js)** | en la **raíz**, no en `tests/` |
| 4.4 | **[tests/1-unitarios.test.js](tests/1-unitarios.test.js)** | 12 tests · sin base ni servidor |
| 4.5 | **[tests/2-services.test.js](tests/2-services.test.js)** | ⭐ 26 tests · las reglas del negocio |
| 4.6 | **[tests/3-endpoints.test.js](tests/3-endpoints.test.js)** | 23 tests · la API por HTTP |
| 4.7 | **[tests/4-middlewares-y-storage.test.js](tests/4-middlewares-y-storage.test.js)** | 9 tests · middlewares y adaptador |

> El orden importa poco salvo en 4.1, 4.2 y 4.3: los tres primeros los necesitan
> todos los demás.

### 5 · Ejecutar

```bash
npm test                        # todos
npm test -- tests/2             # solo un archivo
npm test -- -t "stock"          # solo los tests cuyo nombre diga "stock"
npm run test:watch              # se queda corriendo y repite al guardar
npm run test:coverage           # + la tabla de cobertura
```

Lo que tiene que salir:

```
Test Suites: 4 passed, 4 total
Tests:       70 passed, 70 total
Time:        3 s
```

### 6 · Escribir uno propio

➡️ renombrar **[tests/5-para-completar.test.js.txt](tests/5-para-completar.test.js.txt)**
a [`5-para-completar.test.js`](tests/5-para-completar.test.js.txt) y completar

---

### Lo que NO se toca en toda la clase

`src/models/`, `src/controllers/`, `src/services/`, `src/routes/`, [`src/db.js`](src/db.js),
`src/middleware/`, el `.env`.

> ⭐ Y ese es el punto: **los tests se agregan sin modificar el código que
> prueban.** Lo único que se movió fue partir [`index.js`](src/index.js), y eso ni siquiera es
> un cambio de comportamiento.

---

## Lo que vamos a conseguir

Hoy probamos la API **a mano, con Postman**. Para estar seguros de que el
checkout funciona hay que hacer diez pasos: registrarse, loguearse, copiar el
token, crear un libro con stock, agregarlo al carrito, confirmar, mirar el
stock, cancelar, mirar el stock otra vez. Cinco minutos, y hay que acordarse.

Al final de este documento, eso mismo —y veinte casos más— se corre así:

```bash
npm test
```

```
Test Suites: 4 passed, 4 total
Tests:       70 passed, 70 total
Time:        3.1 s
```

---

## Paso 1 · Partir la app en dos

**Esto es lo primero y es lo que habilita todo lo demás.**

Nuestro [`src/index.js`](src/index.js) hacía tres cosas juntas:

```js
await conectarDB()        // 1. conectarse a Mongo
const app = express()     // 2. armar la app
app.listen(PORT, ...)     // 3. ponerse a escuchar
```

Con las tres juntas **no se puede testear**: importar ese archivo levanta un
servidor en el puerto 3000 y se conecta a la base de la cursada.

### 1.1 · El archivo nuevo

**[`src/app.js`](src/app.js)** (nuevo) — arma la app y la **exporta**:

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
app.use(`/${CARPETA_IMAGENES}`, express.static(CARPETA_IMAGENES))

app.use("/api/auth", authRoutes)
app.use("/api/libros", libroRoutes)
app.use("/api/autores", autorRoutes)
app.use("/api/usuarios", usuarioRoutes)
app.use("/api/carrito", carritoRoutes)
app.use("/api/pedidos", pedidoRoutes)

app.use((req, res) => {
    res.status(404).json({ error: "Esa dirección no existe" })
})

app.use(manejarErrores)

export default app        // ⭐ no hay listen ni conectarDB
```

### 1.2 · Y el de siempre, mucho más corto

**[`src/index.js`](src/index.js)**:

```js
import app from "./app.js"
import { conectarDB } from "./db.js"
import { PORT } from "./utils/config.js"

await conectarDB()

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`)
})
```

`npm start` sigue funcionando exactamente igual.

> ⭐ **La idea más importante del día:** testear nos **obligó** a separar
> *"qué es la app"* de *"cómo se arranca"*. Esa separación es mejor diseño
> por sí sola, sin tests de por medio.

---

## Paso 2 · Instalar y configurar

### 2.1 · Las dos dependencias

```bash
npm install --save-dev jest supertest
```

- **Jest** corre los tests y trae `describe`, `it` y `expect`.
- **Supertest** hace peticiones HTTP a nuestra app sin levantar un servidor.

`--save-dev` porque son herramientas de desarrollo: en producción no hacen falta.

### 2.2 · Los scripts

En **[`package.json`](package.json)**:

```json
"scripts": {
    "start": "node --watch src/index.js",
    "seed": "node src/seed.js",
    "test": "node --experimental-vm-modules node_modules/jest/bin/jest.js",
    "test:watch": "node --experimental-vm-modules node_modules/jest/bin/jest.js --watch",
    "test:coverage": "node --experimental-vm-modules node_modules/jest/bin/jest.js --coverage"
}
```

> ⚠️ **¿Por qué no `"test": "jest"`?** Porque nuestro proyecto es
> `"type": "module"` (usamos `import`/`export`) y Jest todavía necesita el flag
> `--experimental-vm-modules` para eso. Escrito así anda igual en Windows, Mac
> y Linux.
>
> La única consecuencia práctica: **`jest` no es una variable global**. Si vas a
> usar `jest.fn()`, hay que importarlo:
> ```js
> import { jest } from "@jest/globals"
> ```

### 2.3 · La configuración

**[`jest.config.js`](jest.config.js)** (nuevo, en la raíz):

```js
export default {
    testEnvironment: "node",                      // no jsdom: esto no es un navegador
    setupFiles: ["<rootDir>/tests/setup.js"],     // corre ANTES de todo
    testMatch: ["<rootDir>/tests/**/*.test.js"],  // qué archivos son tests
    testTimeout: 15000,                           // Mongo a veces tarda
    maxWorkers: 1,                                // ⭐ los tests NO en paralelo
    collectCoverageFrom: ["src/**/*.js", "!src/seed.js", "!src/index.js"],
}
```

`maxWorkers: 1` importa: por defecto Jest corre cada archivo **a la vez**, en
procesos separados. Pero todos usan la misma base y cada uno la vacía entre
tests: si corrieran juntos, uno le borraría los datos al otro.

---

## Paso 3 · ⚠️ La base de los tests es OTRA base

**Esto es lo único de hoy que puede hacer daño. Leelo dos veces.**

Los tests **vacían colecciones enteras** entre un test y el siguiente. Si
apuntaran a `biblioteca`, el primer `npm test` te borra la base con la que
venís trabajando toda la cursada.

**[`tests/setup.js`](tests/setup.js)** (nuevo):

```js
// ⭐ LA BASE DE LOS TESTS ES OTRA BASE
process.env.MONGO_URI = "mongodb://localhost:27017/biblioteca_test"

// los tokens de los tests no tienen que servir en el servidor de verdad
process.env.JWT_SECRET = "secreto-solo-para-los-tests"

// ⭐ las imágenes van a una carpeta, NO a Supabase
process.env.STORAGE = "local"
process.env.CARPETA_IMAGENES = "uploads-test"
```

Dos cosas que hay que entender de este archivo:

1. **Corre en `setupFiles`, antes de que se importe cualquier archivo.**
   [`config.js`](src/utils/config.js) lee el `.env` una sola vez, cuando lo importan: si pusiéramos
   esto dentro de un test, ya sería tarde.

2. **dotenv no pisa una variable que ya existe.** Por eso alcanza con
   escribirla acá: gana esta y el `.env` queda ignorado.

> ⭐ `STORAGE=local` también es una decisión a propósito: **los tests no suben
> nada a Supabase.** Un test no puede depender de internet ni de la cuenta de
> nadie: tiene que dar el mismo resultado siempre, en cualquier máquina.
> Y nos sale gratis: **una variable**, gracias al adaptador de la clase pasada.

Y por si alguien se confunde, una red de seguridad en [`tests/ayudas.js`](tests/ayudas.js):

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
```

---

## Paso 4 · Las ayudas (lo que hace que un test se lea en 4 líneas)

**[`tests/ayudas.js`](tests/ayudas.js)** (nuevo). Nada de esto es magia de Jest: son funciones
nuestras. La regla que seguimos es **un test tiene que decir QUÉ se prueba**, y
todo el "preparar el escenario" se esconde acá.

### 4.1 · Conectar, cerrar y limpiar

```js
export const cerrarBaseDeTest = async () => {
    // ⚠️ Si no se cierra, Jest termina pero el proceso queda colgado:
    //    aparece el famoso "Jest did not exit one second after..."
    await mongoose.connection.close()
}

// Se vacía antes de CADA test: así un test no puede dejarle datos al siguiente
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

### 4.2 · Las fábricas (factories)

Cada una crea algo con valores razonables y deja que el test cambie **solo lo
que al test le importa**:

```js
let contador = 0
const unico = () => `${Date.now()}-${++contador}`

export const crearLibro = (datos = {}) =>
    Libro.create({
        titulo: "Libro de prueba",
        isbn: `ISBN-${unico()}`,       // el isbn es unique: no puede repetirse
        precio: 1000,
        stock: 5,
        ...datos,                       // ⭐ lo que mande el test gana
    })

export const crearUsuario = ({ password = "test1234", ...datos } = {}) =>
    Usuario.create({
        nombre: "Persona", apellido: "De Prueba",
        email: `test-${unico()}@mail.com`,
        password, rol: "comprador",
        ...datos,
    })

export const crearComprador = (datos = {}) => crearUsuario({ rol: "comprador", ...datos })
export const crearVendedor  = (datos = {}) => crearUsuario({ rol: "vendedor",  ...datos })
```

Y en el test se lee así:

```js
const libro = await crearLibro({ stock: 0 })    // "un libro sin stock", y nada más
```

> Si mañana el modelo pide un campo nuevo, se agrega **acá una vez** y no en los
> treinta tests.

### 4.3 · Los tokens

```js
export const tokenDe = (usuario) =>
    jwt.sign({ id: usuario._id, rol: usuario.rol }, JWT_SECRET, { expiresIn: "1h" })

// firmado con OTRO secreto: para probar que el server rechaza lo que no firmó él
export const tokenFalso = (usuario) =>
    jwt.sign({ id: usuario._id, rol: usuario.rol }, "otro-secreto-cualquiera")

// nuestro pero vencido (expiresIn negativo = venció hace un segundo)
export const tokenVencido = (usuario) =>
    jwt.sign({ id: usuario._id, rol: usuario.rol }, JWT_SECRET, { expiresIn: "-1s" })
```

> No pasamos por `POST /api/auth/login` en cada test: sería testear el login
> treinta veces de paso. El token se firma directo, igual que lo hace
> `authService`.

---

## Paso 5 · El vocabulario (es casi todo Jest)

```js
describe("un grupo de tests", () => {        // solo ordena la salida

    it("hace tal cosa", () => {              // UN test
        expect(2 + 2).toBe(4)
    })
})
```

| Matcher | Para qué |
|---|---|
| `.toBe(x)` | `===` · números, strings, booleanos |
| `.toEqual(x)` | mismo **contenido** · objetos y arrays |
| `.toBeNull()` `.toBeUndefined()` `.toBeDefined()` | |
| `.toHaveLength(n)` | arrays y strings |
| `.toMatch(/regex/)` | el texto **contiene** eso |
| `.toContain(x)` | el array contiene ese elemento |
| `.not` | invierte |
| `.rejects.toThrow(/x/)` | una promesa que **falla** |

Y los cuatro ganchos:

```js
beforeAll(conectarBaseDeTest)    // una vez, antes de todo el archivo
beforeEach(limpiarBase)          // antes de CADA test
afterAll(cerrarBaseDeTest)       // una vez, al final
```

> **La regla:** conectar en `beforeAll` (es caro, una vez) y **vaciar en
> `beforeEach`** (es barato). Así cada test arranca de cero y **el orden en que
> corren no importa**. Un test que necesita que otro corra antes es un test que
> un día va a fallar solo.

### La forma de un test: 1-2-3

Siempre la misma:

```js
it("no deja poner en el carrito más de lo que hay en stock", async () => {
    // 1 · PREPARAR
    const comprador = await crearComprador()
    const libro = await crearLibro({ stock: 3 })

    // 2 · EJECUTAR una sola cosa
    const error = await agregarItemService(comprador._id, { libro: libro._id, cantidad: 4 })
        .catch((e) => e)

    // 3 · COMPROBAR
    expect(error.status).toBe(409)
})
```

### Cómo se testea un error (las dos formas)

```js
// A · solo me importa que falle y con qué mensaje
await expect(eliminarAutorService(autor._id)).rejects.toThrow(/No se puede eliminar/)

// B · necesito mirar el status
const error = await eliminarAutorService(autor._id).catch((e) => e)
expect(error.status).toBe(409)
```

> ⚠️ Lo que **no** funciona es `expect(await loQueFalla())`: el error explota
> antes de llegar a `expect` y el test muere en vez de fallar prolijo.
>
> `.catch(e => e)` es el truco: convierte el rechazo en un valor normal.

---

## Paso 6 · Nivel 1 · Tests unitarios

📄 [`tests/1-unitarios.test.js`](tests/1-unitarios.test.js) · **12 tests · medio segundo**

Sin base, sin servidor, sin internet. Para entrar en confianza.

### El test que vale de verdad

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

**Si esto fallara, al subir dos tapas la segunda pisaría a la primera y
perderíamos una imagen.** No es un test de adorno.

Y el de seguridad:

```js
it("no deja pasar el nombre que mandó el cliente", () => {
    // alguien podría mandar un archivo llamado "../../src/index.js"
    const nombre = nombreUnico("../../src/index.js")

    expect(nombre).not.toContain("..")
    expect(nombre).not.toContain("/")
})
```

### Validaciones del modelo, sin Mongo prendido

`libro.validate()` corre **todas** las validaciones del schema sin tocar la base.
Devuelve una promesa: se cumple si está bien, se rechaza si no.

```js
it("un libro sin título no es válido", async () => {
    const libro = new Libro({ isbn: "123", precio: 100 })

    const error = await libro.validate().catch((e) => e)

    expect(error.errors.titulo).toBeDefined()           // indexado por campo
    expect(error.errors.titulo.message).toMatch(/obligatorio/i)
})
```

Los `default` y los setters se ven sin `await`:

```js
const libro = new Libro({ titulo: "  RAYUELA  ", isbn: "978-3", precio: 100 })

expect(libro.stock).toBe(0)            // default del schema
expect(libro.disponible).toBe(true)    // default
expect(libro.imagen).toBeNull()        // default (clase 23)
expect(libro.titulo).toBe("rayuela")   // trim + lowercase son setters
```

> ⚠️ **`unique` NO se prueba así.** `unique` no es una validación de Mongoose:
> es un **índice de MongoDB**. `validate()` no lo mira. Para probarlo hace falta
> la base → nivel 2.

---

## Paso 7 · Nivel 2 · Services ⭐

📄 [`tests/2-services.test.js`](tests/2-services.test.js) · **26 tests**

**Acá está el valor de verdad.** Los services son donde viven las reglas del
negocio que escribimos nosotros. Se toca la base, pero **no** el servidor HTTP:
se llama a la función directo, como lo haría el controller.

### No alcanza con que falle: hay que ver que no quedó nada a medias

```js
it("NO borra un autor que tiene libros, y avisa con 409", async () => {
    const autor = await crearAutor()
    await crearLibro({ autor: autor._id })

    await expect(eliminarAutorService(autor._id)).rejects.toThrow(/No se puede eliminar/)

    // ⭐ y el autor sigue ahí
    expect(await Autor.findById(autor._id)).not.toBeNull()
})
```

### El control de stock que un `if` mal escrito no pasa

```js
it("tampoco si se llega al límite de a poco", async () => {
    const libro = await crearLibro({ stock: 3 })
    await agregarItemService(comprador._id, { libro: libro._id, cantidad: 2 })

    await expect(agregarItemService(comprador._id, { libro: libro._id, cantidad: 2 }))
        .rejects.toThrow(/Stock insuficiente/)
})
```

2 + 2 = 4 > 3, aunque ninguna de las dos cantidades sola supere el stock. El
control tiene que mirar **la cantidad que va a quedar**, no la que se agrega ahora.

### El checkout: cuatro cosas de un saque

```js
const pedido = await crearPedidoService(comprador._id.toString())

expect(pedido.total).toBe(20000)                             // el total lo calcula el SERVIDOR
expect(pedido.items[0].precioUnitario).toBe(10000)           // la FOTO del precio
expect((await Libro.findById(libro._id)).stock).toBe(3)      // el stock bajó
expect((await obtenerCarritoService(comprador._id)).items).toHaveLength(0)   // el carrito se vació
```

Y el que justifica haber copiado el precio en la línea:

```js
it("⭐ el precio del pedido NO cambia si después cambia el del libro", async () => {
    const pedido = await crearPedidoService(comprador._id.toString())

    await Libro.updateOne({ _id: libro._id }, { precio: 15000 })   // el libro aumenta

    const guardado = await Pedido.findById(pedido._id)
    expect(guardado.total).toBe(10000)        // la factura NO cambia
})
```

### 🏆 El test más importante de la clase

```js
it("si falla a mitad de camino, NO deja stock descontado a medias", async () => {
    const primero = await crearLibro({ stock: 5 })
    const segundo = await crearLibro({ stock: 1 })

    await agregarItemService(comprador._id, { libro: primero._id, cantidad: 2 })
    await agregarItemService(comprador._id, { libro: segundo._id, cantidad: 1 })

    // ⬅️ otra persona compra el último ejemplar del segundo libro
    await Libro.updateOne({ _id: segundo._id }, { stock: 0 })

    await expect(crearPedidoService(comprador._id.toString()))
        .rejects.toThrow(/No hay stock suficiente/)

    // ⭐ el stock del PRIMERO volvió a 5: la compensación del catch funcionó
    expect((await Libro.findById(primero._id)).stock).toBe(5)
    expect(await Pedido.countDocuments()).toBe(0)
})
```

**Esto es imposible de probar a mano**: habría que comprar desde dos navegadores
en el momento justo. En un test son tres líneas.

Y es exactamente el bug que nadie te reporta nunca, porque nadie se entera:
simplemente, con el tiempo, el stock del sistema deja de coincidir con el del
depósito.

### 403 y no 404 (el BOLA/IDOR de la clase de roles, con test)

```js
it("⭐ otra persona recibe 403, NO 404", async () => {
    const error = await obtenerMiPedidoService(pedido._id, intrusa._id.toString())
        .catch((e) => e)

    expect(error.status).toBe(403)
})
```

Y el otro lado de la cancelación:

```js
it("no se puede cancelar un pedido ya pagado", async () => {
    await pagarPedidoService(pedido._id, comprador._id.toString())

    await expect(cancelarPedidoService(pedido._id, comprador._id.toString()))
        .rejects.toThrow(/pagado/)

    // ⭐ y el stock NO se devolvió. Si esto fallara, cada intento de cancelar
    //    un pedido pagado INVENTARÍA stock que no existe.
    expect((await Libro.findById(libro._id)).stock).toBe(3)
})
```

---

## Paso 8 · Nivel 3 · Supertest

📄 [`tests/3-endpoints.test.js`](tests/3-endpoints.test.js) · **23 tests**

Acá se prueba todo junto: ruta → middlewares → controller → service → modelo →
middleware de errores.

### ¿Y el servidor? No se levanta

```js
import request from "supertest"
import app from "../src/app.js"

const res = await request(app).get("/api/libros")

expect(res.status).toBe(200)
expect(Array.isArray(res.body)).toBe(true)
```

Supertest toma la app, la pone a escuchar **en un puerto libre al azar**, hace la
petición de verdad por HTTP y la apaga. Por eso [`app.js`](src/app.js) tenía que exportar la
app sin `listen`.

> ⭐ Se puede tener `npm start` corriendo **y** los tests corriendo al mismo
> tiempo: no chocan.

### 401 vs 403

```js
it("sin token → 401", async () => {
    expect((await request(app).post("/api/libros").send(libroNuevo)).status).toBe(401)
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

Y los dos casos que a mano no se prueban nunca porque son incómodos de armar:

```js
tokenFalso(usuario)     // firmado con OTRO secreto  → 401 "Token inválido"
tokenVencido(usuario)   // expiresIn: "-1s"          → 401 "El token venció"
```

### La forma del JSON que recibe el front

```js
it("el autor viene POPULADO, no como un id suelto", async () => {
    const res = await request(app).get("/api/libros")

    expect(res.body[0].autor.nombre).toBe("ursula k. le guin")
})
```

Si alguien saca el `.populate()`, el front deja de mostrar el autor y **este
test lo avisa antes de que lo note un usuario**.

Y el que cuida al usuario:

```js
expect(registro.body.usuario.password).toBeUndefined()
```

### ⭐ El test que cuida el orden de las rutas

```js
it("/todos es del staff y NO se confunde con /:id", async () => {
    const res = await request(app)
        .get("/api/pedidos/todos")
        .set("Authorization", `Bearer ${tokenDe(vendedora)}`)

    expect(res.status).toBe(200)
})
```

En `pedidoRoutes.js`, `/todos` está declarado **antes** de `/:id`. Si alguien los
da vuelta, Express toma `"todos"` como un id y esta ruta deja de existir: la
vendedora recibiría un **403** ("ese pedido no es tuyo") en vez de la lista.

Un bug rarísimo de diagnosticar a mano. El test lo agarra en el acto.

### Multer: solo se puede probar por HTTP

`req.file` no existe fuera de una petición. `.attach()` arma el
`multipart/form-data` igual que Postman:

```js
const res = await request(app)
    .post("/api/libros")
    .set("Authorization", `Bearer ${tokenDe(vendedora)}`)
    .field("titulo", "Con tapa")
    .field("isbn", "CT-1")
    .field("precio", "9000")
    .attach("imagen", Buffer.from("una-imagen"), "tapa.png")

expect(res.status).toBe(201)
expect(res.body.imagen).toMatch(/^http/)
```

> ⭐ Un `Buffer` alcanza: no hace falta un archivo de verdad en el disco.
> Es el "doble de prueba" de un archivo.

Los cuatro casos que cierran la clase pasada:

| Lo que se manda | Lo que tiene que pasar |
|---|---|
| `.field("precio", "25000")` | `res.body.precio === 25000` — el schema lo convierte |
| un PDF en `imagen` | **400** · *"Solo se permiten imágenes"* |
| 5 MB en `imagen` | **400** · *"no puede pesar mas de 4 MB"* |
| el campo `foto` en vez de `imagen` | **400** · *'el campo tiene que llamarse "imagen"'* |

Y el de la compensación, que cierra el círculo del `catch` de `libroService`:

```js
it("⭐ si el ISBN está repetido, la imagen subida se borra", async () => {
    // ... POST con un ISBN que ya existe ...
    expect(res.status).toBe(409)

    // la imagen ya no está en la carpeta: si no, cada intento fallido
    // dejaría un archivo huérfano para siempre
    expect(imagenesEnLaCarpeta()).toHaveLength(0)
})
```

### El recorrido completo

El último test del archivo hace, de punta a punta: registro → carrito → pedido →
"mis pedidos" → la lista del staff.

**Siete pasos, un test, 100 milisegundos.** Es el mismo recorrido que probamos a
mano en la clase 22 y que tardaba cinco minutos.

---

## Extra · middlewares y storage

📄 [`tests/4-middlewares-y-storage.test.js`](tests/4-middlewares-y-storage.test.js) · **9 tests**

### Un middleware es una función común

```js
import { jest } from "@jest/globals"

const next = jest.fn()           // una función espía: se acuerda de si la llamaron
const req = { headers: { authorization: `Bearer ${tokenDe(usuario)}` } }

verificarToken(req, {}, next)

expect(next).toHaveBeenCalled()
expect(req.usuario.rol).toBe("vendedor")
```

El `req` es un objeto hecho a mano: el middleware solo mira `req.headers`,
entonces eso alcanza. **Ese es el "doble de prueba" más simple que existe.**

Y de paso se ve algo que siempre confunde:

```js
permitirRoles("vendedor", "admin")   // ⭐ NO es un middleware: es una FÁBRICA de
                                     //   middlewares. Por eso va con paréntesis
                                     //   en las rutas, y verificarToken sin.
```

### El adaptador de storage, sin internet

Se testea el de **disco**, no el de Supabase:

```js
const archivoFalso = {
    originalname: "tapa.png",
    mimetype: "image/png",
    buffer: Buffer.from("contenido-de-la-imagen"),
}

const url = await subir(archivoFalso)

expect(imagenesEnLaCarpeta()).toHaveLength(1)
expect(url).toContain(imagenesEnLaCarpeta()[0])
```

> ⚠️ **No se testea Supabase, a propósito:**
> el test dependería de internet y de la cuenta de alguien, tardaría segundos en
> vez de milisegundos, y si fallara **no nos diría nada de nuestro código**.
>
> **No se testea la biblioteca de otro. Se testea lo nuestro.**

---

## Coverage: el número y la trampa

```bash
npm run test:coverage
```

```
All files              |   66.92 |    48.27 |   58.16 |   67.73
 src/controllers       |   43.29 |        0 |   29.62 |   43.29
 src/routes            |     100 |      100 |     100 |     100
 src/services          |   70.12 |    51.11 |   69.38 |   70.37
 src/config            |       0 |        0 |     100 |       0
```

**67%. Y está bien.**

- **`routes` 100%**: lógico, los tests de endpoints pasan por todas.
- **`controllers` 43%**: también lógico. Casi no tienen lógica: traducen y nada más.
- **`config` 0%**: ahí vive el cliente de Supabase, que **a propósito nunca se
  importa en los tests**. Un 0% que es exactamente lo que queríamos.

> ⚠️ **El 100% de coverage es una mala meta.** Es fácil de conseguir y no quiere
> decir nada. Este test da coverage y no prueba absolutamente nada:
>
> ```js
> it("anda", async () => { await crearPedidoService(id) })   // sin un solo expect
> ```
>
> El coverage sirve para **encontrar lo que te olvidaste de probar**, no como
> nota. Mirá la columna **% Branch**: ahí se ven los `if` que ningún test
> recorrió. Esos sí valen la pena.

---

## Qué NO se testea

Tan importante como lo otro:

- **Mongoose, Express, Supabase, bcrypt.** No es tu código: ya tienen sus tests.
- **Los controllers que solo traducen.** Si no hay una decisión, no hay nada que probar.
- **Que un `console.log` imprima.**
- **El panel de Supabase.**

## Qué sí vale un test, siempre

1. **Una regla del negocio** ("no se puede borrar un autor con libros").
2. **Un cálculo** (el total del pedido).
3. **Un permiso** (403 vs 404).
4. **Un caso raro que ya nos rompió una vez** ⭐ — el mejor momento para escribir
   un test es justo después de arreglar un bug: así no vuelve.

---

## Lo que los tests encontraron en nuestro código

Esto pasó de verdad hoy, y es la mejor demostración de para qué sirven.

### 1 · `pedidoService` estaba a medio terminar

En la clase 22 completamos `crearPedidoService`, pero las otras cinco funciones
habían quedado como comentarios:

```js
export const listarMisPedidosService = async (usuarioId) => {
  // find filtrando por usuario, ordenado del más nuevo al más viejo
};
```

El servidor arrancaba igual y Postman devolvía `200` con un body vacío: **nadie
se daba cuenta.** Al correr los tests, **10 de 70 se pusieron rojos de una vez**
y señalaron exactamente qué faltaba. Ya están implementadas:
`listarMisPedidosService`, `buscarPedidoPropio`, `obtenerMiPedidoService`,
`cambiarEstado`, `pagarPedidoService`, `cancelarPedidoService` y
`listarTodosPedidosService`.

### 2 · Faltaba `API_URL` en [`config.js`](src/utils/config.js)

Con `STORAGE=local`, el proyecto **no arrancaba**:

```
SyntaxError: The requested module '../../utils/config.js'
does not provide an export named 'API_URL'
```

Arreglado en [`src/utils/config.js`](src/utils/config.js):

```js
const API_URL = process.env.API_URL || `http://localhost:${PORT}`
```

### 3 · Faltaba conectar `manejarErroresDeMulter`

La función estaba escrita en `subirImagen.js`, pero nadie la usaba. Resultado:
una imagen de más de 4 MB respondía **500 "Error interno del servidor"** en vez
de **400** con el mensaje. Arreglado al final de [`src/routes/libroRoutes.js`](src/routes/libroRoutes.js):

```js
router.use(manejarErroresDeMulter)
```

### 4 · Dos `console.log` olvidados

`verificarToken` imprimía el header y el token en cada petición. Se ve enseguida
cuando los tests lo llaman cien veces seguidas. Y además: **imprimir tokens en
el log es un problema de seguridad**, no solo de ruido.

---

## Ahora ustedes

📄 [`tests/5-para-completar.test.js.txt`](tests/5-para-completar.test.js.txt) — **siete tests a medio escribir**, con
el título puesto y los pasos comentados.

```bash
# 1. renombrarlo:  5-para-completar.test.js.txt → 5-para-completar.test.js
# 2. npm test -- tests/5
# 3. completar un it() y volver a correr
```

Termina en `.txt` a propósito, para que Jest no lo corra y la suite siga verde.

Las soluciones están en [`tests/5-soluciones.test.js.txt`](tests/5-soluciones.test.js.txt) — mirarlas después de
intentarlo.

---

## Si algo no anda

| Lo que ves | Qué pasa |
|---|---|
| `Cannot use import statement outside a module` | falta el flag: usá `npm test`, no `npx jest` |
| `jest is not defined` | con ESM hay que importarlo: `import { jest } from "@jest/globals"` |
| `Jest did not exit one second after...` | falta cerrar la conexión: `afterAll(cerrarBaseDeTest)` |
| `🛑 Los tests NO corren contra "biblioteca"` | la red de seguridad funcionando: revisá [`tests/setup.js`](tests/setup.js) |
| `MongooseServerSelectionError` | Mongo no está prendido |
| un test pasa solo y falla con los demás | se quedó con datos del anterior: falta `beforeEach(limpiarBase)` |
| `EADDRINUSE` | no debería pasar: Supertest usa un puerto al azar. Si pasa, quedó un `app.listen` en [`app.js`](src/app.js) |
| se borró la base de la cursada | `npm run seed` |

---

## El mapa completo

```
15/
├── jest.config.js                ⭐ nuevo · la configuración
├── src/
│   ├── app.js                    ⭐ nuevo · arma la app y la EXPORTA
│   └── index.js                      solo conecta y escucha
└── tests/
    ├── setup.js                  ⚠️  a qué base apuntan los tests
    ├── ayudas.js                     las factories y la red de seguridad
    ├── 1-unitarios.test.js           sin base ni servidor         · 12 tests
    ├── 2-services.test.js        ⭐  las reglas del negocio       · 26 tests
    ├── 3-endpoints.test.js           la API por HTTP (Supertest)  · 23 tests
    ├── 4-middlewares-y-storage.test.js  middlewares y adaptador   ·  9 tests
    ├── 5-para-completar.test.js.txt  para escribir
    └── 5-soluciones.test.js.txt      las respuestas
                                                              ─────────────
                                                                  70 tests
```

**Tres ideas para llevarse:**

1. **Testear te obliga a desacoplar.** [`app.js`](src/app.js) / [`index.js`](src/index.js) es la prueba.
2. **El valor está en las reglas del negocio**, no en el porcentaje de coverage.
3. **Un test es documentación que no puede mentir.** Un comentario que dice
   "esto devuelve 409" puede quedar viejo. Un `expect(error.status).toBe(409)`
   no: si deja de ser verdad, se pone rojo.
