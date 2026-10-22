// =====================================================================
//  NIVEL 2 · TESTS DE SERVICES  (acá está el valor de verdad)
//
//  Los services son donde viven las REGLAS DEL NEGOCIO: "no se puede
//  borrar un autor con libros", "no se puede comprar más que el stock",
//  "cancelar devuelve el stock". Eso no lo prueba nadie más.
//
//  Estos tests sí tocan la base de datos, pero NO el servidor HTTP: se
//  llama a la función directamente, como lo haría el controller.
//
//  ⚠️ LA BASE ES OTRA: biblioteca_test. Mirá tests/setup.js
// =====================================================================

import mongoose from "mongoose"
import Libro from "../../src/models/libro.js"
import Autor from "../../src/models/autor.js"
import Pedido from "../../src/models/pedido.js"
import {
    conectarBaseDeTest, cerrarBaseDeTest, limpiarBase,
    crearAutor, crearLibro, crearComprador,
} from "../ayudas.js"

import { eliminarAutorService } from "../../src/services/autorService.js"
import { crearLibroService } from "../../src/services/libroService.js"
import { agregarItemService, obtenerCarritoService } from "../../src/services/carritoService.js"
import {
    crearPedidoService, obtenerMiPedidoService,
    cancelarPedidoService, pagarPedidoService,
} from "../../src/services/pedidoService.js"

// ─────────────────────────────────────────────────────────────
//  LOS CUATRO GANCHOS DE JEST
//
//  beforeAll   una vez, antes de todos los tests del archivo
//  beforeEach  antes de CADA test
//  afterEach   después de cada test
//  afterAll    una vez, al final
//
//  La base se conecta una vez (es caro) y se vacía antes de cada test
//  (es barato). Así cada test arranca de cero y el orden no importa:
//  un test que depende de otro es un test que un día va a fallar solo.
// ─────────────────────────────────────────────────────────────
beforeAll(conectarBaseDeTest)
beforeEach(limpiarBase)
afterAll(cerrarBaseDeTest)

// ═════════════════════════════════════════════════════════════
describe("eliminarAutorService", () => {

    it("borra un autor que no tiene libros", async () => {
        const autor = await crearAutor({ nombre: "Sin Libros" })

        await eliminarAutorService(autor._id)

        // la prueba de verdad no es lo que devolvió la función: es que YA NO ESTÁ
        expect(await Autor.findById(autor._id)).toBeNull()
    })

    it("NO borra un autor que tiene libros, y avisa con 409", async () => {
        const autor = await crearAutor({ nombre: "Con Libros" })
        await crearLibro({ autor: autor._id })

        // ⭐ ASÍ SE TESTEA UN ERROR:
        //    la función se envuelve en otra (() => ...) porque expect necesita
        //    poder llamarla él. Si le pasáramos el resultado, el error
        //    explotaría antes de llegar a expect y el test moriría.
        //    .rejects es para promesas; con una función normal es .toThrow()
        await expect(eliminarAutorService(autor._id)).rejects.toThrow(/No se puede eliminar/)

        // y el autor sigue ahí: el error no dejó nada a medio hacer
        expect(await Autor.findById(autor._id)).not.toBeNull()
    })

    it("el error trae status 409, no 500", async () => {
        const autor = await crearAutor()
        await crearLibro({ autor: autor._id })

        // para mirar el status hay que atrapar el error. .catch(e => e) lo
        // convierte en un valor normal, igual que en los tests de modelo.
        const error = await eliminarAutorService(autor._id).catch((e) => e)

        // 409 = "el pedido está bien escrito, pero el estado del sistema no lo permite"
        expect(error.status).toBe(409)
    })

    it("devuelve null si el autor no existe", async () => {
        const idQueNoExiste = new mongoose.Types.ObjectId()

        expect(await eliminarAutorService(idQueNoExiste)).toBeNull()
    })
})

// ═════════════════════════════════════════════════════════════
describe("crearLibroService", () => {

    it("no deja crear un libro con un autor que no existe", async () => {
        const idInventado = new mongoose.Types.ObjectId()

        await expect(
            crearLibroService({ titulo: "Fantasma", isbn: "F-1", precio: 100, autor: idInventado })
        ).rejects.toThrow(/No existe ningún autor/)

        // ⭐ y lo importante: no quedó un libro suelto en la base
        expect(await Libro.countDocuments()).toBe(0)
    })

    it("traduce el ISBN repetido a un 409 con un mensaje que se entiende", async () => {
        await crearLibro({ isbn: "REPETIDO-1" })

        const error = await crearLibroService(
            { titulo: "Otro", isbn: "REPETIDO-1", precio: 100 }
        ).catch((e) => e)

        expect(error.status).toBe(409)
        expect(error.message).toMatch(/REPETIDO-1/)
    })

    it("un libro sin imagen queda con imagen null", async () => {
        // el segundo parámetro (el archivo) no viene: la tapa es opcional
        const libro = await crearLibroService({ titulo: "Sin tapa", isbn: "ST-1", precio: 100 })

        expect(libro.imagen).toBeNull()
    })
})

// ═════════════════════════════════════════════════════════════
describe("agregarItemService · el control de stock del carrito", () => {

    it("agrega un libro y calcula el subtotal y el total", async () => {
        const comprador = await crearComprador()
        const libro = await crearLibro({ precio: 1500, stock: 10 })

        const carrito = await agregarItemService(comprador._id, { libro: libro._id, cantidad: 2 })

        expect(carrito.items).toHaveLength(1)
        expect(carrito.items[0].subtotal).toBe(3000)
        expect(carrito.unidades).toBe(2)
        expect(carrito.total).toBe(3000)
    })

    it("sumar el mismo libro NO lo duplica: suma la cantidad", async () => {
        const comprador = await crearComprador()
        const libro = await crearLibro({ stock: 10 })

        await agregarItemService(comprador._id, { libro: libro._id, cantidad: 1 })
        const carrito = await agregarItemService(comprador._id, { libro: libro._id, cantidad: 2 })

        expect(carrito.items).toHaveLength(1)
        expect(carrito.items[0].quantity ?? carrito.items[0].cantidad).toBe(3)
    })

    it("no deja poner en el carrito más de lo que hay en stock", async () => {
        const comprador = await crearComprador()
        const libro = await crearLibro({ stock: 3 })

        const error = await agregarItemService(
            comprador._id, { libro: libro._id, cantidad: 4 }
        ).catch((e) => e)

        expect(error.status).toBe(409)
        expect(error.message).toMatch(/Stock insuficiente/)
    })

    it("tampoco si se llega al límite de a poco", async () => {
        // ⭐ Este es el test que un control mal escrito NO pasa: mira la
        //    cantidad que va a quedar, no la que se agrega ahora.
        const comprador = await crearComprador()
        const libro = await crearLibro({ stock: 3 })

        await agregarItemService(comprador._id, { libro: libro._id, cantidad: 2 })

        await expect(
            agregarItemService(comprador._id, { libro: libro._id, cantidad: 2 })
        ).rejects.toThrow(/Stock insuficiente/)
    })

    it("no deja agregar un libro marcado como no disponible", async () => {
        const comprador = await crearComprador()
        const libro = await crearLibro({ stock: 10, disponible: false })

        const error = await agregarItemService(
            comprador._id, { libro: libro._id, cantidad: 1 }
        ).catch((e) => e)

        expect(error.status).toBe(409)
    })

    it("rechaza una cantidad de 0, negativa o con coma", async () => {
        const comprador = await crearComprador()
        const libro = await crearLibro({ stock: 10 })

        for (const cantidad of [0, -3, 1.5]) {
            const error = await agregarItemService(
                comprador._id, { libro: libro._id, cantidad }
            ).catch((e) => e)

            // 400 y no 409: acá lo que está mal es el PEDIDO, no el stock
            expect(error.status).toBe(400)
        }
    })
})

// ═════════════════════════════════════════════════════════════
describe("crearPedidoService · el checkout", () => {

    it("descuenta el stock, congela el precio y vacía el carrito", async () => {
        const comprador = await crearComprador()
        const libro = await crearLibro({ titulo: "Rayuela", precio: 10000, stock: 5 })
        await agregarItemService(comprador._id, { libro: libro._id, cantidad: 2 })

        const pedido = await crearPedidoService(comprador._id.toString())

        // 1 · el total lo calcula el SERVIDOR
        expect(pedido.total).toBe(20000)

        // 2 · ⭐ la línea guarda una FOTO del libro, no una referencia viva
        expect(pedido.items[0].precioUnitario).toBe(10000)
        expect(pedido.items[0].titulo).toBe("rayuela")   // el schema lo pasa a minúsculas

        // 3 · el stock bajó
        expect((await Libro.findById(libro._id)).stock).toBe(3)

        // 4 · el carrito quedó vacío
        expect((await obtenerCarritoService(comprador._id)).items).toHaveLength(0)
    })

    it("⭐ el precio del pedido NO cambia si después cambia el del libro", async () => {
        // Este es EL test que justifica haber copiado el precio en la línea.
        // Una factura no puede cambiar sola.
        const comprador = await crearComprador()
        const libro = await crearLibro({ precio: 10000, stock: 5 })
        await agregarItemService(comprador._id, { libro: libro._id, cantidad: 1 })

        const pedido = await crearPedidoService(comprador._id.toString())

        // el libro aumenta un 50%
        await Libro.updateOne({ _id: libro._id }, { precio: 15000 })

        const guardado = await Pedido.findById(pedido._id)
        expect(guardado.total).toBe(10000)
        expect(guardado.items[0].precioUnitario).toBe(10000)
    })

    it("no deja confirmar un carrito vacío", async () => {
        const comprador = await crearComprador()

        const error = await crearPedidoService(comprador._id.toString()).catch((e) => e)

        // 409: el pedido está bien escrito, lo que no da es el estado del carrito.
        // ⚠️ Este es discutible y está bien que lo sea: 400 también se defiende
        //    ("mandaste una compra sin nada que comprar"). Lo importante es que
        //    el test DEJA ESCRITA la decisión: si mañana alguien la cambia sin
        //    querer, el test se pone rojo y hay que decidir a propósito.
        expect(error.status).toBe(400)
    })

    it("ignora los libros que fueron borrados después de ponerlos en el carrito", async () => {
        const comprador = await crearComprador()
        const queda = await crearLibro({ precio: 1000, stock: 5 })
        const borrado = await crearLibro({ precio: 9999, stock: 5 })

        await agregarItemService(comprador._id, { libro: queda._id, cantidad: 1 })
        await agregarItemService(comprador._id, { libro: borrado._id, cantidad: 1 })

        await Libro.findByIdAndDelete(borrado._id)

        const pedido = await crearPedidoService(comprador._id.toString())

        // populate deja null donde el libro ya no existe: esos ítems se filtran
        expect(pedido.items).toHaveLength(1)
        expect(pedido.total).toBe(1000)
    })

    it("⭐⭐ si falla a mitad de camino, NO deja stock descontado a medias", async () => {
        // EL TEST MÁS IMPORTANTE DEL ARCHIVO.
        //
        // El escenario: la compradora pone dos libros en el carrito cuando hay
        // stock de los dos. Mientras duda, otra persona se lleva el último
        // ejemplar del segundo. Al confirmar, el primero ya se descontó y el
        // segundo falla: si no se devuelve, ese stock queda perdido para
        // siempre y nadie se entera.
        const comprador = await crearComprador()
        const primero = await crearLibro({ titulo: "Primero", precio: 1000, stock: 5 })
        const segundo = await crearLibro({ titulo: "Segundo", precio: 1000, stock: 1 })

        await agregarItemService(comprador._id, { libro: primero._id, cantidad: 2 })
        await agregarItemService(comprador._id, { libro: segundo._id, cantidad: 1 })

        // ⬅️ otra persona compra el último ejemplar del segundo libro
        await Libro.updateOne({ _id: segundo._id }, { stock: 0 })

        await expect(crearPedidoService(comprador._id.toString()))
            .rejects.toThrow(/No hay stock suficiente/)

        // ⭐ el stock del PRIMERO volvió a 5: la compensación del catch funcionó
        expect((await Libro.findById(primero._id)).stock).toBe(5)

        // y no se creó ningún pedido a medio hacer
        expect(await Pedido.countDocuments()).toBe(0)
    })
})

// ═════════════════════════════════════════════════════════════
describe("los pedidos son de quien los hizo (BOLA / IDOR)", () => {

    // una ayuda local: deja un pedido listo y devuelve con qué se armó
    const pedidoListo = async () => {
        const comprador = await crearComprador()
        const libro = await crearLibro({ precio: 1000, stock: 5 })
        await agregarItemService(comprador._id, { libro: libro._id, cantidad: 2 })
        const pedido = await crearPedidoService(comprador._id.toString())
        return { comprador, libro, pedido }
    }

    it("el dueño puede ver su pedido", async () => {
        const { comprador, pedido } = await pedidoListo()

        const visto = await obtenerMiPedidoService(pedido._id, comprador._id.toString())

        expect(visto._id.toString()).toBe(pedido._id.toString())
    })

    it("⭐ otra persona recibe 403, NO 404", async () => {
        const { pedido } = await pedidoListo()
        const intrusa = await crearComprador({ email: "intrusa@mail.com" })

        const error = await obtenerMiPedidoService(
            pedido._id, intrusa._id.toString()
        ).catch((e) => e)

        // 403 "existe pero no es tuyo" y no 404 "no existe".
        // Son dos cosas distintas y el usuario tiene que poder distinguirlas.
        expect(error.status).toBe(403)
    })

    it("un pedido que no existe sí da 404", async () => {
        const comprador = await crearComprador()
        const idInventado = new mongoose.Types.ObjectId()

        const error = await obtenerMiPedidoService(
            idInventado, comprador._id.toString()
        ).catch((e) => e)

        expect(error.status).toBe(404)
    })

    it("tampoco se puede cancelar el pedido de otro", async () => {
        const { pedido } = await pedidoListo()
        const intrusa = await crearComprador({ email: "intrusa2@mail.com" })

        await expect(cancelarPedidoService(pedido._id, intrusa._id.toString()))
            .rejects.toThrow(/no es tuyo/)

        // y el pedido sigue pendiente: el intento no cambió nada
        expect((await Pedido.findById(pedido._id)).estado).toBe("pendiente")
    })
})

// ═════════════════════════════════════════════════════════════
describe("los estados del pedido", () => {

    const pedidoListo = async () => {
        const comprador = await crearComprador()
        const libro = await crearLibro({ precio: 1000, stock: 5 })
        await agregarItemService(comprador._id, { libro: libro._id, cantidad: 2 })
        const pedido = await crearPedidoService(comprador._id.toString())
        return { comprador, libro, pedido }
    }

    it("pendiente → pagado", async () => {
        const { comprador, pedido } = await pedidoListo()

        const pagado = await pagarPedidoService(pedido._id, comprador._id.toString())

        expect(pagado.estado).toBe("pagado")
    })

    it("no se puede pagar dos veces", async () => {
        const { comprador, pedido } = await pedidoListo()
        await pagarPedidoService(pedido._id, comprador._id.toString())

        const error = await pagarPedidoService(
            pedido._id, comprador._id.toString()
        ).catch((e) => e)

        expect(error.status).toBe(409)
        expect(error.message).toMatch(/pagado/)
    })

    it("⭐ cancelar DEVUELVE el stock", async () => {
        const { comprador, libro, pedido } = await pedidoListo()

        // quedó en 3: había 5 y se compraron 2
        expect((await Libro.findById(libro._id)).stock).toBe(3)

        await cancelarPedidoService(pedido._id, comprador._id.toString())

        // y ahora volvió a 5
        expect((await Libro.findById(libro._id)).stock).toBe(5)
    })

    it("no se puede cancelar un pedido ya pagado", async () => {
        const { comprador, libro, pedido } = await pedidoListo()
        await pagarPedidoService(pedido._id, comprador._id.toString())

        await expect(cancelarPedidoService(pedido._id, comprador._id.toString()))
            .rejects.toThrow(/pagado/)

        // ⭐ y el stock NO se devolvió: el error cortó antes de tocarlo.
        //    Si esto fallara, cada intento de cancelar inventaría stock.
        expect((await Libro.findById(libro._id)).stock).toBe(3)
    })
})
