import mongoose from 'mongoose'

// El modelo basicamente es validacion, filtro y formateo de datos antes de que entren en la DB

const autorSchema = new mongoose.Schema({

    nombre: {
        type: String,
        // el segundo parametro de required es un mensaje de error
        required: [true, "El nombre del autor es obligatorio"],
        // trim borra espacios adelante y atras de un string " uva "
        trim: true,
        minlength: [3, "El nombre necesita al menos 3 caracteres"],
        maxlength: [60, "El nombre no puede tener mas de 60 caracteres"],
        lowercase: true
    },

    nacionalidad: {
        type: String,
        enum: ["argentina", "uruguaya", "chilena"],
        default: "argentina",
        lowercase: true
    },

    nacimiento: {
        type: Number,
        min: [1800, "Ese año es demasiado antiguo"],
        max: [2010, "Ese año es demasiado reciente"]
    }
    
})

// Modelo es Autor -> coleccion es "autors" no "autores"
// mongoose pluraliza en ingles y autor no es una palabra que reconozca
// asique le pega una "s"
// importa por las consultas
// se puede forzar un nombre real en el tercer argumento
// mongoose.model("Autor", autorSchema, "autores")

export default mongoose.model("Autor", autorSchema)