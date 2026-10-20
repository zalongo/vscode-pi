# Pi — Terminal a la derecha

Extensión de VS Code con accesos a Pi en la barra de actividad, en la cabecera
del Explorador y en la esquina superior derecha del editor. Abre una terminal
como pestaña en una columna a la derecha y ejecuta `pi`. No mueve el panel de
terminales ni cambia tus ajustes.

## Instalación

Necesitas VS Code 1.85 o superior y el comando `pi` disponible en tu terminal habitual.

1. Instala el archivo `dist/pi-editor-terminal-0.1.1.vsix` con **Extensiones → ⋯ → Instalar desde VSIX…**, o ejecuta:
   ```sh
   code --install-extension dist/pi-editor-terminal-0.1.1.vsix --force
   ```
2. Si actualizas desde una versión anterior, ejecuta **Developer: Reload Window**
   (o **Desarrollador: Recargar ventana**) desde la paleta de comandos.
3. Abre una carpeta de confianza.
4. Pulsa el icono de Pi en la cabecera del Explorador para iniciar Pi directamente,
   o selecciona **Pi** en la barra de actividad y pulsa **Abrir Pi a la derecha**.
   Si tienes un archivo abierto, también aparece el botón en la barra del editor.

El icono de la barra de actividad es monocromático para adaptarse al tema de VS Code.
Si está oculto, haz clic derecho en esa barra y activa **Pi**. Si has movido la
barra de actividad a la parte superior (como en tu configuración), el icono
aparecerá allí, junto a Explorador y Extensiones.

También puedes ejecutar **Pi: Abrir Pi a la derecha** desde la paleta
(`Ctrl+Shift+P` / `Cmd+Shift+P`), incluso cuando no hay documentos abiertos.
Si falta espacio en la barra, el botón puede aparecer dentro del menú **⋯**.

## Directorio y sesiones

- Usa la raíz del proyecto del archivo activo, no la subcarpeta del archivo.
- En workspaces multirraíz, selecciona la carpeta correspondiente al archivo activo.
- Si no hay un archivo asociado, usa la última carpeta utilizada; en caso de
  ambigüedad, pregunta qué carpeta abrir.
- Cada carpeta tiene su propia terminal. Volver a pulsar el botón enfoca la
  existente, sin lanzar otro proceso Pi.
- Cerrar la terminal permite iniciar una nueva sesión con el botón.
- Si sales de Pi pero dejas la shell abierta, escribe `pi` de nuevo o cierra esa
  terminal antes de usar el botón para crear una nueva.
- No ejecuta comandos en workspaces sin confianza ni en proyectos virtuales.
- En SSH, WSL y contenedores, Pi debe estar instalado en el entorno remoto.

Crea explícitamente una columna a la derecha, incluso si tu configuración de
apertura lateral es `down`. No modifica ninguna preferencia global.

## Desarrollo

```sh
npm ci
npm run check
npm test
npm run package
```

Pulsa **F5** para abrir una ventana de desarrollo de extensiones. Comprueba el
botón, la ubicación de la terminal y el inicio de Pi en un proyecto real.

No hay dependencias de ejecución. Las pruebas unitarias simulan la API de VS Code;
no sustituyen una comprobación visual dentro del editor.

El icono de la acción es el SVG de Pi obtenido de https://pi.dev/logo.svg.
Este proyecto es una integración independiente, no una extensión oficial de Pi.
