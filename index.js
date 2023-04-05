import { jsPDF } from "jspdf";
import axios from "axios";
import "jspdf-autotable";
import fs from "fs";
import dotenv from 'dotenv';
dotenv.config();


// URL de la API
// URL de la imagen de fondo
const BACKGROUND_IMAGE_PATH = "./fondo.jpg";

function imageToBase64(filePath) {
  const imageData = fs.readFileSync(filePath);
  return imageData.toString("base64");
}
function getMonthName(dateString) {
  const date = new Date(dateString);
  const arr = dateString.split("-");
  const options = { month: "long" };
  return (
    arr[2] +
    " de " +
    date.toLocaleString("es", options).toLowerCase() +
    " de " +
    arr[0]
  );
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
  doc.text(6, 0.7, "N° Empleado: " + employee.emp_code);
  doc.text(6, 1, employee.position_name);
  doc.text(6, 1.3, employee.dept_name);

  doc.text(
    0.6,
    1.6,
    "Nombre: " + employee.first_name + " " + employee.last_name
  );
  doc.setFontSize(12);
  doc.text(
    0.6,
    2,
    "Registros del: " + getMonthName(startDate) + " al " + getMonthName(endDate)
  );
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
    : "./fotos/avatar-de-perfil.png";

  doc.addImage(
    imageToBase64(exist),
    "PNG",
    0.8,
    doc.internal.pageSize.width,
    1.5,
    1.5
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

function addPunchTimesTable(doc, employee, startY) {
  const headers_punch_time = [["Fecha", "Hora", "Dispositivo"]];
  const data_punch_time = employee.punch_times.map((punch) => [
    getMonthName(punch.fecha),
    punch.hora,
    punch.checo_en,
  ]);

  doc.autoTable({
    head: headers_punch_time,
    body: data_punch_time,
    startY: startY,
    startX: 0,
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
        orientation: "portrait",
        unit: "in",
        format: [8.5, 11],
      });

      data.forEach((employee,index) => {
        addBackgroundImage(doc, BACKGROUND_IMAGE_PATH);
        addEmployeeInfo(doc, employee, START_DATE, END_DATE);
        addEmployeePhoto(doc, employee.emp_code);
        addEmployeeSignature(employee, doc);
        addConformityLegend(doc);
        addPunchTimesTable(doc, employee, 2.1);
       
      });
      doc.deletePage(1)
      doc.save(`REPORTE_${REPORT_TYPE}_${START_DATE}_${END_DATE}.pdf`);

    })
    .catch((error) => {
      console.error(error);
    });
}



getReport("QUINCENA", "2023-03-23", "2023-03-30");


