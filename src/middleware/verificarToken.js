import jwt from "jsonwebtoken"
import { ErrorApp } from "../utils/ErrorApp.js"
import { JWT_SECRET } from "../utils/config.js"

// 🧢🧢🧢

export const verificarToken = (req, res, next) => {
    const header = req.headers.authorization || ""
    if(!header.startsWith("Bearer ")){
        throw new ErrorApp("Falta el token. Mandá el header Authorization: Bearer <token>", 401)
    }

    // quita la palabra Bearer y se queda solo con el token
    const token = header.slice(7)
    // "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6Ikp1YW4gUGVyZXoiLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE1MTYyMzkwMDB9.4S8_00u2X_fake_signature_for_testing_only_12345"

    try {
        // revisamos si el token está firmado por nosotros y si no está vencido
        const payload = jwt.verify(token, JWT_SECRET)

        // guarda el request los datos del usuario (este es el que obtenemos en el controller de carrito)
        req.usuario = { id: payload.id, rol: payload.rol }

        next()
    } catch (error) {
        if (error.name === "TokenExpiredError") {
            throw new ErrorApp("El token venció, volvé a iniciar sesión", 401)
        }
        throw new ErrorApp("Token inválido", 401)
    }
}