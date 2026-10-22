import path from "path"

// El nombre con el que se guarda el archivo.
//
// ⚠️ NO se usa el nombre original tal cual. Dos motivos:
//    1. Si dos personas suben "tapa.jpg", el segundo pisa al primero.
//    2. El nombre lo elige el cliente: podría mandar "../../index.js".
// Date.now() + un número al azar alcanza para que no se repitan.
export const nombreUnico = (originalname = "archivo") => {
    const extension = path.extname(originalname).toLowerCase() || ".jpg"
    const azar = Math.random().toString(36).slice(2, 8)

    return `${Date.now()}-${azar}${extension}`
}
