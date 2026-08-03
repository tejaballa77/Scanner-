import zlib, struct

def create_png(width, height, color_rgb):
    # PNG signature
    png_magic = b'\x89PNG\r\n\x1a\n'
    
    # IHDR chunk
    ihdr_data = struct.pack('!IIBBBBB', width, height, 8, 2, 0, 0, 0)
    ihdr_crc = zlib.crc32(b'IHDR' + ihdr_data)
    ihdr_chunk = struct.pack('!I', len(ihdr_data)) + b'IHDR' + ihdr_data + struct.pack('!I', ihdr_crc)
    
    # IDAT chunk (raw RGB image data)
    r, g, b = color_rgb
    raw_data = bytearray()
    for _ in range(height):
        raw_data.append(0) # Filter type 0
        raw_data.extend([r, g, b] * width)
        
    compressed_data = zlib.compress(raw_data)
    idat_crc = zlib.crc32(b'IDAT' + compressed_data)
    idat_chunk = struct.pack('!I', len(compressed_data)) + b'IDAT' + compressed_data + struct.pack('!I', idat_crc)
    
    # IEND chunk
    iend_crc = zlib.crc32(b'IEND')
    iend_chunk = struct.pack('!I', 0) + b'IEND' + struct.pack('!I', iend_crc)
    
    return png_magic + ihdr_chunk + idat_chunk + iend_chunk

# Create emerald green icons for PWA
with open('public/pwa-192x192.png', 'wb') as f:
    f.write(create_png(192, 192, (16, 185, 129)))

with open('public/pwa-512x512.png', 'wb') as f:
    f.write(create_png(512, 512, (16, 185, 129)))

with open('public/apple-touch-icon.png', 'wb') as f:
    f.write(create_png(180, 180, (16, 185, 129)))

print("PWA PNG icons created successfully.")
