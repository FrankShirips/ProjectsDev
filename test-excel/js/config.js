/*
 * Configuración del instructor.
 * Edita este archivo para personalizar la plataforma sin tocar el resto del código.
 */
window.APP_CONFIG = {
  // Nombre que aparece en la cabecera y en el informe.
  academyName: "Academia Excel",
  instructorName: "Tu nombre",

  // Datos de contacto que se muestran al final del test.
  contactEmail: "",          // ej. "cursos@midominio.com" (habilita "Enviar por correo")
  whatsappNumber: "",        // ej. "573001234567" (código de país + número, sin "+")

  // URL de la aplicación web de Google Apps Script que guarda cada resultado
  // en una hoja de Google Sheets. Ver apps-script/Code.gs y el README.
  // Déjalo vacío si no quieres recopilar resultados automáticamente.
  resultsEndpoint: "",

  // Mostrar al estudiante qué preguntas acertó y la solución sugerida.
  showReview: true,

  // Porcentaje mínimo en un nivel para considerarlo "aprobado".
  // El nivel asignado es el más alto aprobado de forma consecutiva desde Básico.
  levelPassThreshold: 60,

  // Puntos por ítem según su nivel (los niveles altos pesan más en la nota).
  pointsPerLevel: { 1: 1, 2: 2, 3: 3, 4: 4 },

  // Umbrales para el estado de cada tema en la ruta de aprendizaje.
  topicMastered: 80,   // >= 80 %: Dominado
  topicReinforce: 50,  // >= 50 %: Reforzar; por debajo: Por aprender
};
