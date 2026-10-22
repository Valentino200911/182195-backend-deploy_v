import { Router } from "express"
import * as carritoController from "../controllers/carritoController.js"
import { verificarToken } from "../middleware/verificarToken.js"
import { permitirRoles } from "../middleware/permitirRoles.js"
import { ROLES } from "../utils/constants.js"

// paso 0: acá NO hace falta mergeParams: el :usuarioId está escrito en cada ruta de
// este router, no en el prefijo del app.use. mergeParams solo se necesita cuando
// el parámetro viene del padre, ej: router.use("/:usuarioId/carrito", carritoRoutes)
const router = Router()

router.use(verificarToken, permitirRoles(ROLES.COMPRADOR))

// si el user está loggeado, ya lo tenemos guardado en el sistema, no haria falta que lo manden por ruta
// si el user no está loggeado como podría acceder a una ruta de ese usuario especifico?
// no deberia poder hacerlo
// es una medida de seguridad para que nadie que conozca el usuarioId pueda acceder a su carrito si no está loggeado con el mismo userId

// si yo permito que accedan los compradores a estas rutas
// lo que sucede es que deberiamos controlar controlar tambien que los usuarios no vean carritos de otros

/**
 * @openapi
 * /api/carrito:
 *   get:
 *     tags: [Carrito]
 *     summary: Ver mi carrito
 *     description: >
 *       Devuelve el carrito de la persona del token. **No hay un id de usuario en
 *       la URL a propósito:** si lo hubiera, cualquiera que adivine un id podría
 *       mirar el carrito de otro. El `total` y el `subtotal` los calcula el
 *       servidor con el precio vivo del libro.
 *       Si todavía no tenés carrito, se crea uno vacío.
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: El carrito, con los libros populados
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Carrito' }
 *       401: { $ref: '#/components/responses/SinToken' }
 *       403: { $ref: '#/components/responses/SinPermiso' }
 */
router.get("/", carritoController.obtenerCarritoController)
/**
 * @openapi
 * /api/carrito:
 *   post:
 *     tags: [Carrito]
 *     summary: Agregar un libro al carrito
 *     description: >
 *       Si el libro ya estaba, **suma** la cantidad (no lo duplica).
 *       El control de stock mira la cantidad que va a QUEDAR: si tenés 2 de un
 *       libro con stock 3 y agregás 2 más, da 409 aunque 2 sea menor que 3.
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/ItemNuevoDeCarrito' }
 *     responses:
 *       200:
 *         description: El carrito ya actualizado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Carrito' }
 *       400:
 *         description: Falta el libro, el id no tiene formato válido, o la cantidad no es un entero >= 1
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *             example: { error: 'La cantidad tiene que ser un número entero mayor a 0' }
 *       401: { $ref: '#/components/responses/SinToken' }
 *       403: { $ref: '#/components/responses/SinPermiso' }
 *       409:
 *         description: No hay stock suficiente, o el libro no está disponible para la venta
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *             example: { error: 'Stock insuficiente de "rayuela": hay 3 y en el carrito quedarían 4' }
 */
router.post("/", carritoController.agregarItemCarritoController)
/**
 * @openapi
 * /api/carrito/{libroId}:
 *   patch:
 *     tags: [Carrito]
 *     summary: Cambiar la cantidad de un libro
 *     description: >
 *       ⚠️ **Fija** la cantidad, no la suma: es la diferencia con el POST.
 *       Mandar `cantidad: 5` deja 5, no agrega 5.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdDeLibroEnLaRuta'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [cantidad]
 *             properties:
 *               cantidad: { type: integer, minimum: 1, example: 5 }
 *     responses:
 *       200:
 *         description: El carrito ya actualizado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Carrito' }
 *       400: { $ref: '#/components/responses/DatosInvalidos' }
 *       401: { $ref: '#/components/responses/SinToken' }
 *       403: { $ref: '#/components/responses/SinPermiso' }
 *       404:
 *         description: Ese libro no está en tu carrito
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *             example: { error: 'Ese libro no está en el carrito' }
 *       409:
 *         description: No hay stock suficiente
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *             example: { error: 'Stock insuficiente de "rayuela": hay 3' }
 */
router.patch("/:libroId", carritoController.actualizarItemCarritoController)
/**
 * @openapi
 * /api/carrito/{libroId}:
 *   delete:
 *     tags: [Carrito]
 *     summary: Quitar un libro del carrito
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdDeLibroEnLaRuta'
 *     responses:
 *       200:
 *         description: El carrito sin ese libro
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Carrito' }
 *       400: { $ref: '#/components/responses/DatosInvalidos' }
 *       401: { $ref: '#/components/responses/SinToken' }
 *       403: { $ref: '#/components/responses/SinPermiso' }
 *       404:
 *         description: Ese libro no está en tu carrito
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *             example: { error: 'Ese libro no está en el carrito' }
 */
router.delete("/:libroId", carritoController.quitarItemCarritoController)
/**
 * @openapi
 * /api/carrito:
 *   delete:
 *     tags: [Carrito]
 *     summary: Vaciar el carrito
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: El carrito vacío
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Carrito' }
 *       401: { $ref: '#/components/responses/SinToken' }
 *       403: { $ref: '#/components/responses/SinPermiso' }
 */
router.delete("/", carritoController.vaciarCarritoController)

export default router
