import mongoose from "mongoose"
import Libro from "../src/models/libro.js"
import Autor from "../src/models/autor.js"
import Pedido from "../src/models/pedido.js"
import {
    conectarBaseDeTest, cerrarBaseDeTest, limpiarBase,
    crearAutor, crearLibro, crearComprador,
} from "./ayudas.js"
import { eliminarAutorService } from "../src/services/autorService.js"
import { crearLibroService } from "../src/services/libroService.js"
import { agregarItemService, obtenerCarritoService } from "../src/services/carritoService.js"
import {
    crearPedidoService, obtenerMiPedidoService,
    cancelarPedidoService, pagarPedidoService,
} from "../src/services/pedidoService.js"

// preparar escenario
// antes de todos se conecta a la base de datos de prueba
beforeAll(conectarBaseDeTest)
// antes de cada uno limpia completamente la base
beforeEach(limpiarBase)
// despues de todos los tests cierra la base de datos
afterAll(cerrarBaseDeTest)

describe("eliminarAutorService", () => {
    it("borra un autor que no tiene libros", async () => {
        const autor = await crearAutor({nombre: "Sin Libros"})

        await eliminarAutorService(autor._id)

        expect(await Autor.findById(autor._id)).toBeNull()
    })

    it("No borra un autor que tiene libros y avisa con 409", async () => {
        const autor = await crearAutor({nombre: "Con Libros"})

        await crearLibro({autor: autor._id})

        await expect(eliminarAutorService(autor._id)).rejects.toThrow(/No se puede eliminar/)

        expect(await Autor.findById(autor._id)).not.toBeNull()
    })
})

describe("crearLibroService", () => {
    it("no deja crear un libro con un autor que no existe", async () => {
        // preparar escenario -> creamos un objectID
        const idInventado = new mongoose.Types.ObjectId()

        // ejecutar una sola cosa + comprobacion -> creacion de un libro con un autor falso
        await expect(
            crearLibroService({ titulo: "Fantasma", isbn: "F-1", precio: 100, autor: idInventado })
        ).rejects.toThrow(/No existe ningún autor/)

        // comprobación
        expect(await Libro.countDocuments()).toBe(0)
    })
})

describe("agregarItemService - el control de stock del carrito", () => {
    it("agrega un libro y calcula el subtotal y el total", async () => {
        const comprador = await crearComprador()
        const libro = await crearLibro({ precio: 1500, stock: 10 })

        const carrito = await agregarItemService(comprador._id, {libro: libro._id, cantidad: 2})

        expect(carrito.items).toHaveLength(1)
        expect(carrito.items[0].subtotal).toBe(3000)
        expect(carrito.unidades).toBe(2)
        expect(carrito.total).toBe(3000)
    })
})