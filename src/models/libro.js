import mongoose from "mongoose"

const libroSchema = new mongoose.Schema({
    titulo:{
        type: String,
        required: [true, "el titulo es obligatorio"],
        trim: true,
        lowercase: true,
        minlength: [2, "El título necesita al menos 2 caracteres"]
    },
    isbn: {
        type: String,
        required: [true, "El ISBN es obligatorio"],
        unique: true, // No es una validacion -> es un indice
        trim: true
    },
    genero: {
        type: String,
        enum: ["novela", "cuento", "poesia"],
        // default hace que: si no me mandan nada en este campo, ese valor es el que queda
        // puede pasar que no me manden nada porque el campo no es required
        default: "novela"
    },
    anio: {
        type: Number,
        min: [1400, "Ese año es anterior a la imprenta"],
        max: [2027, "Ese año todavía no llegó"]
    },
    disponible: {
        type: Boolean,
        default: true
    },
    // Referencia, no es una FOREIGN KEY pero es parecido
    autor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Autor"
    },
    creado: {
        type: Date,
        default: Date.now // sin parentesis
        // Data.now se ejecuta cuando se crea el documento
        // si pones Data.now() -> todos los libros van a quedar con la hora de arranque del sistema
    },
    stock: {
        type: Number,
        default: 0,
        required: [true, "El stock es obligatorio"],
        min: [0, "El stock no puede ser negativo"],
        // validacion custom
        validate: {
            validator: Number.isInteger,
            message: "El stock tiene que ser un numero entero"
        }
    },
    precio: {
        type: Number,
        required: [true, "El precio es obligatorio"],
        min: [0, "El precio no puede ser negativo"]
    },
    imagen: {
        type: String,
        default: null // el libro puede no tener tapa
    }
})

export default mongoose.model("Libro", libroSchema)