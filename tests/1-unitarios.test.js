import { nombreUnico } from "../src/services/storage/nombreUnico.js"
import { ErrorApp } from "../src/utils/ErrorApp.js"
import Libro from "../src/models/libro.js"

describe("nombreUnico", () => {
    it("converva la extension del archivo original", () => {
        const nombre = nombreUnico("mi-tapa.png")

        expect(nombre).toMatch(/\.png$/)
    })

    it("nunca devuelve dos veces el mismo nombre", () => {
        // el set es parecido a un array, pero no guarda repetidos
        const nombres = new Set()

        for(let i = 0; i < 500; i++){
            nombres.add(nombreUnico("tapa.jpg"))
        }
        expect(nombres.size).toBe(500)
    })
})

describe("ErrorApp", () => {
    it("guarda el mensaje y el estatus que le pasamos", () => {
        const error = new ErrorApp("No hay stock", 409)

        expect(error.message).toBe("No hay stock")
        expect(error.status).toBe(409)

        expect(error.name).toBe("ErrorApp")
    })
    it("sigue siendo un Error de verdad", () => {
        // toBeInstanceOf revisa si un objeto pertenece a una clase
        expect(new ErrorApp("algo", 400)).toBeInstanceOf(Error)
    })
})

// Test de modelo
describe("el modelo libro valida antes de llegar a la base", () => {
    it("Un libro sin titulo no es válido", async () => {
        const libro = new Libro({ isbn: "123", precio: 100 })

        const error = await libro.validate().catch((error) => error)
        // los errores están indexados por el nombre del campo
        expect(error.errors.titulo).toBeDefined()
        expect(error.errors.titulo.message).toMatch(/obligatorio/i)
    })

    it("el título se guarda en minusculas (lo hace el schema, no nosotros)", () => {
        const libro = new Libro({titulo: " RAYUELA ", isbn: "978-3", precio: 100})
        expect(libro.titulo).toBe("rayuela")
    })
})