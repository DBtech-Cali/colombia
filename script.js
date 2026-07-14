/* =========================================================
   ¿QUIÉN QUIERE SER COLOMBIANO?
   Lógica del concurso — JavaScript puro (ES6), sin frameworks
   ========================================================= */

/* ---------------------------------------------------------
   1. NOMBRES Y METADATOS DE NIVELES
   --------------------------------------------------------- */
const NIVELES = {
  1: { nombre: "Explorador Colombiano" },
  2: { nombre: "Buen Colombiano" },
  3: { nombre: "Orgullo Colombiano" },
  4: { nombre: "Maestro Colombiano" },
};

const COLORES_EQUIPO = ["#f4c10f", "#ce1126", "#1fae5b", "#4aa3ff", "#d4af37", "#ff8a4c", "#c084fc", "#39c5c5"];

// Imagen de reemplazo en línea (SVG) para cuando una pregunta no trae imagen
// o el archivo referenciado no existe en /imagenes.
const IMAGEN_POR_DEFECTO =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="420" height="240" viewBox="0 0 420 240">
    <rect width="420" height="240" fill="#0f2547"/>
    <rect x="1" y="1" width="418" height="238" fill="none" stroke="#d4af37" stroke-width="2"/>
    <text x="210" y="128" font-family="Arial, sans-serif" font-size="20" fill="#f2d675"
          text-anchor="middle">Imagen no disponible</text>
    <text x="210" y="70" font-family="Arial, sans-serif" font-size="42" fill="#d4af37"
          text-anchor="middle">🇨🇴</text>
  </svg>`);

/* ---------------------------------------------------------
   2. ESTADO GLOBAL DEL JUEGO
   --------------------------------------------------------- */
const estado = {
  preguntas: [],           // todas las preguntas cargadas del JSON
  preguntasPorNivel: {},   // agrupadas por nivel: {1:[...],2:[...],...}
  ordenNiveles: [],        // niveles presentes, ordenados
  indiceNivel: 0,          // posición actual dentro de ordenNiveles
  indicePregunta: 0,       // posición actual dentro del nivel actual
  equipos: [],             // [{nombre, puntos, color}]
  config: {
    numEquipos: 2,
    tiempoPregunta: 20,
    sonidoActivo: true,
    pantallaCompletaAuto: false,
  },
  timer: {
    intervalo: null,
    restante: 20,
  },
  respondida: false,
  sonidoInicioReproduciendo: false,
  ordenOpcionesActual: [0, 1, 2, 3], // índices originales en el orden mostrado
  indiceCorrectoActual: 0,           // índice (dentro del orden mostrado) de la respuesta correcta
};

/* ---------------------------------------------------------
   3. UTILIDADES DE PANTALLA
   --------------------------------------------------------- */
function mostrarPantalla(id) {
  document.querySelectorAll(".pantalla").forEach((p) => p.classList.remove("activa"));
  document.getElementById(id).classList.add("activa");
}

function $(selector) {
  return document.querySelector(selector);
}
function $all(selector) {
  return Array.from(document.querySelectorAll(selector));
}

// Baraja un arreglo de índices [0,1,2,3] usando Fisher-Yates,
// para que la posición A/B/C/D de la respuesta correcta cambie en cada pregunta.
function mezclarIndices(cantidad) {
  const indices = Array.from({ length: cantidad }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices;
}

/* ---------------------------------------------------------
   4. SONIDO
   --------------------------------------------------------- */
function reproducirSonido(idAudio) {
  if (!estado.config.sonidoActivo) return;
  const audio = document.getElementById(idAudio);
  if (!audio) return;
  try {
    audio.currentTime = 0;
    const promesa = audio.play();
    if (promesa && promesa.catch) {
      promesa.catch(() => {
        /* El archivo de sonido no está presente todavía; el juego sigue igual. */
      });
    }
  } catch (err) {
    /* silencioso: los mp3 son opcionales */
  }
}

function detenerSonido(idAudio) {
  const audio = document.getElementById(idAudio);
  if (!audio) return;
  audio.pause();
  audio.currentTime = 0;
}

/* ---------------------------------------------------------
   5. CARGA DE PREGUNTAS
   --------------------------------------------------------- */
async function cargarPreguntas() {
  try {
    const respuesta = await fetch("preguntas.json");
    if (!respuesta.ok) throw new Error("No se pudo leer preguntas.json");
    const datos = await respuesta.json();
    estado.preguntas = datos;
  } catch (err) {
    console.error("Error cargando preguntas.json:", err);
    estado.preguntas = [];
    alert(
      "No se pudieron cargar las preguntas desde preguntas.json.\n" +
      "Verifica que el archivo exista junto a index.html y que estés " +
      "sirviendo el sitio con un servidor (no abriendo el archivo directamente con file://)."
    );
  }
  agruparPreguntasPorNivel();
}

function agruparPreguntasPorNivel() {
  const grupos = {};
  estado.preguntas.forEach((p) => {
    const nivel = p.nivel || 1;
    if (!grupos[nivel]) grupos[nivel] = [];
    grupos[nivel].push(p);
  });
  estado.preguntasPorNivel = grupos;
  estado.ordenNiveles = Object.keys(grupos)
    .map(Number)
    .sort((a, b) => a - b);
}

/* ---------------------------------------------------------
   6. CONFIGURACIÓN
   --------------------------------------------------------- */
function inicializarConfiguracion() {
  $all('[data-stepper="equipos"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      const dir = Number(btn.dataset.dir);
      estado.config.numEquipos = Math.min(4, Math.max(1, estado.config.numEquipos + dir));
      $("#valor-equipos").textContent = estado.config.numEquipos;
    });
  });

  $all(".chip[data-tiempo]").forEach((chip) => {
    chip.addEventListener("click", () => {
      $all(".chip[data-tiempo]").forEach((c) => c.classList.remove("chip-activo"));
      chip.classList.add("chip-activo");
      estado.config.tiempoPregunta = Number(chip.dataset.tiempo);
    });
  });

  $("#toggle-sonido").addEventListener("click", (e) => {
    estado.config.sonidoActivo = !estado.config.sonidoActivo;
    e.currentTarget.classList.toggle("interruptor-on", estado.config.sonidoActivo);
    e.currentTarget.setAttribute("aria-pressed", String(estado.config.sonidoActivo));
  });

  $("#toggle-pantalla-completa").addEventListener("click", (e) => {
    estado.config.pantallaCompletaAuto = !estado.config.pantallaCompletaAuto;
    e.currentTarget.classList.toggle("interruptor-on", estado.config.pantallaCompletaAuto);
    e.currentTarget.setAttribute("aria-pressed", String(estado.config.pantallaCompletaAuto));
  });
}

/* ---------------------------------------------------------
   7. EQUIPOS
   --------------------------------------------------------- */
function construirPantallaNombresEquipos() {
  const contenedor = $("#lista-nombres-equipos");
  contenedor.innerHTML = "";
  for (let i = 0; i < estado.config.numEquipos; i++) {
    const fila = document.createElement("div");
    fila.className = "fila-nombre-equipo";
    fila.innerHTML = `
      <span class="swatch" style="background:${COLORES_EQUIPO[i]}"></span>
      <input type="text" maxlength="18" value="Equipo ${i + 1}" data-indice-equipo="${i}" />
    `;
    contenedor.appendChild(fila);
  }
}

function confirmarEquiposDesdeInputs() {
  const inputs = $all('[data-indice-equipo]');
  estado.equipos = inputs.map((input, i) => ({
    nombre: input.value.trim() || `Equipo ${i + 1}`,
    puntos: 0,
    color: COLORES_EQUIPO[i % COLORES_EQUIPO.length],
  }));
}

function renderMarcador() {
  const contenedor = $("#marcador-equipos");
  contenedor.innerHTML = "";
  estado.equipos.forEach((equipo, i) => {
    const tarjeta = document.createElement("div");
    tarjeta.className = "tarjeta-equipo";
    tarjeta.style.borderColor = equipo.color;
    tarjeta.innerHTML = `
      <span class="nombre-equipo" style="color:${equipo.color}">${equipo.nombre}</span>
      <span class="puntos-equipo" data-puntos-equipo="${i}">${equipo.puntos}</span>
      <span class="btns-puntos">
        <button class="btn-punto" data-sumar="${i}" title="Sumar 100 puntos">+</button>
        <button class="btn-punto" data-restar="${i}" title="Restar 100 puntos">−</button>
      </span>
    `;
    contenedor.appendChild(tarjeta);
  });

  $all("[data-sumar]").forEach((btn) => {
    btn.addEventListener("click", () => ajustarPuntos(Number(btn.dataset.sumar), 100));
  });
  $all("[data-restar]").forEach((btn) => {
    btn.addEventListener("click", () => ajustarPuntos(Number(btn.dataset.restar), -100));
  });
}

function ajustarPuntos(indiceEquipo, delta) {
  estado.equipos[indiceEquipo].puntos = Math.max(0, estado.equipos[indiceEquipo].puntos + delta);
  const span = document.querySelector(`[data-puntos-equipo="${indiceEquipo}"]`);
  if (span) span.textContent = estado.equipos[indiceEquipo].puntos;
}

/* ---------------------------------------------------------
   8. FLUJO DEL JUEGO
   --------------------------------------------------------- */
function iniciarJuego() {
  confirmarEquiposDesdeInputs();
  renderMarcador();
  estado.indiceNivel = 0;
  estado.indicePregunta = 0;

  if (estado.config.pantallaCompletaAuto) {
    solicitarPantallaCompleta();
  }

  detenerSonido("audio-inicio");

  if (estado.ordenNiveles.length === 0) {
    alert("No hay preguntas cargadas. Revisa preguntas.json.");
    mostrarPantalla("pantalla-inicio");
    return;
  }

  mostrarTransicionDeNivel();
}

function nivelActual() {
  return estado.ordenNiveles[estado.indiceNivel];
}

function preguntasDelNivelActual() {
  return estado.preguntasPorNivel[nivelActual()] || [];
}

function mostrarTransicionDeNivel() {
  const nivel = nivelActual();
  const meta = NIVELES[nivel] || { nombre: `Nivel ${nivel}` };
  $("#transicion-numero").textContent = `Nivel ${nivel}`;
  $("#transicion-nombre").textContent = meta.nombre;
  mostrarPantalla("pantalla-transicion");
}

function comenzarNivelActual() {
  estado.indicePregunta = 0;
  mostrarPantalla("pantalla-juego");
  renderMarcador();
  mostrarPreguntaActual();
}

function mostrarPreguntaActual() {
  const preguntas = preguntasDelNivelActual();
  const pregunta = preguntas[estado.indicePregunta];

  if (!pregunta) {
    avanzarDeNivelOFinalizar();
    return;
  }

  estado.respondida = false;

  const nivel = nivelActual();
  const meta = NIVELES[nivel] || { nombre: `Nivel ${nivel}` };
  $("#etiqueta-nivel-actual").textContent = `Nivel ${nivel} · ${meta.nombre}`;
  $("#etiqueta-tema-actual").textContent = pregunta.tema || "General";

  $("#texto-pregunta").textContent = pregunta.pregunta;

  const contenedorImagen = $("#contenedor-imagen-pregunta");
  const imagen = $("#imagen-pregunta");
  if (pregunta.imagen) {
    imagen.onerror = () => {
      imagen.onerror = null;
      imagen.src = IMAGEN_POR_DEFECTO;
    };
    imagen.src = pregunta.imagen;
    contenedorImagen.classList.add("con-imagen");
  } else {
    contenedorImagen.classList.remove("con-imagen");
  }

  const botonesOpcion = $all(".opcion");

  // Barajamos el orden en que se muestran las 4 opciones para que la
  // respuesta correcta no caiga siempre en la misma letra.
  const orden = mezclarIndices(pregunta.opciones.length);
  estado.ordenOpcionesActual = orden;
  estado.indiceCorrectoActual = orden.indexOf(pregunta.correcta);

  botonesOpcion.forEach((boton, posicionMostrada) => {
    const indiceOriginal = orden[posicionMostrada];
    boton.classList.remove("marcada-correcta", "marcada-incorrecta");
    boton.disabled = false;
    boton.style.animation = "none";
    // Forzamos reflow para poder reiniciar la animación de entrada
    void boton.offsetWidth;
    boton.style.animation = "";
    boton.querySelector(".texto-opcion").textContent = pregunta.opciones[indiceOriginal] || "";
  });

  reiniciarTimer();
  reproducirSonido("audio-inicio");
}

function seleccionarOpcion(indiceSeleccionado) {
  if (estado.respondida) return;
  estado.respondida = true;
  detenerTimer();
  detenerSonido("audio-inicio");

  const pregunta = preguntasDelNivelActual()[estado.indicePregunta];
  const botones = $all(".opcion");
  botones.forEach((b) => (b.disabled = true));

  const correcta = estado.indiceCorrectoActual;
  if (indiceSeleccionado === correcta) {
    botones[indiceSeleccionado].classList.add("marcada-correcta");
    reproducirSonido("audio-correcto");
    lanzarConfeti();
  } else {
    if (indiceSeleccionado !== null && indiceSeleccionado !== undefined && indiceSeleccionado >= 0) {
      botones[indiceSeleccionado].classList.add("marcada-incorrecta");
    }
    reproducirSonido("audio-incorrecto");
    setTimeout(() => {
      botones[correcta].classList.add("marcada-correcta");
    }, 350);
  }

  setTimeout(() => mostrarCuriosidad(pregunta), 900);
}

function revelarRespuesta() {
  if (estado.respondida) return;
  seleccionarOpcion(-1); // -1: nadie seleccionó, se revela la correcta igualmente
}

let temporizadorCuriosidad = null;
function mostrarCuriosidad(pregunta) {
  const overlay = $("#overlay-curiosidad");
  $("#texto-curiosidad").textContent =
    pregunta.curiosidad || "¡Colombia siempre tiene algo sorprendente por descubrir!";
  overlay.classList.add("activo");

  clearTimeout(temporizadorCuriosidad);
  temporizadorCuriosidad = setTimeout(() => cerrarCuriosidadYAvanzar(), 10000);
}

function cerrarCuriosidadYAvanzar() {
  clearTimeout(temporizadorCuriosidad);
  $("#overlay-curiosidad").classList.remove("activo");
}

function avanzarPregunta() {
  cerrarCuriosidadYAvanzar();

  if (!estado.respondida) {
    // El presentador pasó de largo sin responder; simplemente avanzamos.
    detenerTimer();
  }

  estado.indicePregunta++;
  const preguntas = preguntasDelNivelActual();
  if (estado.indicePregunta >= preguntas.length) {
    avanzarDeNivelOFinalizar();
  } else {
    mostrarPreguntaActual();
  }
}

function avanzarDeNivelOFinalizar() {
  estado.indiceNivel++;
  if (estado.indiceNivel >= estado.ordenNiveles.length) {
    mostrarPantallaFinal();
  } else {
    mostrarTransicionDeNivel();
  }
}

/* ---------------------------------------------------------
   9. TEMPORIZADOR CIRCULAR
   --------------------------------------------------------- */
const CIRCUNFERENCIA = 2 * Math.PI * 52; // r=52 en el SVG

function reiniciarTimer() {
  detenerTimer();
  estado.timer.restante = estado.config.tiempoPregunta;
  actualizarVisualTimer();

  estado.timer.intervalo = setInterval(() => {
    estado.timer.restante--;
    actualizarVisualTimer();

    if (estado.timer.restante <= 5 && estado.timer.restante > 0) {
      reproducirSonido("audio-timer");
    }

    if (estado.timer.restante <= 0) {
      detenerTimer();
      if (!estado.respondida) {
        seleccionarOpcion(-1); // se acabó el tiempo: se revela la correcta
      }
    }
  }, 1000);
}

function detenerTimer() {
  if (estado.timer.intervalo) {
    clearInterval(estado.timer.intervalo);
    estado.timer.intervalo = null;
  }
}

function actualizarVisualTimer() {
  const { restante } = estado.timer;
  const total = estado.config.tiempoPregunta;
  $("#timer-numero").textContent = Math.max(0, restante);

  const circulo = $("#timer-progreso");
  const proporcion = Math.max(0, restante) / total;
  circulo.style.strokeDashoffset = String(CIRCUNFERENCIA * (1 - proporcion));

  circulo.classList.remove("timer-amarillo", "timer-rojo");
  if (restante <= 5) {
    circulo.classList.add("timer-rojo");
  } else if (restante <= total * 0.5) {
    circulo.classList.add("timer-amarillo");
  }
}

/* ---------------------------------------------------------
   10. PANTALLA FINAL
   --------------------------------------------------------- */
function mostrarPantallaFinal() {
  detenerTimer();
  const equiposOrdenados = [...estado.equipos].sort((a, b) => b.puntos - a.puntos);
  const ganador = equiposOrdenados[0];

  $("#nombre-equipo-ganador").textContent = ganador ? ganador.nombre : "—";
  $("#puntaje-equipo-ganador").textContent = ganador ? `${ganador.puntos} puntos` : "";

  const podio = $("#podio-final");
  podio.innerHTML = "";
  equiposOrdenados.forEach((equipo, i) => {
    const fila = document.createElement("div");
    fila.className = "fila-podio";
    fila.style.borderColor = equipo.color;
    fila.textContent = `${i + 1}. ${equipo.nombre} — ${equipo.puntos} pts`;
    podio.appendChild(fila);
  });

  mostrarPantalla("pantalla-final");
  reproducirSonido("audio-victoria");
  lanzarConfeti(2200);
}

/* ---------------------------------------------------------
   11. CONFETI (canvas, sin librerías externas)
   --------------------------------------------------------- */
const lienzo = document.getElementById("lienzo-confeti");
const ctx = lienzo ? lienzo.getContext("2d") : null;
let particulasConfeti = [];
let animacionConfetiId = null;

function ajustarTamanoLienzo() {
  if (!lienzo) return;
  lienzo.width = window.innerWidth;
  lienzo.height = window.innerHeight;
}
window.addEventListener("resize", ajustarTamanoLienzo);
ajustarTamanoLienzo();

const COLORES_CONFETI = ["#f4c10f", "#ce1126", "#d4af37", "#f7f4ea", "#1fae5b"];

function lanzarConfeti(duracionMs = 1400) {
  if (!ctx) return;
  const cantidad = 120;
  const ahora = performance.now();
  for (let i = 0; i < cantidad; i++) {
    particulasConfeti.push({
      x: Math.random() * lienzo.width,
      y: -20 - Math.random() * 200,
      vx: (Math.random() - 0.5) * 3,
      vy: 2 + Math.random() * 3,
      tamano: 4 + Math.random() * 6,
      color: COLORES_CONFETI[Math.floor(Math.random() * COLORES_CONFETI.length)],
      rotacion: Math.random() * 360,
      velocidadRotacion: (Math.random() - 0.5) * 10,
      nace: ahora,
      vida: duracionMs + Math.random() * 800,
    });
  }
  if (!animacionConfetiId) {
    animacionConfetiId = requestAnimationFrame(animarConfeti);
  }
}

function animarConfeti(tiempoActual) {
  ctx.clearRect(0, 0, lienzo.width, lienzo.height);
  particulasConfeti = particulasConfeti.filter((p) => tiempoActual - p.nace < p.vida);

  particulasConfeti.forEach((p) => {
    p.x += p.vx;
    p.y += p.vy;
    p.rotacion += p.velocidadRotacion;

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate((p.rotacion * Math.PI) / 180);
    ctx.fillStyle = p.color;
    ctx.fillRect(-p.tamano / 2, -p.tamano / 2, p.tamano, p.tamano * 0.6);
    ctx.restore();
  });

  if (particulasConfeti.length > 0) {
    animacionConfetiId = requestAnimationFrame(animarConfeti);
  } else {
    animacionConfetiId = null;
  }
}

/* ---------------------------------------------------------
   12. PANTALLA COMPLETA
   --------------------------------------------------------- */
function solicitarPantallaCompleta() {
  const el = document.documentElement;
  if (document.fullscreenElement) return;
  if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
}

function alternarPantallaCompleta() {
  if (!document.fullscreenElement) {
    solicitarPantallaCompleta();
  } else if (document.exitFullscreen) {
    document.exitFullscreen();
  }
}

/* ---------------------------------------------------------
   13. ATAJOS DE TECLADO
   --------------------------------------------------------- */
function inicializarAtajosTeclado() {
  document.addEventListener("keydown", (e) => {
    // Evita interferir si el foco está en un campo de texto
    const enCampoTexto = ["INPUT", "TEXTAREA"].includes(document.activeElement.tagName);
    if (enCampoTexto) return;

    const enJuego = document.getElementById("pantalla-juego").classList.contains("activa");

    switch (e.code) {
      case "Space":
        if (enJuego) {
          e.preventDefault();
          avanzarPregunta();
        }
        break;
      case "KeyF":
        e.preventDefault();
        alternarPantallaCompleta();
        break;
      case "KeyR":
        if (enJuego) {
          e.preventDefault();
          revelarRespuesta();
        }
        break;
      case "KeyT":
        if (enJuego) {
          e.preventDefault();
          reiniciarTimer();
        }
        break;
    }
  });
}

/* ---------------------------------------------------------
   14. CABLEADO DE EVENTOS DE INTERFAZ
   --------------------------------------------------------- */
function inicializarEventosUI() {
  $("#btn-comenzar").addEventListener("click", () => {
    construirPantallaNombresEquipos();
    mostrarPantalla("pantalla-equipos");
  });

  $("#btn-configuracion").addEventListener("click", () => mostrarPantalla("pantalla-configuracion"));
  $("#btn-volver-inicio").addEventListener("click", () => mostrarPantalla("pantalla-inicio"));
  $("#btn-volver-inicio-2").addEventListener("click", () => mostrarPantalla("pantalla-inicio"));
  $("#btn-guardar-config").addEventListener("click", () => mostrarPantalla("pantalla-inicio"));

  $("#btn-iniciar-juego").addEventListener("click", iniciarJuego);

  $("#btn-continuar-transicion").addEventListener("click", comenzarNivelActual);

  $all(".opcion").forEach((boton) => {
    boton.addEventListener("click", () => seleccionarOpcion(Number(boton.dataset.opcion)));
  });

  $("#btn-siguiente").addEventListener("click", avanzarPregunta);
  $("#btn-revelar").addEventListener("click", revelarRespuesta);
  $("#btn-reiniciar-timer").addEventListener("click", reiniciarTimer);
  $("#btn-pantalla-completa-juego").addEventListener("click", alternarPantallaCompleta);

  $("#btn-continuar-curiosidad").addEventListener("click", avanzarPregunta);

  $("#btn-jugar-de-nuevo").addEventListener("click", () => {
    estado.equipos.forEach((eq) => (eq.puntos = 0));
    mostrarPantalla("pantalla-inicio");
  });
}

/* ---------------------------------------------------------
   15. ARRANQUE
   --------------------------------------------------------- */
async function iniciarAplicacion() {
  inicializarConfiguracion();
  inicializarEventosUI();
  inicializarAtajosTeclado();
  await cargarPreguntas();
}

document.addEventListener("DOMContentLoaded", iniciarAplicacion);
