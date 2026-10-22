// clase 22
import * as pedidoService from "../services/pedidoService.js"

// req.usuario lo dejó verificarToken: { id, rol }. Viene del TOKEN, no del cliente.
// Igual que en carritoController: el controller no decide nada, solo traduce.

// POST /api/pedidos → confirmar la compra
export const crearPedidoController = async (req, res) => {
    const pedido = await pedidoService.crearPedidoService(req.usuario.id)
    res.status(201).json(pedido)       // acá SÍ se crea un recurso nuevo
}

// GET /api/pedidos → mis pedidos
export const listarMisPedidosController = async (req, res) => {
    const pedidos = await pedidoService.listarMisPedidosService(req.usuario.id)
    res.status(200).json(pedidos)
}

// GET /api/pedidos/:id → uno mío
export const obtenerMiPedidoController = async (req, res) => {
    const pedido = await pedidoService.obtenerMiPedidoService(req.params.id, req.usuario.id)
    res.status(200).json(pedido)
}

// PATCH /api/pedidos/:id/pagar
export const pagarPedidoController = async (req, res) => {
    const pedido = await pedidoService.pagarPedidoService(req.params.id, req.usuario.id)
    res.status(200).json(pedido)
}

// PATCH /api/pedidos/:id/cancelar
export const cancelarPedidoController = async (req, res) => {
    const pedido = await pedidoService.cancelarPedidoService(req.params.id, req.usuario.id)
    res.status(200).json(pedido)
}

// GET /api/pedidos/todos → para el staff
export const listarTodosPedidosController = async (req, res) => {
    const pedidos = await pedidoService.listarTodosPedidosService()
    res.status(200).json(pedidos)
}
