from flask import Flask, jsonify, send_file, request
from flask_cors import CORS
from dotenv import load_dotenv
import os
from firebase_admin import credentials, firestore, initialize_app
from backend.services.email_service import EmailService
from backend.services.pdf_generator import generate_pdf

# Cargar variables de entorno
load_dotenv()

# Inicializar Flask
app = Flask(__name__)
CORS(app)

# Configuración
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'default_secret_key')
app.config['DEBUG'] = os.getenv('DEBUG', 'False').lower() in ('true', '1', 't')

# Inicializar Firebase
cred = credentials.Certificate('backend/proyectoproga4AccountKey.json')
initialize_app(cred)
db = firestore.client()
app.config['FIRESTORE_DB'] = db

# Ruta principal
@app.route('/')
def index():
    return jsonify({
        'message': 'Welcome to TravelExperts API',
        'version': '1.0.0',
        'status': 'online'
    })

# Listar paquetes
@app.route('/api/packages', methods=['GET'])
def get_packages():
    packages = []
    docs = db.collection('packages').stream()
    for doc in docs:
        pkg = doc.to_dict()
        pkg['id'] = doc.id
        packages.append(pkg)
    return jsonify(packages), 200

# Agregar paquete y notificar a VIPs
@app.route('/api/add-package', methods=['POST'])
def add_package():
    data = request.get_json()
    package_data = {
        'destination': data.get('destination'),
        'price': data.get('price'),
        'duration': data.get('duration'),
        'features': data.get('features', []),
        'image': data.get('image')
    }

    # Guardar en Firestore
    package_ref = db.collection('packages').add(package_data)

    # Notificar a usuarios VIP
    email_service = EmailService()
    email_service.send_vip_notification(package_data)

    return jsonify({"message": "Paquete agregado", "id": package_ref[1].id}), 200

# Generar PDF y enviar correo
@app.route('/api/generate-pdf', methods=['POST'])
def generate_pdf_endpoint():
    data = request.get_json()
    user_id = data.get('userId')
    package_id = data.get('packageId')
    package_name = data.get('packageName')
    price = data.get('price')
    email = data.get('email')

    package_data = {
        'destination': package_name,
        'price': price,
        'duration': data.get('duration', 'No especificado')
    }

    pdf_path = f"comprobante_{package_id}.pdf"
    generate_pdf(pdf_path=pdf_path, user_id=user_id, package_id=package_id, package_name=package_name, price=price, email=email)

    email_service = EmailService()
    email_service.send_booking_confirmation(email, package_id, package_data, pdf_path)

    return send_file(pdf_path, as_attachment=True)

# Manejadores de errores
@app.errorhandler(404)
def not_found(error):
    return jsonify({'message': 'Resource not found!'}), 404

@app.errorhandler(500)
def server_error(error):
    return jsonify({'message': 'Internal server error!'}), 500

if __name__ == '__main__':
    host = os.getenv('HOST', '0.0.0.0')
    port = int(os.getenv('PORT', 5000))
    app.run(host=host, port=port)