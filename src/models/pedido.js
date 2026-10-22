// clase 17 · paso 7 (crear)
import mongoose from "mongoose"

// Una línea del pedido: referencia + FOTO
const lineaSchema = new mongoose.Schema({
    libro: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Libro",
        required: true
    },
    // ⭐ la FOTO: se copian del libro al confirmar la compra
    titulo: {
        type: String,
        required: true
    },
    precioUnitario: {
        type: Number,
        required: true,
        min: 0
    },
    cantidad: {
        type: Number,
        required: true,
        min: 1
    },
    subtotal: {
        type: Number,
        required: true,
        min: 0
    }
}, { _id: false })

// ⭐ Se copia el precio a propósito: si mañana el libro sube, el pedido de ayer
//    tiene que seguir diciendo lo que se pagó. Una factura no puede cambiar.

const pedidoSchema = new mongoose.Schema({
    usuario: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Usuario",
        required: true
        // sin unique: un usuario tiene MUCHOS pedidos (1 a N)
    },
    items: {
        type: [lineaSchema],
        validate: {
            validator: (items) => items.length > 0,
            message: "Un pedido necesita al menos un ítem"
        }
    },
    total: {
        type: Number,
        required: true,
        min: 0
    },
    estado: {
        type: String,
        enum: ["pendiente", "pagado", "cancelado"],
        default: "pendiente"
    }
}, { timestamps: true })

export default mongoose.model("Pedido", pedidoSchema)
