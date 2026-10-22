// =====================================================================
//  clase 24 · LAS AYUDAS DE LOS TESTS
//
//  Nada de esto es magia de Jest: son funciones nuestras, que existen
//  para que cada test se lea en 4 líneas en vez de 40.
//
//  La regla que seguimos: un test tiene que decir QUÉ se prueba.
//  Todo el "preparar el escenario" se esconde acá.
// =====================================================================

import mongoose from "mongoose"
import jwt from "jsonwebtoken"
import fs from "fs"
import path from "path"
import { MONGO_URI, JWT_SECRET, CARPETA_IMAGENES } from "../src/utils/config.js"
import Autor from "../src/models/autor.js"
import Libro from "../src/models/libro.js"
import Usuario from "../src/models/usuario.js"
import Carrito from "../src/models/carrito.js"
import Pedido from "../src/models/pedido.js"

// ─────────────────────────────────────────────────────────────
//  LA RED DE SEGURIDAD
//
//  Si alguien se confunde y los tests apuntan a la base de la cursada,
//  el primer limpiarBase() se la borra. Esta función no deja que eso pase.
// ─────────────────────────────────────────────────────────────
const nombreDeLaBase = () => MONGO_URI.split("/").pop().split("?")[0]

export const conectarBaseDeTest = async () => {
    const nombre = nombreDeLaBase()

    if (!nombre.endsWith("_test")) {
        throw new Error(
            `🛑 Los tests NO corren contra "${nombre}". ` +
            `La base de los tests tiene que terminar en "_test" (mirá tests/setup.js)`
        )
    }

    await mongoose.connect(MONGO_URI)
}

export const cerrarBaseDeTest = async () => {
    // ⚠️ Si no se cierra, Jest termina los tests pero el proceso queda colgado
    //    y aparece el famoso "Jest did not exit one second after...".
    await mongoose.connection.close()
}

// Se vacía antes de CADA test. Así un test no puede dejarle datos al
// siguiente: cada uno arranca de cero y el orden en que corren no importa.
export const limpiarBase = async () => {
    await Promise.all([
        Pedido.deleteMany({}),
        Carrito.deleteMany({}),
        Libro.deleteMany({}),
        Autor.deleteMany({}),
        Usuario.deleteMany({}),
    ])
}

// ─────────────────────────────────────────────────────────────
//  LAS FÁBRICAS
//
//  Cada una crea algo con valores razonables y deja que el test cambie
//  SOLO lo que al test le importa:
//
//      await crearLibro({ stock: 0 })    ← "un libro sin stock", y nada más
//
//  Si mañana el modelo pide un campo nuevo, se agrega acá una vez y no
//  en los treinta tests.
// ─────────────────────────────────────────────────────────────

let contador = 0
const unico = () => `${Date.now()}-${++contador}`

export const crearAutor = (datos = {}) =>
    Autor.create({ nombre: "Autora de prueba", nacionalidad: "argentina", ...datos })

export const crearLibro = (datos = {}) =>
    Libro.create({
        titulo: "Libro de prueba",
        isbn: `ISBN-${unico()}`,
        precio: 1000,
        stock: 5,
        ...datos,
    })

// El modelo hashea la contraseña solo, en su hook pre("save"): acá se pasa
// en texto plano y queda guardada hasheada, igual que en el seed.
export const crearUsuario = ({ password = "test1234", ...datos } = {}) =>
    Usuario.create({
        nombre: "Persona",
        apellido: "De Prueba",
        email: `test-${unico()}@mail.com`,
        password,
        rol: "comprador",
        ...datos,
    })

export const crearComprador = (datos = {}) => crearUsuario({ rol: "comprador", ...datos })
export const crearVendedor = (datos = {}) => crearUsuario({ rol: "vendedor", ...datos })

// ─────────────────────────────────────────────────────────────
//  EL TOKEN
//
//  Los tests de endpoints necesitan mandar Authorization: Bearer ...
//  No pasamos por POST /api/auth/login en cada test: sería testear el
//  login treinta veces de paso. Firmamos el token directo, igual que
//  lo hace authService.
// ─────────────────────────────────────────────────────────────
export const tokenDe = (usuario) =>
    jwt.sign({ id: usuario._id, rol: usuario.rol }, JWT_SECRET, { expiresIn: "1h" })

// Un token firmado con OTRO secreto: sirve para probar que el servidor
// rechaza los tokens que no firmó él.
export const tokenFalso = (usuario) =>
    jwt.sign({ id: usuario._id, rol: usuario.rol }, "otro-secreto-cualquiera")

// Un token nuestro pero ya vencido (expiresIn negativo = venció hace un segundo)
export const tokenVencido = (usuario) =>
    jwt.sign({ id: usuario._id, rol: usuario.rol }, JWT_SECRET, { expiresIn: "-1s" })

// ─────────────────────────────────────────────────────────────
//  LA CARPETA DE IMÁGENES DE LOS TESTS
//
//  Los tests de subida escriben archivos de verdad en uploads-test
//  (STORAGE=local, ver tests/setup.js). Hay que barrerla entre tests,
//  igual que la base: si no, un test ve las imágenes del anterior.
// ─────────────────────────────────────────────────────────────
export const imagenesEnLaCarpeta = () => {
    const carpeta = path.resolve(CARPETA_IMAGENES)
    return fs.existsSync(carpeta) ? fs.readdirSync(carpeta) : []
}

export const vaciarCarpetaDeImagenes = () => {
    const carpeta = path.resolve(CARPETA_IMAGENES)
    // force: true -> no se queja si la carpeta no existe todavía
    fs.rmSync(carpeta, { recursive: true, force: true })
}
