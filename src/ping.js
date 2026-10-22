// =====================================================================
//  clase 26 · PROBAR LA CONEXIÓN, SIN LEVANTAR EL SERVIDOR
//
//  Correlo así:   npm run db:ping
//
//  Sirve para separar dos problemas que se confunden todo el tiempo:
//  "no conecta a la base" y "el servidor no arranca". Esto prueba SOLO
//  la base: si acá anda, el problema está en otro lado.
//
//  Y no toca ningún dato: solo mira.
// =====================================================================

import mongoose from "mongoose"
import { conectarDB, esAtlas, uriSinPassword } from "./db.js"
import { MONGO_URI } from "./utils/config.js"

console.log("")
console.log(`   conexión : ${uriSinPassword()}`)
console.log(`   tipo     : ${esAtlas ? "Atlas (nube)" : "local"}`)

// cuánto tarda en conectarse. Contra local son milisegundos; contra Atlas,
// entre 100 y 400 ms según dónde esté el cluster. Es la latencia que después
// paga CADA consulta: por eso los tests siguen corriendo contra local.
const arranque = Date.now()

await conectarDB()

const tardo = Date.now() - arranque
console.log(`   tardó    : ${tardo} ms en conectar`)

// ping es el comando más barato que hay: solo pregunta "¿estás ahí?"
const inicioPing = Date.now()
await mongoose.connection.db.admin().command({ ping: 1 })
console.log(`   ping     : ${Date.now() - inicioPing} ms`)

// qué hay adentro, para darse cuenta rápido si estamos mirando la base equivocada
const colecciones = await mongoose.connection.db.listCollections().toArray()

console.log("")
if (colecciones.length === 0) {
    console.log("   la base está VACÍA (todavía no corriste el seed)")
} else {
    console.log(`   ${colecciones.length} colecciones:`)

    for (const { name } of colecciones.sort((a, b) => a.name.localeCompare(b.name))) {
        const cuantos = await mongoose.connection.db.collection(name).countDocuments()
        console.log(`      ${name.padEnd(12)} ${cuantos} documentos`)
    }
}

console.log("")
await mongoose.connection.close()
