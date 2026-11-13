import { createFileRoute } from "@tanstack/react-router";
import { RacingGame } from "@/components/RacingGame";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Supercar Highway Dash — Jogo de Corrida" },
      {
        name: "description",
        content:
          "Pilote supercarros como a Lamborghini Revuelto e a Bugatti Chiron pela rodovia. Acelere, desvie do trânsito e personalize seu carro.",
      },
      { property: "og:title", content: "Supercar Highway Dash — Jogo de Corrida" },
      {
        property: "og:description",
        content:
          "Pilote supercarros como a Lamborghini Revuelto e a Bugatti Chiron pela rodovia. Acelere, desvie do trânsito e personalize seu carro.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RacingGame,
});
