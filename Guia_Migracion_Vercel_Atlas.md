# Guía Maestra: Despliegue de Backend (Node/Express + MongoDB Atlas) en Vercel

Esta guía es un resumen de los pasos críticos realizados para migrar un proyecto local de Express a un entorno Serverless en Vercel, solucionando errores comunes de red y arquitectura.

---

## 1. El Problema de Conexión (DNS SRV)
**Error común**: `querySrv ECONNREFUSED`
*   **Por qué ocurre**: El protocolo `mongodb+srv://` (SRV) es bloqueado por muchos ISPs y firewalls. Vercel a veces tiene retardos resolviendo estos registros.
*   **Solución**: Cambiar a la **Standard Connection String** (la versión "larga" que especifica los nodos).
*   **Cómo obtenerla**: En Atlas, elige la versión de driver de Node.js "3.6 or later".
*   **Ejemplo de formato**: 
    `mongodb://user:pass@nodo0:27017,nodo1:27017,nodo2:27017/dbname?ssl=true&replicaSet=atlas-shard-0&authSource=admin`

---

## 2. Arquitectura de Sesiones (Stateless)
**El problema**: Vercel usa Serverless (Lambdas), lo que significa que el servidor se "apaga" cuando no hay tráfico. Las sesiones guardadas en memoria (`MemoryStore` de `express-session`) se pierden.
*   **Sugerencia**: Usar **JWT (Stateless)**. La información del usuario viaja en el Header `Authorization: Bearer <token>`.
*   **Acción**: Si el proyecto tiene `express-session` y ya usa JWT, desactivar/eliminar la sesión para evitar cookies innecesarias y fugas de memoria.

---

## 3. Configuración para Vercel
Son necesarios dos ajustes clave para que Vercel "entienda" tu servidor:

### A. Archivo `vercel.json` (En la raíz)
Le dice a Vercel que redirija todo el tráfico a tu archivo de entrada principal.
```json
{
  "version": 2,
  "builds": [{ "src": "index.js", "use": "@vercel/node" }],
  "routes": [{ "src": "/(.*)", "dest": "index.js" }]
}
```

### B. Ajuste en `index.js`
Vercel necesita que el objeto `app` de Express sea exportado como `default`.
```javascript
// Al final de index.js
app.listen(PORT, () => console.log(`Run on ${PORT}`)); // Para local
export default app; // Para Vercel
```

---

## 4. Checklist para el Proyecto Completo
* [ ] **Whitelist en Atlas**: En "Network Access", agregar la IP `0.0.0.0/0` para permitir el acceso desde los servidores de Vercel.
* [ ] **Variables de Entorno**: Configurar `MONGODB_URI` y `SECRET` en el Dashboard de Vercel (Settings > Environment Variables).
* [ ] **Framework Preset**: Al importar en Vercel, elegir **"Other"** para que use el `vercel.json` manual.
* [ ] **Node.js Versión**: Asegurarse de que el equipo local y Vercel usen versiones compatibles (ej. Node 20/22/24).

---

## Anexo: Cómo convertir una URI `+srv` a Estándar (DNS Manual)

Si tienes problemas de conexión (errores de DNS como `ECONNREFUSED`), puedes convertir tu URI de MongoDB Atlas manualmente siguiendo estos pasos:

### 1. Instrucción para delegar a una IA (Prompt)
Copia y pega este mensaje para que un asistente te ayude con la conversión técnica:
> "Tengo una cadena de conexión `mongodb+srv://...` y tengo problemas de resolución DNS. Por favor, realiza una consulta DNS de los registros **SRV** (en `_mongodb._tcp.[tu-cluster]`) y los registros **TXT** para obtener los hostnames individuales y el nombre del `replicaSet`. Como resultado, devuélveme la cadena de conexión expandida en formato `mongodb://user:pass@host1:27017,host2:27017,host3:27017/...` incluyendo los parámetros necesarios."

### 2. Pasos técnicos (Si lo haces manualmente)
1. **Identifica el cluster**: Extrae el dominio (ej. `cluster0.abcde.mongodb.net`) de tu URI original.
2. **Consulta SRV**: Ejecuta `nslookup -type=SRV _mongodb._tcp.[tu-cluster]` para obtener los 3 hosts reales.
3. **Consulta TXT**: Ejecuta `nslookup -type=TXT [tu-cluster]` para obtener el `replicaSet` y el `authSource`.
4. **Ensambla**: Une el usuario, contraseña y los 3 hosts en una sola cadena `mongodb://`, añadiendo al final los parámetros obtenidos del TXT.

### Ejemplo Práctico de Conversión:
- **Entrada (SRV):** `mongodb+srv://user:pass@cluster0.abcde.mongodb.net/test`
- **Comandos:**
  ```bash
  nslookup -type=SRV _mongodb._tcp.cluster0.abcde.mongodb.net
  nslookup -type=TXT cluster0.abcde.mongodb.net
  ```
- **Salida (Estándar):**
  `mongodb://user:pass@nodo0:27017,nodo1:27017,nodo2:27017/test?ssl=true&replicaSet=atlas-xxx-shard-0&authSource=admin`

---

**Nota para la IA**: "Aplica el patrón de despliegue stateless con Standard URI y vercel.json de ruta completa".