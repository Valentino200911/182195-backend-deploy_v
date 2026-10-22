# El proyecto: una librería online (solo el backend)

Este documento explica **qué estamos construyendo**, **qué está hecho hasta hoy** y **por qué cada
pieza está donde está**. No hay que escribir código para leerlo: es el mapa, no la ruta.

Todos los links apuntan a archivos reales de esta carpeta: hacé clic y mirá.

---

## 1. En una línea

Estamos construyendo la **API de una librería**: alguien puede ver el catálogo, armar un carrito
y confirmar una compra. Todo eso vive en el servidor. No hay pantallas: hay endpoints.

El frontend (la parte bonita) no existe en este proyecto. Si mañana alguien quiere hacer una web,
una app de celular o un bot de WhatsApp, **los tres van a hablar con esta misma API**. Por eso el
backend no sabe ni le importa quién lo consume.

---

## 2. Dónde estamos hoy

| Pieza | Modelo | Service | Controller | Rutas |
|---|:--:|:--:|:--:|:--:|
| **Autor** | ✅ | ✅ | ✅ | ✅ |
| **Libro** | ✅ | ✅ | ✅ | ✅ |
| **Usuario** | ✅ | ✅ (parcial) | ✅ | ✅ |
| **Carrito** | ✅ | ❌ | ❌ | ❌ |
| **Pedido** | ✅ | ❌ | ❌ | ❌ |

Los modelos de carrito y pedido ya están escritos, pero **todavía no hay nada que los use**: no
existe `carritoService.js` ni `pedidoService.js`, y en
[`usuarioRoutes.js`](src/routes/usuarioRoutes.js#L10) quedó anotado el pendiente:

```js
// GAP: faltan rutas de carrito y rutas de pedidos
```

Eso es exactamente lo que dice [`prox_class.md`](prox_class.md): la próxima clase son los servicios
de carrito y de pedido. Diseñamos primero la forma del dato y recién después la lógica.

Endpoints que **sí** funcionan hoy:

| Método | Ruta | Qué hace |
|---|---|---|
| GET | `/api/libros` | lista, con filtros opcionales `?genero=` `?autor=` `?disponible=` |
| GET · PATCH · DELETE | `/api/libros/:id` | traer, modificar y borrar un libro |
| POST | `/api/libros` | crear |
| GET | `/api/autores` | lista, filtro opcional `?nacionalidad=` |
| GET · PATCH · DELETE | `/api/autores/:id` | traer, modificar y borrar un autor |
| POST | `/api/autores` | crear |
| GET · POST | `/api/usuarios` | listar y crear |
| GET | `/api/usuarios/:id` | traer uno |

> Del usuario todavía no hay PATCH ni DELETE, y está anotado en
> [`usuarioService.js`](src/services/usuarioService.js#L19): `// GAP : no tenemos ni delete ni patch`.
> Tampoco hay PUT en ningún lado: usamos PATCH, que modifica solo los campos que mandás.

---

## 3. Las cinco colecciones

| Colección | Qué representa | Archivo |
|---|---|---|
| **Autor** | quién escribió el libro | [`models/autor.js`](src/models/autor.js) |
| **Libro** | lo que se vende: título, precio, stock | [`models/libro.js`](src/models/libro.js) |
| **Usuario** | quién compra | [`models/usuario.js`](src/models/usuario.js) |
| **Carrito** | lo que un usuario **todavía no** compró | [`models/carrito.js`](src/models/carrito.js) |
| **Pedido** | lo que un usuario **ya** compró | [`models/pedido.js`](src/models/pedido.js) |

Y cómo se relacionan:

| Relación | Tipo | Cómo se resolvió |
|---|---|---|
| Libro → Autor | 1 a N (un autor, muchos libros) | referencia: el libro guarda el `_id` del autor |
| Usuario → Carrito | 1 a 1 | referencia con [`unique: true`](src/models/carrito.js#L31) |
| Carrito → Libros | N a N | array de **subdocumentos**, cada uno con una referencia |
| Usuario → Pedidos | 1 a N | referencia, **sin** `unique` |
| Pedido → Libros | N a N | referencia **+ copia** del título y el precio |

> **El detalle que importa:** `unique: true` en `carrito.usuario` es lo único que impide que un
> usuario tenga dos carritos. Lo hace cumplir la base de datos, no nuestro código.

---

## 4. Anatomía de un modelo

Como dice el comentario de [`autor.js`](src/models/autor.js#L3): *el modelo básicamente es
validación, filtro y formateo de datos antes de que entren en la DB*. Es el portero.

| Opción | Qué hace | Ejemplo en el proyecto |
|---|---|---|
| `required: [true, "msg"]` | obligatorio; el 2º elemento es el mensaje de error | [autor.nombre](src/models/autor.js#L10) |
| `trim: true` | borra espacios de los bordes: `" uva "` → `"uva"` | [autor.nombre](src/models/autor.js#L12) |
| `lowercase: true` | guarda todo en minúscula (así las búsquedas no fallan por mayúsculas) | autor.nombre, libro.titulo |
| `minlength` / `maxlength` | largo de un texto | [autor.nombre](src/models/autor.js#L13) |
| `min` / `max` | rango de un número | [libro.anio](src/models/libro.js#L26) |
| `enum` | solo estos valores y ninguno más | [libro.genero](src/models/libro.js#L19) |
| `default` | si no me mandan nada, queda esto | [libro.genero](src/models/libro.js#L22) |
| `validate` | validación propia, cuando ninguna de las anteriores alcanza | [libro.stock](src/models/libro.js#L50) |
| `unique: true` | **no es una validación: es un índice** | [libro.isbn](src/models/libro.js#L14) |
| `timestamps: true` | agrega y mantiene `createdAt` y `updatedAt` | [carrito](src/models/carrito.js#L37), usuario, pedido |

Cuatro trampas que ya están anotadas en el código:

**`default: Date.now` va SIN paréntesis** ([libro.creado](src/models/libro.js#L40)). Con paréntesis
guardás *el resultado de ejecutarlo una vez*, al arrancar el servidor: todos los libros quedarían con
la misma hora. Sin paréntesis le pasás **la función**, y Mongoose la ejecuta al crear cada documento.

**`unique` no valida, indexa.** No produce un `ValidationError` sino un error de MongoDB con
`code: 11000`, y por eso el middleware lo trata aparte. Además el índice **no se crea solo** si la
colección ya existía: para eso el seed llama a `syncIndexes()`.

**Mongoose pluraliza en inglés** ([autor.js](src/models/autor.js#L33)): el modelo `Autor` guarda en
la colección **`autors`**, no `autores`. Importa cuando consultás desde Compass o desde la shell. Se
puede forzar el nombre real con un tercer argumento:
`mongoose.model("Autor", autorSchema, "autores")`.

**`timestamps` no agrega `deletedAt`.** El comentario de
[`carrito.js`](src/models/carrito.js#L39) lo menciona junto a los otros dos, pero Mongoose solo
mantiene `createdAt` y `updatedAt`. Un `deletedAt` (borrado lógico: marcar en vez de borrar) es algo
que uno agrega a mano si lo quiere.

---

## 5. El campo `__v` que aparece en todas las respuestas

Si mirás cualquier documento en Postman, hay un campo que nadie escribió:

```json
{ "_id": "68f...", "titulo": "rayuela", "__v": 0 }
```

`__v` es el **versionKey**. Lo agrega Mongoose, empieza en `0` y sirve para **control de concurrencia
optimista** (*optimistic concurrency control*): cada vez que una operación modifica un array o un
objeto anidado, la versión sube.

¿Para qué? Para que dos operaciones simultáneas no se pisen. Si dos personas cargaron el mismo
documento con `__v: 3`, la primera en guardar lo deja en `4`; cuando la segunda intenta guardar sobre
la versión `3`, esa versión ya no existe y Mongoose lanza un **`VersionError`** en lugar de corromper
el array. Es justo lo que nos va a importar con `carrito.items`.

Se puede apagar con `{ versionKey: false }` en las opciones del schema, pero apagarlo es perder esa
red de seguridad. Lo dejamos.

---

## 6. `runValidators: true` (y el typo que hay que arreglar)

Esta es la más traicionera de todas.

**Mongoose solo valida cuando creás o guardás un documento** (`.create()`, `.save()`). Cuando
actualizás con `findByIdAndUpdate` / `findOneAndUpdate`, la actualización viaja directo a MongoDB y
**las reglas del schema no se ejecutan**: `min`, `max`, `enum`, `required`, `match` — ninguna.

Por eso hay que pedirlo explícitamente:

```js
Libro.findByIdAndUpdate(id, datos, { returnDocument: "after", runValidators: true })
```

| Opción | Para qué |
|---|---|
| `returnDocument: "after"` | devolver el documento **ya actualizado** (si no, devuelve el viejo) |
| `runValidators: true` | correr las validaciones del schema también en el update |

⚠️ **En [`libroService.js`](src/services/libroService.js#L61) está escrito `runvalidators`, con `v`
minúscula.** JavaScript distingue mayúsculas: esa opción no existe, Mongoose la ignora en silencio y
**no valida nada**. Se puede comprobar: un `PATCH /api/libros/:id` con `{ "anio": 3000 }` se guarda
tranquilo, aunque el modelo diga `max: 2027`. En
[`autorService.js`](src/services/autorService.js#L31) sí está bien escrito.

> Moraleja general: una opción mal escrita no da error, simplemente **no hace nada**. Son los bugs
> más caros de encontrar.

---

## 7. El email y las expresiones regulares

El modelo de usuario valida el email con un **regex**
([`usuario.js`](src/models/usuario.js#L6)), y ahí hay dos decisiones.

**Primera: literal, no string.** Se escribe `/.../` y no `"..."`:

```js
const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
```

Con un string habría que escapar cada barra invertida **dos veces** (`"\\."` en vez de `\.`), y
además el literal se compila una sola vez al cargar el archivo, en lugar de recompilarse cada vez
que se usa.

**Segunda: permisivo vs. robusto.**

| Versión | Qué exige | Qué deja pasar |
|---|---|---|
| Permisiva `/^\S+@\S+\.\S+$/` | algo sin espacios, un `@`, un dominio y un punto | `$$$@???.com` es válido |
| Robusta (la que usamos) | limita qué caracteres valen en el usuario y en el dominio, y exige un TLD de **2 letras o más** | rechaza `hola@sitio.123` |

Pieza por pieza, como está comentado en el archivo:

| Parte | Significa |
|---|---|
| `^[a-zA-Z0-9._%+-]+` | el usuario: letras, números y los especiales estándar (`.` `_` `%` `+` `-`) |
| `@` | un único arroba divisorio |
| `[a-zA-Z0-9.-]+` | el dominio: letras, números, guiones y puntos |
| `\.` | el punto literal antes de la extensión |
| `[a-zA-Z]{2,}$` | el TLD: solo letras, mínimo 2 (`.com`, `.ar`, `.org`) |

El regex va en una constante fuera del schema ([`usuario.js`](src/models/usuario.js#L5)) porque es un
valor fijo que no depende de nada: se define una vez, se lee con nombre en vez de con símbolos, y se
puede reusar.

Aclaración: ningún regex garantiza que el mail **exista**; eso solo lo prueba mandar un correo. El
regex descarta lo que ni siquiera tiene forma de email, que ya es bastante.

---

## 8. Carrito y Pedido parecen lo mismo. No lo son.

Esta es la decisión de diseño central del proyecto.

| | Carrito | Pedido |
|---|---|---|
| ¿Cuántos por usuario? | **uno solo**, siempre el mismo | **muchos**, uno por compra |
| ¿Guarda el precio? | **No** | **Sí**, copiado |
| ¿Cambia con el tiempo? | sí, se agregan y sacan cosas | no, queda congelado |
| ¿Toca el stock? | no | sí, lo descuenta |
| Se parece a... | una lista de compras en la heladera | una factura |

El carrito **no guarda el precio a propósito**. Como dice el comentario de
[`carrito.js`](src/models/carrito.js#L24), muestra el **precio vivo** del libro: si mañana Rayuela
baja, quiero ver el precio nuevo. Por eso el ítem solo guarda `libro` y `cantidad`, y el precio se
lee del libro en el momento.

El pedido **sí guarda el precio a propósito** ([`pedido.js`](src/models/pedido.js#L33)): si mañana
Rayuela sube, mi compra de ayer tiene que seguir diciendo lo que pagué. Una factura no puede cambiar
sola.

Copiar un dato que ya vive en otro lado se llama **desnormalizar**, y como regla general es un error.
Acá es correcto porque no estamos copiando *el mismo* dato: estamos guardando **el precio que tenía
ese día**, que es un dato distinto que casualmente hoy coincide.

Y el otro comentario del carrito ([`carrito.js`](src/models/carrito.js#L3)) marca la otra mitad de la
idea: *el carrito entre compra y compra queda vacío*. El carrito no se borra nunca — es siempre el
mismo documento —, se vacía. El historial de lo comprado no vive ahí: vive en los pedidos.

---

## 9. `itemSchema` y `lineaSchema`: schemas adentro de otro schema

En [`carrito.js`](src/models/carrito.js#L6) y en [`pedido.js`](src/models/pedido.js#L5) hay un
`new mongoose.Schema({...})` que **no** termina en `mongoose.model(...)`. Eso confunde la primera
vez, así que vamos despacio.

### Qué son

Un schema suelto, sin modelo, **no crea ninguna colección**. Es una *forma* que después se usa como
el tipo de un campo:

```js
items: { type: [lineaSchema] }     // "items es un array, y adentro tiene esta forma"
```

A cada objeto guardado con esa forma se lo llama **subdocumento**: vive **embebido** dentro de su
padre, en el mismo documento de MongoDB. No existe una colección `lineas`. Si borrás el pedido, sus
líneas se van con él, porque nunca estuvieron en otro lado. Y como es un schema de verdad, **valida
igual**: si mandás `cantidad: 0`, salta el `min` del ítem.

Se le da nombre propio (`lineaSchema`, `itemSchema`) por tres razones: se puede escribir con todas
sus validaciones sin amontonar el modelo entero en una sola llave, se le pueden pasar opciones
propias (como `{ _id: false }`), y se lee mucho mejor.

### `lineaSchema`: una línea de la factura

```js
const lineaSchema = new mongoose.Schema({
    libro: { type: ObjectId, ref: "Libro" },   // referencia: a QUÉ libro apunta
    titulo: String,                            // ┐
    precioUnitario: Number,                    // │ la FOTO del libro,
    cantidad: Number,                          // │ al momento de comprar
    subtotal: Number                           // ┘
}, { _id: false })
```

Es **mitad referencia y mitad foto**:

| Campo | Por qué está |
|---|---|
| `libro` | para poder ir al libro actual: ver la ficha, dejar una reseña, volver a comprarlo |
| `titulo` y `precioUnitario` | copiados al confirmar: aunque el libro cambie de precio, de título o lo borren, la factura sigue diciendo qué se compró y a cuánto |
| `cantidad` | cuántos |
| `subtotal` | `precioUnitario × cantidad`, ya calculado |

`subtotal` es redundante: se podría multiplicar cada vez que haga falta. Se guarda igual porque es
**el número que se cobró**, y no queremos que dependa de que dentro de un año lo recalculemos bien.

El pedido además tiene un `validate` a nivel del array ([`pedido.js`](src/models/pedido.js#L45)): un
pedido con cero ítems no tiene sentido, así que se rechaza. Fijate que la validación no está en cada
ítem sino **en el array**, porque lo que se valida es el conjunto.

### `itemSchema`: una línea del carrito

La diferencia es toda la sección 8: el ítem del carrito **solo tiene `libro` y `cantidad`**, nada de
precio ni de título. Un ítem se convierte en una línea de pedido recién al confirmar la compra: ahí
se les saca la foto al título y al precio, se calcula el subtotal y se guarda.

### `{ _id: false }` en los dos

Por defecto Mongoose le pone un `_id` propio a cada subdocumento. Acá se apaga a propósito. El
comentario del carrito ([`carrito.js`](src/models/carrito.js#L23)) lo explica: *el ítem se identifica
por el libro; si agregás el mismo libro de nuevo no se repite, se suma la cantidad*. La clave natural
es el libro, así que un id extra sería ruido — y encima abriría la puerta a tener dos ítems del mismo
libro con ids distintos, que es justo lo que queremos evitar.

Consecuencia práctica: para tocar un ítem, la ruta va a usar el id del **libro**, no el del ítem
(`.../carrito/items/:libroId`).

---

## 10. Cómo está ordenado el código

Cada pedido HTTP atraviesa siempre las mismas capas, en el mismo orden:

```
Postman
   │  POST /api/libros
   ▼
index.js          arma la app, enchufa las rutas
   ▼
routes/           ¿qué URL es? → llamá a este controller       (no piensa)
   ▼
controllers/      leo req, llamo al service, armo la respuesta (no sabe de Mongoose)
   ▼
services/         acá vive la lógica de negocio                (no sabe de HTTP)
   ▼
models/           validación y forma del dato
   ▼
MongoDB
```

| Carpeta | Qué puede hacer | Qué NO puede hacer |
|---|---|---|
| [`routes/`](src/routes) | mapear URL → función | tener lógica |
| [`controllers/`](src/controllers) | leer `req`, responder `res` | tocar Mongoose |
| [`services/`](src/services) | consultar la base, decidir | ver `req` o `res` |
| [`models/`](src/models) | definir campos y validaciones | saber de dónde vino el dato |

**La prueba para saber si está bien separado:** ¿el service seguiría funcionando si mañana la API
fuera un comando de terminal, sin HTTP? Si la respuesta es sí, está bien.

El comentario de [`libroService.js`](src/services/libroService.js#L5) lo dice completo: *el servicio
tiene la responsabilidad de hacer el llamado a los datos, procesarlos, operarlos, combinarlos*.

Y el de [`autorController.js`](src/controllers/autorController.js#L3) es la lista de preguntas para
escribir cualquier controller:

- ¿voy a usar datos que reciba del cliente? ¿cuáles?
- ¿qué le voy a mandar como respuesta? (status / data)
- ¿qué servicio uso y qué me devuelve?
- ¿el servicio maneja algún error que deba informarle al usuario?

### `req.params` vs `req.query`

| | Ejemplo | Para qué | ¿Obligatorio? |
|---|---|---|---|
| `req.params` | `/api/libros/68f3...` | identificar **un** recurso | sí: sin él, la ruta es otra |
| `req.query` | `/api/libros?genero=novela` | filtrar, ordenar, paginar | no: son opcionales |

Está comentado en [`autorController.js`](src/controllers/autorController.js#L9). Por eso los services
de listado reciben un objeto y arman el filtro solo con lo que vino
([`listarLibroService`](src/services/libroService.js#L8)): sin query params el filtro queda `{}`, y
`find({})` devuelve todo. Un solo service sirve para "traeme todo" y para "traeme los de novela".

Detalle: los query params **siempre llegan como string**. Por eso hay que escribir
`filtro.disponible = disponible === "true"` ([libroService.js](src/services/libroService.js#L12)) —
el string `"false"` es *verdadero* en JavaScript, así que compararlo a mano es la única forma.

### Dos reglas de negocio que ya viven en los services

**No se borra un autor que tiene libros** ([`autorService.js`](src/services/autorService.js#L37)):
primero cuenta cuántos libros lo referencian y, si hay, lanza un `ErrorApp(..., 409)`. Esa decisión
no podría vivir en el modelo (el modelo no sabe de otras colecciones) ni en el controller (no es
HTTP): es negocio puro. El comentario de arriba deja anotada la alternativa: si un día quisiéramos
borrarlo igual, habría que vaciar el campo `autor` de todos sus libros primero.

**No se crea un libro con un autor inexistente**
([`verificarAutorService`](src/services/libroService.js#L25)): MongoDB acepta feliz una referencia a
un `_id` que no existe — `ref` **no** es una foreign key, no verifica nada, como está anotado en
[`libro.js`](src/models/libro.js#L33). Si queremos esa garantía, la escribimos nosotros. Fijate que
la función arranca con `if (!autorId) return`, porque el autor es opcional: "no mandaste autor" y
"mandaste un autor que no existe" son dos cosas distintas.

---

## 11. Los errores se manejan en un solo lugar

Casi no vas a ver `try/catch`. Express 5 agarra solo los errores de una función `async` y se los pasa
al último middleware de la app: [`manejarErrores`](src/middleware/manejarErrores.js) — el que tiene
**cuatro** parámetros (`error, req, res, next`). Esos cuatro parámetros son lo que lo convierte en
middleware *de errores*; con tres, Express lo trataría como uno común y nunca le llegaría nada.

Por eso el orden en [`index.js`](src/index.js#L27) no es casual: primero las rutas, después el 404, y
`manejarErrores` **siempre último**.

| Lo que pasó | Respuesta |
|---|---|
| El body no es JSON válido (una coma de más en Postman) | **400** |
| El id no tiene forma de ObjectId (`CastError`) | **400** |
| No pasa una validación del modelo (`ValidationError`) | **400** + qué campos |
| Un `unique` repetido que nadie tradujo (`code: 11000`) | **400** + qué campo |
| Un `ErrorApp` nuestro | el status que traiga: **404**, **409**... |
| Cualquier otra cosa | **500**, y el detalle va al log, no al cliente |

Un `try/catch` suelto solo sabe responder 500, porque no distingue qué pasó. El middleware sí, está
escrito una sola vez y no se puede olvidar. La explicación larga está comentada arriba del archivo.

[`ErrorApp`](src/utils/ErrorApp.js) es nuestra clase de error propia: un `Error` normal más un
`status`. Sirve para que el service diga *"esto está mal y corresponde un 409"* sin tener que saber
nada de `res`. El service lanza, el middleware traduce.

**¿Cuándo sí va un `try/catch`?** Solo cuando vas a *hacer* algo con el error. Hoy hay un solo caso
([`crearLibroService`](src/services/libroService.js#L43)): traducir el `11000` del ISBN a un mensaje
que se entienda —

```js
throw new ErrorApp(`El ISBN ${datos.isbn} ya está cargado en otro libro`, 409)
```

— y el `else { throw error }` es obligatorio: si no, cualquier otro error moriría ahí en silencio. La
regla es **siempre terminar en `throw`**. Un `catch` que solo hace `console.error` no atrapa el error:
lo esconde.

### Los 404 los responde el controller

Fijate que los services devuelven `null` cuando no encuentran nada, y es el controller el que decide
el 404 ([`obtenerLibroIdController`](src/controllers/libroController.js#L13)). Tiene sentido: "no
existe" no es una falla del sistema, es un resultado posible; y 404 es un concepto de HTTP, así que le
toca a la capa que habla HTTP.

La excepción es [`verificarUsuarioService`](src/services/usuarioService.js#L22), que lanza el 404
directo. Se justifica porque ahí el usuario no es el recurso pedido sino un **requisito** de la
operación ("no puedo armarte el carrito porque ese usuario no existe"), y quien la llama no tiene por
qué ocuparse de eso.

---

## 12. Cómo correrlo

```bash
npm i
cp .env.example .env
npm run seed
npm start
```

### `npm i` y los dos archivos que lo acompañan

| Archivo / carpeta | Qué es | ¿Va a Git? |
|---|---|---|
| `package.json` | la lista de qué necesita el proyecto | **sí** |
| `package-lock.json` | la versión **exacta** de cada dependencia, y de las dependencias de ellas | normalmente sí |
| `node_modules/` | el código ya descargado; pesa cientos de megas y se reconstruye solo | **no, nunca** |

Cuando bajás un proyecto de GitHub no viene con `node_modules`: viene con `package.json`, y `npm i`
lee esa lista y descarga todo. Por eso se puede bajar un repo de 200 KB y terminar con 300 MB en
disco.

⚠️ En nuestro [`.gitignore`](.gitignore) está ignorado también `package-lock.json`. Se puede hacer,
pero la práctica habitual es **subirlo**, para que todo el equipo instale exactamente las mismas
versiones y no aparezca el clásico "en mi máquina anda".

### `.gitignore`

Es una lista de qué **no** se sube al repositorio. Git la lee y directamente ignora esos archivos: no
aparecen en `git status` ni se suben con `git push`. Acá esconde dos tipos de cosas: lo que se
regenera (`node_modules`) y **lo que es secreto** (`.env`).

Por eso existe [`.env.example`](.env.example): es la **lista de qué variables hacen falta, sin los
valores**. El que baja el proyecto lo copia a `.env` y completa con sus datos. `.env` tiene la URL de
tu base; si se sube a GitHub, se sube tu contraseña.

> Ojo con los espacios en `.env`: `PORT = 300` guarda el valor `"300"` (string, con el espacio ya
> recortado). Y si la variable no existe, `app.listen(undefined)` **no falla**: arranca en un puerto
> al azar, y te volvés loco buscando por qué `localhost:3000` no responde.

Las variables se leen en un solo lugar, [`utils/config.js`](src/utils/config.js), y de ahí las
importa el resto. Así `process.env` aparece una sola vez en todo el proyecto.

### `npm run seed`

[`seed.js`](src/seed.js) **borra todo y vuelve a cargar los mismos datos**: 5 autores y 6 libros.
Sirve para dos cosas: que todos veamos lo mismo en clase, y para volver atrás cuando rompimos la base
probando. Es un botón de reset, no un backup.

Fijate el orden: primero `deleteMany` de libros y después de autores; al crear, primero los autores
— porque los libros guardan el `_id` del autor y necesitan que exista. Después llama a
`syncIndexes()`, que es lo que crea de verdad el índice `unique` del ISBN.

⚠️ **El seed quedó desactualizado y hoy falla.** Le agregamos `precio` (obligatorio) al modelo de
libro, pero [el seed sigue creando libros sin precio](src/seed.js#L30), así que corta con:

```
Libro validation failed: precio: El precio es obligatorio
```

Hay que agregarle `precio` y `stock` a cada libro y, de paso, crear algún usuario y vaciar carritos y
pedidos, porque de esas tres colecciones el seed todavía no sabe nada. Es el primer pendiente antes
de poder probar el carrito.

### `npm start`

Corre `node --watch src/index.js`. El `--watch` reinicia el servidor solo cada vez que guardás un
archivo: no hace falta cortar y volver a levantar. Si ves el mensaje de arranque dos veces, es eso.

---

## 13. Lo que este proyecto todavía NO tiene

Es importante saberlo para no confundir "no está" con "está mal":

- **No hay carrito ni pedidos funcionando**: solo los modelos. Es la próxima clase.
- **No hay login.** El `usuarioId` va a ir en la URL y la API le va a creer. Cualquiera podría pedir
  el carrito de cualquiera. Eso se arregla con autenticación, más adelante.
- **No hay roles.** No existe el admin: cualquiera puede crear libros. Está anotado como pendiente en
  [`usuario.js`](src/models/usuario.js#L3).
- **No hay pagos reales.** Pagar va a ser cambiar una palabra en un documento.

Agregar todo eso ahora sería **sobreingeniería**: resolver un problema que todavía no tenemos.
Dejarlo pendiente **a sabiendas y anotado** es **deuda técnica** — y está bien, siempre que uno sepa
que la tiene. Los `// GAP` repartidos por el código son exactamente eso: deuda anotada.
