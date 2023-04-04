import { jsPDF } from "jspdf";
import axios from "axios";
import "jspdf-autotable";
import fs from "fs";

// URL de la API
// URL de la imagen de fondo
const imageUrl = "./fondo.jpg";
let tipo = "QUINCENA";
let fecha_inicio = "2023-03-23";
let fecha__fin = "2023-03-30";

const apiUrl = `http://192.168.1.8:3000/api/consulta?departamento=${tipo}&fecha_inicio=${fecha_inicio}&fecha_fin=${fecha__fin}`;

function imageToBase64(filePath) {
  const imageData = fs.readFileSync(filePath);
  const base64 = Buffer.from(imageData).toString("base64");
  return base64;
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

// Realizar petición GET a la API y obtener información en formato JSON
axios
  .get(apiUrl)
  .then((response) => {
    const data = response.data;
    //creacion de DOC
    var doc = new jsPDF({
      orientation: "portrait",
      unit: "in",
      format: [8.5, 11],
    });
  

    data.forEach((employee, index) => {
      for (let i = 1; i <= 2; i++) {
       if (index > -1) {
          doc.addPage();
          doc.addImage(
            imageToBase64("./fondo.jpg"),
            "JPEG",
            0,
            0,
            doc.internal.pageSize.width,
            doc.internal.pageSize.height
          );
        }

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
          "Registros del: " +
            getMonthName(fecha_inicio) +
            " al " +
            getMonthName(fecha__fin)
        );
        doc.setFontSize(16);

        //foto empleado

        let filePath = `./fotos/${employee.emp_code}.png`;
        var exist = "";
        if (fs.existsSync(filePath)) {
          exist = filePath;
        } else {
          exist = "./fotos/avatar-de-perfil.png";
        }
        doc.addImage(
          imageToBase64(exist),
          "PNG",
          0.8,
          doc.internal.pageSize.width,
          1.5,
          1.5
        );
        //Firma del empleado
        doc.setFontSize(12);
        doc.text(2.5, 9, employee.first_name + " " + employee.last_name);
        doc.setLineWidth(0.02); // Grosor de la línea
        doc.line(2.5, 9.1, 7, 9.1);
        doc.text(2.5, 9.3, "Nombre y Firma del Trabajador");
        doc.setFontSize(16);

        //leyenda de conformidad
        doc.setFontSize(10);
        var text =
          "El trabajador confirma que la impresión de su registro de entradas y salidas coincide fielmente con su horario de asistencias registrado digitalmente. Por lo tanto, ratifica el presente registro firmando de conformidad.";
        var lines = doc.splitTextToSize(text, 5); // dividir en líneas de 80 caracteres de ancho
        doc.text(lines, 2.5, 9.6);
        doc.setFontSize(16);

        var headers_punch_time = [["Fecha", "Hora", "Dispositivo"]];
        var data_punch_time = [];
        employee.punch_times.forEach(function (punch) {
          data_punch_time.push([
            getMonthName(punch.fecha),
            punch.hora,
            punch.checo_en,
          ]);
        });

        doc.autoTable({
          head: headers_punch_time,
          body: data_punch_time,
          startY: 2.1,
          startX: 0,
        });
      }
    });
    doc.deletePage(1);
    doc.save(`REPORTE_${tipo}_${fecha_inicio}_${fecha__fin}.pdf`);
  })
  .catch((error) => {
    console.error(error);
  });
