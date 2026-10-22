import mongoose from "mongoose"
import bcrypt from "bcrypt"
import { ROLES } from "../utils/constants.js";

// ROLES
// comprador -> arma su carrito y compra (es el rol por defecto)
// vendedor  -> administra el catalogo: libros y autores
// admin     -> todo lo anterior + administra usuarios

// cuantas "vueltas" da bcrypt al hashear. Mas vueltas = mas lento de crackear
// y tambien mas lento de calcular. 10 es el estandar (~100ms por hash)
const VUELTAS = 10

// ESTA ES UNA VERDADERA CONSTANTE
const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// ^[a-zA-Z0-9._%+-]+: El usuario solo puede contener letras, números y los caracteres especiales estándar permitidos en emails (., _, %, +, -). Cero símbolos raros o caracteres de control.

// @: Un único arroba divisorio.

// [a-zA-Z0-9.-]+: El dominio solo acepta letras, números, guiones y puntos (sin caracteres extraños).

// \.: El punto literal divisor del TLD.

// [a-zA-Z]{2,}$: Exige que la extensión (.com, .ar, .org) sea únicamente de letras y tenga como mínimo 2 caracteres. Chau dominios raros como hola@sitio.123.

const usuarioSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: [true, "El nombre es obligatorio"],
        trim: true,
        minLength: [3, "El nombre necesita al menos 3 caracteres"],
        maxLength: [100, "El nombre no puede ser mayor a 100 caracteres"]
    },
    apellido: {
        type: String,
        required: [true, "El apellido es obligatorio"],
        trim: true,
        minLength: [3, "El apellido necesita al menos 3 caracteres"],
        maxLength: [100, "El apellido no puede ser mayor a 100 caracteres"]
    },
    email: {
        type: String,
        required: [true, "El email es obligatorio"],
        unique: true,
        trim: true,
        lowercase: true,
        // regex
        match: [emailRegex, "Ese email no tiene forma de email"]
    },
    password: {
        type: String,
        required: [true, "La contraseña es obligatoria"],
        minLength: [6, "La contraseña necesita al menos 6 caracteres"],
        // select: false -> NUNCA viene en un find(). Hay que pedirla a proposito
        // con .select("+password"). Asi es imposible mandarla en un JSON sin querer
        // si pedis el usuario no te envia la contraseña
        select: false
    },
    rol: {
        type: String,
        enum: Object.values(ROLES),
        default: "comprador"
    }
}, {
    timestamps: true,
    // select: false solo aplica a las CONSULTAS (find, findById...).
    // Pero create() y save() devuelven el documento que acaban de guardar, CON
    // el hash adentro. Este transform lo borra cada vez que un usuario se
    // convierte a JSON, que es lo que hace res.json(). Doble candado.
    toJSON: {
        transform: (doc, ret) => {
            delete ret.password
            return ret
        }
    }
})

// PRE-SAVE HOOK: corre ANTES de cada save() (y de cada create(), que usa save)
// Aca se hashea la contraseña. Va en el modelo y no en el service para que sea
// IMPOSIBLE guardar una contraseña en texto plano, la guarde quien la guarde.
// ⚠️ function y no flecha: necesitamos el "this", que es el documento que se guarda
usuarioSchema.pre("save", async function () {
    // si no cambio la password (ej: solo cambio el nombre) no se toca:
    // re-hashear un hash lo romperia y el usuario no podria volver a entrar
    if (!this.isModified("password")) return

    this.password = await bcrypt.hash(this.password, VUELTAS)
})

// metodo de instancia: usuario.compararPassword("loQueMandaron")
// bcrypt.compare hashea lo que llego y lo compara con lo guardado.
// Un hash NUNCA se "deshashea": es de una sola direccion
usuarioSchema.methods.compararPassword = function (password) {
    return bcrypt.compare(password, this.password)
}

export default mongoose.model("Usuario", usuarioSchema)