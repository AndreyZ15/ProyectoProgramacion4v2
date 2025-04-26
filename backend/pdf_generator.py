from reportlab.pdfgen import canvas
import sys
import json

def generate_pdf(data, output_path):
    c = canvas.Canvas(output_path)
    c.drawString(100, 750, "TravelExperts Reservation Confirmation")
    c.drawString(100, 730, f"Destino: {data['packageName']}")
    c.drawString(100, 710, f"Precio: ${data['price']}")
    c.drawString(100, 690, f"Duracion: {data['duration']}")
    c.drawString(100, 670, f"Fecha de inicio: {data['startDate']}")
    c.drawString(100, 650, f"Fecha de finalización: {data['endDate']}")
    c.save()

if __name__ == "__main__":
    data = json.loads(sys.argv[1])
    output_path = sys.argv[2]
    generate_pdf(data, output_path)