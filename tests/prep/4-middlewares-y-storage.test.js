// =====================================================================
//  EXTRA · DOS COSAS MÁS QUE SE PUEDEN TESTEAR
//
//  1. Un middleware solo, sin servidor.
//  2. El adaptador de storage, sin internet.
//
//  No son imprescindibles (el nivel 3 ya los cruza de punta a punta),
//  pero muestran algo importante: un middleware es una función común,
//  y se la puede llamar a mano.
// =====================================================================

// ⚠️ describe, it y expect son globales, pero "jest" NO lo es cuando el
//    proyecto usa módulos ESM (import/export): hay que importarlo.
//    Es la única rareza de usar Jest con ESM que nos va a tocar.
import { jest } from "@jest/globals"

import { verificarToken } from "../../src/middleware/verificarToken.js"
import { permitirRoles } from "../../src/middleware/permitirRoles.js"
import { subir, borrar } from "../../src/services/storage/local.js"
import { imagenesEnLaCarpeta, vaciarCarpetaDeImagenes, tokenDe } from "../ayudas.js"

// ═════════════════════════════════════════════════════════════
//  UN MIDDLEWARE ES (req, res, next). Nada más.
//
//  Para testearlo se le pasan un req y un next de juguete. No hace falta
//  un req de Express de verdad: el middleware solo mira req.headers,
//  entonces un objeto con headers alcanza.
//
//  ⭐ ESTE ES EL "DOBLE DE PRUEBA" (test double) más simple que existe:
//     un objeto hecho a mano que se parece lo suficiente.
// ═════════════════════════════════════════════════════════════
describe("verificarToken, solo", () => {

    // jest.fn() es una función espía: no hace nada, pero se acuerda de si la
    // llamaron y con qué. Es la forma de responder "¿llamó a next()?"
    const armarContexto = (authorization) => ({
        req: { headers: authorization ? { authorization } : {} },
        res: {},
        next: jest.fn(),
    })

    it("con un token válido llama a next() y deja req.usuario", () => {
        const usuario = { _id: "507f1f77bcf86cd799439011", rol: "vendedor" }
        const { req, res, next } = armarContexto(`Bearer ${tokenDe(usuario)}`)

        verificarToken(req, res, next)

        expect(next).toHaveBeenCalled()
        expect(req.usuario.rol).toBe("vendedor")
    })

    it("sin header tira un ErrorApp 401 y NO llama a next()", () => {
        const { req, res, next } = armarContexto()

        // el middleware lanza el error; Express 5 lo atrapa y lo manda a
        // manejarErrores. Acá lo atrapamos nosotros.
        const error = (() => { try { verificarToken(req, res, next) } catch (e) { return e } })()

        expect(error.status).toBe(401)
        expect(next).not.toHaveBeenCalled()
    })

    it("con 'Basic xxx' en vez de 'Bearer xxx' también es 401", () => {
        const { req, res, next } = armarContexto("Basic dXN1YXJpbzpjbGF2ZQ==")

        expect(() => verificarToken(req, res, next)).toThrow(/Falta el token/)
    })
})

describe("permitirRoles, solo", () => {

    // ⭐ permitirRoles NO es un middleware: es una FÁBRICA de middlewares.
    //    Se la llama con los roles y devuelve el middleware. Por eso en las
    //    rutas va permitirRoles("admin") con paréntesis, y verificarToken sin.
    it("deja pasar al rol permitido", () => {
        const middleware = permitirRoles("vendedor", "admin")
        const next = jest.fn()

        middleware({ usuario: { rol: "admin" } }, {}, next)

        expect(next).toHaveBeenCalled()
    })

    it("al que no está en la lista le tira 403", () => {
        const middleware = permitirRoles("vendedor", "admin")
        const next = jest.fn()

        const error = (() => {
            try { middleware({ usuario: { rol: "comprador" } }, {}, next) } catch (e) { return e }
        })()

        expect(error.status).toBe(403)
        expect(next).not.toHaveBeenCalled()
    })
})

// ═════════════════════════════════════════════════════════════
//  EL ADAPTADOR DE STORAGE
//
//  Se testea el de DISCO, no el de Supabase.
//
//  ⚠️ NO SE TESTEA SUPABASE, y es a propósito:
//     · el test dependería de internet y de la cuenta de alguien
//     · tardaría segundos en vez de milisegundos
//     · y si fallara, no nos diría nada de NUESTRO código
//     No se testea la biblioteca de otro: se testea lo nuestro.
//
//  Que esto se pueda testear sin tocar nada es exactamente el premio de
//  haber hecho el adaptador en la clase 23.
// ═════════════════════════════════════════════════════════════
describe("el adaptador local (STORAGE=local)", () => {

    beforeEach(vaciarCarpetaDeImagenes)
    afterAll(vaciarCarpetaDeImagenes)

    // un req.file de juguete: el adaptador solo usa estas tres cosas
    const archivoFalso = (nombre = "tapa.png") => ({
        originalname: nombre,
        mimetype: "image/png",
        buffer: Buffer.from("contenido-de-la-imagen"),
    })

    it("subir() escribe el archivo y devuelve una URL que lo apunta", async () => {
        const url = await subir(archivoFalso())

        expect(url).toMatch(/^http/)

        const archivos = imagenesEnLaCarpeta()
        expect(archivos).toHaveLength(1)
        // la URL termina con el nombre del archivo que quedó en disco
        expect(url).toContain(archivos[0])
    })

    it("dos subidas del mismo nombre NO se pisan", async () => {
        await subir(archivoFalso("tapa.png"))
        await subir(archivoFalso("tapa.png"))

        expect(imagenesEnLaCarpeta()).toHaveLength(2)
    })

    it("borrar() lo saca de la carpeta", async () => {
        const url = await subir(archivoFalso())

        await borrar(url)

        expect(imagenesEnLaCarpeta()).toHaveLength(0)
    })

    it("borrar() una URL que ya no existe no explota", async () => {
        // Importa: borrar es "limpieza". Si reventara, un libro no se podría
        // actualizar solo porque su tapa vieja ya no estaba.
        await expect(borrar("http://localhost:3000/uploads-test/no-existe.png"))
            .resolves.not.toThrow()
    })
})
