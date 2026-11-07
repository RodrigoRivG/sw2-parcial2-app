export class ErrorApi extends Error {
  constructor(
    public readonly estado: number,
    public readonly codigo: string,
    public readonly mensaje: string,
    public readonly detalles: unknown = null,
    public readonly idCorrelacion: string = '',
  ) {
    super(mensaje);
    this.name = 'ErrorApi';
  }
}
