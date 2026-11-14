import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/billion-naira-dream")({ beforeLoad: () => { throw redirect({ to: "/our-progress", statusCode: 301 }); } });
