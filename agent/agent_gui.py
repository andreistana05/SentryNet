import os
import queue
import subprocess
import sys
import threading
import tkinter as tk
from pathlib import Path
from tkinter import messagebox, ttk

import requests

from collector import collect_metrics
from config import CONFIG_PATH, load_config, save_config
from device_info import get_device_info


APP_DIR = Path(__file__).resolve().parent


class AgentControlPanel(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("SentryNet Agent")
        self.minsize(780, 560)

        self.process = None
        self.output_queue = queue.Queue()

        self.backend_url = tk.StringVar()
        self.api_key = tk.StringVar()
        self.metrics_interval = tk.IntVar()
        self.heartbeat_interval = tk.IntVar()
        self.timeout = tk.IntVar()
        self.status = tk.StringVar(value="Stopped")
        self.config_path = tk.StringVar(value=str(CONFIG_PATH))

        self._load_settings()
        self._build_ui()
        self._poll_output()
        self.protocol("WM_DELETE_WINDOW", self._on_close)

    def _load_settings(self):
        config = load_config()
        self.backend_url.set(config["backend_url"])
        self.api_key.set(config["api_key"])
        self.metrics_interval.set(config["metrics_interval"])
        self.heartbeat_interval.set(config["heartbeat_interval"])
        self.timeout.set(config["timeout"])

    def _build_ui(self):
        self.columnconfigure(0, weight=1)
        self.rowconfigure(1, weight=1)

        header = ttk.Frame(self, padding=(18, 16, 18, 10))
        header.grid(row=0, column=0, sticky="ew")
        header.columnconfigure(0, weight=1)

        title = ttk.Label(header, text="SentryNet Agent", font=("Segoe UI", 18, "bold"))
        title.grid(row=0, column=0, sticky="w")

        status = ttk.Label(header, textvariable=self.status, font=("Segoe UI", 11, "bold"))
        status.grid(row=0, column=1, sticky="e")

        notebook = ttk.Notebook(self)
        notebook.grid(row=1, column=0, sticky="nsew", padx=18, pady=(0, 18))

        settings_tab = ttk.Frame(notebook, padding=16)
        runtime_tab = ttk.Frame(notebook, padding=16)
        metrics_tab = ttk.Frame(notebook, padding=16)

        notebook.add(settings_tab, text="Settings")
        notebook.add(runtime_tab, text="Run")
        notebook.add(metrics_tab, text="Metrics")

        self._build_settings_tab(settings_tab)
        self._build_runtime_tab(runtime_tab)
        self._build_metrics_tab(metrics_tab)

    def _build_settings_tab(self, parent):
        parent.columnconfigure(1, weight=1)

        fields = [
            ("Backend URL", self.backend_url),
            ("Ingest API Key", self.api_key),
            ("Metrics Interval", self.metrics_interval),
            ("Heartbeat Interval", self.heartbeat_interval),
            ("Request Timeout", self.timeout),
        ]

        for row, (label, variable) in enumerate(fields):
            ttk.Label(parent, text=label).grid(row=row, column=0, sticky="w", pady=7)
            if isinstance(variable, tk.IntVar):
                entry = ttk.Spinbox(parent, from_=1, to=3600, textvariable=variable, width=12)
            else:
                entry = ttk.Entry(parent, textvariable=variable, show="*" if "Key" in label else "")
            entry.grid(row=row, column=1, sticky="ew", padx=(14, 0), pady=7)

        ttk.Label(parent, text="Config File").grid(row=5, column=0, sticky="w", pady=7)
        ttk.Entry(parent, textvariable=self.config_path, state="readonly").grid(
            row=5, column=1, sticky="ew", padx=(14, 0), pady=7
        )

        actions = ttk.Frame(parent)
        actions.grid(row=6, column=0, columnspan=2, sticky="ew", pady=(18, 0))
        actions.columnconfigure(3, weight=1)

        ttk.Button(actions, text="Save", command=self.save_settings).grid(row=0, column=0, padx=(0, 8))
        ttk.Button(actions, text="Reload", command=self.reload_settings).grid(row=0, column=1, padx=(0, 8))
        ttk.Button(actions, text="Test Backend", command=self.test_backend).grid(row=0, column=2)

    def _build_runtime_tab(self, parent):
        parent.columnconfigure(0, weight=1)
        parent.rowconfigure(2, weight=1)

        device = get_device_info()
        device_text = (
            f"Hostname: {device['hostname']}\n"
            f"IP Address: {device['ip_address']}\n"
            f"Device Type: {device['device_type']}"
        )
        ttk.Label(parent, text=device_text, justify="left").grid(row=0, column=0, sticky="ew")

        controls = ttk.Frame(parent)
        controls.grid(row=1, column=0, sticky="ew", pady=(14, 10))
        ttk.Button(controls, text="Start Agent", command=self.start_agent).grid(row=0, column=0, padx=(0, 8))
        ttk.Button(controls, text="Stop Agent", command=self.stop_agent).grid(row=0, column=1, padx=(0, 8))
        ttk.Button(controls, text="Clear Log", command=self.clear_log).grid(row=0, column=2)

        log_frame = ttk.Frame(parent)
        log_frame.grid(row=2, column=0, sticky="nsew")
        log_frame.columnconfigure(0, weight=1)
        log_frame.rowconfigure(0, weight=1)

        self.log = tk.Text(log_frame, height=18, wrap="word", state="disabled")
        scroll = ttk.Scrollbar(log_frame, orient="vertical", command=self.log.yview)
        self.log.configure(yscrollcommand=scroll.set)
        self.log.grid(row=0, column=0, sticky="nsew")
        scroll.grid(row=0, column=1, sticky="ns")

    def _build_metrics_tab(self, parent):
        parent.columnconfigure(0, weight=1)
        parent.rowconfigure(1, weight=1)

        toolbar = ttk.Frame(parent)
        toolbar.grid(row=0, column=0, sticky="ew", pady=(0, 10))
        ttk.Button(toolbar, text="Collect Preview", command=self.preview_metrics).grid(row=0, column=0)

        columns = ("type", "value", "unit")
        self.metrics_table = ttk.Treeview(parent, columns=columns, show="headings", height=16)
        for col in columns:
            self.metrics_table.heading(col, text=col.title())
            self.metrics_table.column(col, width=160, anchor="w")
        self.metrics_table.grid(row=1, column=0, sticky="nsew")

    def _current_settings(self):
        return {
            "backend_url": self.backend_url.get(),
            "api_key": self.api_key.get(),
            "metrics_interval": self.metrics_interval.get(),
            "heartbeat_interval": self.heartbeat_interval.get(),
            "timeout": self.timeout.get(),
        }

    def save_settings(self):
        try:
            settings = save_config(self._current_settings())
        except Exception as exc:
            messagebox.showerror("Settings", f"Could not save settings:\n{exc}")
            return

        self.backend_url.set(settings["backend_url"])
        self.status.set("Settings saved")
        self._append_log(f"Settings saved to {CONFIG_PATH}")

    def reload_settings(self):
        self._load_settings()
        self.status.set("Settings reloaded")

    def test_backend(self):
        self.save_settings()
        config = load_config()

        def worker():
            headers = {"X-API-Key": config["api_key"]}
            try:
                response = requests.get(
                    f"{config['base_url']}/devices",
                    headers=headers,
                    timeout=config["timeout"],
                )
                if response.status_code == 200:
                    self.output_queue.put(("status", "Backend reachable"))
                    self.output_queue.put(("log", "Backend test succeeded"))
                else:
                    self.output_queue.put(("status", f"Backend returned {response.status_code}"))
                    self.output_queue.put(("log", f"Backend test failed: {response.status_code} {response.text}"))
            except Exception as exc:
                self.output_queue.put(("status", "Backend unreachable"))
                self.output_queue.put(("log", f"Backend test failed: {exc}"))

        threading.Thread(target=worker, daemon=True).start()

    def start_agent(self):
        if self.process and self.process.poll() is None:
            self.status.set("Running")
            return

        self.save_settings()
        env = os.environ.copy()
        for key in ("BACKEND_URL", "INGEST_API_KEY", "METRICS_INTERVAL", "HEARTBEAT_INTERVAL", "TIMEOUT"):
            env.pop(key, None)

        creationflags = 0
        if os.name == "nt":
            creationflags = getattr(subprocess, "CREATE_NO_WINDOW", 0)

        self.process = subprocess.Popen(
            [sys.executable, "-u", str(APP_DIR / "main.py")],
            cwd=str(APP_DIR),
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
            env=env,
            creationflags=creationflags,
        )

        threading.Thread(target=self._read_process_output, daemon=True).start()
        self.status.set("Running")
        self._append_log("Agent process started")

    def stop_agent(self):
        if not self.process or self.process.poll() is not None:
            self.status.set("Stopped")
            return

        self.process.terminate()
        try:
            self.process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            self.process.kill()
            self.process.wait(timeout=5)
        self.status.set("Stopped")
        self._append_log("Agent process stopped")

    def preview_metrics(self):
        def worker():
            try:
                metrics = collect_metrics()
                self.output_queue.put(("metrics", metrics))
                self.output_queue.put(("status", f"Collected {len(metrics)} metric(s)"))
            except Exception as exc:
                self.output_queue.put(("status", "Metric preview failed"))
                self.output_queue.put(("log", f"Metric preview failed: {exc}"))

        threading.Thread(target=worker, daemon=True).start()

    def clear_log(self):
        self.log.configure(state="normal")
        self.log.delete("1.0", "end")
        self.log.configure(state="disabled")

    def _read_process_output(self):
        if not self.process or not self.process.stdout:
            return
        for line in self.process.stdout:
            self.output_queue.put(("log", line.rstrip()))
        code = self.process.poll()
        self.output_queue.put(("status", f"Stopped ({code})" if code else "Stopped"))

    def _poll_output(self):
        try:
            while True:
                kind, payload = self.output_queue.get_nowait()
                if kind == "log":
                    self._append_log(payload)
                elif kind == "status":
                    self.status.set(payload)
                elif kind == "metrics":
                    self._render_metrics(payload)
        except queue.Empty:
            pass

        self.after(200, self._poll_output)

    def _append_log(self, message):
        self.log.configure(state="normal")
        self.log.insert("end", f"{message}\n")
        self.log.see("end")
        self.log.configure(state="disabled")

    def _render_metrics(self, metrics):
        self.metrics_table.delete(*self.metrics_table.get_children())
        for metric in metrics:
            self.metrics_table.insert(
                "",
                "end",
                values=(metric.get("type", ""), metric.get("value", ""), metric.get("unit", "")),
            )

    def _on_close(self):
        if self.process and self.process.poll() is None:
            if not messagebox.askyesno("SentryNet Agent", "Stop the running agent and close?"):
                return
            self.stop_agent()
        self.destroy()


if __name__ == "__main__":
    AgentControlPanel().mainloop()
