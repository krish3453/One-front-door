import { campusAgent } from "./campus-agent.js";

async function main() {
  const result = await campusAgent.invoke({
    messages: [
      {
        role: "user",
        content: "Where is the central library?",
      },
    ],
  });

  const messages = result.messages;

  const finalMessage = messages[messages.length - 1];

  console.log(finalMessage.content);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});