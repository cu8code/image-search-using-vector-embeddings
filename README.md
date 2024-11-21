# Image Search Engine

This repository contains an **Image Search Engine** built using **Next.js** for the frontend and **Flask** for the backend. The backend leverages the **OpenAI CLIP model** for image processing and search capabilities.

---

## 🚀 Features

- **Fast Image Retrieval**: Utilizes the power of OpenAI's CLIP model for efficient image search.
- **Frontend**: Built with Next.js for a modern, responsive user experience.
- **Backend**: Powered by Flask to handle image embedding and search logic.
- **Easy Setup**: Simple instructions to get started.

---

## 🛠️ Installation and Setup

### Prerequisites

Ensure you have the following installed:
- **Node.js** and **npm**
- **Python 3.7+**
- **Pip** (Python package installer)

### 1. Clone the Repository

```bash
git clone https://github.com/image-search-using-vector-embeddings/image-search-engine.git
cd image-search-engine
```

### 2. Install Frontend Dependencies

Navigate to the root directory and install dependencies:

```bash
npm install
```

### 3. Set Up the Backend

Navigate to the backend folder and install Python dependencies:

```bash
cd backend
pip install -r requirements.txt
```

### 4. Run the Backend

Start the Flask server:

```bash
python app.py
```

The backend will be available at `http://127.0.0.1:5000`.

### 5. Run the Frontend

Go back to the root directory and start the Next.js application:

```bash
npm run dev
```

The frontend will be available at `http://localhost:3000`.

---

## 🖥️ Usage

1. Upload images or search for images using natural language queries.
2. The backend processes the queries and returns the most relevant results.

---

## 🤝 Contributing

Contributions are welcome! Follow these steps:

1. Fork the repository.
2. Create a new branch (`git checkout -b feature-name`).
3. Commit your changes (`git commit -m "Add feature"`).
4. Push to the branch (`git push origin feature-name`).
5. Open a pull request.

---

## 🛡️ License

This project is licensed under the [MIT License](LICENSE).

---

## 🙌 Acknowledgments

- **OpenAI CLIP Model** for powering the image search functionality.
- The open-source community for their continuous support.

---

Feel free to reach out for suggestions or issues! 😊
