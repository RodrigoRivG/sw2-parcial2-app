module.exports = async (config, options) => {
  const { default: modulo } = await import('single-spa-angular/lib/webpack');
  const configurar = modulo.default ?? modulo;
  const resultado = configurar(config, options);
  resultado.externals = ['@agro/compartido'];
  return resultado;
};
