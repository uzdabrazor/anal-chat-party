"""
Simple CLI handler without Rich Live display interference.
Handles CLI input and display while syncing with web interface.
"""

import threading
import time
from queue import Empty
from typing import Any, Dict, Optional, cast

import numpy as np
import numpy.typing as npt
from rich.console import Console

from main import Args
from chat import SYSTEM_PROMPT, stream_chat
from rag import ollama_embed, pick_context
from shared_state import shared_state

console = Console()


class SimpleCLIHandler:
    """Simple CLI handler without Rich Live interference"""

    def __init__(self, args: Args, web_enabled: bool = True):
        self.args = args
        self.web_enabled = web_enabled
        self.web_monitor_thread = None
        self.processing_lock = threading.Lock()
        self.is_processing = False

    def start_cli(self):
        """Start simple CLI interface"""
        console.print("🚀 [bold green]Starting ANAL CHAT PARTY...[/]")
        if self.web_enabled:
            console.print(
                f"🌐 [bold blue]Web interface available at http://{self.args.listen}[/]"
            )

            # Check if password protection is enabled
            import os

            if os.getenv("OLLAMA_CHAT_PARTY_WEB_UI_PASSWORD"):
                console.print("🔐 [bold yellow]Web UI is password protected[/]")
        else:
            console.print("🖥️  [bold yellow]Running in CLI-only mode[/]")

        console.print()

        # Start background web message monitor only if web is enabled
        if self.web_enabled:
            self.web_monitor_thread = threading.Thread(
                target=self._monitor_web_messages, daemon=True
            )
            self.web_monitor_thread.start()

        # Run CLI loop in main thread
        self._run_cli_loop()

    def _run_cli_loop(self):
        """Main CLI interaction loop"""
        while not shared_state.shutdown_event.is_set():
            try:
                # Show web connection status only if web is enabled
                status = ""
                if self.web_enabled:
                    web_count = shared_state.get_web_client_count()
                    status = (
                        f"(🌐 {web_count} web client"
                        f"{'s' if web_count != 1 else ''} connected)"
                        if web_count > 0
                        else ""
                    )

                # Get user input with proper prompt
                if status:
                    console.print(f"\n[dim]{status}[/]")

                # Ensure we have a clean line for input
                console.print("[bold cyan]🗨️  > [/]", end="")
                message = input().strip()

                if message:
                    self._process_cli_message(message)
                    # Add a small delay to let any async processes finish
                    import time

                    time.sleep(0.1)

            except (KeyboardInterrupt, EOFError):
                console.print("\n[bold red]🛑 Shutting down...[/]")
                shared_state.shutdown()
                break
            except Exception as e:
                console.print(f"[bold red]CLI Error: {e}[/]")
                break

    def _monitor_web_messages(self):
        """Monitor web messages and display them in CLI"""
        while not shared_state.shutdown_event.is_set():
            try:
                self._process_web_messages()
                time.sleep(0.1)  # Check every 100ms
            except Exception as e:
                console.print(f"[bold red]Web monitor error: {e}[/]")
                time.sleep(1)

    def _process_message(
        self, message: str, source: str, user_name: Optional[str] = None
    ):
        """Process message through RAG pipeline (shared by CLI and web)"""
        try:
            # Check if RAG is enabled
            if shared_state.index is not None and shared_state.store is not None:
                # RAG is enabled - get document context
                q_vec: npt.NDArray[np.float32] = ollama_embed(
                    [message],
                    self.args.embed_model,
                    self.args.ollama_url,
                    self.args.debug,
                )
                ctx = pick_context(
                    shared_state.index,
                    shared_state.store,
                    q_vec,
                    self.args.max_ctx_docs,
                    self.args.chunks,
                    debug=self.args.debug,
                )

                # Add context message
                context_msg = {"role": "user", "content": f"CONTEXT:\n{ctx}"}
                shared_state.add_message(context_msg, source="internal")

            display_name = user_name if user_name else "Anonymous"
            question_msg = {
                "role": "user",
                "content": f"I am {display_name}:\n{message}",
            }
            shared_state.add_message(question_msg, source=source, user_name=user_name)

            # Get trimmed messages for context
            messages = shared_state.get_messages_for_context(
                self.args.context_size, debug=self.args.debug
            )

            # Stream response
            response_content = ""

            try:
                # For web responses, let stream_chat function handle robot emoji

                for chunk in stream_chat(
                    messages,
                    self.args.model,
                    self.args.ollama_url,
                    self.args.context_size,
                    self.args.debug,
                ):
                    # Always show in CLI
                    console.print(chunk, end="")

                    # Always send chunks to web clients for real-time streaming
                    shared_state.cli_to_web_queue.put(("chunk", chunk))

                    response_content += chunk

                # Always add newline after streaming
                console.print()  # New line after response

                # Add complete response to shared state (single source of truth)
                assistant_msg = {"role": "assistant", "content": response_content}
                shared_state.add_message(assistant_msg, source=source)

                # Notify web clients about complete response
                shared_state.cli_to_web_queue.put(
                    (
                        "assistant_complete",
                        {
                            "role": "assistant",
                            "content": response_content,
                            "source": source,
                        },
                    )
                )

            except Exception as e:
                error_msg = f"Error generating response: {str(e)}"
                if source == "cli":
                    console.print(f"\n[bold red]❌ {error_msg}[/]")

                # Add error to shared state (single source of truth)
                error_chat_msg = {"role": "assistant", "content": error_msg}
                shared_state.add_message(error_chat_msg, source=source)

                # Notify web clients about error
                shared_state.cli_to_web_queue.put(
                    (
                        "error",
                        {
                            "role": "assistant",
                            "content": error_msg,
                            "source": source,
                        },
                    )
                )

        except Exception as e:
            console.print(f"[bold red]Error processing {source} message: {e}[/]")

    def _process_cli_message(self, message: str):
        """Process message from CLI"""
        # Get CLI user name
        cli_name = getattr(self.args, "name", None)

        # Notify web clients of CLI user message with name
        shared_state.cli_to_web_queue.put(
            (
                "user_message",
                {
                    "role": "user",
                    "content": message,
                    "source": "cli",
                    "user_name": cli_name or "Anonymous",
                },
            )
        )

        # Process through shared pipeline with CLI user name
        self._process_message(message, "cli", user_name=cli_name)

    def _generate_ai_response(self, source: str, tagged: bool = False):
        """Generate AI response for party mode"""
        try:
            if shared_state.index is not None and shared_state.store is not None:
                recent_msgs = shared_state.get_display_messages()[-5:]
                combined_query = " ".join(
                    [m["content"] for m in recent_msgs if m["role"] == "user"]
                )
                if combined_query:
                    q_vec: npt.NDArray[np.float32] = ollama_embed(
                        [combined_query],
                        self.args.embed_model,
                        self.args.ollama_url,
                        self.args.debug,
                    )
                    ctx = pick_context(
                        shared_state.index,
                        shared_state.store,
                        q_vec,
                        self.args.max_ctx_docs,
                        self.args.chunks,
                        debug=self.args.debug,
                    )
                    context_msg = {"role": "user", "content": f"CONTEXT:\n{ctx}"}
                    shared_state.add_message(context_msg, source="internal")

            context_messages = shared_state.get_messages_for_context(
                self.args.context_size, debug=self.args.debug
            )

            response_content = ""
            try:
                for chunk in stream_chat(
                    context_messages,
                    self.args.model,
                    self.args.ollama_url,
                    self.args.context_size,
                    self.args.debug,
                ):
                    console.print(chunk, end="")
                    shared_state.cli_to_web_queue.put(("chunk", chunk))
                    response_content += chunk

                console.print()

                assistant_msg = {"role": "assistant", "content": response_content}
                shared_state.add_message(assistant_msg, source=source)

                shared_state.cli_to_web_queue.put(
                    (
                        "assistant_complete",
                        {
                            "role": "assistant",
                            "content": response_content,
                            "source": source,
                        },
                    )
                )

            except Exception as e:
                error_msg = f"Error generating response: {str(e)}"
                console.print(f"\n[bold red]{error_msg}[/]")
                error_chat_msg = {"role": "assistant", "content": error_msg}
                shared_state.add_message(error_chat_msg, source=source)
                shared_state.cli_to_web_queue.put(
                    ("error", {"role": "assistant", "content": error_msg, "source": source})
                )

        except Exception as e:
            console.print(f"[bold red]Error generating AI response: {e}[/]")

    def _check_for_tag(self, message: str) -> bool:
        """Check if message contains @uzdabrazor tag"""
        lower_msg = message.lower()
        return "@uzdabrazor" in lower_msg or "@uzda" in lower_msg

    def _process_web_messages(self):
        """Process messages from web interface - PARTY MODE with tagging"""
        try:
            collected_messages = []
            has_tag = False

            while True:
                try:
                    msg_type, content = shared_state.web_to_cli_queue.get_nowait()

                    if msg_type == "user":
                        if isinstance(content, dict):
                            content_dict = cast(Dict[str, Any], content)
                            msg_content: str = str(content_dict.get("content", ""))
                            user_name: Optional[str] = content_dict.get("user_name")
                            if not isinstance(user_name, str):
                                user_name = None
                        else:
                            msg_content: str = str(content)
                            user_name: Optional[str] = None

                        console.print(
                            f"\r[bold blue]🌐 [{user_name or 'Anonymous'}]:[/] "
                            f"[white]{msg_content}[/]"
                        )

                        collected_messages.append((msg_content, user_name))

                        if self._check_for_tag(msg_content):
                            has_tag = True

                except Empty:
                    break

            if not collected_messages:
                return

            with self.processing_lock:
                if self.is_processing:
                    for msg_content, user_name in collected_messages:
                        shared_state.web_to_cli_queue.put(
                            ("user", {"content": msg_content, "user_name": user_name})
                        )
                    return

            for msg_content, user_name in collected_messages:
                display_name = user_name if user_name else "Anonymous"
                question_msg = {
                    "role": "user",
                    "content": f"I am {display_name}:\n{msg_content}",
                }
                shared_state.add_message(question_msg, source="web", user_name=user_name)

            should_respond = has_tag or shared_state.should_ai_auto_join()

            if should_respond:
                with self.processing_lock:
                    self.is_processing = True

                try:
                    self._generate_ai_response("web", tagged=has_tag)
                finally:
                    with self.processing_lock:
                        self.is_processing = False

                    web_count = shared_state.get_web_client_count()
                    if web_count > 0:
                        console.print(
                            f"\n[dim](🌐 {web_count} web client"
                            f"{'s' if web_count != 1 else ''} connected)[/]"
                        )
                    console.print("[bold cyan]🗨️  > [/]", end="")
            else:
                msgs_until_join = (
                    shared_state.ai_auto_join_threshold
                    - shared_state.get_messages_since_ai()
                )
                console.print(
                    f"[dim](Party chat - AI will join in {msgs_until_join} "
                    f"more messages or tag @uzdabrazor)[/]"
                )

        except Exception as e:
            console.print(f"[bold red]Error processing web messages: {e}[/]")
            with self.processing_lock:
                self.is_processing = False


def run_simple_cli_interface(
    args: Args, index: Any, store: Dict[str, Any], web_enabled: bool = True
) -> None:
    """Run simple CLI interface with optional web sync"""
    # Set RAG components in shared state
    shared_state.set_rag_components(index, store, args)

    # Initialize conversation with system message (internal - don't show in web)
    system_prompt = args.system_prompt if args.system_prompt else SYSTEM_PROMPT
    system_msg: Dict[str, str] = {"role": "system", "content": system_prompt}
    shared_state.add_message(system_msg, source="internal")

    # Create and start CLI handler
    cli_handler = SimpleCLIHandler(args, web_enabled)
    cli_handler.start_cli()
