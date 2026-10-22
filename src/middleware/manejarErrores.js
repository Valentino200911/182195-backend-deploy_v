// =====================================================================
//  ¿POR QUÉ NO HAY try/catch EN LOS CONTROLLERS NI EN LOS SERVICES?
//
//  Porque Express 5 lo hace solo: si una función async lanza un error,
//  Express lo agarra y se lo manda al middleware de errores.
//
//  Escribirlo a mano sería repetir esto en cada una de las ~25 funciones:
//
//      try { ... } catch (error) { next(error) }   // 3 líneas para no hacer nada
//
//  El middleware lo hace mejor por tres motivos:
//
//  1. Está escrito UNA vez. Si mañana cambia cómo respondemos los errores,
//     se toca un solo archivo y no veinticinco.
//
//  2. Sabe traducir. Un catch suelto solo puede responder 500, porque no
//     distingue qué pasó. El middleware mira el tipo de error y decide:
//
//        ValidationError  -> 400 + qué campo está mal
//        CastError        -> 400 (el id no tiene formato de ObjectId)
//        code 11000       -> 400 (valor duplicado)
//        ErrorApp         -> el status que traiga (404, 409...)
//        cualquier otro   -> 500 y el detalle va al log, no al cliente
//
//  3. No se olvida. Si te salteás un try/catch, la petición queda colgada.
//     El middleware atrapa todo lo que nadie atrapó.
//
//  ⚠️ ENTONCES, ¿CUÁNDO SÍ VA UN try/catch?
//     Solo si vas a HACER algo con el error:
//       · traducirlo a un mensaje mejor  -> ver el ISBN en libroService.js
//       · deshacer algo a medio hacer    -> lo vamos a ver en pedidos (devolver stock)
//     Y siempre termina en throw.
//
//  ⚠️ UN catch QUE SOLO HACE console.error NO ATRAPA EL ERROR: LO ESCONDE.
//     Es el GAP 1: por eso un POST sin título respondía 201 con el cuerpo vacío.
//
//  ⚠️ Esto vale para Express 5. En Express 4 el try/catch es OBLIGATORIO:
//     sin él, la petición queda esperando para siempre.
// =====================================================================


export const manejarErrores = (error, req, res, next) => {

    // nuestras reglas de negocio
    if (error.name === "ErrorApp") {
        return res.status(error.status).json({ error: error.message })
    }

    // el body no es un JSON válido (una coma de más en Postman)
    if (error.type === "entity.parse.failed") {
        return res.status(400).json({ error: "El body no es un JSON válido" })
    }

    // el id no tiene forma de ObjectId → /api/libros/abc
    if (error.name === "CastError") {
        return res.status(400).json({ error: "Ese id no tiene un formato válido", recibido: error.value })
    }

    // se rompió una regla del modelo
    if (error.name === "ValidationError") {
        return res.status(400).json({
            error: "Los datos no son válidos",
            detalles: Object.values(error.errors).map(e => e.message)
        })
    }

    // un unique repetido que nadie tradujo antes
    if (error.code === 11000) {
        return res.status(409).json({ error: "Ya existe un registro con ese dato", campo: Object.keys(error.keyPattern)[0] })
    }

    // lo demás es culpa nuestra: el detalle al log, al cliente solo el mensaje
    console.error(error)
    res.status(500).json({ error: "Error interno del servidor" })
}
