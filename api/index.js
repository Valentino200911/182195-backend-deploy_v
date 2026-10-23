// =====================================================================
//  clase 27 · EL PUNTO DE ENTRADA DE VERCEL
//
//  Vercel no corre "npm start". Busca los archivos de la carpeta api/ y
//  los convierte en funciones serverless. Este es el único que hay, y
//  vercel.json manda TODO el tráfico acá.
//
//  ¿Y por qué funciona pasarle la app de Express?
//  Porque una app de Express ES una función (req, res): la misma forma que
//  espera Vercel. Lo único que agregamos alrededor es asegurar la conexión
//  a la base antes de atender.
//
//  ⭐ Fijate que src/app.js NO se toca. Esa separación entre "armar la app"
//     y "arrancar el servidor" la hicimos para poder testear (clase 24), y
//     resulta que es exactamente lo que pide Vercel.
// =====================================================================

import app from "../src/app.js"
import { conectar } from "../src/db.js"

export default async function handler(req, res) {
    try {
        await conectar()
    } catch (error) {
        // 503 = "el servicio no está disponible ahora". No es 500: nuestro
        // código está bien, lo que no responde es la base.
        console.error("Sin conexión a MongoDB:", error.message)

        // ⚠️ Acá NO se usa res.status().json(), que son métodos de EXPRESS.
        //    En este punto todavía no entramos a la app: el res es el de Node
        //    pelado. Vercel le agrega esos helpers, pero depender de eso es
        //    frágil. Con la API nativa funciona en cualquier lado.
        res.statusCode = 503
        res.setHeader("Content-Type", "application/json; charset=utf-8")

        return res.end(JSON.stringify({ error: "La base de datos no está disponible" }))
    }

    return app(req, res)
}
