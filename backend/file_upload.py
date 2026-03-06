from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
import os
import uuid
from PIL import Image
import io
from pathlib import Path

router = APIRouter()

UPLOAD_DIR = Path("/app/uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

# Allowed formats and max size
ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png'}
MAX_FILE_SIZE = 2 * 1024 * 1024  # 2 MB

def compress_image(image_data: bytes, max_size: int = 800) -> bytes:
    """Compress and resize image"""
    img = Image.open(io.BytesIO(image_data))
    
    # Convert RGBA to RGB if necessary
    if img.mode == 'RGBA':
        img = img.convert('RGB')
    
    # Resize if too large
    if max(img.size) > max_size:
        ratio = max_size / max(img.size)
        new_size = tuple(int(dim * ratio) for dim in img.size)
        img = img.resize(new_size, Image.Resampling.LANCZOS)
    
    # Compress
    output = io.BytesIO()
    img.save(output, format='JPEG', quality=85, optimize=True)
    return output.getvalue()

@router.post('/upload')
async def upload_file(file: UploadFile = File(...)):
    """Upload and compress image file"""
    
    # Validate file extension
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f'Invalid file format. Allowed: {", ".join(ALLOWED_EXTENSIONS)}'
        )
    
    # Read file content
    content = await file.read()
    
    # Validate file size
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f'File too large. Maximum size: 2MB'
        )
    
    try:
        # Compress image
        compressed_content = compress_image(content)
        
        # Generate unique filename
        unique_filename = f"{uuid.uuid4()}.jpg"
        file_path = UPLOAD_DIR / unique_filename
        
        # Save file
        with open(file_path, 'wb') as f:
            f.write(compressed_content)
        
        # Return URL
        file_url = f"/api/files/{unique_filename}"
        
        return {
            'success': True,
            'url': file_url,
            'filename': unique_filename,
            'original_name': file.filename,
            'size': len(compressed_content)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Failed to process image: {str(e)}')

@router.get('/files/{filename}')
async def get_file(filename: str):
    """Serve uploaded file"""
    file_path = UPLOAD_DIR / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail='File not found')
    
    return FileResponse(file_path, media_type='image/jpeg')

@router.delete('/files/{filename}')
async def delete_file(filename: str):
    """Delete uploaded file"""
    file_path = UPLOAD_DIR / filename
    
    if file_path.exists():
        os.remove(file_path)
        return {'success': True, 'message': 'File deleted'}
    
    raise HTTPException(status_code=404, detail='File not found')
