// =====================================================================
//  clase 24 · LA CONFIGURACIÓN DE JEST
//
//  Es corta, pero cada línea está por un motivo.
// =====================================================================

export default {
    // Node y no "jsdom": estamos testeando una API, no una página web.
    // jsdom simula un navegador (document, window) y acá no hace falta.
    testEnvironment: "node",

    // Corre ANTES de todo, incluso antes de importar los archivos del test.
    // Ahí se define a qué base apuntan los tests. Ver tests/setup.js
    setupFiles: ["<rootDir>/tests/setup.js"],

    // Dónde buscar los tests. Jest ya busca *.test.js solo, pero dejarlo
    // escrito evita que mañana intente correr algo de node_modules.
    testMatch: ["<rootDir>/tests/**/*.test.js"],

    // ⚠️ Los tests tocan Mongo de verdad: 5 segundos (el default) a veces
    //    no alcanza la primera vez que se conecta.
    testTimeout: 15000,

    // ⭐ Los archivos de test corren en PARALELO, cada uno en su proceso.
    //    Pero todos usan la MISMA base, y cada uno la vacía entre tests:
    //    si corrieran a la vez, uno le borraría los datos al otro.
    //    maxWorkers: 1 los pone en fila. Es más lento y es correcto.
    //    (En un proyecto grande se usa una base por worker, pero eso ya es
    //     otra clase.)
    maxWorkers: 1,

    // Para npm test -- --coverage: qué archivos contar.
    collectCoverageFrom: ["src/**/*.js", "!src/seed.js", "!src/index.js"],
}
