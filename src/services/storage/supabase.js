import { supabase } from "../../config/supabase.js"
import { CARPETA_IMAGENES } from "../../utils/config.js"
import { nombreUnico } from "./nombreUnico.js"

// bucket
const bucket = () => supabase.storage.from(CARPETA_IMAGENES)

export const subir = async (file) => {
    const nombre = nombreUnico(file.originalname)

    const {error} = await bucket().upload(nombre, file.buffer, {
        contentType: file.mimetype,
        upsert: false
    })

    if(error) throw error

    // arma la url, solo funciona si el bucket es publico
    const {data} = bucket().getPublicUrl(nombre)

    return data.publicUrl
}

export const borrar = async (url) => {
    // La URL pública termina en .../object/public/<bucket>/<archivo>
    const nombre = url.split(`/${CARPETA_IMAGENES}/`).pop()

    if (!nombre || nombre === url) return    // no parece una URL nuestra

    const { error } = await bucket().remove([nombre])    // remove espera un ARRAY

    if (error) throw error
}

