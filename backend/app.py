import os
from flask import Flask, request, jsonify, send_file
import torch
from PIL import Image
from pathlib import Path
import shutil
from transformers import CLIPProcessor, CLIPModel
import numpy as np
from datetime import datetime
import sqlite3
import base64
from typing import Optional
from flask_cors import CORS

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

class ImageSearchEngine:
    def __init__(self, images_dir: str = "images", database_path: str = "image_database.db"):
        """Initialize the image search engine with a directory of images and database."""
        self.images_dir = Path(images_dir)
        self.images_dir.mkdir(exist_ok=True)
        self.database_path = database_path
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        
        # Load CLIP model and processor
        self.model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
        self.processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
        self.model.to(self.device)
        
        # Initialize database
        self._init_database()
        
    def _init_database(self):
        """Initialize SQLite database with necessary tables."""
        with sqlite3.connect(self.database_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS images (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    filename TEXT NOT NULL,
                    original_filename TEXT NOT NULL,
                    upload_date TIMESTAMP NOT NULL,
                    description TEXT,
                    embedding BLOB NOT NULL
                )
            """)
            conn.commit()

    def load_and_process_image(self, image_path: str) -> torch.Tensor:
        """Load and process a single image."""
        image = Image.open(image_path)
        inputs = self.processor(images=image, return_tensors="pt", padding=True)
        inputs['pixel_values'] = inputs['pixel_values'].to(self.device)
        return inputs

    def compute_image_embedding(self, image_path: str) -> np.ndarray:
        """Compute embedding for a single image."""
        inputs = self.load_and_process_image(image_path)
        with torch.no_grad():
            image_features = self.model.get_image_features(**inputs)
        return image_features.cpu().numpy().flatten()
    
    def compute_text_embedding(self, text: str) -> np.ndarray:
        """Compute embedding for a text query."""
        inputs = self.processor(text=text, return_tensors="pt", padding=True)
        inputs = {k: v.to(self.device) for k, v in inputs.items()}
        with torch.no_grad():
            text_features = self.model.get_text_features(**inputs)
        return text_features.cpu().numpy().flatten()

    def add_image(self, image_path: str, description: Optional[str] = None) -> dict:
        """Add a new image to the database and storage."""
        try:
            img = Image.open(image_path)
            img.verify()

            if description is None or description.strip() == "":
                description = "No description provided."
            
            original_filename = Path(image_path).name
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            new_filename = f"{timestamp}_{original_filename}"
            new_path = self.images_dir / new_filename

            shutil.copy2(image_path, new_path)
            embedding = self.compute_image_embedding(str(new_path))
            embedding_bytes = base64.b64encode(embedding.tobytes())
            
            with sqlite3.connect(self.database_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO images (filename, original_filename, upload_date, description, embedding)
                    VALUES (?, ?, ?, ?, ?)
                """, (new_filename, original_filename, datetime.now(), description, embedding_bytes))
                conn.commit()
            
            return {"success": True, "message": f"Image '{original_filename}' added successfully."}
            
        except Exception as e:
            return {"success": False, "error": str(e)}

    def get_all_images(self) -> list:
        """Get information about all stored images."""
        with sqlite3.connect(self.database_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT id, filename, original_filename, upload_date, description 
                FROM images
            """)
            results = [
                {
                    'id': row[0],
                    'filename': row[1],
                    'original_filename': row[2],
                    'upload_date': row[3],
                    'description': row[4],
                    'path': str(self.images_dir / row[1])
                }
                for row in cursor.fetchall()
            ]
            return results

    def search(self, query: str, top_k: int = 5):
        """Search for images matching the text query."""
        query_embedding = self.compute_text_embedding(query)
        results = []
        
        with sqlite3.connect(self.database_path) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id, filename, original_filename, description, embedding FROM images")
            
            for row in cursor.fetchall():
                id_, filename, original_filename, description, embedding_bytes = row
                embedding = np.frombuffer(
                    base64.b64decode(embedding_bytes), 
                    dtype=np.float32
                )
                
                similarity = np.dot(query_embedding, embedding) / \
                            (np.linalg.norm(query_embedding) * np.linalg.norm(embedding))
                
                results.append({
                    'id': id_,
                    'filename': filename,
                    'original_filename': original_filename,
                    'description': description,
                    'similarity': float(similarity),
                    'path': str(self.images_dir / filename)
                })
        
        # Sort by similarity
        results.sort(key=lambda x: x['similarity'], reverse=True)
        return results[:top_k]


search_engine = ImageSearchEngine()
@app.route('/add_image', methods=['POST'])
def add_image():
    try:
        file = request.files['image']
        description = request.form.get('description', '')

        # Define the directory and file path
        directory = 'temp'
        os.makedirs(directory, exist_ok=True)  # Ensure the directory exists
        file_path = os.path.join(directory, file.filename)
        file.save(file_path)
        search_engine.add_image(file_path, description)
        return jsonify({'message': 'File saved successfully', 'path': file_path}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/list_images', methods=['GET'])
def list_images():
    try:
        images = search_engine.get_all_images()
        return jsonify(images)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/search', methods=['GET'])
def search_images():
    try:
        query = request.args.get('query')
        top_k = int(request.args.get('top_k', 5))

        if not query:
            return jsonify({"success": False, "error": "Query parameter is required."}), 400

        results = search_engine.search(query, top_k)
        return jsonify(results)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/download_image/<int:image_id>', methods=['GET'])
def download_image(image_id):
    try:
        with sqlite3.connect(search_engine.database_path) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT filename FROM images WHERE id = ?", (image_id,))
            row = cursor.fetchone()

            if row:
                file_path = search_engine.images_dir / row[0]
                if file_path.exists():
                    return send_file(file_path, as_attachment=True)
        return jsonify({"success": False, "error": "Image not found."}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True)
