import { Router } from 'express'
import * as libroController from "../controllers/libroController.js"
import { soloStaff } from '../utils/constants.js'
// clase 23
import { subirImagen, manejarErroresDeMulter } from '../middleware/subirImagen.js'

const router = Router()

/**
 * @openapi
 * /api/libros:
 *   get:
 *     tags: [Libros]
 *     summary: Listar el catálogo
 *     description: >
 *       Es **público**: no hace falta token. Los filtros son opcionales y se
 *       combinan. El autor viene *populado*: llega el objeto, no el id.
 *     parameters:
 *       - name: genero
 *         in: query
 *         description: Filtra por género
 *         schema: { type: string, enum: [novela, cuento, poesia] }
 *       - name: autor
 *         in: query
 *         description: El _id de un autor
 *         schema: { type: string }
 *       - name: disponible
 *         in: query
 *         description: "Solo los disponibles. ⚠️ Llega como texto: vale 'true'"
 *         schema: { type: string, enum: ['true', 'false'] }
 *     responses:
 *       200:
 *         description: Los libros que coinciden. Si no hay ninguno, un array vacío (no un 404)
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Libro' }
 */
router.get("/", libroController.listarLibroController)

/**
 * @openapi
 * /api/libros/{id}:
 *   get:
 *     tags: [Libros]
 *     summary: Ver un libro
 *     parameters:
 *       - $ref: '#/components/parameters/IdEnLaRuta'
 *     responses:
 *       200:
 *         description: El libro, con su autor populado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Libro' }
 *       400: { $ref: '#/components/responses/DatosInvalidos' }
 *       404: { $ref: '#/components/responses/NoExiste' }
 */
router.get("/:id", libroController.obtenerLibroIdController)

/**
 * @openapi
 * /api/libros:
 *   post:
 *     tags: [Libros]
 *     summary: Crear un libro (staff)
 *     description: >
 *       Acepta **dos formatos de body**, y por eso están los dos documentados:
 *
 *       - `application/json` → un libro sin tapa.
 *       - `multipart/form-data` → con la tapa. En Swagger UI aparece un botón
 *         para elegir el archivo.
 *
 *       ⚠️ Con `multipart` todos los campos viajan como **texto**: el precio
 *       llega `"15000"` y lo convierte el schema de Mongoose.
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/LibroNuevo' }
 *         multipart/form-data:
 *           schema:
 *             allOf:
 *               - $ref: '#/components/schemas/LibroNuevo'
 *               - type: object
 *                 properties:
 *                   imagen:
 *                     type: string
 *                     format: binary
 *                     description: >
 *                       La tapa. Solo imágenes, hasta 5 MB. El campo tiene que
 *                       llamarse exactamente `imagen`.
 *     responses:
 *       201:
 *         description: El libro creado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Libro' }
 *       400:
 *         description: >
 *           Datos inválidos, o el archivo no es una imagen, o pesa más de 5 MB,
 *           o el campo del archivo no se llama `imagen`
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorDeValidacion' }
 *       401: { $ref: '#/components/responses/SinToken' }
 *       403: { $ref: '#/components/responses/SinPermiso' }
 *       409:
 *         description: Ese ISBN ya está cargado en otro libro
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *             example: { error: 'El ISBN 978-84-376-0494-7 ya está cargado en otro libro' }
 *       502:
 *         description: El storage de imágenes falló. No es culpa tuya ni nuestra
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *             example: { error: 'No se pudo guardar la imagen. Probá de nuevo.' }
 */
// clase 23 · el ORDEN de los middlewares importa:
//   1. soloStaff      ¿quién sos y podés? → si no, 401/403 y no gastamos tiempo
//                      recibiendo un archivo de 5 MB de alguien que no puede subirlo
//   2. subirImagen    Multer parte el multipart y deja req.body y req.file
//   3. el controller  ya recibe todo armado
router.post("/", soloStaff, subirImagen, libroController.crearLibroController)

/**
 * @openapi
 * /api/libros/{id}:
 *   patch:
 *     tags: [Libros]
 *     summary: Modificar un libro (staff)
 *     description: >
 *       Se mandan **solo** los campos que cambian. Si viene una `imagen` nueva,
 *       la tapa anterior se borra del storage.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdEnLaRuta'
 *     requestBody:
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/LibroNuevo' }
 *         multipart/form-data:
 *           schema:
 *             allOf:
 *               - $ref: '#/components/schemas/LibroNuevo'
 *               - type: object
 *                 properties:
 *                   imagen: { type: string, format: binary }
 *     responses:
 *       200:
 *         description: El libro con los cambios aplicados
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Libro' }
 *       400: { $ref: '#/components/responses/DatosInvalidos' }
 *       401: { $ref: '#/components/responses/SinToken' }
 *       403: { $ref: '#/components/responses/SinPermiso' }
 *       404: { $ref: '#/components/responses/NoExiste' }
 *       409:
 *         description: Ese ISBN ya está cargado en otro libro
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *             example: { error: 'El ISBN 978-84-376-0494-7 ya está cargado en otro libro' }
 */
router.patch("/:id", soloStaff, subirImagen, libroController.actualizarLibroController);

/**
 * @openapi
 * /api/libros/{id}:
 *   delete:
 *     tags: [Libros]
 *     summary: Borrar un libro (staff)
 *     description: Se lleva también su tapa del storage.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdEnLaRuta'
 *     responses:
 *       200:
 *         description: El libro que se borró
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Libro' }
 *       400: { $ref: '#/components/responses/DatosInvalidos' }
 *       401: { $ref: '#/components/responses/SinToken' }
 *       403: { $ref: '#/components/responses/SinPermiso' }
 *       404: { $ref: '#/components/responses/NoExiste' }
 */
router.delete("/:id", soloStaff, libroController.eliminarLibroController);

// clase 23 · los errores de Multer se traducen ACÁ, al final de este router.
// Un middleware de errores puesto en un router solo atrapa lo que pasó en ESE
// router: es el lugar natural, porque es el único que sabe de archivos.
router.use(manejarErroresDeMulter)

export default router
