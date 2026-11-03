import { useEffect, useRef, useState } from "react";
import { ArrowUp, Mic, Square, Sparkles } from "lucide-react";
const suggestions = [
  "gold rocket",
  "blue bird",
  "gray elephant",
  "teal crystal",
  "red cube",
];
export default function CommandBar({
  onCommand,
  message,
  compact = false,
}: {
  onCommand: (text: string) => void;
  message: string;
  compact?: boolean;
}) {
  const [input, setInput] = useState("");
  const [listening, setListening] = useState(false);
  const [feedback, setFeedback] = useState("");
  const recognition = useRef<any>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(
    () => () => {
      clearTimeout(timer.current);
      recognition.current?.abort();
    },
    [],
  );
  useEffect(() => {
    const stop = () => {
      if (document.hidden) recognition.current?.abort();
    };
    document.addEventListener("visibilitychange", stop);
    return () => document.removeEventListener("visibilitychange", stop);
  }, []);
  const submit = (text: string) => {
    setFeedback("");
    onCommand(text);
    setInput("");
  };
  function listen() {
    if (listening) {
      recognition.current?.stop();
      return;
    }
    const Speech =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!Speech) {
      setFeedback(
        "Voice isn’t supported in this browser. Type a command below.",
      );
      return;
    }
    const instance = new Speech();
    recognition.current = instance;
    instance.lang = "en-US";
    instance.continuous = false;
    instance.interimResults = true;
    let received = false;
    instance.onresult = (event: any) => {
      const result = event.results[event.resultIndex];
      setInput(result[0].transcript);
      if (result.isFinal) {
        received = true;
        submit(result[0].transcript);
        instance.stop();
      }
    };
    instance.onerror = (event: any) =>
      setFeedback(
        (
          {
            "not-allowed":
              "Microphone permission denied. You can still type a command.",
            "service-not-allowed":
              "Speech service is unavailable. Type your command instead.",
            "no-speech": "No speech detected. Try again, or type a command.",
            "audio-capture": "No microphone found. Type a command instead.",
            network: "Speech service needs a connection. Try typing instead.",
          } as Record<string, string>
        )[event.error] || "Listening stopped. Try again or type a command.",
      );
    instance.onend = () => {
      setListening(false);
      clearTimeout(timer.current);
    };
    try {
      instance.start();
      setListening(true);
      setFeedback("Listening… say a color and an object.");
      timer.current = setTimeout(() => {
        instance.stop();
        if (!received)
          setFeedback("No speech detected. Try again, or type a command.");
      }, 12000);
    } catch {
      setFeedback("Could not start the microphone. Try typing instead.");
      setListening(false);
    }
  }
  return (
    <div className={`command-panel ${compact ? "compact" : ""}`}>
      {!compact && (
        <div className="command-heading">
          <span className="status-dot" /> A WORD IS ALL IT TAKES{" "}
          <Sparkles size={12} />
        </div>
      )}
      <form
        className={`command-form ${listening ? "is-listening" : ""}`}
        onSubmit={(event) => {
          event.preventDefault();
          submit(input);
        }}
      >
        <button
          type="button"
          className="mic-control"
          aria-label={listening ? "Stop listening" : "Speak a command"}
          aria-pressed={listening}
          onClick={listen}
        >
          {listening ? <Square size={16} /> : <Mic size={19} />}
        </button>
        <input
          aria-label="Object command"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Try saying: gold rocket"
          maxLength={120}
          autoComplete="off"
        />
        <button
          className="submit-command"
          aria-label="Create object"
          type="submit"
        >
          <ArrowUp size={19} />
        </button>
      </form>
      <div className="suggestions" aria-label="Try a command">
        {suggestions.map((text, index) => (
          <button key={text} onClick={() => submit(text)}>
            <span className={`chip-dot dot-${index}`} />
            {text}
          </button>
        ))}
      </div>
      <p className="command-feedback" role="status">
        {feedback || message}
      </p>
    </div>
  );
}
