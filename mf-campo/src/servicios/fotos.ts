export const maxFoto = 10 * 1024 * 1024;
export async function esImagenValida(archivo: Blob) {
  const firma = new Uint8Array(await archivo.slice(0, 8).arrayBuffer());
  if (firma[0] === 255 && firma[1] === 216 && firma[2] === 255) return 'image/jpeg';
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((b, i) => firma[i] === b)) return 'image/png';
  return null;
}
export async function reducir(archivo: Blob, maximo = 1600) {
  const tipo = await esImagenValida(archivo);
  if (!tipo) throw new Error('Seleccione una foto JPEG o PNG');
  let imagen: ImageBitmap;
  try { imagen = await createImageBitmap(archivo); }
  catch { throw new Error('No se pudo leer la foto. Seleccione una imagen JPEG o PNG válida'); }
  let foto: Blob;
  try {
    const escala = Math.min(1, maximo / Math.max(imagen.width, imagen.height));
    if (escala === 1) foto = archivo.slice(0, archivo.size, tipo);
    else {
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(imagen.width * escala));
      canvas.height = Math.max(1, Math.round(imagen.height * escala));
      const contexto = canvas.getContext('2d');
      if (!contexto) throw new Error('No se pudo preparar la foto');
      contexto.fillStyle = '#fff'; contexto.fillRect(0, 0, canvas.width, canvas.height);
      contexto.drawImage(imagen, 0, 0, canvas.width, canvas.height);
      foto = await new Promise<Blob>((resolver, rechazar) => canvas.toBlob(
        blob => blob ? resolver(blob) : rechazar(new Error('No se pudo reducir la foto')), 'image/jpeg', 0.85));
    }
  } finally { imagen.close(); }
  if (!foto.size || foto.size > maxFoto) throw new Error('La foto debe pesar hasta 10 MB después de reducirla');
  return foto;
}
