# Clase de hoy · Del carrito al pedido

**Lo que ya tenemos:** catálogo, usuarios con roles, login con token, carrito protegido.
**Lo que falta:** apretar "comprar". Eso es lo de hoy.

**El modelo `pedido.js` YA ESTÁ ESCRITO** (clase 17). Hoy escribimos el service.

| Ya está hecho | Se escribe hoy |
|---|---|
| `models/pedido.js` | `services/pedidoService.js` ← **toda la clase es esto** |
| `controllers/pedidoController.js` | |
| `routes/pedidoRoutes.js` | |
| `index.js` con `/api/pedidos` | |

**Antes de empezar:** `npm run seed` · `npm start` · en Postman, carpeta **5 · Pedidos**.

Correr de una los **requests 21 a 26**: hacen los logins (los tokens se guardan solos),
guardan los ids de dos libros, y de paso muestran que sin token da **401** y que una
vendedora comprando da **403**. Desde el 27 en adelante se va probando a medida que escribimos.

---

## 0 · Arranque (20 min) · no se escribe nada

Abrir **`models/pedido.js`** y preguntar:

1. ¿Por qué la línea del pedido **copia** `titulo` y `precioUnitario`, si ya tiene el `libro`?
   → *Una factura no puede cambiar.* Si mañana el libro sube de precio, el pedido de ayer tiene que seguir diciendo lo que se pagó. El carrito muestra el precio **vivo**; el pedido, la **foto**.
2. ¿Por qué el carrito **no** copia el precio? → Porque todavía no compraste nada.

Abrir **`routes/carritoRoutes.js`**: el id sale del **token**, no de la URL (BOLA). Hoy los pedidos siguen la misma idea.

---

## 1 · Confirmar la compra (50 min) · el corazón de la clase

En `services/pedidoService.js` están los pasos comentados. Se llena de arriba hacia abajo.

### Leer el carrito

```js
const carrito = await Carrito
    .findOne({ usuario: usuarioId })
    .populate("items.libro", "titulo precio stock disponible")

const items = carrito ? carrito.items.filter(item => item.libro) : []

if (items.length === 0) {
    throw new ErrorApp("El carrito está vacío", 409)
}
```

> El `filter` saca los ítems cuyo libro fue borrado: `populate` deja `null` ahí.

**▶️ Probar: requests 27 y 28** (vaciar el carrito → comprar → 409)

### Descontar el stock · ⭐ el momento importante

```js
const descontados = []

for (const item of items) {
    const actualizado = await Libro.findOneAndUpdate(
        {
            _id: item.libro._id,
            disponible: true,
            stock: { $gte: item.cantidad }      // ⭐ la condición va en el FILTRO
        },
        { $inc: { stock: -item.cantidad } },
        { returnDocument: "after" }
    )

    if (!actualizado) {
        throw new ErrorApp(`No hay stock suficiente de "${item.libro.titulo}" para confirmar el pedido`, 409)
    }

    descontados.push(item)
}
```

**Escribir en el pizarrón lo que NO hay que hacer:**

```js
// ❌
if (libro.stock >= cantidad) {
    libro.stock -= cantidad
    await libro.save()
}
```

Entre **leer** y **guardar** pasa tiempo. Dos clientes compran el último ejemplar a la vez: los dos leen `stock: 1`, los dos guardan `stock: 0`, y vendimos dos libros que no tenemos. Se llama **race condition**.
`findOneAndUpdate` busca y descuenta en **una sola operación**: nadie se mete en el medio.

### Armar las líneas y el total

```js
const lineas = items.map(item => ({
    libro: item.libro._id,
    titulo: item.libro.titulo,
    precioUnitario: item.libro.precio,
    cantidad: item.cantidad,
    subtotal: item.libro.precio * item.cantidad
}))

const total = lineas.reduce((acc, linea) => acc + linea.subtotal, 0)

const pedido = await Pedido.create({ usuario: usuarioId, items: lineas, total })

carrito.items = []
await carrito.save()

return pedido
```

> El total lo calcula el **servidor**. El cliente puede mandar `"total": 1`: se ignora.

### El try/catch que SÍ va

Envolver todo desde "descontar el stock" hasta acá:

```js
try {
    // descontar stock + armar líneas + crear pedido + vaciar carrito
} catch (error) {
    // ⭐ COMPENSACIÓN: devolver el stock que ya se descontó
    for (const item of descontados) {
        await Libro.updateOne({ _id: item.libro._id }, { $inc: { stock: item.cantidad } })
    }
    throw error
}
```

> Este es **el único `try/catch` del proyecto que se justifica**: hace algo con el error (deshace lo hecho a medias) y lo **re-lanza**. Si solo hiciera `console.error`, el stock quedaría mal y el cliente recibiría un 201 vacío. Eso es el GAP 1.
> Con replica set esto sería una **transacción**; el MongoDB local no la tiene.

**▶️ Probar: requests 29 a 33** (comprar → 201 · el stock bajó · el carrito quedó vacío)
**Mirar en el 31:** mandamos `"total": 1` y `"estado": "pagado"`, y el servidor los ignoró.

---

## 2 · Mis pedidos y el dueño (25 min)

```js
export const listarMisPedidosService = async (usuarioId) => {
    return await Pedido.find({ usuario: usuarioId }).sort({ createdAt: -1 })
}
```

> El filtro sale del **token**: no existe "los pedidos de otro".

Pero `GET /api/pedidos/:id` sí recibe un id por la URL. Entonces:

```js
const buscarPedidoPropio = async (id, usuarioId) => {
    const pedido = await Pedido.findById(id)

    if (!pedido) {
        throw new ErrorApp("No existe ese pedido", 404)
    }

    // pedido.usuario es un ObjectId y usuarioId un string: sin toString() nunca son iguales
    if (pedido.usuario.toString() !== usuarioId) {
        throw new ErrorApp("Ese pedido no es tuyo", 403)   // existe, pero no es tuyo
    }

    return pedido
}

export const obtenerMiPedidoService = async (id, usuarioId) => {
    return await buscarPedidoPropio(id, usuarioId)
}
```

**La pregunta de la clase:** ¿por qué esto no lo puede hacer `permitirRoles`?
→ Porque `permitirRoles` sabe el **rol**, no **de quién es el recurso**. La comprobación del dueño va en el **service**, que es el que tiene el documento en la mano.

**▶️ Probar: requests 34 a 38** (Bruno pidiendo el pedido de Ana → **403**)

---

## 3 · Estados: pagar y cancelar (30 min)

El modelo ya tiene `estado: "pendiente" | "pagado" | "cancelado"` y hasta ahora nadie lo cambiaba.

```js
const cambiarEstado = async (id, usuarioId, desde, hacia) => {
    await buscarPedidoPropio(id, usuarioId)      // primero el dueño

    const pedido = await Pedido.findOneAndUpdate(
        { _id: id, estado: desde },              // ⭐ otra vez la condición en el filtro
        { estado: hacia },
        { returnDocument: "after" }
    )

    if (pedido) return pedido

    const existente = await Pedido.findById(id)
    throw new ErrorApp(`No se puede pasar a "${hacia}" un pedido que está "${existente.estado}"`, 409)
}

export const pagarPedidoService = async (id, usuarioId) => {
    return await cambiarEstado(id, usuarioId, "pendiente", "pagado")
}

export const cancelarPedidoService = async (id, usuarioId) => {
    const pedido = await cambiarEstado(id, usuarioId, "pendiente", "cancelado")

    // ⭐ cancelar DEVUELVE el stock
    for (const linea of pedido.items) {
        await Libro.updateOne({ _id: linea.libro }, { $inc: { stock: linea.cantidad } })
    }

    return pedido
}
```

> **Es la misma compensación del `catch`**, pero acá a propósito: no es un error, es una regla de negocio.

**▶️ Probar: requests 41 a 47** (pagar · pagar dos veces → 409 · cancelar → el stock vuelve)

---

## 4 · Colchón · para el staff (15 min) · que lo escriban ellos

```js
export const listarTodosPedidosService = async () => {
    return await Pedido
        .find()
        .populate("usuario", "nombre apellido email")
        .sort({ createdAt: -1 })
}
```

Mirar `routes/pedidoRoutes.js`:

```js
router.get("/todos", soloStaff, ...)   // ⚠️ ANTES que /:id
router.get("/:id", soloComprador, ...)
```

> Express prueba las rutas **en orden**. Si `/:id` fuera primero, `GET /api/pedidos/todos` entraría ahí con `id = "todos"`: al vendedor le daría **403** (porque esa ruta pide rol comprador) y a un comprador, **400** por CastError. Probado.

**▶️ Probar: requests 39 y 40**

---

## Cierre (5 min) · la demo del front

El front ya está hecho: comprar desde el navegador y ver el stock bajar en el catálogo.
No abrimos React hoy: eso es la próxima.

---

## Si algo no anda

| Pasa esto | Es esto |
|---|---|
| `401 Falta el token` | No corriste el login de la carpeta (request 21) |
| `403` comprando con Ana | Ana quedó con otro token; volvé a correr el 21 |
| `GET /pedidos/todos` da **403** con Carla (o **400** con Ana) | `/todos` quedó **después** de `/:id` en el router: Express lo toma como un id |
| `Cannot read properties of null (reading 'items')` | El carrito no existe: hay que chequear `carrito ? ... : []` |
| El pedido se crea pero el stock no baja | El `$inc` quedó en positivo, o el `await` falta |
| Comprar da 201 pero el carrito sigue lleno | Falta `carrito.items = []` + `await carrito.save()` |
| El total es `1` | Estás usando `req.body.total` en vez de calcularlo |

---

<details>
<summary><b>Apéndice · preguntas que pueden aparecer</b></summary>

**¿Por qué el pedido guarda `subtotal` si se puede multiplicar?**
Porque es la factura: si mañana cambia cómo se calcula (un descuento, un impuesto), los pedidos viejos no se tienen que mover.

**¿Y si el usuario borra un libro que está en un pedido?**
La línea sigue teniendo título y precio: el pedido se lee igual. Por eso la foto.

**¿Por qué 409 y no 400 cuando no hay stock?**
400 es "lo que mandaste está mal". Acá lo que mandaste está bien: el problema es el **estado** del sistema. Eso es 409.

**¿Por qué el carrito no se borra si falla la compra?**
Porque el cliente querrá reintentar. Solo se vacía cuando el pedido ya existe.

**¿Esto es una transacción?**
No. Es una **compensación** a mano (patrón saga, en chiquito). Las transacciones de MongoDB necesitan replica set.

**¿Quién puede cancelar?**
Hoy, el dueño. Que el staff también pueda es un `permitirRoles` más y una rama en el service: queda como ejercicio.

</details>
