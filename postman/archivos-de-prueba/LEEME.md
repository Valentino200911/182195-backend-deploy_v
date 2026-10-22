# Archivos para los requests de Postman

Postman **no puede guardar un archivo dentro de la colección**: en los requests con
imagen hay que elegirlo a mano (*Body → form-data → fila `imagen` → Select Files*).
Estos son los que corresponden a cada uno.

| Archivo | Request | Qué tiene que pasar |
|---|---|---|
| `tapa-ejemplo.png` | **51** · Crear libro CON imagen | 201 · se guarda la URL |
| `tapa-nueva.png` | **58** · Cambiar la tapa | 200 · URL nueva, la vieja se borra |
| `no-es-imagen.pdf` | **53** · Un PDF → 400 | 400 · *"Solo se permiten imágenes"* |
| `pesada-6mb.png` | **54** · Más de 5 MB → 400 | 400 · *"no puede pesar más de 5 MB"* |

Para los requests **55** (campo mal nombrado), **56** (compradora) y **57** (ISBN repetido)
sirve cualquiera de las dos tapas: lo que se prueba ahí no es el archivo.

### Detalles

- **`tapa-ejemplo.png`** y **`tapa-nueva.png`** son dos imágenes de 300×450 bien distintas
  (una azul, otra roja), para que al cambiar la tapa se note en pantalla.
- **`no-es-imagen.pdf`** es un PDF válido de verdad, no un archivo renombrado: así el
  rechazo no es por casualidad.
- **`pesada-6mb.png`** son 5,6 MB de ruido (por eso no comprime). Es una imagen PNG
  válida: la frena el límite de tamaño, no el filtro de tipo. Si querés, podés usar
  cualquier foto sacada con el celular, que suele pesar parecido.

> También podés usar tus propios archivos. Estos están para que no tengas que salir a
> buscar uno en el medio de la clase.
