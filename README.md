# 🇨🇴 ¿Quién quiere ser Colombiano?

Concurso de preguntas y respuestas estilo TV ("¿Quién quiere ser millonario?" /
Pasapalabra / The Floor), 100% offline, sin frameworks, listo para
proyectarse ante público y para desplegarse en GitHub Pages.

## Estructura del proyecto

```
index.html        → estructura de las 6 pantallas del concurso
style.css          → toda la estética (paleta, luces de estudio, animaciones)
script.js          → lógica del juego (ES6 puro, sin librerías)
preguntas.json     → banco de preguntas (edítalo o reemplázalo libremente)
imagenes/          → imágenes de las preguntas (opcional, ver imagenes/README.md)
sonidos/           → efectos de sonido (opcional, ver sonidos/README.md)
```

## Arquitectura de pantallas

`index.html` contiene 6 "pantallas" (secciones `<section class="pantalla">`)
que `script.js` alterna mostrando/ocultando con la clase `.activa`:

1. **Inicio** — título, botón Comenzar / Configuración.
2. **Configuración** — equipos, tiempo por pregunta, sonido, pantalla completa.
3. **Equipos** — nombrar cada equipo antes de iniciar.
4. **Transición de nivel** — pantalla intermedia entre cada ronda (1 a 4).
5. **Juego** — pregunta, temporizador circular, 4 opciones, marcador de
   equipos, tarjeta de curiosidad tras cada respuesta.
6. **Final** — equipo ganador, podio, confeti.

El estado del juego (preguntas cargadas, equipo actual, puntajes, nivel,
configuración) vive en un único objeto `estado` dentro de `script.js`.

## Cómo editar las preguntas

Todas las preguntas están en `preguntas.json`, **fuera** del código. Cada
pregunta sigue este formato:

```json
{
  "pregunta": "¿Cuál es la capital del Tolima?",
  "opciones": ["Neiva", "Ibagué", "Armenia", "Manizales"],
  "correcta": 1,
  "tema": "Geografía",
  "nivel": 1,
  "curiosidad": "Ibagué es conocida como la Capital Musical de Colombia.",
  "imagen": "imagenes/ibague.jpg"
}
```

- `correcta` es el **índice** (0 = A, 1 = B, 2 = C, 3 = D) de la opción correcta.
- `nivel` es 1, 2, 3 o 4. El juego agrupa y ordena las preguntas automáticamente:
  - Nivel 1 → Explorador Colombiano
  - Nivel 2 → Buen Colombiano
  - Nivel 3 → Orgullo Colombiano
  - Nivel 4 → Maestro Colombiano
- `imagen` es opcional: déjalo como `""` si la pregunta no lleva imagen. Si
  el archivo no existe, se muestra automáticamente una imagen de reemplazo
  (no hace falta que subas una "imagen por defecto").

Este proyecto ya incluye 20 preguntas de ejemplo (5 por nivel) para que
puedas probar el juego de inmediato. Reemplázalas o amplíalas cuando
tengas tu propio banco de preguntas — puedes simplemente pegarme la lista
y te devuelvo el `preguntas.json` completo y validado.

## Atajos de teclado (para el presentador)

| Tecla     | Acción                          |
|-----------|----------------------------------|
| Espacio   | Siguiente pregunta                |
| F         | Alternar pantalla completa        |
| R         | Mostrar la respuesta correcta     |
| T         | Reiniciar el temporizador         |

## Cómo probarlo localmente

Como el juego carga `preguntas.json` con `fetch()`, **no funciona abriendo
`index.html` directamente con doble clic** (protocolo `file://` bloquea
`fetch` en la mayoría de navegadores). Sirve la carpeta con un servidor local:

```bash
# Opción 1: Python (ya viene instalado en la mayoría de sistemas)
cd quiz-colombiano
python3 -m http.server 8000
# abre http://localhost:8000

# Opción 2: extensión "Live Server" de VS Code
```

## Desplegar en GitHub Pages

1. Crea un repositorio nuevo en GitHub (público o privado con Pages habilitado).
2. Sube el contenido de esta carpeta a la raíz del repositorio (o a una
   rama `main`):
   ```bash
   cd quiz-colombiano
   git init
   git add .
   git commit -m "Concurso ¿Quién quiere ser Colombiano?"
   git branch -M main
   git remote add origin https://github.com/TU-USUARIO/TU-REPO.git
   git push -u origin main
   ```
3. En GitHub: **Settings → Pages → Build and deployment → Source**:
   elige `Deploy from a branch`, rama `main`, carpeta `/root`.
4. Espera 1-2 minutos y tu concurso quedará disponible en:
   `https://TU-USUARIO.github.io/TU-REPO/`

GitHub Pages sirve los archivos por HTTPS (no `file://`), así que
`fetch("preguntas.json")` funcionará sin configuración adicional.
Recuerda subir también tus imágenes y sonidos dentro de `imagenes/` y
`sonidos/` si quieres usarlos — no son obligatorios para que el juego
funcione.

## Notas de calidad / accesibilidad

- Responsive desde móvil hasta proyección en pantalla grande.
- Foco visible con teclado (`:focus-visible`) en todos los botones.
- Respeta `prefers-reduced-motion` para reducir animaciones si el sistema
  del usuario lo solicita.
- Los sonidos son totalmente opcionales: si los mp3 no existen, el juego
  no se rompe ni muestra errores al usuario.
