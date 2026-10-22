import { Router } from "express"
import * as authController from "../controllers/authController.js"
import { verificarToken } from "../middleware/verificarToken.js"

const router = Router()

/**
 * @openapi
 * /api/auth/registro:
 *   post:
 *     tags: [Auth]
 *     summary: Crear una cuenta
 *     description: >
 *       Crea un usuario con rol `comprador` y devuelve la sesión ya iniciada.
 *       El rol NO se puede elegir desde acá: un vendedor lo crea un admin.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/Registro' }
 *     responses:
 *       201:
 *         description: Cuenta creada. Ojo que ya viene con el token
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Sesion' }
 *       400: { $ref: '#/components/responses/DatosInvalidos' }
 *       409:
 *         description: Ese email ya está registrado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *             example: { error: 'Ya existe un usuario con ese email' }
 */
router.post("/registro", authController.registrarController)

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Iniciar sesión y obtener el token
 *     description: >
 *       ⭐ **Empezá por acá.** Copiá el `token` de la respuesta y pegalo en
 *       el botón **Authorize** 🔓 de arriba: queda puesto para todas las rutas.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/Login' }
 *     responses:
 *       200:
 *         description: El usuario y su token
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Sesion' }
 *       401:
 *         description: >
 *           Email o contraseña incorrectos. El mensaje NO dice cuál de los dos
 *           está mal, a propósito: si lo dijera, confirmaría que el email existe.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *             example: { error: 'Email o contraseña incorrectos' }
 */
router.post("/login", authController.loginController)

/**
 * @openapi
 * /api/auth/perfil:
 *   get:
 *     tags: [Auth]
 *     summary: Ver mis datos
 *     description: Devuelve el usuario del token. Sirve para saber si el token sigue vivo.
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: El usuario de la sesión
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Usuario' }
 *       401: { $ref: '#/components/responses/SinToken' }
 */
router.get("/perfil", verificarToken, authController.perfilController)

export default router
