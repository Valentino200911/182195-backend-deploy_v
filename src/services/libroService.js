import Autor from "../models/autor.js";
import Libro from "../models/libro.js";
import { ErrorApp } from "../utils/ErrorApp.js";
import { borrarImagenService, subirImagenService } from "./storageService.js";

// el servicio tiene la responsabilidad de hacer el llamado a los datos, procesarlos, operarlos, combinarlos. Todo tratamiento a los datos se hace desde acá y muchas veces dependemos de llamados a la base de datos

// get libros
export const listarLibroService = async ({ genero, disponible, autor } = {}) => {
  const filtro = {};
  if (genero) filtro.genero = genero;
  if (autor) filtro.autor = autor;
  if (disponible) filtro.disponible = disponible === "true";

  return await Libro.find(filtro)
    .populate("autor", "nombre nacionalidad")
    .sort({ titulo: 1 });
};

// getById
export const obtenerLibroIdService = async (id) => {
  return await Libro.findById(id).populate("autor", "nombre nacionalidad");
};

// verifyAutor
export const verificarAutorService = async (autorId) => {

    if (!autorId) return;                    // el autor es opcional

    const existe = await Autor.exists({ _id: autorId });

    if (!existe) {
        throw new ErrorApp(`No existe ningún autor con el id ${autorId}`, 400);
    }
};
// crear
export const crearLibroService = async (datos, file) => {
    await verificarAutorService(datos.autor)

    const imagen = await subirImagenService(file)

    try {
        const libro = await Libro.create({...datos, imagen})

        return await libro.populate("autor", "nombre nacionalidad")
    } catch (error) {
        await borrarImagenService(imagen)
        // error.code 11000 es un error de duplicado
        if(error.code === 11000){
            throw new ErrorApp(`El ISBN ${datos.isbn} ya está cargado en otro libro`, 409)
        }  else {
            throw error
        }
    }
}

// Siempre al actualizar debemos saber "a quien" y "con qué"
export const actualizarLibroService = async (id, datos, file) => {
    await verificarAutorService(datos.autor)

    const anterior = file ? await Libro.findById(id) : null

    const cambios = { ...datos }

    if(file){
        cambios.imagen = await subirImagenService(file)
    }

    try {
        const libro = await Libro.findByIdAndUpdate(
            {_id: id},
            cambios,
            // ojo: runValidators con V mayuscula. Si va en minuscula la opcion no existe,
            // mongoose la ignora en silencio y el PATCH no valida nada.
            { returnDocument: "after", runValidators: true}
        )
        .populate("autor", "nombre nacionalidad")

        if(libro && anterior?.imagen) {
            await borrarImagenService(anterior.imagen)
        }

        return libro

    } catch (error) {
        if(error.code === 11000){
            throw new ErrorApp(`El ISBN ${datos.isbn} ya está cargado en otro libro`, 409)
        } else {
            throw error
        }
    }
}

export const eliminarLibroService = async (id) => {
    return await Libro.findByIdAndDelete(id)
}