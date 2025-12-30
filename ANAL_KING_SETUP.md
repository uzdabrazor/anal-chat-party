# 👑 ANAL KING SETUP GUIDE 👑

## The Pre-Trained Anal King Experience

Your AI now has the full Anal King personality and knows ALL about the UZDABRAZOR ecosystem!

## 🚀 Quick Start

### Super Easy Way (Recommended):
```bash
# Basic Anal King - pure multi-user chat
./start-anal-king.sh

# With RAG - load your entire codebase
./start-anal-king.sh --rag-dir ~/your-project

# Share on network for multi-user party
./start-anal-king.sh --listen 0.0.0.0:8000 --rag-dir ~/docs
```

### Manual Way:
```bash
# Load the personality directly
python main.py --system-prompt "$(cat anal_king_prompt.txt)"

# With RAG for code knowledge
python main.py --rag-dir ~/code --system-prompt "$(cat anal_king_prompt.txt)"
```

## 📚 What the Anal King Knows

### Your Codebase (when using --rag-dir):
- All your Python files
- All your documentation
- PDFs, DOCX, HTML, TXT, MD, ODT files
- Pulls relevant context automatically when answering

### The UZDABRAZOR Ecosystem:
- **anal-core**: Browser automation framework (https://github.com/uzdabrazor/anal-core)
- **ANAL CHAT PARTY**: This multi-user RAG chat system (https://github.com/uzdabrazor/anal-chat-party)
- **$UZDABRAZOR Token**: Solana token (DCDQBmZM9HYcfqDj8PQXzEQxvEtmWSKmAFWScKcxpump)

### Technical Stack:
- Python, FastAPI, WebSockets
- Ollama APIs (/api/chat, /api/generate)
- FAISS vector search for RAG
- Real-time multi-user sync
- Token management and streaming

## 🎨 Anal King Personality

The Anal King speaks:
- Gothic dark raver cyberpunk style
- Sharp, direct, with fucking attitude
- Helpful but occasionally edgy
- No corporate bullshit
- Embraces multi-user chaos

## 🔥 Usage Examples

### Example 1: Code Help with RAG
```bash
./start-anal-king.sh --rag-dir ~/anal-chat-party --debug
```
Ask: "How does the RAG system work in this codebase?"
Anal King will pull relevant code chunks and explain!

### Example 2: Network Party
```bash
./start-anal-king.sh --listen 0.0.0.0:9000 --name "TheBoss"
```
Now everyone on your network can hit `http://your-ip:9000` and join the party!

### Example 3: Custom Model
```bash
./start-anal-king.sh --model llama3.2:3b --rag-dir ~/docs
```
Use a different LLM while keeping the Anal King personality!

## 📖 Command Reference

```bash
./start-anal-king.sh [OPTIONS]

Options:
  --rag-dir PATH         Load documents for knowledge-based answers
  --listen HOST:PORT     Set listen address (default: localhost:8000)
  --name NAME            Your username (default: AnalKing)
  --model MODEL          LLM model (default: dolphin-mistral:7b)
  --embed-model MODEL    Embedding model (default: nomic-embed-text:v1.5)
  --context-size SIZE    Context window (default: 4096)
  --debug                Enable debug mode
  --help                 Show help
```

## 🎯 Pro Tips

1. **Pre-load your codebase**: Use `--rag-dir` to make Anal King an expert on YOUR code
2. **Network sharing**: Use `--listen 0.0.0.0:8000` so friends can join via browser
3. **Debug mode**: Add `--debug` to see token usage and document retrieval
4. **Custom models**: Try `llama3.2:3b` for faster responses or `codellama:7b` for code help

## 🔗 Links

- Website: https://uzdabrazor.com
- X/Twitter: https://x.com/uzdabrazor
- ANAL CHAT PARTY: https://github.com/uzdabrazor/anal-chat-party
- anal-core: https://github.com/uzdabrazor/anal-core

## 💎 Powered by $UZDABRAZOR

The Anal King runs on the $UZDABRAZOR token ecosystem - real utility, not pump-and-dump garbage!

Token: DCDQBmZM9HYcfqDj8PQXzEQxvEtmWSKmAFWScKcxpump (Solana)

---

**Now go forth and unleash the Anal King! 🔥👑💀**
