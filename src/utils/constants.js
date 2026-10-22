// soloStaff permite simplificar la gestion de los roles
// router.delete("/:id", verificarToken, permitirRoles("vendedor", "admin"), libroController.eliminarLibroController);

import { permitirRoles } from "../middleware/permitirRoles.js"
import { verificarToken } from "../middleware/verificarToken.js"

export const ROLES = Object.freeze({
  COMPRADOR: 'comprador',
  VENDEDOR: 'vendedor',
  ADMIN: 'admin'
});

export const soloStaff = [ verificarToken, permitirRoles(ROLES.VENDEDOR, ROLES.ADMIN) ]