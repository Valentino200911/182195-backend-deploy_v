// =====================================================================
//  clase 24 · este archivo se quedó con UNA sola responsabilidad:
//  arrancar el servidor de verdad.
//
//  Todo lo que era "armar la app" se fue a app.js, para que los tests
//  puedan importar la app sin que se levante un servidor ni se conecte
//  a la base de producción.
// =====================================================================

import app from "./app.js"
import { conectarDB } from "./db.js"
import { PORT } from "./utils/config.js"

await conectarDB()

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`)
})
