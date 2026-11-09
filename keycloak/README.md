# Login agrícola

Tema `agro` para Keycloak 26.4. Hereda las plantillas oficiales `keycloak`: conserva el envío, validaciones, accesibilidad y botón para mostrar la contraseña. Personaliza estilos y textos del formulario. El login es común a Administración, Análisis y Campo.

Desde PowerShell, con el backend local levantado en WSL:

```powershell
wsl.exe python3 /mnt/c/sw2-parcial2-app/keycloak/instalar-local.py /home/rodrigo/proyectos/sw2-parcial2
```

El instalador copia el tema a `docker/keycloak/temas/agro` del backend, agrega un montaje de solo lectura al Compose y fija el tema y español en el JSON de importación. También actualiza el realm activo por su API, sin reiniciar Keycloak. Usa las credenciales administrativas del contenedor solo en memoria. Los cambios del backend deben versionarse en ese repositorio.

Para otra instalación, copiar `temas/agro` a `/opt/keycloak/themes/agro` y seleccionar **Realm settings → Themes → Login theme → agro**. En **Localization**, habilitar español y seleccionarlo como idioma predeterminado.

Verificación: abrir una ventana privada en `http://localhost:9000`, revisar el formulario en escritorio y móvil, mostrar/ocultar contraseña, probar credenciales inválidas y luego ingresar con una cuenta válida. Para volver al diseño anterior, seleccionar `keycloak` como tema de login.

Referencia: [temas de Keycloak](https://www.keycloak.org/ui-customization/themes).
