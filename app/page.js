import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import ScrollWorld from "@/components/scroll-world";

export default async function Home() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");
  return <ScrollWorld />;
}
