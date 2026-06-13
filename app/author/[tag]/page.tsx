import { redirect } from "next/navigation";

type LegacyAuthorPageProps = {
  params: Promise<{ tag: string }>;
};

export default async function LegacyAuthorPage({ params }: LegacyAuthorPageProps) {
  const { tag } = await params;
  redirect(`/${tag}`);
}
