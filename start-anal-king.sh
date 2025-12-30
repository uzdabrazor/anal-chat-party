#!/bin/bash

# ANAL KING LAUNCHER - Start the beast with full personality!
# Part of the UZDABRAZOR ecosystem 💎

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Banner
echo -e "${MAGENTA}"
cat << "EOF"
╔═════════════════════════════════╗
║    🔥 ANAL KING LAUNCHER 🔥    ║
║   Powered by $UZDABRAZOR 💎    ║
╚═════════════════════════════════╝
EOF
echo -e "${NC}"

# Default settings
MODEL="dolphin-mistral:7b"
EMBED_MODEL="nomic-embed-text:v1.5"
OLLAMA_URL="http://localhost:11434"
LISTEN="localhost:8000"
RAG_DIR=""
DEBUG=""
NAME="AnalKing"
CONTEXT_SIZE="4096"

# Help function
show_help() {
    cat << EOF
${CYAN}ANAL KING LAUNCHER - Start with full Anal King personality!${NC}

Usage: $0 [OPTIONS]

${YELLOW}Basic Options:${NC}
  --rag-dir PATH       Path to documents for RAG mode (optional)
  --listen HOST:PORT   Listen address (default: localhost:8000)
                       Use 0.0.0.0:8000 to share on network!
  --name NAME          Your username (default: AnalKing)
  --debug              Enable debug mode with all the gore
  --help               Show this help

${YELLOW}Advanced Options:${NC}
  --model MODEL        LLM model (default: dolphin-mistral:7b)
  --embed-model MODEL  Embedding model (default: nomic-embed-text:v1.5)
  --ollama-url URL     Ollama server URL (default: http://localhost:11434)
  --context-size SIZE  Context window size (default: 4096)

${YELLOW}Examples:${NC}
  ${GREEN}# Basic Anal King - pure chat party${NC}
  $0

  ${GREEN}# With RAG - load your codebase${NC}
  $0 --rag-dir ~/my-project

  ${GREEN}# Share on network with RAG${NC}
  $0 --listen 0.0.0.0:8000 --rag-dir ~/docs

  ${GREEN}# Debug mode with custom model${NC}
  $0 --debug --model llama3.2:3b --rag-dir ~/code

${MAGENTA}Links:${NC}
  Website: https://uzdabrazor.com
  GitHub: https://github.com/uzdabrazor/anal-chat-party
  X/Twitter: https://x.com/uzdabrazor

EOF
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --rag-dir)
            RAG_DIR="$2"
            shift 2
            ;;
        --listen)
            LISTEN="$2"
            shift 2
            ;;
        --name)
            NAME="$2"
            shift 2
            ;;
        --model)
            MODEL="$2"
            shift 2
            ;;
        --embed-model)
            EMBED_MODEL="$2"
            shift 2
            ;;
        --ollama-url)
            OLLAMA_URL="$2"
            shift 2
            ;;
        --context-size)
            CONTEXT_SIZE="$2"
            shift 2
            ;;
        --debug)
            DEBUG="--debug"
            shift
            ;;
        --help|-h)
            show_help
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Check if anal_king_prompt.txt exists
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROMPT_FILE="$SCRIPT_DIR/anal_king_prompt.txt"

if [ ! -f "$PROMPT_FILE" ]; then
    echo -e "${RED}Error: anal_king_prompt.txt not found at $PROMPT_FILE${NC}"
    echo "Make sure you're running this script from the project directory!"
    exit 1
fi

# Check if main.py exists
if [ ! -f "$SCRIPT_DIR/main.py" ]; then
    echo -e "${RED}Error: main.py not found!${NC}"
    echo "Make sure you're running this script from the project directory!"
    exit 1
fi

# Show configuration
echo -e "${CYAN}🔧 Configuration:${NC}"
echo -e "  Model: ${GREEN}$MODEL${NC}"
echo -e "  Listen: ${GREEN}$LISTEN${NC}"
echo -e "  Username: ${GREEN}$NAME${NC}"
echo -e "  Context Size: ${GREEN}$CONTEXT_SIZE${NC}"
if [ -n "$RAG_DIR" ]; then
    echo -e "  RAG Directory: ${GREEN}$RAG_DIR${NC}"
else
    echo -e "  RAG Mode: ${YELLOW}Disabled (pure chat mode)${NC}"
fi
if [ -n "$DEBUG" ]; then
    echo -e "  Debug: ${GREEN}Enabled${NC}"
fi
echo ""

# Build command
CMD="python3 $SCRIPT_DIR/main.py"
CMD="$CMD --model \"$MODEL\""
CMD="$CMD --embed-model \"$EMBED_MODEL\""
CMD="$CMD --ollama-url \"$OLLAMA_URL\""
CMD="$CMD --listen \"$LISTEN\""
CMD="$CMD --name \"$NAME\""
CMD="$CMD --context-size $CONTEXT_SIZE"
CMD="$CMD --system-prompt \"\$(cat '$PROMPT_FILE')\""

if [ -n "$RAG_DIR" ]; then
    CMD="$CMD --rag-dir \"$RAG_DIR\""
fi

if [ -n "$DEBUG" ]; then
    CMD="$CMD $DEBUG"
fi

# Show startup message
echo -e "${MAGENTA}🚀 Starting ANAL KING...${NC}"
echo ""

# Execute
eval $CMD
