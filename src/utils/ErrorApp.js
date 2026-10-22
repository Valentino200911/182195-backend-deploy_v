export class ErrorApp extends Error {
    constructor(mensaje, status = 400) {
        super(mensaje)
        this.name = "ErrorApp"
        this.status = status
    }
}
