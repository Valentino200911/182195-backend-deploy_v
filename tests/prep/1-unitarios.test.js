// =====================================================================
//  NIVEL 1 · TESTS UNITARIOS
//
//  Un test unitario prueba UNA función sola, sin base de datos, sin
//  servidor y sin internet. Es el más rápido y el más fácil de leer.
//
//  Fijate que en este archivo no hay ningún await de Mongo: por eso
//  corre en milisegundos.
//
//  VOCABULARIO (es casi todo lo que hay que saber de Jest):
//    describe(...)  agrupa tests. Es solo para ordenar la salida.
//    it(...)        un test. Se lee "it should...": "debería..."
//    expect(x)      lo que obtuve
//    .toBe(y)       ¿es exactamente y?            (===, para números/strings)
//    .toEqual(y)    ¿tiene el mismo contenido?    (para objetos y arrays)
//    .not           invierte: expect(a).not.toBe(b)
//    .toThrow()     ¿esta función lanza un error?
// =====================================================================

import { nombreUnico } from "../../src/services/storage/nombreUnico.js"
import { ErrorApp } from "../../src/utils/ErrorApp.js"
import Libro from "../../src/models/libro.js"

describe("nombreUnico", () => {

    it("conserva la extensión del archivo original", () => {
        const nombre = nombreUnico("mi-tapa.PNG")

        // .toMatch recibe una expresión regular: "termina en .png"
        expect(nombre).toMatch(/\.png$/)
    })

    it("nunca devuelve dos veces el mismo nombre", () => {
        // ⭐ ESTE es el test que importa de verdad: si fallara, al subir dos
        //    archivos el segundo PISARÍA al primero y perderíamos una imagen.
        const nombres = new Set()

        for (let i = 0; i < 500; i++) {
            nombres.add(nombreUnico("tapa.jpg"))
        }

        // un Set no guarda repetidos: si hay 500, no hubo ninguno repetido
        expect(nombres.size).toBe(500)
    })

    it("no deja pasar el nombre que mandó el cliente", () => {
        // Alguien podría mandar un archivo llamado "../../src/index.js"
        const nombre = nombreUnico("../../src/index.js")

        expect(nombre).not.toContain("..")
        expect(nombre).not.toContain("/")
    })

    it("sin nombre, inventa uno con extensión .jpg", () => {
        expect(nombreUnico()).toMatch(/\.jpg$/)
    })
})

describe("ErrorApp", () => {

    it("guarda el mensaje y el status que le pasamos", () => {
        const error = new ErrorApp("No hay stock", 409)

        expect(error.message).toBe("No hay stock")
        expect(error.status).toBe(409)

        // el name es lo que mira manejarErrores para saber que es NUESTRO error
        expect(error.name).toBe("ErrorApp")
    })

    it("sigue siendo un Error de verdad", () => {
        // Si no heredara de Error, el throw/catch de Express no lo trataría igual
        expect(new ErrorApp("algo", 400)).toBeInstanceOf(Error)
    })
})

// ─────────────────────────────────────────────────────────────
//  TESTS DE MODELO
//
//  libro.validate() corre TODAS las validaciones del schema sin tocar la
//  base de datos. Es la forma de testear un modelo sin Mongo prendido.
//
//  Devuelve una promesa: se cumple si está todo bien, y se rechaza con el
//  ValidationError si algo falla. El truco de .catch(e => e) convierte ese
//  rechazo en un valor normal, así lo podemos mirar con calma.
//
//  ⚠️ unique NO se prueba así: unique no es una validación de Mongoose,
//     es un índice de MongoDB. Para probarlo hace falta la base → nivel 2.
// ─────────────────────────────────────────────────────────────
describe("el modelo Libro valida antes de llegar a la base", () => {

    it("un libro sin título no es válido", async () => {
        const libro = new Libro({ isbn: "123", precio: 100 })

        const error = await libro.validate().catch((e) => e)

        // errors está indexado por el nombre del campo
        expect(error.errors.titulo).toBeDefined()
        expect(error.errors.titulo.message).toMatch(/obligatorio/i)
    })

    it("un precio negativo no es válido", async () => {
        const libro = new Libro({ titulo: "Algo", isbn: "123", precio: -50 })

        const error = await libro.validate().catch((e) => e)

        expect(error.errors.precio).toBeDefined()
    })

    it("un género que no está en la lista no es válido", async () => {
        const libro = new Libro({ titulo: "Algo", isbn: "123", precio: 100, genero: "manual" })

        const error = await libro.validate().catch((e) => e)

        expect(error.errors.genero).toBeDefined()
    })

    it("un libro completo es válido", async () => {
        const libro = new Libro({ titulo: "Rayuela", isbn: "978-1", precio: 15000, stock: 3 })

        // si la promesa se cumple, el test pasa. Si se rechaza, Jest lo marca rojo solo
        await expect(libro.validate()).resolves.toBeUndefined()
    })

    it("stock arranca en 0 y disponible en true sin que nadie los mande", () => {
        const libro = new Libro({ titulo: "Rayuela", isbn: "978-2", precio: 100 })

        // Los default del schema se aplican al construir el documento,
        // no al guardarlo: se pueden ver acá mismo, sin await.
        expect(libro.stock).toBe(0)
        expect(libro.disponible).toBe(true)
        expect(libro.imagen).toBeNull()
    })

    it("el título se guarda en minúsculas (lo hace el schema, no nosotros)", () => {
        const libro = new Libro({ titulo: "  RAYUELA  ", isbn: "978-3", precio: 100 })

        // trim + lowercase son setters: actúan al asignar el valor
        expect(libro.titulo).toBe("rayuela")
    })
})
