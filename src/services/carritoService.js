import mongoose from "mongoose"
import Carrito from "../models/carrito.js"
import Libro from "../models/libro.js"
// No sabemos si el usuario tiene carrito o no
// Si el usuario tiene carrito lo devuelve
// si no  lo crea en la misma operacion

import { verificarUsuarioService } from "./usuarioService.js"
import { ErrorApp } from "../utils/ErrorApp.js"

// populate anidado de 3 colecciones
// Populate - Carrito -> libros -> autor

const POPULATE_ITEMS = {
    path: "items.libro",
    select: "titulo precio stock disponible autor",
    populate: { path: "autor", select: "nombre" }
}

// porque esta linea se repite tanto? 
// await carrito.save()
//     return await obtenerCarritoService(usuarioId)

// respuesta:
// Concurrencia: carrito.save() guarda en MongoDB la versión que Node.js tiene en memoria. Si entran dos peticiones simultáneas, la última en guardar puede sobrescribir los cambios de la primera (condición de carrera/lectura desactualizada).

// Single Source of Truth (SSOT): La base de datos es la única fuente de la verdad, no el objeto en memoria. Al ejecutar obtenerCarritoService(), devuelves el estado real y persistido recién traído de MongoDB (con sus populates y campos calculados), garantizando que el frontend reciba la información oficial.



/**
 * Obtiene el carrito del usuario o lo crea si no existe (patrón Get or Create).
 * Usa 'upsert: true' junto con '$setOnInsert' para inicializar 'items: []'
 * únicamente al crear un nuevo registro, evitando sobrescribir datos existentes
 * de forma atómica y segura ante concurrencia.
 */
// $setOnInsert -> solo se aplica cuando se crea el carrito
const obtenerOCrear = async (usuarioId) => {
    await verificarUsuarioService(usuarioId)

    return await Carrito.findOneAndUpdate(
        { usuario: usuarioId },
        { $setOnInsert: { items: [] } },
        { upsert: true, returnDocument: "after" }
    )
}

// Necesitamos calcular total
// el total no se guarda: se calcula cada vez con el precio vivo del libro
const conTotal = (carrito) => {
    const items = carrito.items
    .filter(item => item.libro) // filter por si un libro se borró
    .map(item => ({
        libro: item.libro,
        cantidad: item.cantidad,
        subtotal: item.libro.precio * item.cantidad
    }))

    return {
        _id: carrito._id,
        usuario: carrito.usuario,
        items,
        unidades: items.reduce(( acc, item ) => acc + item.cantidad, 0),
        total: items.reduce((acc, item) => acc + item.subtotal, 0),
        actualizado: carrito.updatedAt // paso 0: decía updateAt
    }
}

// get
export const obtenerCarritoService = async (usuarioId) => {
    // Asegura si el cliente tiene carrito, si no lo tiene lo crea
    const carrito = await obtenerOCrear(usuarioId)
    // al carrito le populamos los datos del libro y el autor
    await carrito.populate(POPULATE_ITEMS)
    // retornamos el carrito con las unidades y el total calculados
    return conTotal(carrito)
}

/**
 * Valida que la cantidad sea un número entero estrictamente positivo (>= 1).
 * Descarta decimales, textos, valores nulos y números menores o iguales a cero,
 * lanzando un error 400 si la entrada no es apta para operaciones de inventario.
 */
const validarCantidad = (cantidad) => {
    if(!Number.isInteger(cantidad) || cantidad < 1){
        throw new ErrorApp("La cantidad tiene que ser un número entero mayor a 0", 400)
    }
}

/**
 * Verifica que el ID provisto cumpla con la estructura hexadecimal de 24 caracteres
 * propia de un ObjectId de MongoDB/Mongoose antes de consultar la base de datos,
 * evitando fallos internos en las consultas y retornando un error 400.
 */
const validarIdLibro = (libroId) => {
    if(!mongoose.isValidObjectId(libroId)){
        throw new ErrorApp("Ese id de libro no tiene un formato valido", 400)
    }
}

// Funcionalidad para agregar un item al carrito
// cantidad = 1 es porque se añaden libros de a 1

// Obtención y Guardas: Garantiza que el usuario tenga un carrito activo (obtenerOCrear) y valida que el ID del libro y la cantidad tengan un formato válido antes de consultar la base de datos.

// Verificación del Libro: Comprueba que el libro exista en la base de datos y que su estado disponible sea verdadero.

// Control de Stock: Busca si el libro ya estaba en el carrito. Calcula la cantidadFinal (existente + nueva) y la compara contra el stock real del libro. Si supera la existencia, lanza un error.

// Actualización:

// Si ya existía: Actualiza la propiedad cantidad del ítem encontrado.

// Si es nuevo: Realiza un push al arreglo items con el nuevo libro y su cantidad.

// Persistencia: Guarda las modificaciones con carrito.save() y retorna el carrito procesado y formateado.
// POST
// paso 0: el "= {}" evita un 500 si el POST llega sin body (en Express 5, req.body queda undefined)
export const agregarItemService = async (usuarioId, { libro: libroId, cantidad = 1 } = {}) => {
    const carrito = await obtenerOCrear(usuarioId)

    if(!libroId)  throw new ErrorApp("Falta el libro", 400)
    validarIdLibro(libroId)
    validarCantidad(cantidad)

    const libro = await Libro.findById(libroId)

    // existe el libro?
    if(!libro){
        throw new ErrorApp(`No existe ningún libro con el id ${libroId}`)
    }

    if(!libro.disponible){
        throw new ErrorApp(`"${libro.titulo}" no está disponible para la venta`, 409) // paso 0: faltaba el 409
    }

    // si está en el carrito se suma
    // el total no debe pasar el stock
    const item = carrito.items.find(item => item.libro.equals(libro._id))
    const cantidadFinal = (item ? item.cantidad : 0) + cantidad

    if(cantidadFinal > libro.stock){
        throw new ErrorApp(
            `Stock insuficiente de "${libro.titulo}": hay ${libro.stock} y en el carrito quedarían ${cantidadFinal}`,
            409 // paso 0: estaba ADENTRO del string
        )
    }

    // si tenemos un libro repetido
    if(item){
        // se suma el nuevo como repetido
        item.cantidad = cantidadFinal
    } else {
        // sino se añade como un libro individual no como un libro repetido
        carrito.items.push({ libro: libro._id, cantidad })
    }

    await carrito.save()
    return await obtenerCarritoService(usuarioId)
}

/**
 * Reemplaza la cantidad de un libro existente en el carrito por un valor fijo.
 * Valida la existencia del ítem en el carrito y disponibilidad de stock,
 * permitiendo al cliente modificar directamente las unidades desde la interfaz.
 */
// PATCH
// actualizar los items
export const actualizarItemService = async (usuarioId, libroId, { cantidad } = {} ) => {
    const carrito = await obtenerOCrear(usuarioId)
    validarIdLibro(libroId)
    validarCantidad(cantidad)

    const item = carrito.items.find(item => item.libro.equals(libroId))
    if(!item){
        throw new ErrorApp("Ese libro no está en el carrito", 404)
    }

    // paso 0: faltaba el await. Sin él, libro es una consulta SIN ejecutar,
    // libro.stock da undefined y el control de stock nunca se cumplía.
    const libro = await Libro.findById(libroId)
    if(cantidad > libro.stock){
        throw new ErrorApp(`Stock insuficiente de "${libro.titulo}": hay ${libro.stock}`, 409) // paso 0
    }

    item.cantidad = cantidad // se fija la cantidad no se suma
    await carrito.save()
    return await obtenerCarritoService(usuarioId)
}

// quitar un item
export const quitarItemService = async (usuarioId, libroId) => {
    const carrito = await obtenerOCrear(usuarioId)
    validarIdLibro(libroId)
    
    const antes = carrito.items.length

    // lo borro, me quedo solamente con los que no coinciden con el libroId
    // filter -> te integra lo que pedis y te discrimina lo que no le pedis
    // en otras palabras deja afuera de carrito.items el libro que posee el libroId
    // pero el resto los deja intactos
    carrito.items = carrito.items.filter(item => !item.libro.equals(libroId))

    if(carrito.items.length === antes){
        throw new ErrorApp("Ese libro no está en el carrito", 404)
    }

    await carrito.save()
    return await obtenerCarritoService(usuarioId)
}

// vaciar carrito
export const vaciarCarritoService = async (usuarioId) => {
    const carrito = await obtenerOCrear(usuarioId)
    carrito.items = []
    await carrito.save()
    return await obtenerCarritoService(usuarioId)
}