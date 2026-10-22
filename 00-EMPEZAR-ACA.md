# Empezar acá — Express + Mongoose

**Para quién es este documento:** para vos, si faltaste a la clase, si te perdiste en algún momento,
o si querés tener en un solo lugar todo lo que vimos.

Está armado sobre **el código que escribimos en clase**. Empezá de arriba.

---

## Índice

1. [Qué hicimos hoy](#1-qué-hicimos-hoy)
2. [El proyecto: qué archivo hace qué](#2-el-proyecto-qué-archivo-hace-qué)
3. [Los archivos que no escribiste vos](#3-los-archivos-que-no-escribiste-vos)
4. [Cómo arrancar un proyecto que te descargaste](#4-cómo-arrancar-un-proyecto-que-te-descargaste)
5. [La conexión](#5-la-conexión)
6. [⭐ El modelo](#6--el-modelo)
7. [El seed](#7-el-seed)
8. [Las rutas](#8-las-rutas)
9. [Errores del primer día](#9-errores-del-primer-día)
10. [Chuleta](#10-chuleta)

---

## 1. Qué hicimos hoy

En la clase pasada armamos un servidor con los datos en un array:

```js
let contactos = [ { id: 1, nombre: "Ana" }, ... ];
```

Funcionaba. **Hasta que apagabas el servidor.**

```
POST /libros   →  201, se creó
GET  /libros   →  7 libros    ✅

Ctrl+C  ·  volver a arrancar

GET  /libros   →  6 libros    ❌ el 7 no existe más
```

No se rompió nada: el array volvió a ser exactamente lo que dice el código. Todo lo que guardaste
vivía **en la memoria RAM del proceso**, y cuando el proceso muere, se muere con él.

Hoy le conectamos **una base de datos real**.

> 🎯 **Nos faltaba la tercera pieza del diagrama de la primera clase:**
>
> ```
>    CLIENTE  ────►  SERVIDOR  ────►  BASE DE DATOS
>                    la clase          esta clase
>                    pasada
>                    el cerebro        la memoria
> ```

### Qué es Mongoose

Para hablarle a MongoDB desde Node hay dos caminos: el driver oficial, que es MongoDB crudo, o
**Mongoose**, que es una capa arriba.

**Mongoose es un ODM** — *Object Document Mapper*. Traduce entre los objetos de JavaScript que
escribís y los documentos que MongoDB guarda.

Pero lo importante no es la traducción:

> 🧠 En la clase 8 dijimos que MongoDB es **una hoja en blanco**: le escribís cualquier cosa y te la
> acepta. Si escribías `precoi` en vez de `precio`, te lo guardaba igual, sin chistar.
>
> **Mongoose es el formulario con validaciones que le ponés encima a esa hoja.**

---

## 2. El proyecto: qué archivo hace qué

```
15/
├── package.json          ← qué necesita el proyecto
├── package-lock.json     ← qué versión EXACTA de cada cosa
├── .gitignore            ← qué NO se sube al repositorio
├── node_modules/         ← el código de las librerías
└── src/
    ├── index.js          ← el servidor y las rutas
    ├── db.js             ← la conexión a MongoDB
    ├── seed.js           ← los datos de arranque
    └── models/
        ├── autor.js      ← un archivo por modelo
        └── libro.js
```

### Por qué `src/`

El código va en `src/`, y en la raíz quedan solo los archivos de configuración. Es una **convención**,
no una regla del lenguaje — pero la vas a ver en casi cualquier proyecto de Node, y sirve: de un
vistazo sabés qué escribiste vos y qué es andamiaje.

### Cada archivo, una responsabilidad

| Archivo | De qué se ocupa |
|---|---|
| `db.js` | **El único lugar del proyecto que sabe dónde está la base.** Si mañana se muda a un servidor en la nube, se toca acá y nada más |
| `models/` | La **forma y las reglas** de los datos |
| `seed.js` | Cargar los datos de arranque. El botón de reset |
| `index.js` | El servidor y las rutas |

---

## 3. Los archivos que no escribiste vos

De los cuatro que hay en la raíz, **vos escribiste dos líneas en total**. Los demás los generó npm.
Conviene entender qué es cada uno, porque son los que más confusión generan.

### `package.json` — el documento de identidad

Lo creó `npm init -y`. Dice cómo se llama el proyecto, con qué archivo se ejecuta, qué comandos
tiene y — lo más importante — **de qué depende**:

```json
{
  "main": "src/index.js",
  "type": "module",
  "scripts": {
    "start": "node --watch src/index.js",
    "seed":  "node src/seed.js"
  },
  "dependencies": {
    "express":  "^5.2.1",
    "mongoose": "^9.9.5"
  }
}
```

La sección `dependencies` **se escribió sola** cuando corriste `npm install express mongoose`.

> 💡 `"type": "module"` es la línea que decide si el proyecto usa `import` o `require`. Con ella,
> `import`. Sin ella, `require`. **No se pueden mezclar.**

### `node_modules/` — el código de las librerías

Abrila: tiene **decenas de carpetas**. Instalaste dos paquetes y aparecieron sesenta, porque Express
y Mongoose también dependen de otras librerías, y esas de otras.

Acá adentro está el código real de Express y de Mongoose.

> ⚠️ **Esta carpeta nunca se toca y nunca se sube al repositorio.** Pesa muchísimo y **se regenera
> entera** con un solo comando.

### `package-lock.json` — las versiones exactas

En `package.json` dice `"mongoose": "^9.9.5"`. Ese `^` significa *"esta versión o cualquier
actualización menor compatible"*. O sea: `9.9.6`, `9.10.0`, etc. **No es una versión fija.**

`package-lock.json` sí lo es: guarda **la versión exacta de cada uno de los sesenta paquetes** que se
instalaron, con su dirección de descarga y su firma.

> 🎯 Es lo que hace que a vos y a mí nos instale **exactamente lo mismo**, aunque hayamos corrido
> `npm install` con tres meses de diferencia.
>
> **No se edita a mano.** Lo maneja npm.

### `.gitignore` — qué NO se sube

```
package-lock.json
node_modules
```

**Cómo funciona:** es un archivo de texto con una regla por línea. Git lee ese archivo y **actúa como
si esos archivos no existieran**: no aparecen en `git status`, no se agregan con `git add .`, no
viajan al repositorio.

Las reglas son simples:

```
node_modules        ← un nombre: ignora ese archivo o carpeta, esté donde esté
node_modules/       ← la barra al final: solo si es carpeta
*.log               ← un asterisco: cualquier archivo terminado en .log
.env                ← el archivo de claves. NUNCA al repo
```

**Por qué `node_modules` va ahí:** porque se regenera. Subir sesenta carpetas de código que no
escribiste, cada vez que hacés un commit, no tiene ningún sentido.

**Sobre `package-lock.json`:** en este proyecto lo estamos ignorando. Tenelo presente porque
**la convención general es la contraria: normalmente se sube**, justamente para que todo el equipo
instale las mismas versiones exactas. Si lo ignorás, cada uno que clone el proyecto va a instalar la
última versión compatible que exista ese día — que puede no ser la tuya.

> 📌 En resumen:
>
> | Archivo | ¿Va al repo? | ¿Por qué? |
> |---|---|---|
> | `package.json` | **Sí** | Dice qué necesita el proyecto |
> | `package-lock.json` | **Normalmente sí** | Fija las versiones exactas |
> | `node_modules/` | **No** | Se regenera con un comando |
> | `.gitignore` | **Sí** | Es la lista de qué ignorar |
> | `.env` | **Nunca** | Ahí van las claves |

---

## 4. Cómo arrancar un proyecto que te descargaste

Esto te va a pasar todo el tiempo: clonás un repo de GitHub, o te pasan un `.zip`, y **no viene
`node_modules`**. Viene `package.json`.

```bash
npm i
```

`npm i` es la forma corta de `npm install`. Sin nombre de paquete atrás, hace esto:

1. Lee `package.json` (y `package-lock.json`, si está)
2. Descarga **todo** lo que dice `dependencies`
3. Crea `node_modules/` con eso adentro

En unos segundos tenés el proyecto entero funcionando, sin haber bajado una sola librería a mano.

> 🎯 **Por eso importa que `package.json` esté bien.** Es el que reconstruye todo.

### La secuencia completa

```bash
npm i            # 1. instalar las dependencias
npm run seed     # 2. cargar los datos de arranque
npm start        # 3. levantar el servidor
```

> ⚠️ Y antes de todo eso: **que MongoDB esté corriendo.** Verificalo con:
> ```bash
> mongosh --eval "db.version()"
> ```

### Los scripts

Los comandos viven en la sección `scripts` del `package.json`:

```bash
npm start        # levanta el servidor (con --watch: se reinicia solo al guardar)
npm run seed     # resetea la base
```

> 💡 `start` es el único que funciona sin `run`. Todos los demás necesitan `npm run <nombre>`.
>
> `npm start` es el nombre **estándar**: en cualquier proyecto de Node del mundo, `npm start` lo
> levanta. No hace falta leer el código para saber cómo se arranca.

---

## 5. La conexión

```js
// src/db.js
import mongoose from 'mongoose'

const MONGO_URI = "mongodb://localhost:27017/biblioteca"

export const conectarDB = async () => {
    try {
        await mongoose.connect(MONGO_URI)
        console.log(`MongoDB conectado . base "${mongoose.connection.name}"`)
    } catch (error) {
        console.error(`No se pudo conectar ${error.message}`)
        process.exit(1)
    }
}
```

### La cadena de conexión

```
   mongodb://localhost:27017/biblioteca
   └──┬───┘  └───┬────┘ └─┬─┘ └────┬────┘
   protocolo  máquina   puerto    BASE

   http://localhost:3000/libros        ← la del servidor
```

Misma anatomía, otro protocolo y otro puerto. **27017** es el de MongoDB, como **3306** era el de
MySQL y **3000** el de nuestro servidor.

> 💡 **La base no hay que crearla.** Mongo la crea sola la primera vez que guardás algo. Si todavía
> no guardaste nada, no aparece en Compass — y eso está bien.

### `process.exit(1)`

Corta el programa ahí mismo. Parece drástico, y es a propósito:

> Una API sin base de datos **no tiene sentido que siga viva**: cada pedido que le llegue va a fallar
> igual. Es preferible que muera al arrancar, con un mensaje claro, y no que quede corriendo rota.

### Y en `index.js`, primero la base

```js
await conectarDB()          // ⬅️ el await está arriba de todo

const app = express()
```

Si Express empezara a atender pedidos antes de que la conexión esté lista, los primeros fallarían.
Con el `await` ahí, `app.listen()` ni siquiera se ejecuta hasta que la base respondió.

---

## 6. ⭐ El modelo

Esta es la parte central de la clase.

> **El modelo básicamente es validación, filtro y formateo de datos antes de que entren en la DB.**

Tres cosas, no una:

- **Valida** — rechaza lo que no cumple las reglas
- **Filtra** — un campo que no está en el schema no se guarda
- **Formatea** — le saca espacios, lo pasa a minúsculas, completa lo que falta

### Schema y Model son dos cosas

```js
const autorSchema = new mongoose.Schema({ ... });      // el molde
export default mongoose.model("Autor", autorSchema);   // la máquina
```

> ```
> ┌──────────────────────────────────────────────────────────┐
> │  Schema  =  el molde     (qué forma tiene un documento)  │
> │  Model   =  la máquina   (crear, buscar, actualizar)     │
> └──────────────────────────────────────────────────────────┘
> ```

El schema es una **descripción**: no hace nada por sí solo. El model es lo que Mongoose construye a
partir de él, y es lo que tiene los métodos.

### ⭐ El nombre de la colección

```js
mongoose.model("Autor", autorSchema)   →   colección "autors"
mongoose.model("Libro", libroSchema)   →   colección "libros"
```

> Escribís el nombre en **singular y con mayúscula**, y Mongoose usa la colección en **minúscula y
> plural**. Lo pluraliza solo.
>
> ⚠️ **Y lo pluraliza en inglés.** `Autor` no es una palabra que reconozca, así que le pega una `s`:
> la colección queda **`autors`**, no `autores`.

Importa para las consultas. Se puede forzar el nombre real con un tercer argumento:

```js
mongoose.model("Autor", autorSchema, "autores")
```

Es la razón número uno por la que abrís Compass y no encontrás la colección con el nombre que
escribiste.

---

### Las reglas, una por una

Así quedó el modelo de autor:

```js
const autorSchema = new mongoose.Schema({

    nombre: {
        type: String,
        required: [true, "El nombre del autor es obligatorio"],
        trim: true,
        minlength: [3, "El nombre necesita al menos 3 caracteres"],
        maxlength: [60, "El nombre no puede tener mas de 60 caracteres"],
        lowercase: true
    },

    nacionalidad: {
        type: String,
        enum: ["argentina", "uruguaya", "chilena"],
        default: "argentina",
        lowercase: true
    },

    nacimiento: {
        type: Number,
        min: [1800, "Ese año es demasiado antiguo"],
        max: [2010, "Ese año es demasiado reciente"]
    }
})
```

#### `type` — de qué tipo es el campo

`String`, `Number`, `Boolean`, `Date`, `mongoose.Schema.Types.ObjectId`.

Si mandás algo que no se puede convertir a ese tipo, Mongoose lo rechaza.

#### `required` — el campo tiene que estar

```js
required: [true, "El nombre del autor es obligatorio"]
```

> **El segundo parámetro es el mensaje de error.** Escribilo siempre: es lo que va a leer quien use
> tu API. Si ponés solo `required: true`, el mensaje sale en inglés y genérico.

#### `trim` — borra espacios adelante y atrás

```
entra:  "  Julio Cortázar  "
sale:   "Julio Cortázar"
```

Solo los de los bordes. Los del medio quedan.

#### `lowercase` — lo pasa a minúsculas

```
entra:  "Julio CORTÁZAR"
sale:   "julio cortázar"
```

> 💡 Sirve para **que las búsquedas sean predecibles**: si todo está guardado en minúsculas, no
> tenés que preocuparte por cómo lo escribió el que cargó el dato.

#### `default` — el valor si no mandan nada

```js
genero: { type: String, enum: [...], default: "novela" }
```

> **`default` hace que, si no te mandan nada en ese campo, ese valor sea el que queda.**
>
> Y puede pasar que no te manden nada **porque el campo no es `required`**. Los dos van de la mano:
> `required` obliga a que esté, `default` completa cuando no está.

Un campo con `required` y `default` a la vez no tiene mucho sentido: el default nunca se usaría.

#### `enum` — lista cerrada de valores

```js
enum: ["novela", "cuento", "poesia"]
```

Cualquier otra cosa se rechaza. Es el equivalente al `ENUM` de MySQL.

#### `min` / `max` — rango para números

```js
anio: { type: Number, min: [1400, "..."], max: [2027, "..."] }
```

#### `minlength` / `maxlength` — largo para textos

```js
nombre: { minlength: [3, "..."], maxlength: [60, "..."] }
```

> ⚠️ No los mezcles: `min`/`max` es para **números**, `minlength`/`maxlength` para **textos**.

#### `match` — formato, con expresión regular

```js
email: { type: String, match: [/^\S+@\S+\.\S+$/, "Ese email no tiene forma de email"] }
```

---

### ⭐⭐ `unique` NO es una validación

```js
isbn: {
    type: String,
    required: [true, "El ISBN es obligatorio"],
    unique: true,          // No es una validación → es un índice
    trim: true
}
```

Se escribe al lado de `required` y `trim`, así que **parece una regla más. No lo es.**

```
   required, min, match, enum   →  los revisa MONGOOSE, en Node,
                                   antes de mandar nada a la base

   unique                       →  le pide a MONGODB que cree un
                                   ÍNDICE ÚNICO. Rechaza la BASE.
```

**Consecuencia práctica:** el error que tira es de **otro tipo**.

| | Regla del schema | `unique` |
|---|---|---|
| `error.name` | `ValidationError` | `MongoServerError` |
| `error.code` | — | **`11000`** |
| Tiene `error.errors` | Sí, con el detalle por campo | No |

> **11000** es el número que hay que reconocer: "clave duplicada".
>
> Si en tu API solo atrapás `ValidationError`, este error se te escapa y le respondés **500** al
> cliente — cuando la culpa era de él y correspondía un **400**.

---

### ⭐ `Date.now` sin paréntesis

```js
creado: {
    type: Date,
    default: Date.now       // sin paréntesis
}
```

> `Date.now` **se ejecuta cuando se crea el documento**.
> Si ponés `Date.now()`, todos los libros van a quedar con **la hora de arranque del sistema**.

```js
default: Date.now       // ✅ le pasás LA FUNCIÓN. Mongoose la llama por cada documento
default: Date.now()     // ❌ la llamás VOS, ahora. Se guarda una sola fecha para todos
```

Un paréntesis de diferencia, y **ningún error**.

---

### ⭐ La referencia

```js
autor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Autor"
}
```

> **Es una referencia. No es una FOREIGN KEY, pero es parecido.**

Lo que se guarda en la base es **el `_id` del autor**, no su nombre:

```json
{ "titulo": "rayuela", "autor": "6aa0821a8e314da964f922a0" }
```

**En qué se parece a una FK:** apunta a un documento de otra colección, igual que una FK apunta a
una fila de otra tabla.

**En qué NO se parece — y es importante:**

> ⚠️ `ref` **no crea ninguna restricción**. Mongo te deja guardar tranquilamente un `_id` que no
> existe, y al hacerle `populate` ese campo viene **`null`**.
>
> En MySQL eso era imposible: la base rechazaba la fila con
> `Cannot add or update a child row: a foreign key constraint fails`.
>
> `ref` es solo una **anotación para Mongoose**, que le dice a qué colección ir a buscar cuando le
> pidas un `populate`. **La integridad referencial, en Mongo, es responsabilidad de tu código.**

### Embeber o referenciar

Mongo no tiene `JOIN`. Cuando dos datos se relacionan hay dos caminos:

| | **Embebido** | **Referencia** |
|---|---|---|
| Se ve como | `{ autor: { nombre: "Borges" } }` | `{ autor: ObjectId("6aa0...") }` |
| Para leerlo | ✅ ya viene, 1 consulta | ❌ hace falta una segunda |
| Para cambiarlo | ❌ hay que tocar todos los que lo repiten | ✅ un solo lugar |

> 💡 **La regla práctica:**
> ¿el dato **pertenece** al documento y casi no cambia? → **embebido**
> ¿el dato **es otra entidad** que muchos comparten? → **referencia**
>
> Un autor lo comparten muchos libros, y si le corregís el nombre querés corregirlo en un solo lugar
> y no en los 40 libros que escribió. → **referencia**.

---

## 7. El seed

```bash
npm run seed
```

**"Seed" es semilla.** Es un script que **borra todo y vuelve a cargar los datos de arranque**.

```js
// src/seed.js
await conectarDB();

// Primero los libros: apuntan a los autores.
await Libro.deleteMany({});
await Autor.deleteMany({});

await Autor.syncIndexes();
await Libro.syncIndexes();

const [cortazar, borges, ...] = await Autor.create([ ... ]);

await Libro.create([
    { titulo: "Rayuela", isbn: "978-84-376-0001", autor: cortazar._id },
    ...
]);

await mongoose.connection.close();
```

### Para qué sirve

1. **Que todos empecemos igual.** Cuando yo digo "tenés que ver 6 libros", vos ves 6 libros.
2. **Volver atrás.** Cuando la práctica te dejó la base hecha un desastre, corrés eso y volvés al
   punto de partida.

> 🎯 **Es el botón de reset.** Anotalo, porque lo vas a usar mucho.

### Cuatro detalles del código

**El orden del borrado.** Primero los libros, después los autores: los libros son los que apuntan.
Si borrás los autores primero, te quedan libros apuntando a la nada.

**`create()` acepta un array** y crea todos de una.

**`syncIndexes()`** crea los índices de `unique`. Mongoose los crea en segundo plano, y en un script
que termina enseguida hay que pedirlos explícitamente. En la API no hace falta.

**`mongoose.connection.close()`** al final. En un **script** hay que cerrar, si no el programa queda
vivo esperando — la conexión abierta cuenta como "trabajo pendiente" para Node, igual que
`app.listen()`.

> ⚠️ En la **API** no cerramos nunca: queremos que la conexión quede abierta. Se abre **una sola
> vez**, al arrancar, y se reutiliza en todos los pedidos.

---

## 8. Las rutas

```js
import express from 'express'
import { conectarDB } from "./db.js";
import Autor from "./models/autor.js";
import Libro from "./models/libro.js";

await conectarDB()

const app = express()

// express.json lee las consultas que recibimos en json y las puede utilizar
app.use(express.json())

app.get("/libros", async (req, res) => {
    try {
        const libros = await Libro
            .find()
            .populate("autor", "nombre nacionalidad")
            .sort({ titulo: 1 })

        res.status(200).json(libros)
    } catch (error) {
        console.error(error.message)
    }
})

// Caso 404 en caso que la direccion no exista
app.use((req, res) => {
    res.status(404).json({ error: "Esa dirección no existe" });
});

const PORT = 3000

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`)
})
```

### `async` y `try/catch`

Las dos cosas nuevas, y van en **todas** las rutas que tocan la base:

1. **`async`** — porque adentro hay `await`. Hablar con la base sale por la red y tarda.
2. **`try/catch`** — porque la base puede fallar.

### `populate`

Sin él, el campo `autor` viene como un número largo — que es lo que está guardado de verdad:

```json
{ "titulo": "rayuela", "autor": "6aa0821a8e314da964f922a0" }
```

Con `populate("autor", "nombre nacionalidad")`, Mongoose va a buscar ese autor y lo reemplaza por el
documento, trayendo solo esos dos campos:

```json
{ "titulo": "rayuela", "autor": { "nombre": "julio cortázar", "nacionalidad": "argentina" } }
```

> ⚠️ **`populate` no es un JOIN.**
>
> ```
>    JOIN de SQL   →  la base une las tablas.               1 viaje
>    populate      →  Mongoose consulta libros, mira qué _id
>                     salieron, hace UNA SEGUNDA consulta a
>                     autores, y pega del lado de Node.     2 viajes
> ```
>
> De ahí sale una regla: **nunca un `populate` adentro de un loop.** Un solo `.populate()` sobre la
> consulta entera resuelve todo en 2 consultas; adentro de un `for` son 1 + N. Tiene nombre propio:
> el **problema N+1**.

### Los filtros son los mismos de siempre

```js
await Libro.find({ genero: "novela" })
await Libro.find({ anio: { $gte: 1950 } })
```

`$gte`, `$in`, `$or`, `$regex`... **son exactamente los de la clase 8.** Mongoose no inventó un
lenguaje nuevo: le pasa el filtro a MongoDB tal cual.

### El 404 va último

```js
app.use((req, res) => { res.status(404).json({ error: "Esa dirección no existe" }) })
```

Ese bloque **no tiene dirección: coincide con todo.** Express prueba las rutas en orden, de arriba
hacia abajo. Si un pedido llegó hasta ahí, es porque ninguna otra lo agarró.

> ⚠️ Si lo ponés arriba, **atrapa todo** y ninguna otra ruta se ejecuta nunca.

### 🐞 Un detalle a corregir en el código de la clase

Mirá el `catch` de las rutas:

```js
} catch (error) {
    console.error(error.message)      // ⚠️ imprime, pero no responde
}
```

Imprime el error en la terminal, **pero nunca llama a `res`**. Si algo falla, el cliente
**queda esperando para siempre**: ni respuesta ni error.

Todo camino de una ruta tiene que terminar en un `res`:

```js
} catch (error) {
    console.error(error.message)
    res.status(500).json({ error: "Error interno del servidor" })
}
```

> 💡 El detalle técnico va al `console.error` (para nosotros); al cliente solo el mensaje. Nunca se
> le manda un stack trace: le estarías contando cómo está hecho tu sistema por dentro.

---

## 9. Errores del primer día

| Lo que ves | Qué pasó |
|---|---|
| `ECONNREFUSED 127.0.0.1:27017` | MongoDB no está corriendo |
| `Cannot find module 'mongoose'` | Falta `npm i`, o estás parado en otra carpeta |
| `Cannot find module './db.js'` | Falta el `.js` en el import |
| `Cannot use import statement outside a module` | Falta `"type": "module"` en el `package.json` |
| `Operation buffered timed out after 10000ms` | Usaste un modelo antes de conectar. Falta el `await conectarDB()` |
| **La colección no aparece en Compass** | Todavía no guardaste nada, o la buscás en singular (`autores` vs `autors`) |
| **La petición queda cargando y nunca responde** | El `catch` no llama a `res`, o falta un `res` en algún camino |
| **Guarda datos inválidos en un update** | Falta `runValidators` (ver la chuleta) |
| Un ISBN repetido responde 500 | Falta atrapar `error.code === 11000` |
| **El campo referenciado sale como un número largo** | Falta el `.populate(...)` |
| **Todas las rutas dan 404** | El `app.use` del 404 quedó arriba de las demás |
| `Cannot overwrite model once compiled` | Registraste dos veces un modelo con el mismo nombre |
| Todo quedó hecho un desastre | `npm run seed` |

> 🎯 Fijate las cinco en negrita. **Ninguna da un mensaje de error.** El programa hace exactamente lo
> que le pediste — solo que no era lo que querías. Son las que más tiempo hacen perder.

---

## 10. Chuleta

### Los comandos

```bash
npm i                           # instalar las dependencias de package.json
npm i express mongoose          # instalar paquetes nuevos (y anotarlos en package.json)
npm run seed                    # resetear la base a los datos de arranque
npm start                       # levantar el servidor
mongosh --eval "db.version()"   # ¿está corriendo MongoDB?
```

### Las reglas del modelo

| Regla | Qué hace |
|---|---|
| `type` | De qué tipo es el campo |
| `required` | El campo tiene que estar · `[true, "mensaje"]` |
| `default` | Valor automático si no lo mandan |
| `min` / `max` | Rango para **números** |
| `minlength` / `maxlength` | Largo para **textos** |
| `match` | Formato, con expresión regular |
| `enum` | Lista cerrada de valores |
| `trim` | Le saca los espacios de los bordes |
| `lowercase` | Lo pasa a minúsculas |
| `unique` | ❗ **No es validación.** Es un índice: su error es el **11000** |
| `ref` | ❗ **No es una FK.** Es una anotación para el `populate` |

### Las operaciones

```js
await Modelo.find(filtro)               // array (puede ser [])
await Modelo.findById(id)               // documento o null
await Modelo.findOne(filtro)            // documento o null
await Modelo.create(datos)              // el documento creado
await Modelo.countDocuments(filtro)     // un número
await Modelo.deleteMany({})             // borra todo

await Modelo.find().populate("campo", "solo estos campos").sort({ campo: 1 })
```

**Para modificar y borrar** (los vemos en profundidad la próxima):

```js
await Modelo.findByIdAndUpdate(id, datos, { returnDocument: "after", runValidators: true })
await Modelo.findByIdAndDelete(id)
```

> ⚠️ Las dos opciones van **siempre juntas**:
> - **`returnDocument: "after"`** — devolveme el documento **después** del cambio. Sin esto te
>   devuelve la foto vieja, el cambio se guarda igual, y **parece que no pasó nada**.
>   *(En código más viejo vas a ver `{ new: true }`: es lo mismo, pero está deprecado en Mongoose 9.)*
> - **`runValidators: true`** — respetá las reglas del schema también acá. **Sin esto, los updates se
>   saltean TODAS las validaciones, sin avisar.** `create()` sí valida; los updates no.

### Los dos errores que hay que distinguir

```js
error.name === "ValidationError"   // rompió una regla del schema
                                   // error.errors tiene el detalle por campo

error.code === 11000               // valor duplicado en un unique
                                   // error.keyPattern dice qué campo
```

Los dos son culpa del cliente → los dos se responden con **400**.

### Las cinco cosas que hay que recordar

1. **El modelo es validación, filtro y formateo** antes de que el dato entre a la base
2. **Schema es el molde, Model es la máquina** — y la colección va en plural, en inglés (`autors`)
3. **`unique` no es una validación**: es un índice, y su error es el **11000**
4. **`ref` no es una FOREIGN KEY**: Mongo acepta un `_id` que no existe
5. **Toda ruta que toca la base es `async`, va en `try/catch`, y el `catch` tiene que responder**

---

## Para practicar

1. Borrá `node_modules/` entera. Después corré `npm i` y confirmá que el proyecto vuelve a andar.
   Eso es exactamente lo que hace alguien que clona tu repo.
2. Levantá la API, mirá `/libros` y `/autores` en Postman.
3. Sacale el `.populate("autor", ...)` a la ruta de libros y mirá qué devuelve el campo `autor`.
4. Abrí Compass y buscá las dos colecciones. Fijate cómo se llaman **exactamente**.
5. En el `seed.js`, cambiale a un autor el `nacimiento` a `1700` y corré `npm run seed`.
   Leé el error que tira.
6. Agregale `console.log` al `catch` de una ruta y provocá un error a propósito (por ejemplo,
   pidiendo `/libros/abc` si tenés esa ruta). Confirmá que la petición **queda colgada** hasta que
   le agregues el `res`.
