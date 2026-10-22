import jwt from "jsonwebtoken";
import { JWT_EXPIRA, JWT_SECRET } from "../utils/config.js";
import {
  buscarPorEmailConPasswordService,
  crearUsuarioService,
  datosPublicosUsuario,
} from "./usuarioService.js";
import { ErrorApp } from "../utils/ErrorApp.js";
// cual es la responsabilidad de este componente?

// 1- Firmar el token
// La información del usuario queda en el token (payload)
// El token queda firmado
// el token es publico, la firma es lo que vale
const firmarToken = (usuario) => {
  // la firma lleva:
  // datos del usuario
  // el secreto del servidor
  // lleva el tiempo de expiracion
  return jwt.sign({ id: usuario._id, rol: usuario.rol }, JWT_SECRET, {
    expiresIn: JWT_EXPIRA,
  });
};

// 2-
// POST /api/auth/registro
// queremos quitar la password cuando se retorne el usuario
export const registrarService = async ({
  nombre,
  apellido,
  email,
  password,
} = {}) => {
  const usuario = await crearUsuarioService({
    nombre,
    apellido,
    email,
    password,
  });

  // la practica usual es que esto no pase asi
  // lo comun es que recibas un email para confirmar tu cuenta

  // esto permite que en cuanto se registre puede iniciar sesion
  return {
    usuario: datosPublicosUsuario(usuario),
    token: firmarToken(usuario),
  };
};

export const loginService = async ({ email, password } = {}) => {
  if (!email || !password) {
    throw new Error("Faltan el email y/o la contraseña", 400);
  }

  // un llamado a la api por email y trae la contraseña relacionada a ese email (unique)
  const usuario = await buscarPorEmailConPasswordService(email);

  // valida si no nos mandaron usuario
  // usuario.compararPassword(password) compara la contraseña a traves del hashing de bcrypt
  if (!usuario || !(await usuario.compararPassword(password))) {
    throw new ErrorApp("Email o contraseña incorrectos", 401);
  }
  // retornamos el usuario sin la password
  // token firmado con la información del usuario
  return {
    usuario: datosPublicosUsuario(usuario),
    token: firmarToken(usuario),
  };
};
