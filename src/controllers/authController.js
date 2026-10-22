import * as authService from "../services/authService.js"
import * as usuarioService from "../services/usuarioService.js"

export const registrarController = async (req, res) => {
    const datos = await authService.registrarService(req.body)
    res.status(201).json(datos) // 201 significa created
}

export const loginController = async (req, res) => {
    const datos = await authService.loginService(req.body)
    res.status(200).json(datos)
}

// Extra - Acceso al perfil
// esto ayuda a verificar si tenemos sesion activa
export const perfilController = async (req, res) => {
    const usuario = await usuarioService.obtenerUsuarioIdService(req.usuario.id)
    if (!usuario) {
        // el token es válido, pero el usuario se borró después de loguearse
        return res.status(404).json({ error: "Ese usuario ya no existe" })
    }
    res.status(200).json(usuario)
}