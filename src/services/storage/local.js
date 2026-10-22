// clase 23 · ADAPTADOR DE DISCO LOCAL
//
// Sirve para trabajar sin cuenta de nadie... y para ENTENDER por qué no alcanza.
// Tres problemas que no tienen los storages de verdad:
//   1. Se borra en cada deploy: el servidor se reconstruye de cero.
//   2. Con dos servidores, la imagen está en uno solo: la mitad de las
//      peticiones no la encuentra.
//   3. Tu servidor gasta tiempo y ancho de banda sirviendo archivos en vez
//      de responder la API.
import fs from "fs/promises"
import path from "path"
import { CARPETA_IMAGENES, API_URL } from "../../utils/config.js"
import { nombreUnico } from "./nombreUnico.js"

export const subir = async (file) => {
    const nombre = nombreUnico(file.originalname)
    const carpeta = path.resolve(CARPETA_IMAGENES)

    // recursive: true → si la carpeta ya existe, no se queja
    await fs.mkdir(carpeta, { recursive: true })
    await fs.writeFile(path.join(carpeta, nombre), file.buffer)

    // esta URL funciona gracias al express.static() de index.js
    return `${API_URL}/${CARPETA_IMAGENES}/${nombre}`
}

export const borrar = async (url) => {
    const nombre = path.basename(new URL(url).pathname)

    // force: true → si el archivo ya no está, no tira error
    await fs.rm(path.join(path.resolve(CARPETA_IMAGENES), nombre), { force: true })
}
