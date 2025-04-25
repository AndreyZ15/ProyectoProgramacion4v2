from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors

def generate_pdf(pdf_path, user_id, package_id, package_name, price, email):
    c = canvas.Canvas(pdf_path, pagesize=letter)
    c.setFont("Helvetica", 16)
    c.setFillColor(colors.black)
    c.drawString(100, 750, "Comprobante de Reserva")
    c.setFont("Helvetica", 12)
    c.drawString(100, 720, f"User ID: {user_id}")
    c.drawString(100, 700, f"Package ID: {package_id}")
    c.drawString(100, 680, f"Package Name: {package_name}")
    c.drawString(100, 660, f"Price: ${price}")
    c.drawString(100, 640, f"Email: {email}")
    c.save()