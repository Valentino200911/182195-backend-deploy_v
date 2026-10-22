import { actualizarAutorService, crearAutorService, eliminarAutorService, listarAutorService, obtenerAutorIdService } from "../services/autorService.js"

    // voy a usar datos que reciba del cliente? cuales?
    // que le voy a mandar como respuesta al cliente? (status/data)
    // cual servicio utilizo y que puedo recibir de ese servicio?
    // el servicio maneja algun error y debo informarlo al usuario?

export const listarAutorController = async (req, res) => {
    // req.query (query params) -> parametro de ruta que es opcional, se usa mucho para los filtros
    // a diferencia del req.param que es obligatorio para el acceso a la ruta
    const autores = await listarAutorService(req.query)
    res.status(200).json(autores)
}

export const obtenerAutorIdController = async (req, res) => {
    const autor = await obtenerAutorIdService(req.params.id)
    if(!autor){
        //404 -> not found
        return res.status(404).json({error: "No existe ese autor" })
    }
    res.status(200).json(autor)
}

export const crearAutorController = async (req, res) => {
   const autor = await crearAutorService(req.body)
   // 201 -> created
   res.status(201).json(autor)
}

export const actualizarAutorController = async (req, res) => {
    const autor = await actualizarAutorService(req.params.id, req.body)
    if(!autor){
       return res.status(404).json({error: "No existe ese autor"})
    }
    res.status(200).json(autor)
}

export const eliminarAutorController = async (req, res) => {
    const autor = await eliminarAutorService(req.params.id)
    if(!autor){
       return res.status(404).json({error: "No existe ese autor"})
    }
    res.status(200).json(autor)
}
