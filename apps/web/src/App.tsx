import { useEffect, useState } from "react";
import { healthCheck } from "./services/api";

function App() {
  const [status, setStatus] = useState("Connecting to API...");
  const [error, setError] = useState("");

  useEffect(() => {
    const checkAPI = async () => {
      try {
        const data = await healthCheck();

        setStatus(
          `${data.service} is connected — ${data.status}`
        );
      } catch (err) {
        console.error(err);
        setError("Could not connect to API");
        setStatus("");
      }
    };

    checkAPI();
  }, []);

  return (
    <div>
      <h1>One Front Door</h1>

      {status && <p>✅ {status}</p>}

      {error && <p>❌ {error}</p>}
    </div>
  );
}

export default App;