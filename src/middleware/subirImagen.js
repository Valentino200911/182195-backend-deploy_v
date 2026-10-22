import multer from 'multer'

const storage = multer.memoryStorage()

// validacion para solo imagenes
const soloImagenes = (req, file, cb) => {
    if(file.mimetype.startsWith("image/")){
        // cb(error, success)
        cb(null, true) //aceptado
    } else {
        cb(new Error("Solo se permiten imágenes"), false) //rechazado
    }
}
// la subida de la imagen
const upload = multer({
    storage,
    fileFilter: soloImagenes,
    limits: {
        fileSize: 4 * 1024 * 1024 // 4MB
    }
})

// Subida de la imagen
// tenés que saber exactamente el name del campo por el cual vas a subir la foto
// imagen es el name del campo por el cual subiremos la foto
export const subirImagen = upload.single("imagen")

// manejo de errores:
// limite de peso de la imagen
// campo incorrecto de la imagen
// un error comun de procesamiento
// solo imagenes permitidas
// que no se haya usado multipart

export const manejarErroresDeMulter = (error, req, res, next) => {
    if(error?.name === "MulterError") {
        if(error.code === "LIMIT_FILE_SIZE"){
            return res.status(400).json({ error: "La imagen no puede pesar mas de 4 MB" })
        }
        if(error.code === "LIMIT_UNEXPECTED_FILE"){
            return res.status(400).json({ error: `No esperaba un archivo en el campo "${error.field}". El campo tiene que llamarse "imagen"`})
        }
        return res.status(400).json({error: "No se pudo procesar el archivo"})
    }

    // error de nuestro filtro de archivos
    if(error?.message === "Solo se permiten imágenes"){
        return res.status(400).json({ error: error.message })
    }

    // no escribimos el content-type a mano en postman
    if(error?.message?.includes("Boundary not found")){
        return res.status(400).json({
            error: "No pongas el header Content-Type a mano: dejá que postman lo arme con la frontera del multipart"
        })
    }
    next(error) // cualquier otro error sigue al middleware general
}