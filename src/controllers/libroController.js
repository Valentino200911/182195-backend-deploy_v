import { actualizarLibroService, crearLibroService, eliminarLibroService, listarLibroService, obtenerLibroIdService } from "../services/libroService.js"
// import * as libroService from "../services/libroService.js"

export const listarLibroController = async (req, res) => {
    // query params -> opcional, sirve para filtrar
        const libros = await listarLibroService(req.query)
        res.status(200).json(libros)
}

export const obtenerLibroIdController = async (req, res) => {
    const libro = await obtenerLibroIdService(req.params.id)

    if(!libro){
        return res.status(404).json({ error: "No existe ese libro" })
    }

    res.status(200).json(libro)
}

export const crearLibroController = async (req, res) => {
    const libro = await crearLibroService(req.body, req.file)
    res.status(201).json(libro)
}

export const actualizarLibroController = async (req, res) => {
    const libro = await actualizarLibroService(req.params.id, req.body, req.file)
    if(!libro){
        return res.status(404).json({ error: "No existe ese libro"})
    }
    res.status(200).json(libro)
}

export const eliminarLibroController = async (req, res) => {
    const libro = await eliminarLibroService(req.params.id)
    if(!libro){
        return res.status(404).json({error: "No existe ese libro"})
    }
    // It is used to quickly end the response without any data
    // res.status(204).end()
    res.status(200).json(libro)
}