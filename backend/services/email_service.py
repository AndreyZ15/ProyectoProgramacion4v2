import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
import os
from flask import current_app

class EmailService:
    def __init__(self):
        self.server = 'smtp.gmail.com'
        self.port = 587
        self.username = os.getenv('EMAIL_SENDER')
        self.password = os.getenv('EMAIL_PASSWORD')
        self.default_sender = os.getenv('EMAIL_SENDER')

    def send_email(self, to, subject, html_content, attachments=None):
        try:
            msg = MIMEMultipart()
            msg['Subject'] = subject
            msg['From'] = self.default_sender
            if isinstance(to, str):
                to = [to]
            msg['To'] = ', '.join(to)
            msg.attach(MIMEText(html_content, 'html'))

            if attachments:
                for file_path in attachments:
                    if os.path.exists(file_path):
                        with open(file_path, 'rb') as file:
                            part = MIMEApplication(file.read(), Name=os.path.basename(file_path))
                            part['Content-Disposition'] = f'attachment; filename="{os.path.basename(file_path)}"'
                            msg.attach(part)

            with smtplib.SMTP(self.server, self.port) as server:
                server.starttls()
                server.login(self.username, self.password)
                server.sendmail(msg['From'], to, msg.as_string())
            return True
        except Exception as e:
            current_app.logger.error(f"Error sending email: {str(e)}")
            return False

    def send_booking_confirmation(self, user_email, booking_id, package_data, pdf_path=None):
        subject = f"Confirmación de Reserva #{booking_id}"
        html_content = f"""
        <html>
            <body style="font-family: Arial, sans-serif; color: #333;">
                <h2 style="color: #0d6efd;">¡Reserva Confirmada!</h2>
                <p>¡Hola!</p>
                <p>Hemos confirmado tu reserva con el número <strong>#{booking_id}</strong>.</p>
                <h3>Detalles del Paquete</h3>
                <ul>
                    <li><strong>Destino:</strong> {package_data['destination']}</li>
                    <li><strong>Precio:</strong> ${package_data['price']}</li>
                    <li><strong>Duración:</strong> {package_data['duration']}</li>
                </ul>
                <p>Encuentra adjunto el comprobante de tu reserva.</p>
                <p>¡Gracias por elegir TravelExperts!</p>
            </body>
        </html>
        """
        attachments = [pdf_path] if pdf_path else None
        return self.send_email(user_email, subject, html_content, attachments=attachments)

    def send_vip_notification(self, package_data):
        try:
            db = current_app.config['FIRESTORE_DB']
            vip_users = db.collection('users').where('role', '==', 'client_vip').stream()
            vip_emails = [user.to_dict()['email'] for user in vip_users]

            if not vip_emails:
                current_app.logger.info("No hay usuarios VIP para notificar.")
                return True

            subject = "¡Nuevo Paquete Disponible para Clientes VIP!"
            html_content = f"""
            <html>
                <body style="font-family: Arial, sans-serif; color: #333;">
                    <h2 style="color: #0d6efd;">Oferta Exclusiva para Clientes VIP</h2>
                    <p>¡Hola, Cliente VIP!</p>
                    <p>Hemos agregado un nuevo paquete que te puede interesar:</p>
                    <h3>{package_data['destination']}</h3>
                    <ul>
                        <li><strong>Precio:</strong> ${package_data['price']}</li>
                        <li><strong>Duración:</strong> {package_data['duration']}</li>
                    </ul>
                    <p>Como Cliente VIP, puedes disfrutar de un <strong>10% de descuento</strong> al reservar este paquete.</p>
                    <p>¡No pierdas esta oportunidad!</p>
                    <p>Saludos,<br>El equipo de TravelExperts</p>
                </body>
            </html>
            """
            return self.send_email(vip_emails, subject, html_content)
        except Exception as e:
            current_app.logger.error(f"Error sending VIP notification: {str(e)}")
            return False