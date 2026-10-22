// =====================================================================
//  clase 25 · LA DEFINICIÓN DE LA API (OpenAPI 3)
//
//  ¿QUÉ ES ESTO?
//  OpenAPI es un formato estándar para describir una API: qué rutas tiene,
//  qué recibe cada una, qué devuelve y quién puede usarla. "Swagger" son
//  las herramientas que leen ese formato (Swagger UI, el editor, etc).
//
//  ¿Y POR QUÉ NO ESCRIBIMOS EL JSON A MANO?
//  Porque quedaría en un archivo aparte que nadie actualiza. swagger-jsdoc
//  lo ARMA leyendo comentarios que viven al lado de cada ruta: si se cambia
//  la ruta, el comentario está tres líneas más arriba y se ve.
//
//  Este archivo tiene las dos partes que NO van por ruta:
//    1. la portada (info, servers, tags)
//    2. los COMPONENTES reutilizables (schemas, seguridad, respuestas)
//       ⭐ esto es lo que hace que documentar cada ruta sean 12 líneas
//          y no 60.
// =====================================================================

import swaggerJsdoc from "swagger-jsdoc"
import { PORT } from "../utils/config.js"

const definicion = {
    // la versión del ESTÁNDAR, no la de nuestra API
    openapi: "3.0.3",

    // ─────────────────────────────────────────────────────────────
    //  1 · LA PORTADA
    // ─────────────────────────────────────────────────────────────
    info: {
        title: "API Biblioteca",
        version: "1.0.0",
        description:
            "API de la cursada: catálogo de libros, autores, carrito y pedidos.\n\n" +
            "**Para probar las rutas protegidas:** entrá a `POST /api/auth/login`, " +
            "copiá el `token` de la respuesta, apretá el botón **Authorize** 🔓 de " +
            "arriba a la derecha y pegalo. Queda puesto para todas las rutas.",
        contact: { name: "Cátedra de Backend · UTN" },
    },

    // Dónde está la API. Swagger UI usa el primero para el botón "Try it out".
    servers: [
        { url: `http://localhost:${PORT}`, description: "Desarrollo (tu máquina)" },
        // { url: "https://biblioteca.onrender.com", description: "Producción" },
    ],

    // ─────────────────────────────────────────────────────────────
    //  2 · LOS TAGS
    //
    //  Agrupan las rutas en la pantalla de Swagger UI. El ORDEN de esta
    //  lista es el orden en que aparecen: conviene ponerlos como se usan,
    //  no alfabéticamente.
    // ─────────────────────────────────────────────────────────────
    tags: [
        { name: "Auth", description: "Registro, login y perfil" },
        { name: "Libros", description: "El catálogo. Lo público se lee sin token" },
        { name: "Autores", description: "Administración de autores (staff)" },
        { name: "Carrito", description: "El carrito de la persona logueada (comprador)" },
        { name: "Pedidos", description: "Checkout y estado de los pedidos" },
        { name: "Usuarios", description: "Administración de usuarios (admin)" },
    ],

    components: {
        // ─────────────────────────────────────────────────────────
        //  3 · LA SEGURIDAD
        //
        //  Esto es lo que hace aparecer el botón "Authorize" 🔓.
        //  Después, cada ruta protegida dice   security: [{ bearerAuth: [] }]
        //  y Swagger UI le manda el header Authorization: Bearer <token>.
        // ─────────────────────────────────────────────────────────
        securitySchemes: {
            bearerAuth: {
                type: "http",
                scheme: "bearer",
                bearerFormat: "JWT",
                description: "Pegá acá el token que devuelve POST /api/auth/login",
            },
        },

        // ─────────────────────────────────────────────────────────
        //  4 · LOS SCHEMAS
        //
        //  La forma de los datos. Son el espejo de nuestros modelos de
        //  Mongoose, pero contados desde el lado del CLIENTE.
        //
        //  ⚠️ Fijate que la password NO aparece en ningún schema de
        //     respuesta: la documentación también es una promesa de lo
        //     que NO mandamos.
        // ─────────────────────────────────────────────────────────
        schemas: {
            // ── errores ────────────────────────────────────────────
            Error: {
                type: "object",
                properties: {
                    error: { type: "string", example: "Ese id no tiene un formato válido" },
                },
            },
            ErrorDeValidacion: {
                type: "object",
                properties: {
                    error: { type: "string", example: "Los datos no son válidos" },
                    detalles: {
                        type: "array",
                        items: { type: "string" },
                        example: ["el titulo es obligatorio", "El precio es obligatorio"],
                    },
                },
            },

            // ── autor ──────────────────────────────────────────────
            Autor: {
                type: "object",
                properties: {
                    _id: { type: "string", example: "68f1a2b3c4d5e6f701234567" },
                    nombre: { type: "string", example: "julio cortázar" },
                    nacionalidad: { type: "string", example: "argentina" },
                    nacimiento: { type: "string", format: "date-time", nullable: true },
                    // ⚠️ __v es el "version key" de Mongoose: lo agrega él, no
                    //    nosotros. Lo documentamos porque VIAJA: la doc tiene que
                    //    decir lo que la API manda de verdad, no lo que nos gustaría.
                    //    (Se puede esconder con toJSON: { versionKey: false } en el schema.)
                    __v: { type: "integer", example: 0 },
                },
            },
            AutorNuevo: {
                type: "object",
                required: ["nombre"],
                properties: {
                    nombre: { type: "string", minLength: 3, maxLength: 60, example: "Julio Cortázar" },
                    nacionalidad: { type: "string", example: "argentina" },
                },
            },

            // ── libro ──────────────────────────────────────────────
            Libro: {
                type: "object",
                properties: {
                    _id: { type: "string", example: "68f1a2b3c4d5e6f701234568" },
                    titulo: { type: "string", example: "rayuela" },
                    isbn: { type: "string", example: "978-84-376-0494-7" },
                    genero: { type: "string", enum: ["novela", "cuento", "poesia"], example: "novela" },
                    anio: { type: "integer", example: 1963 },
                    precio: { type: "number", example: 15000 },
                    stock: { type: "integer", example: 4 },
                    disponible: { type: "boolean", example: true },
                    // ⭐ el autor viene POPULADO: no es un id, es un objeto.
                    //    Documentarlo así es lo que le dice al front qué esperar.
                    autor: { $ref: "#/components/schemas/Autor" },
                    imagen: {
                        type: "string",
                        nullable: true,
                        example: "http://localhost:3000/uploads/1760000000-ab12cd.png",
                        description: "URL de la tapa. null si el libro no tiene imagen",
                    },
                    creado: { type: "string", format: "date-time", description: "Lo pone el default del schema" },
                    // ⚠️ __v es el "version key" de Mongoose: lo agrega él, no
                    //    nosotros. Lo documentamos porque VIAJA: la doc tiene que
                    //    decir lo que la API manda de verdad, no lo que nos gustaría.
                    //    (Se puede esconder con toJSON: { versionKey: false } en el schema.)
                    __v: { type: "integer", example: 0 },
                },
            },
            LibroNuevo: {
                type: "object",
                required: ["titulo", "isbn", "precio"],
                properties: {
                    titulo: { type: "string", minLength: 2, example: "Rayuela" },
                    isbn: { type: "string", example: "978-84-376-0494-7" },
                    genero: { type: "string", enum: ["novela", "cuento", "poesia"], default: "novela" },
                    anio: { type: "integer", minimum: 1400, maximum: 2027, example: 1963 },
                    precio: { type: "number", minimum: 0, example: 15000 },
                    stock: { type: "integer", minimum: 0, default: 0, example: 4 },
                    autor: {
                        type: "string",
                        nullable: true,
                        description: "El _id de un autor que ya exista. Es opcional",
                        example: "68f1a2b3c4d5e6f701234567",
                    },
                },
            },

            // ── usuario y auth ─────────────────────────────────────
            Usuario: {
                type: "object",
                properties: {
                    _id: { type: "string", example: "68f1a2b3c4d5e6f70123456a" },
                    nombre: { type: "string", example: "Carla" },
                    apellido: { type: "string", example: "Ruiz" },
                    email: { type: "string", format: "email", example: "carla.ruiz@mail.com" },
                    rol: { type: "string", enum: ["comprador", "vendedor", "admin"], example: "vendedor" },
                    createdAt: { type: "string", format: "date-time" },
                    updatedAt: { type: "string", format: "date-time" },
                    // ⚠️ __v es el "version key" de Mongoose: lo agrega él, no
                    //    nosotros. Lo documentamos porque VIAJA: la doc tiene que
                    //    decir lo que la API manda de verdad, no lo que nos gustaría.
                    //    (Se puede esconder con toJSON: { versionKey: false } en el schema.)
                    __v: { type: "integer", example: 0 },
                },
            },
            Registro: {
                type: "object",
                required: ["nombre", "apellido", "email", "password"],
                properties: {
                    nombre: { type: "string", minLength: 3, example: "Ana" },
                    apellido: { type: "string", minLength: 3, example: "Pérez" },
                    email: { type: "string", format: "email", example: "ana@mail.com" },
                    password: { type: "string", format: "password", minLength: 6, example: "ana12345" },
                },
            },
            Login: {
                type: "object",
                required: ["email", "password"],
                properties: {
                    email: { type: "string", format: "email", example: "carla.ruiz@mail.com" },
                    password: { type: "string", format: "password", example: "carla1234" },
                },
            },
            Sesion: {
                type: "object",
                properties: {
                    usuario: { $ref: "#/components/schemas/Usuario" },
                    token: {
                        type: "string",
                        description: "El JWT. Va en el header Authorization: Bearer <token>",
                        example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ii4uLiJ9.firma",
                    },
                },
            },

            // ── carrito ────────────────────────────────────────────
            ItemDeCarrito: {
                type: "object",
                properties: {
                    libro: { $ref: "#/components/schemas/Libro" },
                    cantidad: { type: "integer", example: 2 },
                    subtotal: { type: "number", example: 30000, description: "Lo calcula el servidor" },
                },
            },
            Carrito: {
                type: "object",
                properties: {
                    _id: { type: "string", example: "68f1a2b3c4d5e6f70123456b" },
                    usuario: { type: "string", example: "68f1a2b3c4d5e6f70123456a" },
                    items: { type: "array", items: { $ref: "#/components/schemas/ItemDeCarrito" } },
                    unidades: { type: "integer", example: 3 },
                    total: { type: "number", example: 45000 },
                    actualizado: { type: "string", format: "date-time" },
                },
            },
            ItemNuevoDeCarrito: {
                type: "object",
                required: ["libro"],
                properties: {
                    libro: { type: "string", description: "El _id del libro", example: "68f1a2b3c4d5e6f701234568" },
                    cantidad: { type: "integer", minimum: 1, default: 1, example: 2 },
                },
            },

            // ── pedido ─────────────────────────────────────────────
            LineaDePedido: {
                type: "object",
                description:
                    "Una línea del pedido. ⭐ titulo y precioUnitario son una FOTO del " +
                    "libro al momento de comprar: si el libro cambia de precio después, " +
                    "el pedido sigue diciendo lo que se pagó.",
                properties: {
                    libro: { type: "string", example: "68f1a2b3c4d5e6f701234568" },
                    titulo: { type: "string", example: "rayuela" },
                    precioUnitario: { type: "number", example: 15000 },
                    cantidad: { type: "integer", example: 2 },
                    subtotal: { type: "number", example: 30000 },
                },
            },
            Pedido: {
                type: "object",
                properties: {
                    _id: { type: "string", example: "68f1a2b3c4d5e6f70123456c" },
                    usuario: { type: "string", example: "68f1a2b3c4d5e6f70123456a" },
                    items: { type: "array", items: { $ref: "#/components/schemas/LineaDePedido" } },
                    total: { type: "number", example: 30000 },
                    estado: { type: "string", enum: ["pendiente", "pagado", "cancelado"], example: "pendiente" },
                    createdAt: { type: "string", format: "date-time" },
                    updatedAt: { type: "string", format: "date-time" },
                    // ⚠️ __v es el "version key" de Mongoose: lo agrega él, no
                    //    nosotros. Lo documentamos porque VIAJA: la doc tiene que
                    //    decir lo que la API manda de verdad, no lo que nos gustaría.
                    //    (Se puede esconder con toJSON: { versionKey: false } en el schema.)
                    __v: { type: "integer", example: 0 },
                },
            },
        },

        // ─────────────────────────────────────────────────────────
        //  5 · LOS PARÁMETROS REUTILIZABLES
        //
        //  El :id de la URL aparece en 10 rutas. Se escribe UNA vez.
        // ─────────────────────────────────────────────────────────
        parameters: {
            IdEnLaRuta: {
                name: "id",
                in: "path",
                required: true,
                description: "El _id de MongoDB (24 caracteres hexadecimales)",
                schema: { type: "string", example: "68f1a2b3c4d5e6f701234568" },
            },
            IdDeLibroEnLaRuta: {
                name: "libroId",
                in: "path",
                required: true,
                description: "El _id del libro dentro del carrito",
                schema: { type: "string", example: "68f1a2b3c4d5e6f701234568" },
            },
        },

        // ─────────────────────────────────────────────────────────
        //  6 · LAS RESPUESTAS REUTILIZABLES
        //
        //  ⭐ ACÁ ESTÁ EL AHORRO GRANDE. Los errores son SIEMPRE los
        //     mismos: se definen una vez y cada ruta los referencia con
        //     una línea. Y así no hay dos rutas que documenten el 401
        //     de manera distinta.
        // ─────────────────────────────────────────────────────────
        responses: {
            SinToken: {
                description: "Falta el token, o no es válido, o venció",
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/Error" },
                        example: { error: "Falta el token. Mandá el header Authorization: Bearer <token>" },
                    },
                },
            },
            SinPermiso: {
                description: "Estás identificado pero tu rol no alcanza (o el recurso no es tuyo)",
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/Error" },
                        example: { error: "Esta acción requiere uno de estos roles: vendedor, admin" },
                    },
                },
            },
            NoExiste: {
                description: "No existe un recurso con ese id",
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/Error" },
                        example: { error: "No existe ese pedido" },
                    },
                },
            },
            DatosInvalidos: {
                description: "El body o el id están mal (validación del modelo, CastError)",
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/ErrorDeValidacion" },
                    },
                },
            },
            Conflicto: {
                description: "El pedido está bien escrito, pero el estado del sistema no lo permite",
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/Error" },
                        example: { error: 'No se puede eliminar: el autor tiene 3 libro(s) cargado(s)' },
                    },
                },
            },
        },
    },
}

// =====================================================================
//  Y acá se arma todo: swagger-jsdoc junta esta definición con los
//  comentarios @openapi que encuentre en los archivos de "apis".
//
//  ⚠️ Si una ruta no aparece en Swagger UI, el 99% de las veces es que
//     su archivo no entra en este glob, o que el comentario dice
//     /* en vez de /**
// =====================================================================
export const especificacion = swaggerJsdoc({
    definition: definicion,
    apis: ["./src/routes/*.js"],
})
