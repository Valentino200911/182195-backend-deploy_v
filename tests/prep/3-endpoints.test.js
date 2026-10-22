// =====================================================================
//  NIVEL 3 · TESTS DE ENDPOINTS CON SUPERTEST
//
//  Acá se prueba la API de punta a punta: la ruta, los middlewares, el
//  controller, el service, el modelo y el middleware de errores, todo junto.
//
//  ¿Y cómo se levanta el servidor? NO se levanta.
//
//      request(app).get("/api/libros")
//
//  Supertest toma la app, la pone a escuchar en un puerto libre al azar,
//  hace la petición de verdad por HTTP y la apaga. Por eso app.js tenía
//  que exportar la app SIN hacer listen: si no, el puerto 3000 ya estaría
//  ocupado y los tests chocarían con el servidor de desarrollo.
//
//  LO QUE SE PRUEBA ACÁ Y NO EN EL NIVEL 2:
//    · los status codes que realmente salen por la red
//    · la autenticación y los roles (401 / 403)
//    · la forma del JSON que recibe el front
//    · el ORDEN de las rutas y de los middlewares
//    · Multer, que solo existe dentro de una petición HTTP
// =====================================================================

import request from "supertest"
import app from "../../src/app.js"
import Libro from "../../src/models/libro.js"
import {
    conectarBaseDeTest, cerrarBaseDeTest, limpiarBase,
    crearLibro, crearAutor, crearComprador, crearVendedor,
    tokenDe, tokenFalso, tokenVencido,
    imagenesEnLaCarpeta, vaciarCarpetaDeImagenes,
} from "../ayudas.js"

beforeAll(conectarBaseDeTest)
afterAll(cerrarBaseDeTest)

// Además de la base, acá hay que limpiar la carpeta de imágenes: estos tests
// suben archivos de verdad (a uploads-test, no a Supabase).
beforeEach(async () => {
    await limpiarBase()
    vaciarCarpetaDeImagenes()
})

// ═════════════════════════════════════════════════════════════
describe("GET /api/libros · lo público", () => {

    it("responde 200 y un array", async () => {
        await crearLibro({ titulo: "Uno" })
        await crearLibro({ titulo: "Dos" })

        const res = await request(app).get("/api/libros")

        expect(res.status).toBe(200)
        expect(Array.isArray(res.body)).toBe(true)
        expect(res.body).toHaveLength(2)
    })

    it("no hace falta token: el catálogo es público", async () => {
        // sin header Authorization y da 200. Si un día alguien pone
        // verificarToken en esta ruta, este test lo avisa.
        expect((await request(app).get("/api/libros")).status).toBe(200)
    })

    it("sin libros devuelve un array vacío, no un 404", async () => {
        const res = await request(app).get("/api/libros")

        expect(res.status).toBe(200)
        expect(res.body).toEqual([])
    })

    it("el filtro por género filtra", async () => {
        await crearLibro({ titulo: "Novela", genero: "novela" })
        await crearLibro({ titulo: "Poema", genero: "poesia" })

        const res = await request(app).get("/api/libros?genero=poesia")

        expect(res.body).toHaveLength(1)
        expect(res.body[0].titulo).toBe("poema")
    })

    it("el autor viene POPULADO, no como un id suelto", async () => {
        const autora = await crearAutor({ nombre: "Ursula K. Le Guin" })
        await crearLibro({ autor: autora._id })

        const res = await request(app).get("/api/libros")

        // esto es lo que el front necesita para mostrar el nombre sin pedir otra cosa.
        // (va en minúsculas porque el schema de Autor también tiene lowercase: true)
        expect(res.body[0].autor.nombre).toBe("ursula k. le guin")
    })

    it("un id con formato inválido da 400, no 500", async () => {
        const res = await request(app).get("/api/libros/esto-no-es-un-id")

        // CastError traducido por manejarErrores
        expect(res.status).toBe(400)
        expect(res.body.error).toMatch(/formato/i)
    })

    it("una dirección que no existe da 404 con nuestro mensaje", async () => {
        const res = await request(app).get("/api/pizzas")

        expect(res.status).toBe(404)
        expect(res.body.error).toBe("Esa dirección no existe")
    })
})

// ═════════════════════════════════════════════════════════════
describe("POST /api/libros · quién puede y quién no", () => {

    const libroNuevo = { titulo: "Nuevo", isbn: "N-1", precio: 5000, stock: 2 }

    it("sin token → 401", async () => {
        const res = await request(app).post("/api/libros").send(libroNuevo)

        expect(res.status).toBe(401)
    })

    it("con un token firmado por otro → 401", async () => {
        // Alguien que arma un token con su propio secreto. La firma no cierra.
        const vendedora = await crearVendedor()

        const res = await request(app)
            .post("/api/libros")
            .set("Authorization", `Bearer ${tokenFalso(vendedora)}`)
            .send(libroNuevo)

        expect(res.status).toBe(401)
        expect(res.body.error).toMatch(/inválido/i)
    })

    it("con un token vencido → 401 y un mensaje distinto", async () => {
        const vendedora = await crearVendedor()

        const res = await request(app)
            .post("/api/libros")
            .set("Authorization", `Bearer ${tokenVencido(vendedora)}`)
            .send(libroNuevo)

        expect(res.status).toBe(401)
        expect(res.body.error).toMatch(/venció/i)
    })

    it("⭐ con token de compradora → 403 (está identificada, pero no puede)", async () => {
        const compradora = await crearComprador()

        const res = await request(app)
            .post("/api/libros")
            .set("Authorization", `Bearer ${tokenDe(compradora)}`)
            .send(libroNuevo)

        // 401 = "no sé quién sos" · 403 = "sé quién sos y no te alcanza"
        expect(res.status).toBe(403)
    })

    it("con token de vendedora → 201 y el libro queda en la base", async () => {
        const vendedora = await crearVendedor()

        const res = await request(app)
            .post("/api/libros")
            .set("Authorization", `Bearer ${tokenDe(vendedora)}`)
            .send(libroNuevo)

        expect(res.status).toBe(201)
        expect(res.body._id).toBeDefined()
        expect(await Libro.countDocuments()).toBe(1)
    })

    it("sin título → 400 con el detalle de qué falta", async () => {
        const vendedora = await crearVendedor()

        const res = await request(app)
            .post("/api/libros")
            .set("Authorization", `Bearer ${tokenDe(vendedora)}`)
            .send({ isbn: "SIN-TITULO", precio: 100 })

        expect(res.status).toBe(400)
        // manejarErrores arma "detalles" con los mensajes del schema
        expect(res.body.detalles.join(" ")).toMatch(/titulo|título/i)

        // ⭐ y no se guardó nada
        expect(await Libro.countDocuments()).toBe(0)
    })

    it("⚠️ el orden de los middlewares: la compradora recibe 403 ANTES de subir nada", async () => {
        // soloStaff va antes que Multer a propósito. Si estuviera después,
        // el servidor recibiría los 5 MB de alguien que no puede subirlos.
        const compradora = await crearComprador()

        const res = await request(app)
            .post("/api/libros")
            .set("Authorization", `Bearer ${tokenDe(compradora)}`)
            .field("titulo", "No deberia entrar")
            .field("isbn", "X-1")
            .field("precio", "100")
            .attach("imagen", Buffer.from("fingimos-una-imagen"), "tapa.png")

        expect(res.status).toBe(403)
        expect(await Libro.countDocuments()).toBe(0)
    })
})

// ═════════════════════════════════════════════════════════════
//  MULTER · solo se puede testear por HTTP: no existe fuera de una petición
// ═════════════════════════════════════════════════════════════
describe("POST /api/libros con imagen · Multer", () => {

    // .attach() de Supertest arma el multipart/form-data por nosotros, igual
    // que Postman o el navegador. Un Buffer alcanza: no hace falta un archivo
    // de verdad en el disco.
    const unPng = Buffer.from("no-es-un-png-real-pero-alcanza")

    it("sube la tapa y guarda la URL en el libro", async () => {
        const vendedora = await crearVendedor()

        const res = await request(app)
            .post("/api/libros")
            .set("Authorization", `Bearer ${tokenDe(vendedora)}`)
            .field("titulo", "Con tapa")
            .field("isbn", "CT-1")
            .field("precio", "9000")
            .attach("imagen", unPng, "tapa.png")

        expect(res.status).toBe(201)
        expect(res.body.imagen).toMatch(/^http/)
        expect(res.body.imagen).toMatch(/\.png$/)
    })

    it("⚠️ con form-data todo llega como TEXTO, y el schema lo convierte", async () => {
        const vendedora = await crearVendedor()

        const res = await request(app)
            .post("/api/libros")
            .set("Authorization", `Bearer ${tokenDe(vendedora)}`)
            .field("titulo", "Precio de texto")
            .field("isbn", "PT-1")
            .field("precio", "25000")       // ← un STRING
            .attach("imagen", unPng, "tapa.png")

        // y sale un número, porque el schema dice Number
        expect(res.body.precio).toBe(25000)
        expect(typeof res.body.precio).toBe("number")
    })

    it("un PDF → 400 (lo frena el fileFilter)", async () => {
        const vendedora = await crearVendedor()

        const res = await request(app)
            .post("/api/libros")
            .set("Authorization", `Bearer ${tokenDe(vendedora)}`)
            .field("titulo", "Con pdf")
            .field("isbn", "PDF-1")
            .field("precio", "100")
            .attach("imagen", Buffer.from("%PDF-1.4 cualquier cosa"), {
                filename: "cosa.pdf",
                contentType: "application/pdf",
            })

        expect(res.status).toBe(400)
        expect(res.body.error).toMatch(/Solo se permiten imágenes/)

        // ⭐ y el libro NO se creó: el filtro cortó antes del controller
        expect(await Libro.countDocuments()).toBe(0)
    })

    it("más de 4 MB → 400 (lo frena limits.fileSize)", async () => {
        const vendedora = await crearVendedor()
        const pesada = Buffer.alloc(5 * 1024 * 1024, 1)   // 5 MB de unos

        const res = await request(app)
            .post("/api/libros")
            .set("Authorization", `Bearer ${tokenDe(vendedora)}`)
            .field("titulo", "Pesada")
            .field("isbn", "PESADA-1")
            .field("precio", "100")
            .attach("imagen", pesada, { filename: "pesada.png", contentType: "image/png" })

        expect(res.status).toBe(400)
        expect(res.body.error).toMatch(/4 MB/)
    })

    it("el campo mal nombrado → 400 y el mensaje dice cómo tiene que llamarse", async () => {
        const vendedora = await crearVendedor()

        const res = await request(app)
            .post("/api/libros")
            .set("Authorization", `Bearer ${tokenDe(vendedora)}`)
            .field("titulo", "Campo mal")
            .field("isbn", "CM-1")
            .field("precio", "100")
            .attach("foto", unPng, "tapa.png")      // ← "foto", no "imagen"

        expect(res.status).toBe(400)
        expect(res.body.error).toMatch(/"imagen"/)
    })

    it("⭐ si el ISBN está repetido, la imagen subida se borra (compensación)", async () => {
        const vendedora = await crearVendedor()
        await crearLibro({ isbn: "YA-EXISTE" })

        const res = await request(app)
            .post("/api/libros")
            .set("Authorization", `Bearer ${tokenDe(vendedora)}`)
            .field("titulo", "Repetido")
            .field("isbn", "YA-EXISTE")
            .field("precio", "100")
            .attach("imagen", unPng, "tapa.png")

        expect(res.status).toBe(409)

        // ⭐ la imagen que se subió antes de fallar ya no está en la carpeta.
        //    Si no se borrara, cada intento fallido dejaría un archivo
        //    huérfano para siempre. La carpeta se vacía en el beforeEach,
        //    así que acá lo único que puede haber es lo que dejó este test.
        expect(imagenesEnLaCarpeta()).toHaveLength(0)
    })
})

// ═════════════════════════════════════════════════════════════
//  EL TEST QUE CUIDA EL ORDEN DE LAS RUTAS
// ═════════════════════════════════════════════════════════════
describe("GET /api/pedidos/todos · el orden de las rutas importa", () => {

    it("⭐ /todos es del staff y NO se confunde con /:id", async () => {
        // En pedidoRoutes, /todos está declarado ANTES de /:id.
        // Si alguien los da vuelta, Express toma "todos" como un id y esta
        // ruta deja de existir: la vendedora recibiría un 403 (no es su
        // pedido) en vez de la lista. Este test lo agarra en el acto.
        const vendedora = await crearVendedor()

        const res = await request(app)
            .get("/api/pedidos/todos")
            .set("Authorization", `Bearer ${tokenDe(vendedora)}`)

        expect(res.status).toBe(200)
        expect(Array.isArray(res.body)).toBe(true)
    })

    it("una compradora no puede ver los pedidos de todos → 403", async () => {
        const compradora = await crearComprador()

        const res = await request(app)
            .get("/api/pedidos/todos")
            .set("Authorization", `Bearer ${tokenDe(compradora)}`)

        expect(res.status).toBe(403)
    })
})

// ═════════════════════════════════════════════════════════════
//  EL FLUJO COMPLETO, COMO LO HACE EL FRONT
// ═════════════════════════════════════════════════════════════
describe("el recorrido completo: registro → carrito → pedido", () => {

    it("una persona se registra, compra y ve su pedido", async () => {
        // 1 · hay un libro en el catálogo
        const vendedora = await crearVendedor()
        const libro = await crearLibro({ titulo: "Rayuela", precio: 12000, stock: 3 })

        // 2 · se registra (este sí pasa por el endpoint: queremos probar el login)
        const registro = await request(app).post("/api/auth/registro").send({
            nombre: "Ana", apellido: "Pérez",
            email: "ana@mail.com", password: "ana12345",
        })

        expect(registro.status).toBe(201)
        const token = registro.body.token
        expect(token).toBeDefined()

        // ⭐ y la contraseña NO viene en la respuesta
        expect(registro.body.usuario.password).toBeUndefined()

        // 3 · agrega el libro al carrito
        const carrito = await request(app)
            .post("/api/carrito")
            .set("Authorization", `Bearer ${token}`)
            .send({ libro: libro._id, cantidad: 2 })

        expect(carrito.status).toBe(200)
        expect(carrito.body.total).toBe(24000)

        // 4 · confirma la compra
        const pedido = await request(app)
            .post("/api/pedidos")
            .set("Authorization", `Bearer ${token}`)

        expect(pedido.status).toBe(201)
        expect(pedido.body.total).toBe(24000)
        expect(pedido.body.estado).toBe("pendiente")

        // 5 · el stock bajó
        expect((await Libro.findById(libro._id)).stock).toBe(1)

        // 6 · lo ve en su lista
        const mis = await request(app)
            .get("/api/pedidos")
            .set("Authorization", `Bearer ${token}`)

        expect(mis.body).toHaveLength(1)

        // 7 · y la vendedora lo ve en la lista de todos, con el nombre
        const todos = await request(app)
            .get("/api/pedidos/todos")
            .set("Authorization", `Bearer ${tokenDe(vendedora)}`)

        expect(todos.body).toHaveLength(1)
        expect(todos.body[0].usuario.nombre).toBe("Ana")
    })
})
