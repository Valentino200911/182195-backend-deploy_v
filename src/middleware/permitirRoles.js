import { ErrorApp } from "../utils/ErrorApp.js"

// Gracias a esto podemos controlar el acceso a rutas por rol
export const permitirRoles = (...roles) => {
    return (req, res, next) => {
        if(!roles.includes(req.usuario.rol)) {
            throw new ErrorApp(`Esta acción requiere uno de estos roles: ${roles.join(", ")}`, 403);
        }
        next()
    }
}

// 401 ->Unauthorized -> no sé quien sos (falta el token, o no es valido)
// 403 -> forbidden -> se quien sos y NO podes hacer esto