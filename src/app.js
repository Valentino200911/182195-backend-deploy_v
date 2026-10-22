// =====================================================================
//  clase 24 · ESTE ARCHIVO ES NUEVO, Y ES LO PRIMERO QUE HICIMOS HOY
//
//  Antes, index.js hacía TRES cosas juntas:
//     1. armar la app (rutas, middlewares)
//     2. conectarse a Mongo
//     3. ponerse a escuchar en el puerto 3000
//
//  Con las tres juntas no se puede testear: el solo hecho de importar el
//  archivo levantaba un servidor y se conectaba a la base de producción.
//
//  Entonces se parte en dos:
//     · app.js    (este)  arma la app y la EXPORTA. No conecta, no escucha.
//     · index.js          importa la app, conecta la base y escucha.
//
//  Supertest no necesita un puerto: le pasás esta app y él mismo la levanta
//  en un puerto al azar, hace la petición y la cierra.
//
//  ⭐ Fijate el efecto de costado: testear te OBLIGÓ a separar
//     "qué es la app" de "cómo se arranca". Eso es mejor diseño por sí solo,
//     y es el motivo por el que se dice que los tests mejoran el código.
// =====================================================================

import express from 'express'
import cors from "cors"
import libroRoutes from "./routes/libroRoutes.js"
import autorRoutes from "./routes/autorRoutes.js"
import usuarioRoutes from "./routes/usuarioRoutes.js"
import carritoRoutes from "./routes/carritoRoutes.js"
import authRoutes from "./routes/authRoutes.js"
import pedidoRoutes from "./routes/pedidoRoutes.js"
import { manejarErrores } from './middleware/manejarErrores.js'
import { CARPETA_IMAGENES } from './utils/config.js'
import swaggerUi from "swagger-ui-express"
import { especificacion } from './docs/swagger.js'

const app = express()

// CORS: el navegador bloquea que una página de OTRO origen
// (ej: un front en localhost:5173) le pida datos a esta API (localhost:3000).
app.use(cors())

// express.json lee las consultas que recibimos en json y las puede utilizar
app.use(express.json())

// clase 23 · servir las imágenes guardadas en disco (solo hace falta con STORAGE=local)
app.use(`/${CARPETA_IMAGENES}`, express.static(CARPETA_IMAGENES))

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(especificacion, {
    customSiteTitle: "Api Biblioteca - documentación",
    swaggerOptions: { persistAuthorization: true }
}))

app.get("/api-docs.json", (req, res) => {
    res.json(especificacion)
})

// Agrupadores de rutas
app.use("/api/auth", authRoutes)
app.use("/api/libros", libroRoutes)
app.use("/api/autores", autorRoutes)
app.use("/api/usuarios", usuarioRoutes)
app.use("/api/carrito", carritoRoutes)
app.use("/api/pedidos", pedidoRoutes)

// Caso 404 en caso que la direccion no exista
app.use((req, res) => {
    res.status(404).json({ error: "Esa dirección no existe" })
})

// middlewares a nivel aplicacion (global)
app.use(manejarErrores)

export default app
