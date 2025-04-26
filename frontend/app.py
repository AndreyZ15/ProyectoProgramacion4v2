from flask import Flask, request, jsonify, render_template
from firebase_admin import credentials, firestore, initialize_app
from flask_cors import CORS
import jwt
from dotenv import load_dotenv
import os

# Cargar variables de entorno desde el archivo .env (si lo necesitas)
load_dotenv()

# Crear la aplicación Flask
app = Flask(
    __name__,
    template_folder="templates",  # Correcto: app.py está en frontend/, templates está en frontend/templates/
    static_folder="static"       # Correcto: app.py está en frontend/, static está en frontend/static/
)
CORS(app)

# Rutas para renderizar las páginas HTML
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/packages')
def packages():
    return render_template('packages.html')

@app.route('/destinations')
def destinations():
    return render_template('destinations.html')

@app.route('/booking')
def booking():
    return render_template('booking.html')

@app.route('/about')
def about():
    return render_template('about.html')

@app.route('/news')
def news():
    return render_template('news.html')

# Inicializar Firebase Admin para el backend
try:
    # app.py está en frontend/, necesitamos subir un nivel para llegar a la raíz donde está proyectoproga4AccountKey.json
    cred = credentials.Certificate(os.path.join(os.path.dirname(__file__), "..", "proyectoproga4AccountKey.json"))
    initialize_app(cred)
    db = firestore.client()
    print("Firebase inicializado correctamente")
except Exception as e:
    print(f"Error al inicializar Firebase: {str(e)}")
    raise

# Ruta para agregar un paquete
@app.route("/add_package", methods=["POST"])
def add_package():
    try:
        # Verificar el token de autenticación
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return jsonify({"message": "Token de autenticación requerido"}), 401

        token = auth_header.split(" ")[1]
        decoded_token = jwt.decode(token, options={"verify_signature": False})  # En producción, verifica la firma del token
        user_id = decoded_token.get("sub")

        # Verificar si el usuario es admin
        user_ref = db.collection("users").document(user_id).get()
        if not user_ref.exists or user_ref.to_dict().get("role") != "admin":
            return jsonify({"message": "No autorizado: Solo los administradores pueden agregar paquetes"}), 403

        # Obtener datos del paquete desde la solicitud
        data = request.get_json()
        if not data or not all(key in data for key in ["name", "description", "price"]):
            return jsonify({"message": "Faltan datos requeridos (name, description, price)"}), 400

        # Crear el documento del paquete en Firestore (Firestore genera el ID automáticamente)
        package_data = {
            "name": data["name"],
            "description": data["description"],
            "price": float(data["price"]),
            "createdAt": data.get("createdAt", firestore.SERVER_TIMESTAMP),
            "createdBy": user_id
        }

        # Guardar en la colección "packages"
        doc_ref = db.collection("packages").add(package_data)

        return jsonify({"message": "Paquete agregado con éxito", "package_id": doc_ref[1].id}), 200

    except Exception as e:
        return jsonify({"message": f"Error al agregar paquete: {str(e)}"}), 500

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)