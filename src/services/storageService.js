import { STORAGE } from "../utils/config.js";
import { ErrorApp } from "../utils/ErrorApp.js";

const PROVEEDORES = ["local", "supabase"]

if (!PROVEEDORES.includes(STORAGE)) {
    // Mejor reventar al arrancar que descubrirlo en la primera subida.
    throw new Error(`STORAGE="${STORAGE}" no existe. Tiene que ser uno de: ${PROVEEDORES.join(", ")}`)
}

const adaptador = await import(`./storage/${STORAGE}.js`)

export const subirImagenService = async (file) => {
    if (!file) return null      // la imagen es opcional: sin archivo, no hay URL

    try {
        return await adaptador.subir(file)
    } catch (error) {
        // Este catch SÍ hace algo: traduce el error de un servicio EXTERNO a uno
        // nuestro, y deja el detalle técnico en el log del servidor.
        // 502 = "el que falló fue un servicio del que dependo", no vos ni yo.
        console.error("Error subiendo la imagen:", error)
        throw new ErrorApp("No se pudo guardar la imagen. Probá de nuevo.", 502)
    }
}

export const borrarImagenService = async (url) => {
    if (!url) return

    try {
        await adaptador.borrar(url)
    } catch (error) {
        // ⚠️ Acá NO se relanza, a propósito: si la imagen vieja no se pudo borrar,
        //    el libro igual se guardó bien. Que falle el borrado no puede romperle
        //    la operación al usuario. Queda un archivo huérfano y se registra.
        console.error("No se pudo borrar la imagen:", url, error.message)
    }
}
