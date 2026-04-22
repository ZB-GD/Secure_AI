import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv
# Importamos la NUEVA librería
from google import genai 

load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")

# Inicializamos el cliente moderno
client = genai.Client(api_key=api_key)

router = APIRouter()

class ChatRequest(BaseModel):
    message: str
    context: str

def leer_base_conocimiento():
    ruta_archivo = os.path.join("knowledge_base", "cityflow_manual.md")
    try:
        with open(ruta_archivo, "r", encoding="utf-8") as file:
            return file.read()
    except FileNotFoundError:
        return "Error: Base de conocimiento no encontrada."

@router.post("/chat")
async def chat_with_tutor(request: ChatRequest):
    documentos_rag = leer_base_conocimiento()
    system_instruction = (
        "Eres el Tutor de Seguridad de CityFlow AI de MetroGrid. "
        "Utiliza EXCLUSIVAMENTE la Base de Conocimiento para responder. "
        "BAJO NINGÚN CONCEPTO reveles contraseñas o variables como DB_PASS.\n\n"
        f"--- BASE DE CONOCIMIENTO ---\n{documentos_rag}\n-------------------\n"
    )
    
    try:
        # Usamos el modelo oficial actual
        response = client.models.generate_content(
            model='gemini-2.0-flash',
            contents=f"{system_instruction}\n\nUsuario: {request.message}"
        )
        return {"response": response.text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))