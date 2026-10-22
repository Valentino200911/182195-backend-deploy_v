# Resumen de clase · El carrito de compras

Explicamos de punta a punta cómo está armado el módulo de carrito: el service, las validaciones,
los errores y las rutas. Todos los links abren el código real de esta carpeta.

| Archivo | Qué tiene |
|---|---|
| [`src/services/carritoService.js`](src/services/carritoService.js) | toda la lógica |
| [`src/controllers/carritoController.js`](src/controllers/carritoController.js) | lee `req`, llama al service, responde |
| [`src/routes/carritoRoutes.js`](src/routes/carritoRoutes.js) | las 5 rutas |
| [`src/index.js`](src/index.js#L21) | monta todo bajo `/api/carrito` |

---

## 1. Los endpoints

| Método | Ruta | Body | Qué hace |
|---|---|---|---|
| GET | `/api/carrito/:usuarioId` | — | ver el carrito (lo crea si no existe) |
| POST | `/api/carrito/:usuarioId` | `{ "libro": "<id>", "cantidad": 2 }` | agregar un libro |
| PATCH | `/api/carrito/:usuarioId/:libroId` | `{ "cantidad": 3 }` | cambiar la cantidad |
| DELETE | `/api/carrito/:usuarioId/:libroId` | — | sacar un libro |
| DELETE | `/api/carrito/:usuarioId` | — | vaciar el carrito |

Los cinco responden **200 con el carrito completo**, ya calculado.

---

## 2. "Get or Create": `obtenerOCrear`

[`carritoService.js:38`](src/services/carritoService.js#L38)

No sabemos si el usuario ya tiene carrito. Si lo tiene, lo queremos; si no, hay que crearlo. Todo
en **una sola operación**:

```js
Carrito.findOneAndUpdate(
    { usuario: usuarioId },               // buscá el carrito de este usuario
    { $setOnInsert: { items: [] } },      // SOLO si lo creás: arrancá con items vacío
    { upsert: true, returnDocument: "after" }
)
```

| Pieza | Qué hace |
|---|---|
| `upsert: true` | si no encuentra nada, **crea** el documento (update + insert = upsert) |
| `$setOnInsert` | se aplica **solo al crear**. Si el carrito ya existía, no toca nada |
| `returnDocument: "after"` | devuelve el carrito como quedó, no como estaba antes |

**¿Por qué `$setOnInsert` y no `$set`?** Con `$set: { items: [] }`, cada vez que alguien mirara
su carrito se lo vaciaríamos. `$setOnInsert` inicializa sin pisar lo que ya había.

**¿Por qué no un `findOne` + `if` + `create`?** Porque son tres viajes a la base. Si llegan dos
pedidos a la vez, los dos ven "no hay carrito" y los dos intentan crearlo. Con `upsert`, MongoDB
lo resuelve **atómicamente**: buscar y crear es una única operación que no se puede partir al medio.
(Y si igual se colara un segundo, el `unique` de `carrito.usuario` lo frena.)

---

## 3. El total se calcula, no se guarda: `conTotal`

[`carritoService.js:50`](src/services/carritoService.js#L50)

El carrito muestra el precio **vivo** del libro. Si guardáramos el total, quedaría viejo apenas
cambie un precio. Entonces se calcula cada vez, en tres pasadas:

| Método | Qué hace acá |
|---|---|
| `filter` | saca los ítems cuyo libro fue borrado (el `populate` los deja en `null`) |
| `map` | a cada ítem le agrega su `subtotal` = precio × cantidad |
| `reduce` | suma todo en un solo número |

### Cómo funciona `reduce`

```js
items.reduce((acc, item) => acc + item.subtotal, 0)
//            ↑acumulador               ↑valor inicial
```

`acc` (acumulador) arranca en `0` y en cada vuelta se le suma un ítem:

| Vuelta | `acc` antes | `item.subtotal` | `acc` después |
|---|---|---|---|
| 1 | 0 | 50000 | 50000 |
| 2 | 50000 | 18000 | 68000 |
| **resultado** | | | **68000** |

⚠️ Sin el `0` del final, en un carrito vacío `reduce` **tira un error**. El valor inicial no es
decoración.

Se usa dos veces: una suma `cantidad` (→ `unidades`) y otra suma `subtotal` (→ `total`).

---

## 4. Validaciones y `throw`

| Función | Qué exige | Si falla |
|---|---|---|
| [`validarCantidad`](src/services/carritoService.js#L84) | entero y mayor a 0 (`Number.isInteger` + `>= 1`) | 400 |
| [`validarIdLibro`](src/services/carritoService.js#L95) | un ObjectId válido: 24 caracteres hexadecimales | 400 |

`validarIdLibro` usa `mongoose.isValidObjectId`, y valida **antes** de ir a la base. Sin eso,
`"libro": "hola"` llegaría hasta Mongoose y el error saldría después, más feo y menos claro.

### `throw` corta igual que un `return`

```js
if (!Number.isInteger(cantidad) || cantidad < 1) {
    throw new ErrorApp("La cantidad tiene que ser un número entero mayor a 0", 400)
}
// si hubo throw, esta línea NUNCA se ejecuta
```

| | `return` | `throw` |
|---|---|---|
| ¿Corta la función? | sí | sí |
| ¿Qué devuelve? | un resultado, **todo salió bien** | un error, **algo salió mal** |
| ¿Adónde va? | a quien llamó la función | sube hasta un `catch`; si no hay ninguno, al middleware `manejarErrores` |

En nuestro caso no hay `catch` en el camino, así que el error sube solo hasta
[`manejarErrores`](src/middleware/manejarErrores.js), que lee el `status` del `ErrorApp` y responde.
**El segundo argumento de `ErrorApp` es el código HTTP**; si no se lo pasás, queda en 400.

---

## 5. Sumar vs. fijar: agregar y actualizar

La diferencia más importante del módulo:

| | [`agregarItemService`](src/services/carritoService.js#L118) | [`actualizarItemService`](src/services/carritoService.js#L167) |
|---|---|---|
| Verbo | POST | PATCH |
| Cálculo | **relativo**: cantidad actual **+** nueva | **absoluto**: cantidad **=** X |
| Intención del usuario | "agregá 2 más" (botón *Agregar al carrito*) | "dejalo en 3" (el campo numérico del carrito) |
| Si el libro no está en el carrito | lo agrega con `push` | **404**: no se puede editar lo que no existe |
| Controla stock | sí, contra la cantidad final | sí, contra el valor nuevo |

Lo que chequea `agregarItemService`, en orden:

1. hay carrito (lo crea si no)
2. el id del libro y la cantidad tienen forma válida
3. el libro existe
4. el libro está `disponible`
5. `cantidadFinal = (lo que ya había) + (lo nuevo)` no pasa el stock
6. si ya estaba, actualiza la cantidad; si no, `push`

**El stock NO se descuenta al agregar.** Tener algo en el carrito no es haberlo comprado. Se
descuenta recién cuando se confirma el pedido.

---

## 6. `save()` + volver a leer: la Single Source of Truth

Todas las funciones que modifican terminan igual:

```js
await carrito.save()
return await obtenerCarritoService(usuarioId)
```

¿Por qué no devolver directamente `carrito`, si ya lo tenemos en memoria? Por dos razones:

**1. La verdad está en la base, no en la memoria.** El objeto `carrito` es una copia que Node trajo
hace un momento. La **única fuente de verdad** (Single Source of Truth) es MongoDB. Volviendo a
leer, le respondemos al frontend **lo que quedó guardado**, no lo que nosotros creemos que quedó.

**2. El objeto en memoria no tiene el formato de respuesta.** No tiene los libros populados ni el
total calculado. `obtenerCarritoService` hace las dos cosas.

> ⚠️ Ojo con la palabra "protege": volver a leer **no evita** que dos pedidos simultáneos se pisen.
> Eso lo cuida el campo `__v` de Mongoose, que tira un `VersionError` si dos `save()` chocan sobre
> el mismo array. Lo que sí garantiza volver a leer es que **la respuesta no mienta**.

---

## 7. Las rutas

### `index.js` monta el grupo una sola vez

```js
app.use("/api/carrito", carritoRoutes)     // index.js
```

`index.js` no conoce las cinco rutas del carrito: solo dice "todo lo que empiece con
`/api/carrito`, mandáselo a `carritoRoutes`". Cada ruta concreta vive en
[`carritoRoutes.js`](src/routes/carritoRoutes.js), y ahí se escribe **relativa** a ese prefijo:

```js
router.get("/:usuarioId", ...)             // en realidad es GET /api/carrito/:usuarioId
```

Así `index.js` queda corto, y cada módulo es independiente: se puede agregar, sacar o modificar el
carrito sin tocar nada más.

> El comentario de [`carritoRoutes.js:4`](src/routes/carritoRoutes.js#L4) habla de `mergeParams`,
> pero con este diseño **no hace falta**: el `:usuarioId` está escrito en cada ruta del propio
> router, no en el prefijo. `mergeParams` solo se necesita cuando el parámetro está en el
> `app.use` o `router.use` del padre (ej. `/api/usuarios/:usuarioId/carrito`).

### Hacia dónde va: sacar `:usuarioId` de la URL

Hoy el `:usuarioId` viaja en la URL. Eso tiene un problema de seguridad, y está anotado en
[`carritoRoutes.js:8`](src/routes/carritoRoutes.js#L8): **cualquiera que conozca un id puede ver o
modificar el carrito de otra persona.** Solo tiene que cambiar el número en la URL.

Esa vulnerabilidad tiene nombre: **BOLA** (*Broken Object Level Authorization*), también conocida
como **IDOR** (*Insecure Direct Object Reference*). Es la número 1 de la lista OWASP de riesgos de
APIs.

Cuando tengamos login, la identidad no la va a decir la URL sino el **token JWT**, que el servidor
firmó y nadie puede falsificar:

| Hoy | Con login |
|---|---|
| `GET /api/carrito/66f1...` | `GET /api/carrito` + header `Authorization: Bearer <token>` |
| el id lo elige quien hace el pedido | el id sale del token verificado (`req.usuario.id`) |
| se puede pedir el carrito de otro | solo existe "**mi** carrito" |

Además queda más RESTful: la ruta dice "el carrito", en singular, porque desde el punto de vista de
quien pide, hay uno solo — el suyo.

---

## 8. Cuatro cosas para corregir en nuestro código

Probamos el service contra una base de prueba y aparecieron estos cuatro. El primero es serio.

| | Dónde | Qué pasa | Arreglo |
|---|---|---|---|
| 🔴 | [`actualizarItemService` · L177](src/services/carritoService.js#L177) | falta el `await`: `libro` es una consulta sin ejecutar, `libro.stock` da `undefined` y **el control de stock no funciona**. Probado: con stock 1, un PATCH a 999 unidades **se acepta** | `const libro = await Libro.findById(libroId)` |
| 🟠 | [L143](src/services/carritoService.js#L143) · [L179](src/services/carritoService.js#L179) | el `, 409` quedó **adentro** del string. Responde **400** y el mensaje termina en `", 409"` | cerrar el backtick antes: `` `...${cantidadFinal}`, 409 `` |
| 🟡 | [L133](src/services/carritoService.js#L133) | libro no disponible: sin status, sale **400**. Pero el pedido está bien formado, es la situación la que no lo permite: corresponde **409** | `throw new ErrorApp(..., 409)` |
| 🟡 | [L65](src/services/carritoService.js#L65) | `carrito.updateAt` → falta una `d`. Da `undefined` y el campo `actualizado` **desaparece** de la respuesta | `carrito.updatedAt` |

El primero es el más instructivo: **un `await` que falta no da error.** El código corre, no se
queja, y hace otra cosa. Cuando una validación "no hace nada", es lo primero que hay que revisar.

---

## Las ideas del día, en una línea cada una

- **Upsert:** buscar o crear en una sola operación atómica.
- **`$setOnInsert`:** inicializar sin pisar lo que ya existe.
- **El total se calcula:** el carrito muestra el precio vivo.
- **`reduce`:** un acumulador que arranca en un valor inicial y suma de a uno.
- **`throw`:** corta como `return`, pero avisa que algo salió mal.
- **POST suma, PATCH fija.**
- **Volver a leer después de guardar:** la respuesta tiene que reflejar la base, no la memoria.
- **`app.use` con prefijo:** `index.js` monta grupos, cada router define sus rutas.
- **El `usuarioId` en la URL es un agujero (BOLA/IDOR):** lo cierra el login con JWT.
