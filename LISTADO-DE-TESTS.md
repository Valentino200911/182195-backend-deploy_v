# Listado de los 70 tests · a dónde apunta cada uno

> Generado desde el código real. Para verlo en la terminal:
> ```bash
> npm test -- --verbose
> ```

**Resumen:** 4 archivos · 70 tests · ~3 segundos.

| Archivo | Tests | Toca la base | Toca HTTP |
|---|---:|---|---|
| [`tests/1-unitarios.test.js`](tests/1-unitarios.test.js) | 12 | no | no |
| [`tests/2-services.test.js`](tests/2-services.test.js) | 26 | **sí** | no |
| [`tests/3-endpoints.test.js`](tests/3-endpoints.test.js) | 23 | **sí** | **sí** |
| [`tests/4-middlewares-y-storage.test.js`](tests/4-middlewares-y-storage.test.js) | 9 | no | no |

---

## 🎯 Vista por archivo del código: ¿qué está cubierto?

Esta es la tabla que contesta *"¿a dónde apuntamos?"*.

| Archivo de `src/` | Cubierto por | Qué se prueba |
|---|---|---|
| `services/pedidoService.js` | **13 tests** (nivel 2) | checkout, precio congelado, compensación, estados, dueño |
| `services/carritoService.js` | **6 tests** (nivel 2) | control de stock, cantidades, disponibilidad |
| `services/libroService.js` | **3 + 6 tests** (niveles 2 y 3) | autor inexistente, ISBN repetido, imagen y su borrado |
| `services/autorService.js` | **4 tests** (nivel 2) | la regla de "no borrar con libros" |
| `services/storage/nombreUnico.js` | **4 tests** (nivel 1) | unicidad y seguridad del nombre |
| `services/storage/local.js` | **4 tests** (extra) | subir, no pisarse, borrar, borrar lo que no está |
| `models/libro.js` | **6 tests** (nivel 1) | validaciones, defaults, setters |
| `middleware/verificarToken.js` | **3 + 3 tests** (extra y nivel 3) | token válido, ausente, falso, vencido |
| `middleware/permitirRoles.js` | **2 + 3 tests** (extra y nivel 3) | rol permitido y rol insuficiente |
| `middleware/subirImagen.js` | **4 tests** (nivel 3) | tipo, tamaño, nombre del campo |
| `middleware/manejarErrores.js` | **indirecto, ~8 tests** | que cada error salga con el status correcto |
| `routes/*.js` | **100%** (nivel 3) | incluido el **orden** de `/todos` antes de `/:id` |
| `utils/ErrorApp.js` | **2 tests** (nivel 1) | mensaje, status, que sea un Error |
| [`app.js`](src/app.js) | todos los del nivel 3 | el 404 propio, el montaje de las rutas |
| `services/storage/supabase.js` | **0 · a propósito** | no se testea un servicio externo (ver abajo) |
| `config/supabase.js` | **0 · a propósito** | nunca se importa en los tests |
| `services/usuarioService.js` / `authService.js` | **4 tests** (nivel 3) | registro, login, que la password no salga |
| `controllers/*.js` | parcial (nivel 3) | solo traducen: se prueban de paso |

> ⚠️ **Los dos ceros son decisiones, no olvidos.** `supabase.js` haría que los
> tests dependan de internet y de la cuenta de alguien, tardarían segundos en
> vez de milisegundos, y si fallaran no nos dirían nada de **nuestro** código.
> Los tests corren con `STORAGE=local`.

---

## Nivel 1 · [`tests/1-unitarios.test.js`](tests/1-unitarios.test.js) — 12 tests

*Sin base, sin servidor, sin internet. Medio segundo.*

**`nombreUnico`** — [`src/services/storage/nombreUnico.js`](src/services/storage/nombreUnico.js)

| Test | Qué protege |
|---|---|
| conserva la extensión del archivo original | que el `.png` siga siendo `.png` |
| ⭐ nunca devuelve dos veces el mismo nombre | **que una tapa no pise a otra** (500 nombres, un `Set`) |
| no deja pasar el nombre que mandó el cliente | seguridad: `../../src/index.js` no llega al disco |
| sin nombre, inventa uno con extensión `.jpg` | que no reviente si falta `originalname` |

**`ErrorApp`** — [`src/utils/ErrorApp.js`](src/utils/ErrorApp.js)

| Test | Qué protege |
|---|---|
| guarda el mensaje y el status que le pasamos | que `manejarErrores` pueda leer el `status` |
| sigue siendo un `Error` de verdad | que Express 5 lo trate como un error |

**El modelo `Libro`** — [`src/models/libro.js`](src/models/libro.js) *(con `validate()`, sin Mongo)*

| Test | Qué protege |
|---|---|
| un libro sin título no es válido | el `required` y su mensaje |
| un precio negativo no es válido | el `min: 0` |
| un género que no está en la lista no es válido | el `enum` |
| un libro completo es válido | que no estemos validando de más |
| `stock` arranca en 0 y `disponible` en true | los `default` del schema |
| el título se guarda en minúsculas | `trim` + `lowercase` son setters |

---

## Nivel 2 · [`tests/2-services.test.js`](tests/2-services.test.js) — 26 tests ⭐

*Las reglas del negocio. Toca la base (`biblioteca_test`), no el servidor.*

**`eliminarAutorService`** — 4 tests

| Test | Qué protege |
|---|---|
| borra un autor que no tiene libros | el camino feliz |
| ⭐ NO borra un autor que tiene libros, y avisa con 409 | la regla, **y que el autor siga ahí** |
| el error trae status 409, no 500 | que sea culpa del estado y no nuestra |
| devuelve null si el autor no existe | el 404 del controller |

**`crearLibroService`** — 3 tests

| Test | Qué protege |
|---|---|
| no deja crear un libro con un autor que no existe | `verificarAutorService`, **y que no quede un libro suelto** |
| traduce el ISBN repetido a un 409 con un mensaje que se entiende | que el `code 11000` no llegue crudo al cliente |
| un libro sin imagen queda con `imagen: null` | que la tapa sea opcional |

**`agregarItemService`** — 6 tests

| Test | Qué protege |
|---|---|
| agrega un libro y calcula el subtotal y el total | el cálculo del carrito |
| sumar el mismo libro NO lo duplica: suma la cantidad | que no haya dos líneas del mismo libro |
| no deja poner más de lo que hay en stock | la regla básica |
| ⭐ tampoco si se llega al límite de a poco | **2 + 2 > 3**: el control mira la cantidad FINAL |
| no deja agregar un libro marcado como no disponible | 409 |
| rechaza una cantidad de 0, negativa o con coma | 400 · tres casos en un test |

**`crearPedidoService`** — 5 tests

| Test | Qué protege |
|---|---|
| descuenta el stock, congela el precio y vacía el carrito | las 4 consecuencias del checkout |
| ⭐ el precio del pedido NO cambia si después cambia el del libro | **una factura no cambia sola** |
| no deja confirmar un carrito vacío | 400 |
| ignora los libros que fueron borrados después de ponerlos en el carrito | el `filter` del `populate` en null |
| ⭐⭐ si falla a mitad de camino, NO deja stock descontado a medias | **el `catch` de compensación.** Imposible de probar a mano |

**Los pedidos son de quien los hizo (BOLA / IDOR)** — 4 tests

| Test | Qué protege |
|---|---|
| el dueño puede ver su pedido | el camino feliz |
| ⭐ otra persona recibe 403, NO 404 | la distinción "existe pero no es tuyo" |
| un pedido que no existe sí da 404 | el otro lado de la distinción |
| tampoco se puede cancelar el pedido de otro | **y el pedido sigue `pendiente`** |

**Los estados del pedido** — 4 tests

| Test | Qué protege |
|---|---|
| pendiente → pagado | el camino feliz |
| no se puede pagar dos veces | 409 · el `estado: desde` en el filtro |
| ⭐ cancelar DEVUELVE el stock | la compensación a propósito (5 → 3 → 5) |
| no se puede cancelar un pedido ya pagado | **y el stock NO se devolvió**: si no, cada intento inventaría stock |

---

## Nivel 3 · [`tests/3-endpoints.test.js`](tests/3-endpoints.test.js) — 23 tests

*Ruta → middlewares → controller → service → modelo → `manejarErrores`. Por HTTP, sin levantar servidor.*

**`GET /api/libros` · lo público** — 7 tests

| Test | Qué protege |
|---|---|
| responde 200 y un array | el camino feliz |
| no hace falta token: el catálogo es público | que nadie le ponga `verificarToken` sin querer |
| sin libros devuelve un array vacío, no un 404 | "vacío" no es "no existe" |
| el filtro por género filtra | el query param |
| ⭐ el autor viene POPULADO, no como un id suelto | **el contrato con el front** |
| un id con formato inválido da 400, no 500 | el `CastError` traducido |
| una dirección que no existe da 404 con nuestro mensaje | el 404 de [`app.js`](src/app.js) |

**`POST /api/libros` · quién puede y quién no** — 7 tests

| Test | Qué protege |
|---|---|
| sin token → 401 | |
| con un token firmado por otro → 401 "Token inválido" | **que la firma valga de algo** |
| con un token vencido → 401 "El token venció" | el `expiresIn` |
| ⭐ con token de compradora → 403 | **401 ≠ 403** |
| con token de vendedora → 201 y el libro queda en la base | el camino feliz |
| sin título → 400 con el detalle de qué falta | `ValidationError` traducido, **y no se guardó nada** |
| ⚠️ la compradora recibe 403 ANTES de subir nada | **el orden de los middlewares** |

**`POST /api/libros` con imagen · Multer** — 6 tests

| Test | Qué protege |
|---|---|
| sube la tapa y guarda la URL en el libro | el camino feliz, con `.attach()` |
| ⚠️ con form-data todo llega como TEXTO | `"25000"` sale como `25000` |
| un PDF → 400 | el `fileFilter` |
| más de 4 MB → 400 | `limits.fileSize` + `manejarErroresDeMulter` |
| el campo mal nombrado → 400 | `LIMIT_UNEXPECTED_FILE` |
| ⭐ si el ISBN está repetido, la imagen subida se borra | **la compensación, sin archivos huérfanos** |

**`GET /api/pedidos/todos` · el orden de las rutas** — 2 tests

| Test | Qué protege |
|---|---|
| ⭐ `/todos` es del staff y NO se confunde con `/:id` | **que nadie mueva esa línea.** Si se da vuelta: 403 en vez de 200 |
| una compradora no puede ver los pedidos de todos → 403 | el rol |

**El recorrido completo** — 1 test

| Test | Qué protege |
|---|---|
| una persona se registra, compra y ve su pedido | **7 pasos en 100 ms**: registro → carrito → pedido → mis pedidos → lista del staff. Lo mismo que a mano tardaba 5 minutos. Incluye que la password no venga en la respuesta |

---

## Extra · [`tests/4-middlewares-y-storage.test.js`](tests/4-middlewares-y-storage.test.js) — 9 tests

*Un middleware es una función común: se le pasan un `req` y un `next` de juguete.*

**`verificarToken`, solo** — 3 tests

| Test | Qué protege |
|---|---|
| con un token válido llama a `next()` y deja `req.usuario` | el `jest.fn()` como espía |
| sin header tira un ErrorApp 401 y NO llama a `next()` | que la petición se corte ahí |
| con `Basic xxx` en vez de `Bearer xxx` también es 401 | el `startsWith("Bearer ")` |

**`permitirRoles`, solo** — 2 tests

| Test | Qué protege |
|---|---|
| deja pasar al rol permitido | y de paso: es una **fábrica** de middlewares |
| al que no está en la lista le tira 403 | |

**El adaptador local (`STORAGE=local`)** — 4 tests

| Test | Qué protege |
|---|---|
| `subir()` escribe el archivo y devuelve una URL que lo apunta | el contrato del adaptador |
| dos subidas del mismo nombre NO se pisan | lo mismo que el nivel 1, pero de verdad en disco |
| `borrar()` lo saca de la carpeta | |
| `borrar()` una URL que ya no existe no explota | **la limpieza no puede romper la operación del usuario** |

---

## Lo que falta (para el TP y para discutir)

Los huecos reales de la suite, ordenados por lo que más vale la pena:

| Qué falta | Dónde iría |
|---|---|
| `actualizarItemService` y `quitarItemService` | nivel 2 · **están en `5-para-completar`** |
| `actualizarLibroService` con imagen nueva (que borre la vieja) | nivel 2 |
| `PATCH /api/libros/:id` con cada validación | nivel 3 · **está en `5-para-completar`** |
| `DELETE` de libro y de autor por endpoint | nivel 3 · **está en `5-para-completar`** |
| login con contraseña incorrecta | nivel 3 · **está en `5-para-completar`** |
| `usuarioRoutes` completo (el CRUD del admin) | nivel 3 |
| el `unique` del email y del ISBN (es un índice, necesita base) | nivel 2 |
| el `pre("save")` que hashea la password | nivel 2 |

> ⭐ Y lo que **no** va a faltar nunca: `supabase.js`. No se testea la biblioteca
> de otro.
