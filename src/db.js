// =====================================================================
//  clase 26 · LA CONEXIÓN, AHORA QUE LA BASE PUEDE ESTAR LEJOS
//
//  Hasta hoy la base estaba en tu máquina: si fallaba, era porque no
//  habías prendido Mongo. Con Atlas hay cuatro motivos distintos, y el
//  mensaje que tira el driver no se entiende.
//
//  Este archivo hace tres cosas:
//    1. se conecta con un timeout corto (10s en vez de 30)
//    2. dice A DÓNDE se conectó, sin mostrar la contraseña
//    3. TRADUCE los errores típicos de Atlas a algo que se pueda arreglar
// =====================================================================

import mongoose from 'mongoose'
import { MONGO_URI } from './utils/config.js'

// mongodb+srv:// es el formato de Atlas · mongodb:// es el de siempre (local)
export const esAtlas = MONGO_URI.startsWith("mongodb+srv://")

// ─────────────────────────────────────────────────────────────
//  Para poder loguear la conexión sin filtrar la contraseña.
//
//  ⚠️ La URI de Atlas tiene la password ADENTRO. Si la imprimís tal cual,
//     queda en la consola, en los logs del servidor y en la captura de
//     pantalla que mandás al grupo pidiendo ayuda.
// ─────────────────────────────────────────────────────────────
export const uriSinPassword = (uri = MONGO_URI) =>
    uri.replace(/\/\/([^:/@]+):([^@]+)@/, "//$1:****@")

// ─────────────────────────────────────────────────────────────
//  Traduce el error del driver a algo accionable.
//  Son los tres que van a aparecer en clase, por orden de frecuencia.
// ─────────────────────────────────────────────────────────────
const explicar = (error) => {
    const texto = `${error.message} ${error.reason?.message ?? ""}`

    if (/bad auth|Authentication failed/i.test(texto)) {
        return [
            "Usuario o contraseña incorrectos.",
            "  · Es el usuario de BASE DE DATOS (Atlas → Database Access),",
            "    NO el mail con el que entrás a Atlas.",
            "  · Si la contraseña tiene @ : / ? # o % hay que escaparla.",
            "    Lo más simple: generá una sin símbolos con 'Autogenerate Secure Password'.",
        ].join("\n")
    }

    if (/ENOTFOUND|querySrv|EAI_AGAIN|ENODATA/i.test(texto)) {
        return [
            "No se pudo resolver el host del cluster.",
            "  · Revisá que el string esté completo, sin espacios ni comillas.",
            "  · Si está bien copiado, puede ser la red: hay redes que bloquean",
            "    las consultas DNS tipo SRV, que es lo que usa mongodb+srv://",
        ].join("\n")
    }

    if (/ReplicaSetNoPrimary|Server selection timed out|connect ECONNREFUSED/i.test(texto)) {
        return esAtlas
            ? [
                "No se llegó al cluster. Casi siempre es una de estas dos:",
                "  · Tu IP no está permitida → Atlas → Network Access → Add IP Address.",
                "    Ojo que la IP cambia al cambiar de red (casa / facultad / celular).",
                "  · La red bloquea la salida al puerto 27017 (pasa en redes institucionales).",
            ].join("\n")
            : [
                "No se llegó a MongoDB local.",
                "  · ¿Está prendido el servicio de Mongo?",
            ].join("\n")
    }

    return error.message
}

export const conectarDB = async () => {
    try {
        await mongoose.connect(MONGO_URI, {
            // Si no se llega al servidor, falla a los 10s en vez de 30.
            // Con Atlas esto importa: 30 segundos de consola quieta parecen
            // un cuelgue, no un error.
            serverSelectionTimeoutMS: 10_000,
        })

        console.log(
            `MongoDB conectado · ${esAtlas ? "Atlas (nube)" : "local"} · base "${mongoose.connection.name}"`
        )

        // con Atlas conviene ver a QUÉ cluster: es fácil terminar con dos
        if (esAtlas) console.log(`   ${uriSinPassword()}`)
    } catch (error) {
        console.error("\n❌ No se pudo conectar a MongoDB\n")
        console.error(explicar(error))
        console.error(`\n   conexión usada: ${uriSinPassword()}`)
        console.error(`   error original: ${error.message}\n`)

        process.exit(1)
    }
}
