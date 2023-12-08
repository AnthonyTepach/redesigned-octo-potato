import { jsPDF } from "jspdf";
import axios from "axios";
import "jspdf-autotable";
import fs from "fs";
import dotenv from "dotenv";
dotenv.config();

// URL de la API
// URL de la imagen de fondo
const meses = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

function imageToBase64(filePath) {
  const imageData = fs.readFileSync(filePath);
  return imageData.toString("base64");
}
function obtenerNumeroSemana(fecha) {
  const fechanueva = new Date(fecha);
  const primerDia = new Date(fechanueva.getFullYear(), 0, 1);
  const diferencia = (fechanueva - primerDia) / 86400000;
  const numeroSemana = Math.ceil((diferencia + primerDia.getDay() + 1) / 7);
  return numeroSemana.toString();
}
function addBackgroundImage(doc, image_path) {
  if (image_path && fs.existsSync(image_path)) {
    doc.addPage();
    doc.addImage(
      imageToBase64(image_path),
      "JPEG",
      0,
      0,
      doc.internal.pageSize.width,
      doc.internal.pageSize.height
    );
  }
}
function addEmployeeInfo(doc, employee, startDate, endDate) {
  doc.text(9.1, 1.64, employee.emp_code);

  if (employee.position_name.length < 20) {
    doc.setFontSize(16);
    doc.text(7.12, 1.64, employee.position_name);
  } else {
    doc.setFontSize(12);
    doc.text(7.12, 1.64, employee.position_name);
    doc.setFontSize(16);
  }

  //doc.text(6, 1.3, employee.dept_name);

  doc.text(1.25, 1.64, employee.first_name + " " + employee.last_name);

  doc.text(2.8, 2.04, startDate.split("-")[2]);

  const fecha = new Date(endDate);
  fecha.setDate(fecha.getDate() - 1);
  var fechanueva = fecha.toISOString().substring(0, 10);
  
  doc.text(4, 2.04, fechanueva.split("-")[2]);
  //console.log( obtenerNumeroSemana(fechanueva));
  doc.text(1.35, 2.04, obtenerNumeroSemana(fechanueva));

  if (endDate.split("-")[1]==startDate.split("-")[1]){
    doc.text(6.5, 2.04, meses[endDate.split("-")[1] - 1]); // muestra el mes
  }else{
    //doc.text(6.5, 2.04, meses[endDate.split("-")[1] - 1]); // muestra el mes
    doc.text(6.5, 2.04, "Noviembre"); // muestra el mes
  }
 
  doc.text(9.3, 2.04, endDate.split("-")[0]);
  doc.setFontSize(12);
  doc.text(7.1, 6, employee.first_name + " " + employee.last_name);
  doc.setFontSize(16);
}

function addConformityLegend(doc) {
  doc.setFontSize(10);
  const text =
    "El trabajador confirma que la impresión de su registro de entradas y salidas coincide fielmente con su horario de asistencias registrado digitalmente. Por lo tanto, ratifica el presente registro firmando de conformidad.";
  const lines = doc.splitTextToSize(text, 5); // dividir en líneas de 80 caracteres de ancho
  doc.text(lines, 2.5, 9.6);
  doc.setFontSize(16);
}
function addEmployeePhoto(doc, emp_code) {
  let filePath = `./fotos/${emp_code}.png`;
  let exist = fs.existsSync(filePath)
    ? filePath
    : process.env.AVATAR_IMAGE_PATH;

  doc.addImage(
    imageToBase64(exist),
    "PNG",
    doc.internal.pageSize.width - 3,
    doc.internal.pageSize.height - 5.66,
    1.5,
    2
  );
}
function addEmployeeSignature(employee, doc) {
  doc.setFontSize(12);
  doc.text(2.5, 9, `${employee.first_name} ${employee.last_name}`);
  doc.setLineWidth(0.02); // Grosor de la línea
  doc.line(2.5, 9.1, 7, 9.1);
  doc.text(2.5, 9.3, "Nombre y Firma del Trabajador");
  doc.setFontSize(16);
}

function addPunchTimesTables(doc, employee, startY) {
  let color = [0, 0, 0];
  if (employee.dept_name === "SEMANA") {
    color = [60, 236, 218];
  } else if (employee.dept_name === "QUINCENA") {
    color = [241, 19, 34];
  }
  const headers_punch_time = [["Fecha", "Hora", "Dispositivo"]];
  const data_punch_time = employee.punch_times.map((punch) => [
    punch.fecha,
    punch.hora,
    punch.checo_en,
  ]); 

  // Divide los datos en dos conjuntos de filas
  const firstRows = data_punch_time.slice(0, 13);
  const secondRows = data_punch_time.slice(13);

  // Crea la primera tabla
  doc.autoTable({
    head: headers_punch_time,
    body: firstRows,
    styles: { fontSize: 11 },
    headStyles: { fontStyle: "bold", halign: "center", fillColor: color },
    tableWidth: "wrap",
    avoidFirstPage: true,
    startY: startY,
  });

  // Crea la segunda tabla
  doc.autoTable({
    head: headers_punch_time,
    body: secondRows,
    styles: { fontSize: 11 },
    headStyles: { fontStyle: "bold", halign: "center", fillColor: color },
    tableWidth: "wrap",
    avoidFirstPage: true,
    startY: startY,
    margin: { left: 3.5, right: 3.5 }, // La posición horizontal debe ser igual al ancho de la tabla anterior + 10
  });
}

function getReport(REPORT_TYPE, START_DATE, END_DATE) {
  axios
    .get(process.env.API_URL, {
    
      params: {
        departamento: REPORT_TYPE,
        fecha_inicio: START_DATE,
        fecha_fin: END_DATE,
      },
    })
    .then((response) => {
      const data = response.data;
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "in",
        format: [8.5, 11],
      });

      data.forEach((employee, index) => {
        if (REPORT_TYPE == "SEMANA") {
          addBackgroundImage(doc, process.env.BACKGROUND_IMAGE_SEM);
        } else if (REPORT_TYPE == "QUINCENA") {
          addBackgroundImage(doc, process.env.BACKGROUND_IMAGE_QUI);
        }

        addEmployeeInfo(doc, employee, START_DATE, END_DATE);
        addEmployeePhoto(doc, employee.emp_code);

        addPunchTimesTables(doc, employee, 2.5);
      });
      doc.deletePage(1);
      doc.save(`imprimir/REPORTE_${REPORT_TYPE}_${START_DATE}_${END_DATE}.pdf`);
    })
    .catch((error) => {
      console.error(error);
    });
}

const fecha1 = "2023-11-24";
const fecha2 = "2023-12-01";//poner un dia de más
getReport("SEMANA", fecha1, fecha2);
getReport("QUINCENA", fecha1, fecha2);