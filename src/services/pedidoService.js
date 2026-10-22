// clase 22 · el carrito se convierte en pedido
import Pedido from "../models/pedido.js";
import Carrito from "../models/carrito.js";
import Libro from "../models/libro.js";
import { ErrorApp } from "../utils/ErrorApp.js";

// ═══════════════════════════════════════════════════════════════
// 1 · CONFIRMAR LA COMPRA          POST /api/pedidos
// ═══════════════════════════════════════════════════════════════
// El usuarioId NO viene por la URL: lo pone verificarToken desde el token,
// igual que en el carrito.
export const crearPedidoService = async (usuarioId) => {
  // paso 1: leer el carrito, con populate de los datos del libro que vamos a COPIAR
  //         (titulo, precio, stock, disponible)
  const carrito = await Carrito.findOne({ usuario: usuarioId }).populate(
    "items.libro",
    "titulo precio stock disponible",
  );


  // paso 2: filtrar los ítems cuyo libro fue borrado (populate deja null ahí)
  //         si no queda ninguno → ErrorApp("El carrito está vacío", 409)
  const items = carrito ? carrito.items.filter(item => item.libro) : []

  if(items.length === 0) {
    throw new ErrorApp("El carrito está vacío", 400)
  }


  // paso 3: descontar el stock de cada libro de forma ATÓMICA
  //         findOneAndUpdate con la condición stock: { $gte: cantidad } EN EL FILTRO
  //         si no devuelve nada → no había stock → ErrorApp(..., 409)
  //         ⭐ guardar en un array lo que ya se descontó
  const descontados = []

  try {
    // vamos a descontar libro por libro
    for (const item of items) {
        const actualizado = await Libro.findOneAndUpdate(
            {
                _id: item.libro._id,
                disponible: true,
                stock: { $gte: item.cantidad }
            },
            { $inc: { stock: -item.cantidad } },
            { returnDocument: "after" }
        )
        if(!actualizado){
            throw new ErrorApp(`No hay stock suficiente de "${item.libro.titulo}" para confirmar el pedido`, 409)
        }
        descontados.push(item)
    }

    // va a armar la "factura" del pedido por producto
    const lineas = items.map(item => ({
        libro: item.libro._id,
        titulo: item.libro.titulo,
        precioUnitario: item.libro.precio,
        cantidad: item.cantidad,
        subtotal: item.libro.precio * item.cantidad
    }))

    // el total a pagar es calculado en el servidor
    const total = lineas.reduce(( acc, linea ) => acc + linea.subtotal, 0)

    const pedido = await Pedido.create({ usuario: usuarioId, items: lineas, total })

    // limpiamos el carrito
    carrito.items = []

    await carrito.save()

    return pedido

  } catch (error) {
    // si hubo un error solo en un producto donde no se pudo descontar el stock, se calculo mal, o hubo un error
    for(const item of descontados){
        await Libro.updateOne({_id: item.libro._id}, { $inc: { stock: item.cantidad }})
    }
    throw error
  }


  // paso 4: armar las líneas con la FOTO: libro, titulo, precioUnitario, cantidad, subtotal

  // paso 5: el total lo calcula el SERVIDOR con un reduce
  //         (si el cliente manda un total en el body, se ignora)

  // paso 6: Pedido.create({ usuario, items, total })

  // paso 7: vaciar el carrito y guardarlo

  // paso 8: envolver los pasos 3 a 7 en try/catch.
  //         ⭐ En el catch: devolver el stock que ya se había descontado
  //            y RE-LANZAR el error. Este es el único try/catch del proyecto
  //            que se justifica: HACE algo con el error.
};

// ❌ if (libro.stock >= cantidad) { libro.stock -= cantidad; await libro.save() }
//    Entre LEER y GUARDAR, otro cliente puede comprar el mismo libro: se venden
//    dos con un solo stock. Se llama "race condition".
// ✅ findOneAndUpdate({ stock: { $gte: cantidad } }, { $inc: { stock: -cantidad } })
//    Busca y descuenta en UNA sola operación.

// ═══════════════════════════════════════════════════════════════
// 2 · MIS PEDIDOS                  GET /api/pedidos
// ═══════════════════════════════════════════════════════════════
export const listarMisPedidosService = async (usuarioId) => {
  return await Pedido.find({ usuario: usuarioId }).sort({ createdAt: -1 });
};

// ═══════════════════════════════════════════════════════════════
// 3 · EL DUEÑO                     GET /api/pedidos/:id
// ═══════════════════════════════════════════════════════════════
// Acá el id SÍ viene por la URL (cada pedido tiene el suyo), así que hay que
// comprobar a mano que el pedido sea de quien lo pide.
// permitirRoles NO puede hacer esto: sabe el ROL, no de quién es el recurso.
// Por eso la comprobación va en el SERVICE, que es el que tiene el documento.
const buscarPedidoPropio = async (id, usuarioId) => {
  const pedido = await Pedido.findById(id);

  if (!pedido) {
    throw new ErrorApp("No existe ese pedido", 404);
  }

  // ⚠️ pedido.usuario es un ObjectId y usuarioId es un string:
  //    sin .toString() NUNCA son iguales
  if (pedido.usuario.toString() !== usuarioId) {
    // 403 y no 404: existe, pero no es tuyo
    throw new ErrorApp("Ese pedido no es tuyo", 403);
  }

  return pedido;
};

export const obtenerMiPedidoService = async (id, usuarioId) => {
  return await buscarPedidoPropio(id, usuarioId);
};

// ═══════════════════════════════════════════════════════════════
// 4 · ESTADOS            PATCH /api/pedidos/:id/pagar | /cancelar
// ═══════════════════════════════════════════════════════════════
// Cambia el estado solo si está en el estado esperado, en UNA operación.
const cambiarEstado = async (id, usuarioId, desde, hacia) => {
  // primero el dueño: si no es suyo, ni miramos el estado
  await buscarPedidoPropio(id, usuarioId);

  const pedido = await Pedido.findOneAndUpdate(
    { _id: id, estado: desde },
    { estado: hacia },
    { returnDocument: "after" },
  );

  if (pedido) return pedido;

  // no matcheó el filtro: existe (ya lo vimos) pero está en otro estado
  const existente = await Pedido.findById(id);
  throw new ErrorApp(
    `No se puede pasar a "${hacia}" un pedido que está "${existente.estado}"`,
    409,
  );
};

export const pagarPedidoService = async (id, usuarioId) => {
  return await cambiarEstado(id, usuarioId, "pendiente", "pagado");
};

export const cancelarPedidoService = async (id, usuarioId) => {
  const pedido = await cambiarEstado(id, usuarioId, "pendiente", "cancelado");

  // ⭐ cancelar DEVUELVE el stock: es la misma compensación del catch de
  //    arriba, pero acá a propósito, porque es una regla de negocio y no un error.
  for (const linea of pedido.items) {
    await Libro.updateOne({ _id: linea.libro }, { $inc: { stock: linea.cantidad } });
  }

  return pedido;
};

// ═══════════════════════════════════════════════════════════════
// 5 · PARA EL STAFF                GET /api/pedidos/todos
// ═══════════════════════════════════════════════════════════════
export const listarTodosPedidosService = async () => {
  return await Pedido.find()
    .populate("usuario", "nombre apellido email")
    .sort({ createdAt: -1 });
};
