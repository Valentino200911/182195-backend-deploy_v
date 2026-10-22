import * as carritoService from "../services/carritoService.js"

export const obtenerCarritoController = async (req, res) => {
    const carrito = await carritoService.obtenerCarritoService(req.usuario.id)
    res.status(200).json(carrito)
}

export const agregarItemCarritoController = async (req, res) => {
    const carrito = await carritoService.agregarItemService(req.usuario.id, req.body)
    res.status(200).json(carrito)
}

export const actualizarItemCarritoController = async (req, res) => {
    const carrito = await carritoService.actualizarItemService(req.usuario.id, req.params.libroId, req.body)
    res.status(200).json(carrito)
}

export const quitarItemCarritoController = async(req, res) => {
    const carrito = await carritoService.quitarItemService(req.usuario.id, req.params.libroId)
    res.status(200).json(carrito)
}

export const vaciarCarritoController = async (req, res) => {
    const carrito = await carritoService.vaciarCarritoService(req.usuario.id)
    res.status(200).json(carrito)
}