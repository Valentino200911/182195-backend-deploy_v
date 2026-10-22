import { Router } from "express"
import * as usuarioController from "../controllers/usuarioController.js"
import { verificarToken } from "../middleware/verificarToken.js"
import { permitirRoles } from "../middleware/permitirRoles.js"
import { ROLES } from "../utils/constants.js"

const router = Router()

// todo este router es solo para admin
// permite aplicar un middleware a todas las rutas
// esto involucra a todas las rutas que están debajo
router.use(verificarToken, permitirRoles(ROLES.ADMIN))

/**
 * @openapi
 * /api/usuarios:
 *   get:
 *     tags: [Usuarios]
 *     summary: Listar usuarios (admin)
 *     description: >
 *       Todo este grupo de rutas es **solo para admin**. La password nunca viaja.
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Los usuarios
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Usuario' }
 *       401: { $ref: '#/components/responses/SinToken' }
 *       403: { $ref: '#/components/responses/SinPermiso' }
 */
router.get("/", usuarioController.listarUsuarioController)
/**
 * @openapi
 * /api/usuarios/{id}:
 *   get:
 *     tags: [Usuarios]
 *     summary: Ver un usuario (admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdEnLaRuta'
 *     responses:
 *       200:
 *         description: El usuario
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Usuario' }
 *       400: { $ref: '#/components/responses/DatosInvalidos' }
 *       401: { $ref: '#/components/responses/SinToken' }
 *       403: { $ref: '#/components/responses/SinPermiso' }
 *       404: { $ref: '#/components/responses/NoExiste' }
 */
router.get("/:id", usuarioController.obtenerUsuarioIdController)
/**
 * @openapi
 * /api/usuarios:
 *   post:
 *     tags: [Usuarios]
 *     summary: Crear un usuario con cualquier rol (admin)
 *     description: >
 *       La diferencia con `/api/auth/registro`: acá **sí** se puede elegir el
 *       `rol`. Es la única forma de crear un vendedor o otro admin.
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             allOf:
 *               - $ref: '#/components/schemas/Registro'
 *               - type: object
 *                 properties:
 *                   rol:
 *                     type: string
 *                     enum: [comprador, vendedor, admin]
 *                     default: comprador
 *     responses:
 *       201:
 *         description: El usuario creado (sin la password)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Usuario' }
 *       400: { $ref: '#/components/responses/DatosInvalidos' }
 *       401: { $ref: '#/components/responses/SinToken' }
 *       403: { $ref: '#/components/responses/SinPermiso' }
 *       409:
 *         description: Ese email ya está registrado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *             example: { error: 'Ya existe un usuario con ese email' }
 */
router.post("/", usuarioController.crearUsuarioController)

// paso 0: el carrito ya está en /api/carrito. Pendiente: pedidos (clase aparte, con pagos).

export default router