// clase 22
import { Router } from "express"
import * as pedidoController from "../controllers/pedidoController.js"
import { verificarToken } from "../middleware/verificarToken.js"
import { permitirRoles } from "../middleware/permitirRoles.js"
import { ROLES, soloStaff } from "../utils/constants.js"

const router = Router()

// Todas las rutas de pedidos necesitan estar logueado: sin token no hay pedidos.
// Pero el ROL lo decidimos ruta por ruta, porque acá NO todas son del comprador
// (a diferencia del carrito, donde todo el router era para compradores).
router.use(verificarToken)

const soloComprador = permitirRoles(ROLES.COMPRADOR)

/**
 * @openapi
 * /api/pedidos:
 *   post:
 *     tags: [Pedidos]
 *     summary: Confirmar la compra (checkout)
 *     description: >
 *       Convierte **tu carrito** en un pedido. No lleva body: el servidor ya sabe
 *       qué tenés en el carrito.
 *
 *       Lo que hace, en orden:
 *       1. descuenta el stock de cada libro, de forma atómica;
 *       2. copia el título y el precio en cada línea (una **foto**: si el libro
 *       cambia de precio mañana, el pedido sigue diciendo lo que pagaste);
 *       3. calcula el total **en el servidor** (si mandás un total, se ignora);
 *       4. vacía el carrito.
 *
 *       Si algo falla a mitad de camino, **devuelve el stock que ya había
 *       descontado**: no queda un pedido a medio hacer.
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201:
 *         description: El pedido creado, en estado "pendiente"
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Pedido' }
 *       400:
 *         description: El carrito está vacío
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *             example: { error: 'El carrito está vacío' }
 *       401: { $ref: '#/components/responses/SinToken' }
 *       403: { $ref: '#/components/responses/SinPermiso' }
 *       409:
 *         description: Alguien se llevó el stock mientras dudabas
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *             example: { error: 'No hay stock suficiente de "rayuela" para confirmar el pedido' }
 */
router.post("/", soloComprador, pedidoController.crearPedidoController)
/**
 * @openapi
 * /api/pedidos:
 *   get:
 *     tags: [Pedidos]
 *     summary: Mis pedidos
 *     description: >
 *       Solo los tuyos, del más nuevo al más viejo. Para ver los de todo el
 *       mundo está GET /api/pedidos/todos, que es del staff.
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Tus pedidos
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Pedido' }
 *       401: { $ref: '#/components/responses/SinToken' }
 *       403: { $ref: '#/components/responses/SinPermiso' }
 */
router.get("/", soloComprador, pedidoController.listarMisPedidosController)

// ⚠️ "/todos" va ANTES que "/:id".
// Express prueba las rutas EN ORDEN: si /:id estuviera primero, GET /api/pedidos/todos
// entraría ahí con id = "todos": al vendedor le daría 403 (esa ruta pide
// rol comprador) y a un comprador, 400 por CastError.
// soloStaff ya trae [verificarToken, permitirRoles(VENDEDOR, ADMIN)] de constants.js
/**
 * @openapi
 * /api/pedidos/todos:
 *   get:
 *     tags: [Pedidos]
 *     summary: Todos los pedidos (staff)
 *     description: >
 *       Los pedidos de todo el mundo, con el nombre del comprador populado.
 *
 *       En el código esta ruta está declarada **antes** que `/{id}`. Si se
 *       dieran vuelta, Express tomaría `"todos"` como un id y esta ruta
 *       dejaría de existir.
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Todos los pedidos
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Pedido' }
 *       401: { $ref: '#/components/responses/SinToken' }
 *       403: { $ref: '#/components/responses/SinPermiso' }
 */
router.get("/todos", soloStaff, pedidoController.listarTodosPedidosController)

/**
 * @openapi
 * /api/pedidos/{id}:
 *   get:
 *     tags: [Pedidos]
 *     summary: Ver uno de mis pedidos
 *     description: >
 *       Si el pedido existe pero **no es tuyo**, da **403**, no 404. Son dos
 *       cosas distintas y el cliente tiene que poder distinguirlas.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdEnLaRuta'
 *     responses:
 *       200:
 *         description: El pedido
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Pedido' }
 *       400: { $ref: '#/components/responses/DatosInvalidos' }
 *       401: { $ref: '#/components/responses/SinToken' }
 *       403: { $ref: '#/components/responses/SinPermiso' }
 *       404: { $ref: '#/components/responses/NoExiste' }
 */
router.get("/:id", soloComprador, pedidoController.obtenerMiPedidoController)
/**
 * @openapi
 * /api/pedidos/{id}/pagar:
 *   patch:
 *     tags: [Pedidos]
 *     summary: Pagar un pedido
 *     description: >
 *       `pendiente` a `pagado`. Solo desde `pendiente`: pagar dos veces da 409.
 *       (En un sistema real acá entraría la pasarela de pago.)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdEnLaRuta'
 *     responses:
 *       200:
 *         description: El pedido en estado "pagado"
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Pedido' }
 *       400: { $ref: '#/components/responses/DatosInvalidos' }
 *       401: { $ref: '#/components/responses/SinToken' }
 *       403: { $ref: '#/components/responses/SinPermiso' }
 *       404: { $ref: '#/components/responses/NoExiste' }
 *       409:
 *         description: El pedido no está "pendiente"
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *             example: { error: 'No se puede pasar a "pagado" un pedido que está "pagado"' }
 */
router.patch("/:id/pagar", soloComprador, pedidoController.pagarPedidoController)
/**
 * @openapi
 * /api/pedidos/{id}/cancelar:
 *   patch:
 *     tags: [Pedidos]
 *     summary: Cancelar un pedido
 *     description: >
 *       `pendiente` a `cancelado`, y **devuelve el stock** de cada línea.
 *       Un pedido ya pagado no se cancela por acá: eso sería una devolución,
 *       que es otra cosa.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdEnLaRuta'
 *     responses:
 *       200:
 *         description: El pedido en estado "cancelado"
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Pedido' }
 *       400: { $ref: '#/components/responses/DatosInvalidos' }
 *       401: { $ref: '#/components/responses/SinToken' }
 *       403: { $ref: '#/components/responses/SinPermiso' }
 *       404: { $ref: '#/components/responses/NoExiste' }
 *       409:
 *         description: El pedido no está "pendiente"
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *             example: { error: 'No se puede pasar a "cancelado" un pedido que está "pagado"' }
 */
router.patch("/:id/cancelar", soloComprador, pedidoController.cancelarPedidoController)

export default router
