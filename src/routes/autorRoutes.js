import { Router } from 'express'
import * as autorController from "../controllers/autorController.js"
import { soloStaff } from '../utils/constants.js'

const router = Router()

/**
 * @openapi
 * /api/autores:
 *   get:
 *     tags: [Autores]
 *     summary: Listar autores
 *     description: Público. El filtro por nacionalidad es opcional.
 *     parameters:
 *       - name: nacionalidad
 *         in: query
 *         schema: { type: string, example: argentina }
 *     responses:
 *       200:
 *         description: Los autores, ordenados por nombre
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Autor' }
 */
router.get("/", autorController.listarAutorController)

/**
 * @openapi
 * /api/autores/{id}:
 *   get:
 *     tags: [Autores]
 *     summary: Ver un autor
 *     parameters:
 *       - $ref: '#/components/parameters/IdEnLaRuta'
 *     responses:
 *       200:
 *         description: El autor
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Autor' }
 *       400: { $ref: '#/components/responses/DatosInvalidos' }
 *       404: { $ref: '#/components/responses/NoExiste' }
 */
router.get("/:id", autorController.obtenerAutorIdController)

/**
 * @openapi
 * /api/autores:
 *   post:
 *     tags: [Autores]
 *     summary: Crear un autor (staff)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/AutorNuevo' }
 *     responses:
 *       201:
 *         description: El autor creado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Autor' }
 *       400: { $ref: '#/components/responses/DatosInvalidos' }
 *       401: { $ref: '#/components/responses/SinToken' }
 *       403: { $ref: '#/components/responses/SinPermiso' }
 */
router.post("/", soloStaff, autorController.crearAutorController)

/**
 * @openapi
 * /api/autores/{id}:
 *   patch:
 *     tags: [Autores]
 *     summary: Modificar un autor (staff)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdEnLaRuta'
 *     requestBody:
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/AutorNuevo' }
 *     responses:
 *       200:
 *         description: El autor con los cambios
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Autor' }
 *       400: { $ref: '#/components/responses/DatosInvalidos' }
 *       401: { $ref: '#/components/responses/SinToken' }
 *       403: { $ref: '#/components/responses/SinPermiso' }
 *       404: { $ref: '#/components/responses/NoExiste' }
 */
router.patch("/:id", soloStaff, autorController.actualizarAutorController)

/**
 * @openapi
 * /api/autores/{id}:
 *   delete:
 *     tags: [Autores]
 *     summary: Borrar un autor (staff)
 *     description: >
 *       ⚠️ **No se puede borrar un autor que tiene libros cargados**: da 409 y
 *       dice cuántos. Primero hay que reasignar o borrar esos libros.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdEnLaRuta'
 *     responses:
 *       200:
 *         description: El autor que se borró
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Autor' }
 *       400: { $ref: '#/components/responses/DatosInvalidos' }
 *       401: { $ref: '#/components/responses/SinToken' }
 *       403: { $ref: '#/components/responses/SinPermiso' }
 *       404: { $ref: '#/components/responses/NoExiste' }
 *       409: { $ref: '#/components/responses/Conflicto' }
 */
router.delete("/:id", soloStaff, autorController.eliminarAutorController)

export default router
