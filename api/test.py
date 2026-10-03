from http.server import BaseHTTPRequestHandler
import json
import sys
import os

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        response = {
            "status": "OK",
            "python_version": sys.version,
            "cwd": os.getcwd(),
            "files": os.listdir(".") if os.path.exists(".") else []
        }
        self.wfile.write(json.dumps(response).encode('utf-8'))
