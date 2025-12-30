#!/usr/bin/env python3
"""
Quick UI testing script - runs web server without Ollama
Only the homepage will be fully functional. Chat UI can be viewed but won't send messages.
"""

import uvicorn
from web_server import app

if __name__ == "__main__":
    print("🚀 Starting ANAL CHAT PARTY UI Test Server...")
    print("📍 Homepage: http://localhost:8000")
    print("💬 Chat UI: http://localhost:8000/chat")
    print("\n⚠️  Note: Chat won't work without Ollama, but you can view the design\n")

    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info"
    )
