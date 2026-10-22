// =====================================================================
//  clase 24 · ESTE ARCHIVO CORRE ANTES QUE CUALQUIER TEST
//
//  Lo configura jest.config.js con "setupFiles". Es importante que corra
//  ANTES: acá se definen las variables de entorno, y config.js las lee
//  una sola vez cuando se importa. Si lo hiciéramos dentro de un test,
//  config.js ya habría leído el .env de siempre y sería tarde.
//
//  ⚠️ dotenv NO pisa una variable que ya existe. Por eso alcanza con
//     escribirla acá: gana esta y el .env queda ignorado.
// =====================================================================

// ⭐ LA BASE DE LOS TESTS ES OTRA BASE.
//    Los tests borran colecciones enteras entre un test y el siguiente.
//    Si apuntaran a "biblioteca", el primer npm test te borra la base
//    con la que venís trabajando toda la cursada.
process.env.MONGO_URI = "mongodb://localhost:27017/biblioteca_test"

// El JWT_SECRET de los tests es propio: los tokens de los tests no tienen
// que servir en el servidor de verdad, ni al revés.
process.env.JWT_SECRET = "secreto-solo-para-los-tests"

// ⭐ Las imágenes se guardan en una carpeta, NO en Supabase.
//    Un test no puede depender de internet ni de la cuenta de nadie:
//    tiene que dar el mismo resultado siempre, en cualquier máquina.
//    Esto es gratis gracias al adaptador de la clase 23: una variable.
process.env.STORAGE = "local"
process.env.CARPETA_IMAGENES = "uploads-test"
