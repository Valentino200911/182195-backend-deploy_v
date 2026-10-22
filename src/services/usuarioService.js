import Usuario from "../models/usuario.js"
import { ErrorApp } from "../utils/ErrorApp.js"

// get
export const listarUsuarioService = async() => {
    return await Usuario.find().sort({nombre: 1})
}

// get by id
export const obtenerUsuarioIdService = async(id) => {
    return await Usuario.findById(id)
}

// post
export const crearUsuarioService = async(datos) => {
    return await Usuario.create(datos)
}

// GAP : no tenemos ni delete ni patch

// Verificar existencia del usuario
export const verificarUsuarioService = async (usuarioId) => {
   const existe = await Usuario.exists({_id: usuarioId})
   if(!existe){
    throw new ErrorApp(`No existe ningun usuario con el id ${usuarioId}`, 404)
   }
}

// buscar el usuario por email con password
// busca por email y trae la contraseña
// es el unico lugar donde se pide la contraseña
export const buscarPorEmailConPasswordService = async (email = "") => {
    // .select("+password") mitiga el select:false del modelo de usuario
    return await Usuario.findOne({ email: email.toLowerCase().trim() }).select("+password")
}

// datos publicos, no retorna contraseña
export const datosPublicosUsuario = (usuario) => ({
    _id: usuario._id,
    nombre: usuario.nombre,
    apellido: usuario.apellido,
    email: usuario.email,
    rol: usuario.rol
})