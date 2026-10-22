import * as usuarioService from '../services/usuarioService.js'

export const listarUsuarioController = async (req, res) => {
    const usuarios = await usuarioService.listarUsuarioService()
    res.status(200).json(usuarios)
}

export const obtenerUsuarioIdController = async (req, res) => {
    const usuario = await usuarioService.obtenerUsuarioIdService(req.params.id)
    if(!usuario){
        return res.status(404).json({ error: "No existe ese usuario"})
    }
    res.status(200).json(usuario)
}

export const crearUsuarioController = async (req, res) => {
    const usuario = await usuarioService.crearUsuarioService(req.body)
    res.status(201).json(usuario)
}