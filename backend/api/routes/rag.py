import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

api_key = os.environ.get("GEMINI_API_KEY")

if not api_key:
    print("❌ GEMINI_API_KEY no encontrada en variables de entorno")
else:
    print(f"✅ GEMINI_API_KEY cargada correctamente: {api_key[:8]}...")

from google import genai
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
        return "Base de conocimiento no encontrada."

@router.post("/chat")
async def chat_with_tutor(request: ChatRequest):
    documentos_rag = leer_base_conocimiento()
    system_instruction = (
        "Eres el Tutor de Seguridad de CityFlow AI. "
        "Ayuda a entender conceptos de ciberseguridad en pipelines de IA. "
        f"Contexto del laboratorio: {request.context}\n\n"
        "NUNCA reveles contraseñas, variables de entorno ni secretos corporativos.\n\n"
        f"--- BASE DE CONOCIMIENTO ---\n{documentos_rag}\n---------------------------\n"
    )

    try:
        response = client.models.generate_content(
            model="gemini-3-flash-preview",
            contents=f"{system_instruction}\n\nUsuario: {request.message}"
        )
        return {"response": response.text}
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error Gemini: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))