import Autor from "../models/autor.js";
import Libro from "../models/libro.js";
import { ErrorApp } from "../utils/ErrorApp.js";

//get
// Este get sirve tanto para filtrar por nacionalidad o traer todos los autores si no hay filtro
// el objeto del parametro permite el filtrado dinamico y opcional, ya que si no le paso nada como filtro me trae todos, pero si le mando nacionalidad como filtro me filtra por ese campo
// EL FILTRO DE NACIONALIDAD ES OPCIONAL
export const listarAutorService = async ({ nacionalidad } = {}) => {
  const filtro = {};
  if (nacionalidad) {
    filtro.nacionalidad = nacionalidad;
  }
  return await Autor.find(filtro).sort({ nombre: 1 });
};

// getById
export const obtenerAutorIdService = async (id) => {
  return await Autor.findById(id);
};

// post
export const crearAutorService = async (datos) => {
  return await Autor.create(datos);
};

// patch
export const actualizarAutorService = async (id, datos) => {
  return await Autor.findByIdAndUpdate({ _id: id }, datos, {
    returnDocument: "after",
    runValidators: true,
  });
};

// delete: no se puede borrar un autor que tiene libros asignados
// si realmente querés eliminar el autor aunque tenga libros asignados, tendrias que recorrer todos los libros con el id del autor y vaciar ese campo y despues eliminar al autor
export const eliminarAutorService = async (id) => {
    // primero validamos que exista el autor antes de tratar de eliminarlo
    const autor = await Autor.findById(id)
    if(!autor){
        return null
    }
    // validamos si el autor tiene libros con su id
    const libros = await Libro.countDocuments({autor: id})

    if(libros > 0){
        throw new ErrorApp(`No se puede eliminar: el autor tiene ${libros} libro(s) cargado(s)`, 409)
    }

    await autor.deleteOne()
    return autor
}

